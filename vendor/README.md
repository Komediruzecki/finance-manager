# vendor/

Third-party packages committed to the repo as tarballs instead of being pulled
from a registry/CDN at install time. Each is referenced from a `package.json`
via a `file:` dependency, so `pnpm install` never needs network access for it
(no CI/deploy dependency on an external host staying up).

## Contents

### `xlsx-0.20.3.tgz` — SheetJS Community Edition (spreadsheet import/export)

|                     |                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------- |
| **Version**         | 0.20.3                                                                                      |
| **SHA-256**         | `8dc73fc3b00203e72d176e85b50938627c7b086e607c682e8d3c22c02bb99fe8`                          |
| **Upstream**        | https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz                                         |
| **Package license** | Apache-2.0                                                                                  |
| **Referenced by**   | `frontend/package.json`, `worker/package.json` — `"xlsx": "file:../vendor/xlsx-0.20.3.tgz"` |

**Why it's vendored:** SheetJS stopped publishing `xlsx` to npm after 0.18.5,
and that frozen version carries two advisories — prototype pollution
(CVE-2023-30533) and ReDoS (CVE-2024-22363). The patched builds (0.19.3 /
0.20.x) ship **only** from `cdn.sheetjs.com`, so the fix is a tarball rather than
an npm version bump. Committing the tarball here gives us the patched build
without depending on that CDN at install time.

## Updating a vendored package

Using `xlsx` as the example (replace `<new>` with the target version):

1. Download the new tarball:
   ```sh
   curl -fsSL -o vendor/xlsx-<new>.tgz https://cdn.sheetjs.com/xlsx-<new>/xlsx-<new>.tgz
   ```
2. Record its checksum and update the table above:
   ```sh
   sha256sum vendor/xlsx-<new>.tgz
   ```
3. Bump the path in **every** referencing `package.json` (`frontend/`, `worker/`)
   to `file:../vendor/xlsx-<new>.tgz`.
4. Reinstall and verify the resolved version:
   ```sh
   pnpm -C frontend install                      # workspace member
   pnpm -C worker  install --ignore-workspace    # standalone
   node -e "console.log(require('./frontend/node_modules/xlsx/package.json').version)"
   ```
5. Delete the old `.tgz`, then commit the new tarball + the `package.json` +
   this README together.
