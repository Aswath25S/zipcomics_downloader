import {mkdir, readFile, writeFile} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import {createArchive} from "../extension/archive.mjs";

const root = new URL("../", import.meta.url);
const manifest = JSON.parse(await readFile(new URL("extension/manifest.json", root), "utf8"));
const metadata = JSON.parse(await readFile(new URL("extension/package.json", root), "utf8"));
if (manifest.version !== metadata.version) throw new Error("Manifest and package versions must match.");
if (!/^\d+(?:\.\d+){0,3}$/.test(manifest.version)) throw new Error("Invalid extension version.");

// Explicit allowlist keeps tests, virtual environments, and local files out of releases.
const runtime = ["manifest.json", "background.js", "manager.html", "manager.css",
  "manager.mjs", "reader.mjs", "network.mjs", "archive.mjs", "README.md"];
const entries = [];
for (const name of runtime) {
  entries.push({name, data: new Uint8Array(await readFile(new URL(`extension/${name}`, root)))});
}
for (const name of ["LICENSE", "PRIVACY.md", "SECURITY.md"]) {
  entries.push({name, data: new Uint8Array(await readFile(new URL(name, root)))});
}
const archive = createArchive(entries, "cbz");
const destination = new URL(`dist/comic-archive-downloader-${manifest.version}.zip`, root);
await mkdir(new URL("dist/", root), {recursive: true});
await writeFile(destination, new Uint8Array(await archive.arrayBuffer()));
console.log(`Created ${fileURLToPath(destination)}`);
