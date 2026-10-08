# Carousel examination and shared production packet

76 carousel files opened individually on 2026-10-08. 75 full captures, one broken fragment. Eight stored directories, nine visual families. Original files remain in raw-sources and are linked directly, never modified. The existing 57-story examination supplies complementary techniques; this pass does not claim those 57 files were freshly reopened.

Read [the complete examination](../../wiki/synthesis/carousel-reference-forensic-audit-2026-10-08.md), [the shared Markdown profile](../../wiki/content-engine/reference-replication-profile.md) and [the SOP/app contract](../../wiki/playbooks/reference-replication-sop.md). Open [the visual atlas](atlas.html) to inspect every original beside its notes. Filters work locally; source images and findings may contain private business details, so this reader is a local artifact, not a public site.

The portable [JSON profile](../../wiki/content-engine/reference-replication-profile.json) contains all 76 individual entries, nine families, sixteen component roles and fourteen anchored recipes. Estimated geometry is labeled; exact source fonts/layers and absent data are not invented. [Profile schema](../../wiki/content-engine/reference-replication-profile.schema.json).

The [job schema](job.schema.json), [template](job-template.json) and [preflight validator](validate_job.py) make the proposed app handoff concrete. The template is intentionally unbound: bind actual photo, alpha mask, permitted font and final copy before rendering. It passes structure validation and fails asset-ready preflight. This is not a new carousel/story output or a live app integration. JSON alone cannot guarantee 100% pixel identity from a flattened source and replacement assets.

## Files

- observations.tsv: manually authored per-image visual/copy/transfer examination.
- observations.json: portable version of those notes.
- manifest.json: every source path, dimension, hash, family and evidence status.
- color-samples.json: reproducible source-raster accent candidates, sample regions/method and counts; not recovered native brand tokens.
- atlas.html: searchable local full-source reader, responsive desktop/mobile.
- build_audit.py: derives manifest, reader, report ledger and profile/schema from the recorded review. It does not perform or claim a new visual examination when rerun.
- build_contract.py: creates the operational scene schema and unbound template.
- validate_job.py: structural and semantic preflight; local hashes, asset dimensions, mask binding/transform, layering, references, proof arithmetic, graph ports/data and safe-region checks.
- check_contract.py: positive/negative checks, full source hash comparison and recipe-anchor verification.
- check_atlas.cjs: browser checks and desktop/mobile review captures.
- contract-verification.json / atlas-verification.json: actual check results.
- atlas-desktop.png / atlas-mobile.png / atlas-mobile-card.png: reader QA evidence.

## Rebuild and validate

Use Python with Pillow and jsonschema. The audit builder needs only Pillow; the preflight/checker also needs jsonschema. If absent, install them into a chosen environment with `python -m pip install Pillow jsonschema`. The check in this session used an isolated temporary jsonschema dependency directory, rather than adding dependency files to this repository.

```powershell
python output/carousel-reference-audit-2026-10-08/build_audit.py
python output/carousel-reference-audit-2026-10-08/build_contract.py
python output/carousel-reference-audit-2026-10-08/check_contract.py
python output/carousel-reference-audit-2026-10-08/validate_job.py output/carousel-reference-audit-2026-10-08/job-template.json --schema-only
```

Without `--schema-only`, the template intentionally exits nonzero and names its missing actual asset files. Passing preflight does not validate mask appearance, real font parsing, proof authenticity or artistic quality. The SOP requires rendered visual checks and claim review.

The browser checker currently uses the bundled Codex Node/Playwright path and installed Edge on this host. On another host, set those runtime/browser locations accordingly. No browser automation touches a source image.

## Shared doctrine changes

Updated story/carousel SOPs and frameworks, story reference standard, shared design-system scope, wiki index/log and shared visual-reference memory. Older blur/mirrored top-fill engine notes remain labeled historical/disabled. Active highlight copy, brand choices and banned-photo constraints survive. Live app renderer/API integration is a separate implementation stage described concretely in the SOP.

[Complete changed-file inventory](changed-files.md) lists every new or edited file in this task. The founder's newly supplied raw folders existed at session start and were preserved unchanged.
