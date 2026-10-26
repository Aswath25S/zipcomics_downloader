# Contributing

Bug reports, ZipComic reader-layout fixes, documentation, and focused pull
requests are welcome. Please follow the [code of conduct](CODE_OF_CONDUCT.md). For a security
issue, use the reporting process in [SECURITY.md](SECURITY.md).

## Development setup

1. Fork the repository, clone your fork, and create a branch for your change.
2. Install Node.js 24 or newer. If you use nvm, run `nvm use` in the project root.
3. Install `bsdtar` and `unzip` for the archive interoperability tests. On macOS,
   the system tools are sufficient. On Debian/Ubuntu:

   ```sh
   sudo apt-get update
   sudo apt-get install libarchive-tools unzip
   ```

4. Load the `extension` folder as an unpacked extension in Chrome or Brave desktop.

There are no npm dependencies to install and no build step. Python and virtual
environments are not part of the extension's development workflow.

## Make and verify a change

Run these commands from the project root:

```sh
npm --prefix extension run check
npm --prefix extension test
npm --prefix extension run package
```

The package command writes an installable ZIP under `dist/`, containing the
extension runtime files, its user guide, the license, and the privacy policy.
It excludes tests, local environments, and development files. The npm package is
marked `private` to prevent accidental npm publication; the source project is
open source.

For behavior changes, add or update tests that exercise the affected behavior.
The tests use mocked browser APIs and an independent archive reader; they do not
replace browser testing. Reload the unpacked extension and reopen its download
tab after editing files.

The project supports ZipComic/ZipComics only. For manual testing, use a ZipComic
reader you can access normally and images you may save:

- Scan a reader and confirm image order, previews, and selection.
- Save CBR and CBZ archives, then open them in a compatible archive or comic reader.
- Check permission denial, cancellation, a failed image request, and a reader tab
  that navigates after scanning if your change affects those paths.
- Include the browser name and version in your pull request's validation notes.

The extension should request only the permissions it needs. Keep scripts local,
preserve original image bytes, and avoid introducing tracking or remote code.
New external dependencies should have a clear purpose and compatible licensing.

## Pull requests

Describe the concrete problem and the resulting behavior. Include reproduction
steps for a bug, validation results, and screenshots when the interface changes.
Keep unrelated changes in separate pull requests. Match the existing JavaScript
style: ES modules, two-space indentation, semicolons, and double-quoted strings.

For a ZipComic reader-layout report, provide the selector or a minimal HTML
example when possible. Remove cookies, authorization headers, signed URLs, personal data, and
comic image content from diagnostics and fixtures.

## Maintainer release steps

See [docs/RELEASING.md](docs/RELEASING.md) for the first public release and later
updates.
