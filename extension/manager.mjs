import {createArchive, imageExtension, safeName} from "./archive.mjs";
import {collectImages, fetchInReader} from "./reader.mjs";
import {readLimited, imageOrigins} from "./network.mjs";

const $ = (id) => document.getElementById(id);
const sourceTab = Number(new URL(location.href).searchParams.get("tab"));
const MAX_IMAGE = 32 * 1024 * 1024, MAX_TOTAL = 512 * 1024 * 1024;
let scanResult = null, controller = null, busy = false, objectUrl = null;

function status(message, error = false) {
  $("status").textContent = message;
  $("status").classList.toggle("error", error);
}

function selectedImages() {
  return scanResult?.images.filter((image) => image.selected) || [];
}

function updateControls() {
  const selected = selectedImages();
  $("count").textContent = scanResult ? `(${selected.length} of ${scanResult.images.length} selected)` : "";
  $("download").disabled = busy || !selected.length;
  for (const id of ["scan", "all", "none", "selector", "name", "format"]) $(id).disabled = busy;
  for (const checkbox of document.querySelectorAll(".page input")) checkbox.disabled = busy;
  $("cancel").disabled = !busy;
  $("permissions").textContent = selected.length
    ? `Chrome may ask for access to image hosts: ${imageOrigins(selected).map((origin) => new URL(origin).hostname).join(", ")}.`
    : "";
}

function renderPages() {
  $("pages").replaceChildren();
  for (const [index, image] of scanResult.images.entries()) {
    const label = document.createElement("label");
    label.className = "page";
    const preview = document.createElement("img");
    preview.loading = "lazy";
    preview.src = image.url;
    preview.alt = `Page ${index + 1} preview`;
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = image.selected;
    checkbox.addEventListener("change", () => { image.selected = checkbox.checked; updateControls(); });
    const dimensions = document.createElement("small");
    dimensions.textContent = image.width && image.height ? `${image.width} × ${image.height}` : "Not loaded yet";
    const source = document.createElement("small");
    source.textContent = new URL(image.url).pathname.split("/").at(-1);
    source.title = image.url;
    label.append(preview, checkbox, ` Page ${index + 1}`, dimensions, source);
    $("pages").append(label);
  }
}

async function scan() {
  busy = true;
  updateControls();
  status("Reading images from the original tab…");
  try {
    if (!Number.isInteger(sourceTab) || sourceTab <= 0) throw new Error("Open the reader and click the extension icon again.");
    const [{result}] = await chrome.scripting.executeScript({
      target: {tabId: sourceTab}, func: collectImages, args: [{selector: $("selector").value.trim()}],
    });
    if (result.error) throw new Error(result.error);
    if (!result.images.length) throw new Error("No image URLs found. Load the comic in the original tab and scan again.");
    scanResult = result;
    $("source").textContent = result.title;
    $("source").title = result.url;
    $("name").value = safeName(result.title);
    $("selection-hint").textContent = result.scoped
      ? "Images are in reader order. Uncheck adverts or duplicates before downloading."
      : "Reader layout was not recognized. Large images are selected as a starting point. Review the selection and order carefully, or enter a reader selector above.";
    renderPages();
    status(`Found ${result.images.length} images. Review the selection, then download.`);
  } catch (error) {
    scanResult = null;
    $("pages").replaceChildren();
    status(`${error.message} If the tab was closed or navigated, click the extension icon on the reader again.`, true);
  } finally { busy = false; updateControls(); }
}

async function fetchImage(image, signal) {
  let pageError = "";
  try {
    const [{result}] = await chrome.scripting.executeScript({
      target: {tabId: sourceTab}, func: fetchInReader, args: [image.url, MAX_IMAGE],
    });
    signal.throwIfAborted();
    if (result?.base64) {
      const data = Uint8Array.from(atob(result.base64), (char) => char.charCodeAt(0));
      imageExtension(data);
      return data;
    }
    pageError = result?.error || "The reader could not fetch this image.";
  } catch (error) {
    signal.throwIfAborted();
    pageError = error.message;
  }
  signal.throwIfAborted();
  try {
    const response = await fetch(image.url, {credentials: "include",
      signal: AbortSignal.any([signal, AbortSignal.timeout(30000)])});
    return await readLimited(response, MAX_IMAGE);
  } catch (error) {
    signal.throwIfAborted();
    throw new Error(`${error.message} Reader request: ${pageError}`);
  }
}

async function waitForDownload(blob, filename) {
  objectUrl = URL.createObjectURL(blob);
  let downloadId;
  let listener;
  try {
    const finished = new Promise((resolve, reject) => {
      listener = (delta) => {
        if (delta.id !== downloadId) return;
        if (delta.state?.current === "complete") resolve();
        if (delta.state?.current === "interrupted") reject(new Error(`Download interrupted: ${delta.error?.current || "cancelled"}`));
      };
      chrome.downloads.onChanged.addListener(listener);
    });
    downloadId = await chrome.downloads.download({url: objectUrl, filename, saveAs: true, conflictAction: "uniquify"});
    // Check for a fast completion that occurred before downloadId was assigned.
    const [item] = await chrome.downloads.search({id: downloadId});
    if (item?.state === "interrupted") throw new Error(`Download interrupted: ${item.error || "cancelled"}`);
    if (item?.state !== "complete") await finished;
  } finally {
    if (listener) chrome.downloads.onChanged.removeListener(listener);
    URL.revokeObjectURL(objectUrl);
    objectUrl = null;
  }
}

$("download").addEventListener("click", async () => {
  const selected = selectedImages();
  if (busy || !selected.length) return;
  // Invoke permissions.request in the click handler, before any other awaited work.
  const permission = chrome.permissions.request({origins: imageOrigins(selected)});
  busy = true;
  controller = new AbortController();
  const signal = controller.signal;
  updateControls();
  $("progress").hidden = false;
  $("progress").max = selected.length;
  $("progress").value = 0;
  try {
    if (!await permission) throw new Error("Image host access was not granted. Click Download to try again.");
    signal.throwIfAborted();
    // A reader navigation can invalidate the selection or its activeTab grant.
    const [{result: currentUrl}] = await chrome.scripting.executeScript({target: {tabId: sourceTab}, func: () => location.href});
    if (currentUrl !== scanResult.url) throw new Error("The reader changed since scanning. Scan it again first.");
    const entries = [];
    let total = 0;
    for (const [index, image] of selected.entries()) {
      signal.throwIfAborted();
      status(`Downloading page ${index + 1} of ${selected.length}…`);
      let data;
      for (let attempt = 0; attempt < 2; attempt++) {
        try { data = await fetchImage(image, signal); imageExtension(data); break; }
        catch (error) {
          signal.throwIfAborted();
          if (attempt === 1) throw new Error(`Page ${index + 1} failed: ${error.message} No partial archive was saved.`);
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
      total += data.length;
      if (total > MAX_TOTAL) throw new Error("Selected pages exceed the 512 MB memory limit. Download smaller selections.");
      entries.push({name: `${String(index + 1).padStart(5, "0")}.${imageExtension(data)}`, data});
      $("progress").value = index + 1;
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
    signal.throwIfAborted();
    status("Creating the archive…");
    const format = $("format").value;
    const blob = createArchive(entries, format);
    entries.length = 0;
    $("cancel").disabled = true;
    status("Choose where to save the archive. Keep this tab open until it finishes.");
    await waitForDownload(blob, `${safeName($("name").value)}.${format}`);
    status(`Saved ${selected.length} pages. You can close this tab.`);
  } catch (error) {
    status(signal.aborted ? "Cancelled. No archive was saved." : error.message, !signal.aborted);
  } finally {
    busy = false;
    controller = null;
    updateControls();
  }
});

$("cancel").addEventListener("click", () => {
  controller?.abort();
  status("Cancelling after the current reader request finishes…");
});
$("scan").addEventListener("click", scan);
for (const [id, value] of [["all", true], ["none", false]]) {
  $(id).addEventListener("click", () => {
    if (!scanResult || busy) return;
    for (const image of scanResult.images) image.selected = value;
    renderPages();
    updateControls();
  });
}
window.addEventListener("beforeunload", (event) => {
  if (busy) { event.preventDefault(); event.returnValue = ""; }
});
scan();
