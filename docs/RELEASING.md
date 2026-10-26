# Release guide

## Prepare the public repository

1. Review the MIT license and contributor copyright notice in `LICENSE`.
2. Create the public repository and push the source, documentation, and `.github`
   configuration. Do not include `venv`, generated archives, downloaded comics,
   credentials, or browser session data; these local files are ignored by Git.
3. Enable **Private vulnerability reporting** in the repository's security
   settings. Verify that **Report a vulnerability** is available under the
   repository's Security advisories.
4. Provide a private contact method on a maintainer profile for security and
   conduct concerns. Review `SECURITY.md` and `CODE_OF_CONDUCT.md` so their reporting
   instructions match the contact methods you make available.
5. Enable GitHub Actions and confirm the CI workflow passes. Use the required CI
   checks in branch protection if you choose to protect the default branch.

No repository URL or maintainer email is hardcoded in the source. Add repository
metadata or links later if you want them. Files alone do not create a GitHub
repository, enable its settings, or publish a release.

## Validate a release

1. Set the same version in `extension/manifest.json` and
   `extension/package.json`. Use a numeric Chrome extension version such as
   `1.0.0`. The package script rejects mismatched versions.
2. Turn `CHANGELOG.md`'s relevant Unreleased entries into a versioned section
   with the actual release date.
3. Run from the repository root:

   ```sh
   npm --prefix extension run check
   npm --prefix extension test
   npm --prefix extension run package
   ```

4. Extract the ZIP generated in `dist/`. Load that extracted folder as an unpacked
   extension, so you test the release contents as well as the source checkout.
5. Test the reader scan, selection, CBR and CBZ downloads, denied permissions, and
   cancellation. Open both archives with a compatible reader and verify page
   order. Check in Chrome and Brave and record the versions and results.
6. Confirm the package includes LICENSE, PRIVACY.md, and SECURITY.md and excludes
   tests, local environments, signed image URLs, and user data. Re-run packaging
   if source or documentation changed during verification.

The test suite validates JavaScript behavior and archive interoperability. CI
uses Linux and macOS; it does not install the extension into a real browser or
verify live access to ZipComic.

## Publish

Create a version tag and GitHub release only after validation. Attach the
generated versioned ZIP and release notes from the changelog. Tell users to
extract the ZIP and select its folder through **Load unpacked**. Publishing to a
browser store is a separate process and is not automated by this repository.

Record known browser or ZipComic reader limitations in the release notes. Open
a new Unreleased section for future changes.
