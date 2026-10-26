import test from "node:test";
import assert from "node:assert/strict";
import {mkdtemp, writeFile, readFile, rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {execFileSync} from "node:child_process";
import {crc32, createArchive, imageExtension, safeName} from "../archive.mjs";

const png = new Uint8Array(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64"));

test("CRC32 matches the standard vector", () => {
  assert.equal(crc32(new TextEncoder().encode("123456789")), 0xcbf43926);
});

for (const format of ["cbr", "cbz"]) {
  test(`${format} extracts original files with an independent system archive reader`, async () => {
    const folder = await mkdtemp(join(tmpdir(), "comic-extension-"));
    const entries = [{name: "00001.png", data: png},
      {name: "00002-é.png", data: new Uint8Array(20000).fill(65)}];
    try {
      const blob = createArchive(entries, format);
      const archive = join(folder, `comic.${format}`);
      await writeFile(archive, new Uint8Array(await blob.arrayBuffer()));
      const listing = execFileSync("bsdtar", ["-tf", archive], {encoding: "utf8"}).trim().split("\n");
      assert.deepEqual(listing.map((name) => name.normalize("NFC")), entries.map(({name}) => name));
      for (const [index, entry] of entries.entries()) {
        const extracted = execFileSync("bsdtar", ["-xOf", archive, listing[index]]);
        assert.deepEqual(new Uint8Array(extracted), entry.data);
      }
      if (format === "cbz") execFileSync("unzip", ["-t", archive]);
      else assert.deepEqual([...new Uint8Array(await blob.arrayBuffer()).slice(0, 8)], [82, 97, 114, 33, 26, 7, 1, 0]);
    } finally { await rm(folder, {recursive: true, force: true}); }
  });
}

test("archive rejects empty selections, traversal, duplicates, and unknown formats", () => {
  assert.throws(() => createArchive([], "cbr"), /Select/);
  assert.throws(() => createArchive([{name: "../image.jpg", data: png}], "cbr"), /filename/);
  assert.throws(() => createArchive([{name: "a", data: png}, {name: "a", data: png}], "cbz"), /Duplicate/);
  assert.throws(() => createArchive([{name: "a", data: png}], "zip"), /format/);
});

test("image signatures reject HTTP error pages and preserve supported formats", () => {
  assert.equal(imageExtension(png), "png");
  assert.equal(imageExtension(new Uint8Array([255, 216, 255, 0])), "jpg");
  assert.equal(imageExtension(new TextEncoder().encode("GIF89a.....")), "gif");
  assert.equal(imageExtension(new TextEncoder().encode("RIFF0000WEBP")), "webp");
  assert.equal(imageExtension(new TextEncoder().encode("0000ftypavif")), "avif");
  assert.throws(() => imageExtension(new TextEncoder().encode("<html>Access denied")), /error page/);
  assert.equal(safeName("../comic: test?"), ".._comic_ test_");
});

test("manifest references real local assets with no automatic site injection", async () => {
  const root = new URL("../", import.meta.url);
  const manifest = JSON.parse(await readFile(new URL("manifest.json", root), "utf8"));
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.content_scripts, undefined);
  assert.equal(manifest.host_permissions, undefined);
  assert.deepEqual(manifest.permissions, ["activeTab", "scripting", "downloads"]);
  for (const filename of [manifest.background.service_worker, "manager.html", "manager.css", "manager.mjs"]) {
    assert.ok((await readFile(new URL(filename, root))).length > 0);
  }
});
