# Privacy policy

This policy describes the extension source included in this repository. Modified
builds may behave differently.

## Data used

When you click the extension icon, it reads the title, URL, image URLs, image
descriptions, and dimensions from that reader tab. The download tab displays image
previews and your selection, filename, and download progress. To create an archive,
the extension requests the selected image URLs and holds the response bytes in
memory.

The extension does not collect analytics, create an account, upload archives to a
developer service, export cookies, or keep a browsing log. There is no developer
backend or remotely loaded JavaScript.

## Network requests and browser credentials

Preview images and selected pages are requested from the image URLs found in the
reader. Those sites receive normal request information such as your IP address
and browser headers. Requests may use your existing session credentials when
browser cookie and security policies permit. The extension does not read cookie
values through the browser's cookies API.

It first attempts selected-image requests in the reader context, then can retry
from the extension context. Browser settings and server rules can affect whether
those requests succeed. Third-party sites have their own privacy practices.

## Permissions

| Permission | Purpose |
| --- | --- |
| `activeTab` | Temporary access to the reader tab where you invoke the extension. |
| `scripting` | Read the reader's image information and attempt image requests in that tab. |
| `downloads` | Save the archive and observe its download status. |
| Optional HTTP(S) host access | Request selected images from their detected hosts when needed. |

The manifest allows requesting HTTP(S) hosts, but no permanent host access is
granted at installation. When you download, Chrome or Brave may ask you to allow
the selected images' hosts. Granted optional permissions can persist until you
remove them in the browser's extension settings or uninstall the extension.

## Retention and control

The current page list and archive data are held in the download tab's memory.
Closing that tab releases its in-memory data. Saved archives and entries in the
browser's download history remain under your control and are not removed when
the extension is closed or uninstalled. Browser caches and image-server logs are
managed by the browser and the sites that receive requests.

To ask about this policy, open a repository issue without sensitive information.
Use [SECURITY.md](SECURITY.md) for a security concern.
