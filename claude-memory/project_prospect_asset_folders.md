---
name: project-prospect-asset-folders
description: "Founder directive 2026-07-28 - every prospect asset goes in output/prospect-assets/{ig-handle}/, one folder per prospect"
metadata: 
  node_type: memory
  type: project
  originSessionId: d0a1e83b-23b7-45e9-82f1-3c3853f07418
  modified: 2026-07-29T03:22:09.348Z
---

All prospect assets live under `output/prospect-assets/`, one folder per prospect, folder named for their Instagram handle **without the `@`** (`acp1re`, not `@acp1re`).

Keep together in that folder: the build script, the `.docx` that gets sent, the `.pdf` it was rendered to, and the page `.png`s that were read. The render is not scratch - it is the proof the doc was checked, which the doc standard requires. Filenames keep the handle prefix because the docx gets uploaded to Drive where the folder name disappears.

FITFO builds stay at `output/` root: `wiki/playbooks/prospect-asset-doc-standard.md` names `output/fitfo-doc-build-short.js` as the canonical implementation to copy, so moving it breaks that reference.

**Build gotcha:** `docx` is not installed in the repo and there is no `package.json`. Install it into the session scratchpad and run with `NODE_PATH` pointed there, so `node_modules` never lands in the vault. Rebuilding changes the docx hash even with identical content (embedded timestamp), so re-export the PDF after any rebuild or the PDF on disk no longer describes the shipped file.

Convention written up in `output/prospect-assets/README.md` and in the doc standard. See [[project-instagram-project]] for the outreach pipeline these feed.
