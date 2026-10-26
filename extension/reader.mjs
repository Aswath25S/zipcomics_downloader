// These functions are self-contained because Chrome injects their serialized code.
export function collectImages(options = {}) {
  if (/^(just a moment|attention required)/i.test(document.title)) {
    return {error: "Complete verification in the reader tab first, then scan again."};
  }
  let scoped = false;
  let elements;
  try {
    if (options.selector) {
      const containers = [...document.querySelectorAll(options.selector)];
      if (!containers.length) return {error: "No elements match that reader selector."};
      elements = [...document.querySelectorAll("img")].filter((img) => containers.some((box) => box.contains(img)));
      scoped = true;
    } else {
      const selector = "#readcomic, #comic, #reader, .comic-reader, .comic-content, .reading-content, " +
        ".chapter-content, .chapter-container, .page-chapter, .comic-container, .img-container";
      const containers = [...document.querySelectorAll(selector)];
      const all = [...document.querySelectorAll("img")];
      elements = all.filter((img) => containers.some((box) => box.contains(img)));
      scoped = elements.length > 0;
      if (!scoped) elements = all;
    }
  } catch {
    return {error: "Invalid reader selector. Try #readcomic or .reading-content."};
  }
  const images = [], seen = new Set();
  for (const img of elements) {
    const attrs = ["data-original", "data-src", "data-lazy-src"].map((key) => img.getAttribute(key)?.trim());
    const srcset = img.getAttribute("data-srcset") || img.getAttribute("srcset");
    const source = attrs.find((value) => value && !value.startsWith("data:")) ||
      img.currentSrc || (srcset ? srcset.split(",").at(-1).trim().split(/\s+/)[0] : "") || img.getAttribute("src");
    if (!source) continue;
    let url;
    try { url = new URL(source, document.baseURI); } catch { continue; }
    if (!["https:", "http:"].includes(url.protocol)) continue;
    url.hash = "";
    if (seen.has(url.href)) continue;
    seen.add(url.href);
    const width = img.naturalWidth || img.width || 0, height = img.naturalHeight || img.height || 0;
    const described = /read\s+online|comic.*(?:page|issue)/i.test(img.alt || "");
    const likelyPage = described || (width >= 400 && height >= 400);
    images.push({url: url.href, width, height, alt: img.alt || "", selected: scoped || likelyPage});
  }
  return {title: document.title, url: location.href, images, scoped};
}

export async function fetchInReader(url, limit) {
  try {
    const target = new URL(url);
    if (!["http:", "https:"].includes(target.protocol)) throw new Error("Unsupported image URL.");
    const response = await fetch(url, {credentials: "include", signal: AbortSignal.timeout(30000)});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    if (Number(response.headers.get("content-length")) > limit) throw new Error("Image is too large.");
    const reader = response.body.getReader(), chunks = [];
    let length = 0;
    try {
      while (true) {
        const {done, value} = await reader.read();
        if (done) break;
        length += value.length;
        if (length > limit) throw new Error("Image is too large.");
        chunks.push(value);
      }
    } finally { await reader.cancel().catch(() => {}); }
    const data = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.length; }
    let binary = "";
    for (let i = 0; i < data.length; i += 8192) binary += String.fromCharCode(...data.subarray(i, i + 8192));
    return {base64: btoa(binary)};
  } catch (error) {
    return {error: error.message};
  }
}
