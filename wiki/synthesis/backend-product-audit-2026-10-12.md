---
type: synthesis
tags: [content, offer, funnel, product, data, delivery]
sources: [[playbooks/engineering-standard]], [[synthesis/mvp-readiness-and-pricing-2026-10-12]], [[playbooks/client-app-content-sop]], [[playbooks/story-sequence-client-flow]]
created: 2026-10-12
updated: 2026-10-12
---

# Backend and product organization audit

The main problem is fragmented ownership of data and work. The app has working authentication, client isolation, approval flows and integrations, but images, proof, projects, schedules and settings use different records and update rules. Tidying the menus alone will leave the underlying inconsistencies. Ticket: https://github.com/Ab-luiy/pulsify-saas/issues/61. This is a targeted code and workflow audit, not a completed penetration test or verification of every screen.

## Why this matters for Pulsify

Content production depends on finding the right asset and current approved version. The managed offer depends on reliable delivery and clear ownership. Funnel reporting depends on fresh, attributable events. Each needs stable records shared across screens, visible progress and errors, and controls appropriate to the data. Adding more generators before resolving these problems adds more places for work to disagree.

## Core mechanics

### Confirmed findings and risk order

| Priority | Finding | Evidence and consequence | Required action |
|---|---|---|---|
| High, security | Public image handler could serve private storage objects | `functions/m/[[key]].js` accepted arbitrary R2 keys except operator photos. `archive.js` writes workspace exports and `voice-note.js` writes recordings into the same bucket. Synthetic private archive regression returned 200 before the fix. No real private object was requested publicly and no exploitation is established. | Restrict to the public upload namespace and image content types. Patch and regression prepared in this task; release evidence recorded below. |
| High, integrity | Saving the operator proof field can remove library records and replace their IDs | `client-brain.js:saveOperatorField` deletes all proof_items for that client, then inserts the submitted list. `media-upload.js` also stores ordinary uploaded images in proof_items. Folder and order maps refer to those IDs. Existing comments already acknowledge the replacement risk for onboarding. | Separate assets from proof assertions. Until migrated, update proof records by stable IDs and explicit removal, with concurrency checks. Do not bulk rewrite live client data during the audit. |
| High, privacy design | Client uploaded originals are public to anyone holding the URL | `/m/client/UUID.image` and legacy `/media/id` intentionally serve publicly, with one-year cache headers. Login protects the list, not an image URL once shared. Operator photos have an authenticated route. | Explicit private/shared/published visibility. Private originals require workspace authorization; only deliberate published derivatives become public. Audit consumers before changing URLs so public funnels do not break. The immediate namespace fix does not implement this larger access model. |
| High for recovery commitments | Archive/restore is not disaster recovery | `archive.js` exports rows with a direct client/client_id column and references to R2 files. It does not package R2 image/audio bytes, and restore mainly restores workspace status; it does not import a destroyed database. | Define database plus object recovery, retention and manifest; rehearse restore in an isolated environment. Keep operator archive, customer export and disaster recovery as distinct operations. This audit does not establish that provider backups are absent. |
| Medium-high, reliability | Monitoring itself failed to query D1 | Existing connector_health.py failed authentication from the deploy working directory. Identical root query with explicit config succeeded. | Corrected runner to use the vault root and explicit Wrangler config. Verify the scheduled wrapper reports a runner failure as well as failed jobs. The wrapper/desktop notification was not exercised here. |
| Medium-high, data quality | Recent sync repairs are not equivalent to all integrations being verified | Fresh report at 08:30 UTC: eight monitored jobs current; YouTube still shows its last historical success about 308 hours earlier, weekly lead scrape has no recorded success. Claude deployed fixes shortly before the audit; these two have not yet produced confirming success rows. | Verify their next successful run and inspect delivered data. Show last successful data timestamp per client/source in the UI. Do not label historical errors as proof that the new code failed. |
| Medium, concurrency | Folder and order writes can overwrite another browser's work | Folder assignments are a single JSON preference, updated by replacement with no version condition. Upload and folder save are separate calls. The frontend optimistically updates the cache and does not roll it back on error. | Folder membership belongs on asset records. Upload and membership commit together; batch moves update only chosen IDs; use version checks, rollback or an explicit unsaved state. |
| Medium, workflow | Review and calendar can disagree | `content-reviews.js:syncContentItem` matches a content item by client + platform + title and catches failures silently. Two projects with one title can map to one item; renaming can create another. | Stable content/project ID across drafting, review, calendar and published results. Retryable sync or a shared canonical record. Approval state must refer to a specific revision. |
| Medium, usability | The image library forces proof language onto ordinary assets | MediaScreen uses claim for card title, image alt text, modal heading and visible caption. Permission status appears under every image; the modal repeats the caption. Batch upload uses one Claim caption for every selected image. | Plain filename/title in the grid; optional details panel for notes and usage rights. No automatic image explanation. Keep useful alt text separate from visible description. |
| Medium, performance | Browsing fetches more data than it needs | Client media comes through client-brain, including all proof items. workspace-records selects every record for the client. Operator photos paginate, but grid images use full originals. | Dedicated asset listing with cursor pagination, scoped search, thumbnails and lazy loading. Bounded project lists. Keep full brain context and original downloads off the default browse path. |
| Medium, product clarity | Similar tasks have multiple entry points and data stores | Operator photos, client media/proof, thumbnail references and generated designs have separate implementations. Content also spans workspace_records, studio_sequences, content_reviews, content_items and workspace preferences. | Shared resource services and pickers with clear workspace/ownership filters. Consolidation must preserve privacy and distinguish source files, reference examples and final deliverables. |
| Medium, change safety | Deployment and documentation still span two repositories | Frontend main is in pulsify-saas; live Pages source in Brain; #58 staged copy requires manual re-copy of fixes. Migration docs retain older descriptions of screens that have moved. | Finish the already planned one-repo cutover with parity and rollback checks; then one release manifest for frontend, API and schema. Moving to TypeScript alone will not repair incorrect data relationships. |

Existing safeguards matter: signed-in tenant resolution, denied cross-workspace queries, read-only operator previews, upload signature and size checks, operator-photo access control, version checks on workspace_records, a webhook outbox with retries, and logged sync runs already exist. Extend these patterns; do not rebuild every backend endpoint.

### Image library: the first complete product slice

The founder's feedback is that images should be easy to browse and use, without unsolicited explanations. The exact example could be the client image library or YouTube's fanned reference folders; a clarification was requested. Source inspection confirms explanatory copy in both. The operator library is a third implementation. No claim is made that the precise visual bug was reproduced: live operator inspection reached sign-in, and no authenticated operator browser session was available.

Proposed behavior:

1. Open Library to folders and a search field. A folder shows its name, count and preview. Clicking opens its contents with a breadcrumb; browser Back restores the previous folder and scroll position. A fan animation can stay if it does not hide the action or slow browsing.
2. The grid primarily shows images and short filenames/titles. Notes, captions, rights, dimensions and source attribution appear in an optional detail panel. Reference-learning guidance sits behind a deliberate action, not between the user and their files.
3. Upload directly to the selected folder. Show individual progress, retry failed files and commit folder placement with the asset. Keep names per file. No shared mandatory claim caption.
4. Support select-many, move, rename, sort and archive/restore. Search by filename and user-added tags; no automatic descriptive essays. Warn about usage before removing an asset referenced by a project.
5. Use the same picker in stories, thumbnails and other editors. Selecting an image stores its asset ID and intended variant. Show where an asset is used. Store edits/crops separately from the original.
6. Empty, loading, failed, unsaved and completed states must be distinguishable. A failed folder save must not look permanent. Keyboard and mobile flows are part of acceptance.

Minimum acceptance: refresh retains folder and order; two tabs cannot silently overwrite each other's move; saving proof cannot change library IDs; search and folder navigation handle hundreds of assets through pagination; missing images have recoverable states; private files fail unauthorized reads; published files remain usable where deliberately shared; no extra visible image explanation unless the user opens details.

### Data organization to build toward

| Resource | Owns | Must not double as |
|---|---|---|
| Workspace/client | Membership, brand context, offer, integration ownership | A browser-selected authority value |
| Asset | Stable ID, owner, storage key, original filename, MIME, dimensions, hash, visibility, folder, archive state | A marketing claim |
| Asset variant | Thumbnail, crop, export and parent asset ID | Another unrelated upload |
| Proof assertion | Claim, supporting asset IDs, source, permission, verification | Every portrait or background image |
| Content project and revision | Brief, channel, selected assets, current version, owner, due date | A title used as a database identifier |
| Review decision | Exact revision, reviewer, decision, required changes | Approval of whatever happens to be in the editor later |
| Published content | Platform ID/URL, publication time, originating project | A manually copied calendar row |
| Contact/opportunity | Contact identity, pipeline, conversations, booking/outcome references | Independent copies in every funnel screen |
| Integration and job run | Account, scope, last attempt, last successful data, error, retry state | A green badge merely because a key exists |
| Metric/event | Source, external ID, event time, observation time, attribution/version | A number with no freshness or provenance |

Use one shared backend contract per resource and one set of frontend cache keys. Keep storage implementation behind resource services. Add schema constraints, indexes, idempotency and audit history where state transitions require them. Use the existing outbox pattern for recoverable background work rather than adding another automation platform.

### Simpler navigation and flow

Proposed client destinations: Home (next action and blockers), Work (projects, calendar, reviews), Library (assets and brand material), Results (content, funnel and collections), Settings (team, accounts and preferences). Platform-specific views remain filters/tabs inside Work and Results, with links preserving the current workspace and project.

Operator destinations can use Today, Clients, Leads/Inbox, Delivery, Library and Operations. Do not force the operator and client menus to be identical. The operator needs retries, approval queues and cross-client views; the client needs their work and the next action.

Every workflow should answer: what am I making, what information is already available, what is missing, who acts next, what was saved, and where do I see the result. A shared project page should connect brief, assets, draft, review and publication instead of requiring the user to find each stage independently.

### Implementation order and acceptance

| Phase | Deliverable | Completion evidence |
|---|---|---|
| 0 | Close public-storage escape and repair monitoring invocation | Failing-before/passing-after regression, existing media compatibility, preview and production smoke evidence |
| 1 | One dependable asset library | Stable IDs, assets separated from claims, atomic upload/folder placement, optional details, shared picker, move/search/archive and race tests |
| 2 | One content lifecycle | One project ID links draft/revision/review/calendar/publication; a rename cannot duplicate the project; retryable background sync |
| 3 | Operational visibility | Per-client source freshness, job failure/retry view, dead-letter handling, idempotent provider events, reconciliation of metrics/payments |
| 4 | Recovery and release discipline | Restore rehearsal including objects, schema migration ledger, audited changes, one-repo deployment, contract tests for critical flows |

Phases 3 and 4's safeguards start alongside Phase 1 where necessary; this order is not permission to defer known access or data-loss risks. No blanket rewrite, new database vendor, new AI agent or additional paid service is justified by this audit. Ship each slice with data-preserving migration and rollback steps.

## How Pulsify uses this

Use #61 as the parent cleanup plan and split implementation by the completion evidence above. Start with Library because it has a concrete founder complaint and exposes the asset/proof boundary. Then consolidate the content lifecycle. Make each improvement remove a task, a duplicate entry or a failure mode. Do not evaluate success by the number of new screens.

## Connections

- [[synthesis/mvp-readiness-and-pricing-2026-10-12]] — working flows and remaining launch gates; this audit adds structural findings.
- [[playbooks/engineering-standard]] — shared contracts and one-repo target, not a substitute for domain design.
- [[playbooks/client-app-content-sop]] — intended production-to-publication workflow.
- [[playbooks/story-sequence-client-flow]] — shared assets must be easy to use within the story editor.

## Open questions / gaps

- Exact library surface behind the founder's visual complaint; no UI behavior has been silently redesigned in this audit.
- Production evidence of newly repaired YouTube and lead-scrape jobs, per-client integrations and real output quality.
- Real media inventory and which assets must remain publicly reachable before changing client-original access rules.
- Actual disaster-recovery configuration, retention and a restore rehearsal. Workspace unarchive is not proof of disaster recovery.
- Public cache exposure before the namespace fix has not been assessed. No inference of a breach from the code defect alone.

## Source trail

- Founder request in this chat, October 12, including unwanted image descriptions and fragmented usage.
- Backend inspected: functions/m/[[key]].js, api/{media-upload,media,operator-photos,client-brain,media-order,workspace-preferences,workspace-records,content-reviews,workspace-archive}.js, _shared/{archive,media-storage,client-brain-context,outbound-webhooks,image-upload}.js, _middleware.js, workers/sync/src/index.js and tools/connector_health.py.
- Frontend main: src/features/portal-youtube/{media-screen,gallery-screen,parts,queries}, src/features/photos/photos-screen.tsx, portal-home/queries.ts, portal/nav.ts, components/shell/nav.ts, lib/api/portal-youtube.ts and docs/MIGRATION.md. All paths relative to the respective production-source repositories.
- Shared agent log: October 12 sync repairs and earlier release/migration state. Current logs take precedence over stale migration summaries.
- Reproduction and release evidence: output/backend-audit-2026-10-12/. Synthetic regression first failed with 200, then passed after the route restriction. Backend suite 243/243 after changes. Connector report is a live read, not a new sync run.
