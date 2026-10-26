import test from "node:test";
import assert from "node:assert/strict";
import {collectImages, fetchInReader} from "../reader.mjs";
import {readLimited, imageOrigins} from "../network.mjs";

function image(attrs = {}, width = 600, height = 900) {
  return {getAttribute: (name) => attrs[name] || null,
    alt: attrs.alt || "", currentSrc: attrs.currentSrc || attrs.src || "",
    naturalWidth: width, naturalHeight: height};
}

function fixture(images, scoped = false, title = "Comic Issue 1") {
  globalThis.document = {title, baseURI: "https://www.zipcomic.com/issue", querySelectorAll: (selector) => {
    if (selector === "[") throw new Error("Invalid selector");
    if (selector === "img") return images;
    if (selector === "#missing") return [];
    if (scoped) return [{contains: (img) => img !== images[0]}];
    return [];
  }};
  globalThis.location = {href: document.baseURI};
}

test("scoped scan preserves order, deduplicates, and uses original lazy URL", () => {
  fixture([image({src: "/logo.png"}), image({"data-src": "//cdn.example/2.jpg", src: "/placeholder.gif"}),
    image({src: "/1.jpg"}), image({src: "/1.jpg#duplicate"}), image({src: "data:image/png;base64,123"})], true);
  const result = collectImages();
  assert.equal(result.scoped, true);
  assert.deepEqual(result.images.map(({url}) => url), ["https://cdn.example/2.jpg", "https://www.zipcomic.com/1.jpg"]);
  assert.ok(result.images.every(({selected}) => selected));
});

test("fallback shows all candidates but selects large or described comic pages", () => {
  fixture([image({src: "/logo.png"}, 64, 64), image({src: "/page.jpg"}),
    image({src: "/lazy.jpg", alt: "Read online comic page 2"}, 0, 0)]);
  assert.deepEqual(collectImages().images.map(({selected}) => selected), [false, true, true]);
});

test("challenges and invalid selectors give actionable errors", () => {
  fixture([], false, "Just a moment...");
  assert.match(collectImages().error, /verification/);
  fixture([]);
  assert.match(collectImages({selector: "["}).error, /Invalid/);
  assert.match(collectImages({selector: "#missing"}).error, /No elements/);
});

test("image URLs use the document base, srcset, and refuse script URLs", () => {
  const first = image({srcset: "small.jpg 400w, ../large.jpg 1600w"});
  fixture([first, image({src: "javascript:alert(1)"})]);
  assert.equal(collectImages().images[0].url, "https://www.zipcomic.com/large.jpg");
  assert.equal(collectImages().images.length, 1);
});

test("bounded network reads reject oversized responses and HTTP failures", async () => {
  assert.deepEqual(await readLimited(new Response(new Uint8Array([1, 2])), 3), new Uint8Array([1, 2]));
  await assert.rejects(readLimited(new Response(new Uint8Array([1, 2, 3])), 2), /limit/);
  await assert.rejects(readLimited(new Response("Denied", {status: 403}), 100), /403/);
});

test("host access is limited to deduplicated detected HTTP(S) hosts", () => {
  assert.deepEqual(imageOrigins([{url: "https://cdn.example/a"}, {url: "https://cdn.example/b"}]), ["https://cdn.example/*"]);
  assert.throws(() => imageOrigins([{url: "file:///secret"}]), /Unsupported/);
});

test("reader request returns original bytes and carries session credentials", async () => {
  const previousFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(options.credentials, "include");
      return new Response(new Uint8Array([1, 2, 3]));
    };
    const result = await fetchInReader("https://cdn.example/page", 10);
    assert.equal(result.base64, "AQID");
    assert.match((await fetchInReader("https://cdn.example/page", 2)).error, /large/);
  } finally { globalThis.fetch = previousFetch; }
});
