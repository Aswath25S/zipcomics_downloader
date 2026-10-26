# ZipComics Downloader — ZipComic download extension

**ZipComics Downloader** is a free, open-source **ZipComic download** extension for
Chrome and Brave. Save page images from an open ZipComic reader as a **CBR or CBZ
archive**: review the images, choose a format, and download one file for your comic
reader.

The project is named `zipcomics_downloader` on GitHub. It is designed for ZipComic
pages and compatible image-based comic readers, with all archive processing in
your browser. Site access and reader layouts still need manual verification.
There is no external service, npm dependency, or build step.

[Download the source ZIP](https://github.com/Aswath25S/zipcomics_downloader/archive/refs/heads/main.zip)
· [Installation](#installation)
· [Download instructions](#how-to-download-comics-from-zipcomic)
· [MIT license](LICENSE)

## Features

- Collect page images from the reader you already have open.
- Recognize common reader containers and lazy-loaded image attributes.
- Preview pages, exclude unwanted images, and preserve their order in the document.
- Use a CSS container selector when automatic reader detection needs help.
- Export genuine RAR 5 CBR files or ZIP-based CBZ files with padded page numbers.
- Keep the original image bytes, with progress, cancellation, and bounded downloads.

Both formats use the **store** method: images are archived without additional
compression or quality loss. No Python or RAR executable is required.

## Browser compatibility

The extension targets desktop Chromium browsers with Manifest V3 support:

| Browser | Requirement |
| --- | --- |
| Google Chrome | Version 116 or newer. |
| Brave desktop | A current version based on Chromium 116 or newer. |

Automated tests cover JavaScript behavior with mocked browser APIs and archive
interoperability. End-to-end browser behavior and individual reader sites need
manual verification. Firefox, Safari, and mobile browsers are not supported by
this build.

## Installation

1. [Download ZipComics Downloader](https://github.com/Aswath25S/zipcomics_downloader/archive/refs/heads/main.zip)
   and extract it, or clone this repository with Git.
2. Open `chrome://extensions` in Chrome or `brave://extensions` in Brave.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the repository's `extension` folder, which
   contains `manifest.json`.
5. Pin **Comic Archive Downloader** (the extension's installed name) from your
   browser's Extensions menu.

For a packaged release ZIP, extract it and select the extracted folder containing
`manifest.json` instead. Installation is manual; there is no browser-store listing.

## How to download comics from ZipComic

1. Open a ZipComic issue or compatible reader page in your normal browser and
   complete any site verification.
2. Scroll through the entire comic so the reader has loaded its images.
3. Click the extension icon. A separate download tab opens and scans the reader.
4. Review the previews and selected pages. Exclude adverts, thumbnails, and duplicates.
5. Choose **CBR** or **CBZ** and edit the filename if needed.
6. Click **Download archive**, allow access to the image hosts if prompted, and
   choose where to save the file.

Keep the original reader and the download tab open until saving finishes. Archive
entries are named `00001.jpg`, `00002.png`, and so on, in the selected document
order. For the full user guide, see [extension/README.md](extension/README.md).

### Formats

| Format | Archive type | Reader requirement |
| --- | --- | --- |
| CBR | RAR 5, store method | A comic reader that supports RAR 5. |
| CBZ | ZIP, store method | A comic reader that supports CBZ/ZIP. |

Supported image signatures are JPEG, PNG, GIF, WebP, and AVIF. Whether a particular
comic reader can display an image format depends on that reader.

## ZipComic download FAQ

### Can I download a ZipComic issue as CBR or CBZ?

The extension collects the image URLs present in your open issue reader and
packages the selected images into a CBR or CBZ archive. The reader and image URLs
must be accessible in your browser session. Choose CBZ if your comic reader does
not support RAR 5 archives.

### Does ZipComics Downloader work in Brave?

The extension targets Chrome and Brave desktop. In Brave, install it through
`brave://extensions` using **Load unpacked**. No separate downloader application
is needed. Automated tests use mocked browser APIs; verify behavior in your
browser and with the reader you use.

### Does it download every issue in a series?

It downloads selected images from the current reader page. It does not crawl a
series, follow issue links, or advance through pagination. Open and load each
issue you want to save before scanning it.

## Troubleshooting and limits

| Symptom | What to try |
| --- | --- |
| Missing pages | Return to the reader, load more images, then click **Scan reader**. |
| Logos or unrelated images are selected | Review the selection or enter a reader container selector such as `#readcomic`. |
| Verification keeps repeating | Check that the page loads normally in your browser before using the extension. It does not solve or bypass verification. |
| Image download fails | Confirm access to the image host and any requested permissions. The server or browser policy may still deny the request. |
| Reader changed after scanning | Scan the reader again. Reopen the extension from the reader if access was lost. |
| Large issue exceeds the limit | Save smaller selections as separate archives. |

Scanning reads HTTP(S) image URLs from the top document. It does not follow
pagination or issue links, scan cross-origin frames, capture canvas-only readers,
or infer reading order when it differs from document order. Scanning again resets
selection. Failure or cancellation does not resume on the next attempt.

Downloads are sequential with a short delay and one retry. Each request has a
30-second timeout. Limits are **32 MB per image** and **512 MB total selected image
data**; actual memory use can be higher during archive creation. Cancellation may
wait for the current reader request to finish. A failed run does not save a
partial archive.

## Permissions and privacy

The extension requests `activeTab`, `scripting`, and `downloads`. Optional host
access is requested for selected images' detected hosts when downloading; broad
host access is not granted at installation. Granted optional host permissions can
persist until removed in the browser's extension settings.

Reader data and archive contents are processed in the extension tab. Image
previews and downloads contact the page's image hosts and may use normal browser
session credentials. There is no analytics, account, developer backend, cookie
export, or remote JavaScript. Saved archives and browser-managed caches/history
remain under your control. See [PRIVACY.md](PRIVACY.md) for details.

## Development

Use **Node.js 24+**, `bsdtar`, and `unzip`. macOS includes the archive tools. On
Debian/Ubuntu, install `libarchive-tools` and `unzip`. No `npm install` is required.

From the repository root:

```sh
npm --prefix extension run check
npm --prefix extension test
npm --prefix extension run package
```

The package command creates `dist/comic-archive-downloader-1.0.0.zip`, using the
version in the manifest. It includes runtime files and user/legal documentation,
while excluding tests, local environments, and repository metadata. Generated
archives and local environments are ignored by Git.

After editing, click **Reload** on the extension's browser card and reopen its
download tab. GitHub Actions runs checks, tests, and packaging on Linux and macOS. See
[CONTRIBUTING.md](CONTRIBUTING.md) for development and manual testing guidance.

## Contributing and support

Use repository issues for bug reports and feature requests. Include your browser
and extension versions, reproduction steps, and sanitized errors. Pull requests
are welcome; please follow [CONTRIBUTING.md](CONTRIBUTING.md) and the
[code of conduct](CODE_OF_CONDUCT.md).

Report vulnerabilities through the process in [SECURITY.md](SECURITY.md).
Maintainers can follow [the release guide](docs/RELEASING.md) before publishing.
Changes are recorded in [CHANGELOG.md](CHANGELOG.md).

## License

[MIT](LICENSE). The license covers this project's software; downloaded content
retains its original copyright. Save content you have permission to download.
