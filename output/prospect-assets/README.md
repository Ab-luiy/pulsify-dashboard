# Prospect assets

Founder directive, 2026-07-28: every prospect asset lives in its own folder here, and the folder is named for the prospect's Instagram handle.

```
output/prospect-assets/
├── acp1re/
│   ├── acp1re-doc-build.js      the build script
│   ├── acp1re-the-door.docx     what gets sent
│   ├── acp1re-the-door.pdf      the render it was checked against
│   └── acp1re-p01.png ...       the pages that were actually read
└── {handle}/
```

## Rules

1. **Folder name is the handle, no `@`.** `acp1re`, not `@acp1re`. The symbol breaks tooling and paths for no benefit.
2. **Filenames keep the handle prefix.** The docx gets uploaded to Drive and shared, where the folder name is gone and `the-door.docx` means nothing.
3. **Everything for one prospect stays together**: build script, docx, the PDF it was rendered to, and the page PNGs that were read. The render is not a scratch artifact. It is the evidence the document was checked, which [[playbooks/prospect-asset-doc-standard]] requires.
4. **Ship the file you rendered.** A docx embeds a build timestamp, so its hash changes on every run even when the content does not. If you rebuild, re-export the PDF too, or the PDF on disk no longer describes the file being sent.

## Build note

`docx` is not installed in this repo and there is no `package.json`. As of 2026-07-28 it was installed into the session scratchpad and the build run with `NODE_PATH` pointed at it, which keeps `node_modules` out of the vault:

```bash
npm install docx --prefix <scratchpad>
NODE_PATH=<scratchpad>/node_modules node output/prospect-assets/{handle}/{handle}-doc-build.js output/prospect-assets/{handle}/{handle}-{name}.docx
```

The FITFO builds stay at `output/` root. [[playbooks/prospect-asset-doc-standard]] names `output/fitfo-doc-build-short.js` as the canonical implementation to copy, and moving it would break that reference.
