# @agenstra/release-integrity

Nx project **`release-integrity`**: hashes **Electron Forge** build artifacts and writes checksum files next to them (default `out/make`). Used after `electron-forge make` so releases ship with verifiable integrity (repo root **`SECURITY.md`**).

## Outputs

In the chosen directory:

- **`SHA256SUMS`** — GNU `sha256sum` format (`<hex>  <path>`, two spaces)
- **`integrity-manifest.json`** — same digests in JSON (`schemaVersion`, `algorithm`, `generatedAt`, `artifacts[]`)

## Usage

**Nx:**

```bash
nx run release-integrity:build
nx run release-integrity:test
```

**CLI** (after build):

```bash
node tools/release-integrity/dist/src/cli.js
node tools/release-integrity/dist/src/cli.js --input path/to/make/output
```

- Default input: **`out/make`** (relative to cwd), or **`RELEASE_INTEGRITY_INPUT`** / **`DESKTOP_RELEASE_INTEGRITY_INPUT`** (legacy).

**TypeScript** (same package name):

```typescript
import { buildIntegrityArtifactsForDirectory } from '@agenstra/release-integrity';
```

## Note

Checksums detect tampering or corruption; they do not replace OS code signing. See **`SECURITY.md`**.
