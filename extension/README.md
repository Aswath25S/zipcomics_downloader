# ZipComics Downloader — Chrome and Brave user guide

Use this ZipComic download extension to create CBR or CBZ archives from images
in the comic reader tab you already have open. ZipComics Downloader runs locally
in Chrome or Brave desktop. It needs no Python, RAR installation, account, or
build step. Its installed browser name is **Comic Archive Downloader**.

## Install

1. Open `chrome://extensions` in Chrome or `brave://extensions` in Brave desktop.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select the folder containing `manifest.json`.
   In a source checkout, this is the `extension` folder. For a release ZIP,
   extract it first and select the extracted folder.
4. Pin **Comic Archive Downloader** in the browser's Extensions menu.

Chrome 116+ or a Brave version based on Chromium 116+ is required. Browser and
site behavior need manual verification; automated tests use mocked browser APIs.

## Save an archive

1. Open an issue reader normally and complete any site verification.
2. Scroll through the comic so its images load.
3. Click the extension icon to open the download tab.
4. Check the previews and selection. Uncheck adverts, logos, or duplicates.
5. Choose CBR or CBZ, set a filename, and click **Download archive**.
6. Allow access to the selected images' hosts if prompted, then choose where to save.

Keep both tabs open until saving finishes. Pages are numbered in their document
order. CBR uses RAR 5 and needs a compatible comic reader. CBZ uses ZIP. Both use
the store method, preserving original bytes without extra compression or quality
loss. JPEG, PNG, GIF, WebP, and AVIF signatures are supported; your comic reader
also needs to support the image format.

## Missing or unrelated images

Load more pages in the reader, then click **Scan reader**. For unfamiliar layouts,
all HTTP(S) image candidates are shown and large or comic-described images are
selected as a starting point. Review the result carefully. You can enter a CSS
selector for the reader container, such as `#readcomic`, and scan again. Scanning
resets your selection.

The extension scans the top document only. It does not follow pagination, issue
links, or cross-origin frames, or extract images from canvas-only readers.

## Access failures and limits

The reader must load normally in your browser. The extension does not solve or
bypass verification. It attempts requests using the reader context, then the
extension context when needed. Browser cookie policies, CORS, and server rules
can still prevent image downloads.

Requests are sequential, with a short delay, one retry, and a 30-second timeout.
Limits are 32 MB per image and 512 MB total selected image data. Save a large
issue as several selections if needed. Cancel waits for any current reader
request to finish. Failed or cancelled runs do not resume, and no partial archive
is saved.

## Privacy

Processing happens locally. The extension requests previews and images from the
URLs in the reader, sometimes using normal session credentials. There is no
analytics, developer upload service, cookie export, or browsing log. Optional
image-host permissions can persist until revoked through the extension's browser
settings. Saved files and download history are managed by your browser.

Packaged releases include LICENSE, PRIVACY.md, and SECURITY.md. In a source
checkout, those policies and contributor instructions are in the repository root.
Reload the extension's browser card and reopen its download tab after updating it.
