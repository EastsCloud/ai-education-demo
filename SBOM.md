# Software Bill Of Materials

Snapshot: `1.0.0-semi-ai-mvp`, 2026-09-08.

| Component | Version | Purpose | Distribution note |
| --- | --- | --- | --- |
| AI Education source | 1.0.0 | Product application | Internal evaluation package |
| Node.js | 24 or newer | HTTP server, crypto, test runner | External runtime; not bundled |
| `node:sqlite` | Included with Node.js | Local SQLite access | Part of Node.js runtime |
| Browser Web APIs | Modern browser | UI, fetch and local fallback | External runtime; not bundled |

No npm, pnpm or other third-party application packages are declared in `package.json` for this snapshot.

This is a human-readable development SBOM, not a signed SPDX or CycloneDX attestation. Production release engineering should generate a machine-readable SBOM from the actual build image, include operating-system packages, scan it for vulnerabilities and sign the final artifact.

