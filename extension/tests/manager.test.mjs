import test from "node:test";
import assert from "node:assert/strict";

class Element {
  constructor() {
    this.children = [];
    this.events = new Map();
    this.value = "";
    this.classList = {toggle() {}};
  }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  addEventListener(event, handler) { this.events.set(event, handler); }
  async click() { await this.events.get("click")?.(); }
}

const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

async function manager(scenario = {}) {
  const elements = new Map();
  const get = (id) => {
    if (!elements.has(id)) elements.set(id, new Element());
    return elements.get(id);
  };
  get("format").value = "cbr";
  globalThis.document = {getElementById: get, createElement: () => new Element(), querySelectorAll: () => []};
  globalThis.location = {href: "chrome-extension://test/manager.html?tab=42"};
  globalThis.window = {addEventListener() {}};
  const calls = {downloads: [], requests: [], blobs: [], revoked: []};
  const listeners = new Set();
  globalThis.chrome = {
    permissions: {request: async (request) => { calls.requests.push(request); return scenario.permission !== false; }},
    scripting: {executeScript: async ({func}) => {
      if (func.name === "collectImages") return [{result: {title: "Test Comic", url: "https://example.com/issue",
        scoped: true, images: [{url: "https://cdn.example/1.png", selected: true, width: 600, height: 900}]}}];
      if (func.name === "fetchInReader") return [{result: {base64: scenario.invalidImage ? btoa("Access denied") : png}}];
      return [{result: scenario.navigated ? "https://example.com/other" : "https://example.com/issue"}];
    }},
    downloads: {
      onChanged: {addListener: (listener) => listeners.add(listener), removeListener: (listener) => listeners.delete(listener)},
      download: async (options) => { calls.downloads.push(options); return 1; },
      search: async () => [{state: "complete"}],
    },
  };
  const create = URL.createObjectURL, revoke = URL.revokeObjectURL;
  URL.createObjectURL = (blob) => { calls.blobs.push(blob); return "blob:test"; };
  URL.revokeObjectURL = (url) => calls.revoked.push(url);
  await import(`../manager.mjs?scenario=${Math.random()}`);
  // The initial scan is asynchronous.
  await new Promise((resolve) => setImmediate(resolve));
  return {get, calls, listeners, restore() { URL.createObjectURL = create; URL.revokeObjectURL = revoke; }};
}

test("manager scans, requests only selected hosts, and downloads a real CBR blob", async () => {
  const app = await manager();
  try {
    assert.equal(app.get("download").disabled, false);
    assert.match(app.get("count").textContent, /1 of 1/);
    assert.equal(app.get("pages").children.length, 1);
    await app.get("download").click();
    assert.deepEqual(app.calls.requests, [{origins: ["https://cdn.example/*"]}]);
    assert.equal(app.calls.downloads[0].filename, "Test Comic.cbr");
    assert.equal(app.calls.downloads[0].saveAs, true);
    assert.deepEqual([...new Uint8Array(await app.calls.blobs[0].arrayBuffer()).slice(0, 8)], [82, 97, 114, 33, 26, 7, 1, 0]);
    assert.equal(app.listeners.size, 0);
    assert.deepEqual(app.calls.revoked, ["blob:test"]);
    assert.match(app.get("status").textContent, /Saved 1 pages/);
  } finally { app.restore(); }
});

test("manager does not download after permission denial or reader navigation", async () => {
  for (const scenario of [{permission: false}, {navigated: true}]) {
    const app = await manager(scenario);
    try {
      await app.get("download").click();
      assert.equal(app.calls.downloads.length, 0);
      assert.match(app.get("status").textContent, /not granted|reader changed/);
      assert.equal(app.get("download").disabled, false);
    } finally { app.restore(); }
  }
});

test("manager never publishes an archive containing an HTTP error page", async () => {
  const app = await manager({invalidImage: true});
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("<html>Denied</html>", {status: 403});
  try {
    await app.get("download").click();
    assert.equal(app.calls.downloads.length, 0);
    assert.match(app.get("status").textContent, /No partial archive/);
  } finally { globalThis.fetch = previousFetch; app.restore(); }
});
