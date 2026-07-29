---
name: project-prospect-asset-folders
description: "Founder directive 2026-07-28 - every prospect asset goes in C:\\Users\\Abdullah\\Desktop\\Prospect Assets\\{ig-handle}\\, on the DESKTOP not in the vault"
metadata: 
  node_type: memory
  type: project
  originSessionId: d0a1e83b-23b7-45e9-82f1-3c3853f07418
  modified: 2026-07-29T03:31:18.994Z
---

All prospect assets live in **`C:\Users\Abdullah\Desktop\Prospect Assets\`** - on the DESKTOP, not in the repo. One folder per prospect, named for their Instagram handle **without the `@`** (`acp1re`, not `@acp1re`). Desktop folder naming is Title Case to match his existing ones (`FITFO Packaging`, `Cowork Basement Pulsify`).

Reason: he grabs the docx and uploads it to Drive, so digging through the repo is friction on the step that has to be fast.

⚠️ Consequence: that folder is OUTSIDE the vault autosync backup. Build scripts are the part worth protecting since any docx rebuilds from one.

Keep together in that folder: the build script, the `.docx` that gets sent, the `.pdf` it was rendered to, and the page `.png`s that were read. The render is not scratch - it is the proof the doc was checked, which the doc standard requires. Filenames keep the handle prefix because the docx gets uploaded to Drive where the folder name disappears.

FITFO builds stay at `output/` root: `wiki/playbooks/prospect-asset-doc-standard.md` names `output/fitfo-doc-build-short.js` as the canonical implementation to copy, so moving it breaks that reference.

**Build gotcha:** `docx` is not installed in the repo and there is no `package.json`. Install it into the session scratchpad and run with `NODE_PATH` pointed there, so `node_modules` never lands in the vault. Rebuilding changes the docx hash even with identical content (embedded timestamp), so re-export the PDF after any rebuild or the PDF on disk no longer describes the shipped file.

Convention written up in `Desktop\Prospect Assets\README.md` and in the doc standard's "Where it lives" section. See [[project-instagram-project]] for the outreach pipeline these feed.
