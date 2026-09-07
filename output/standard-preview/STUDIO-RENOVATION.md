# Studio renovation

## Product decision

Studio becomes a content workspace, with a small number of deliberate modes instead of a page of generators. The existing tenant data, review workflow and prompt contracts remain the foundation. The client portal gets the same typography, navigation, controls and color system. The separate operator dashboard is a subsequent implementation, not something silently included in this release.

## What changes now

1. Overview: visual entry points for stories and carousels, real saved-work counts and a compact recent-project shelf. Reels and performance remain reachable as related workspaces.
2. Library: one collection of stories and carousels, live search, format and status filters, grid and board views. Cards show the actual topic, format, slide count, update date and review status.
3. Create: choose a format, complete a focused brief, then generate the saved prompt/structure. Advanced creative direction is separated from primary fields. Generation reports progress and failure. Manual mode explicitly hands the prompt to the client's own AI.
4. Editor: a slide navigator, a large visual preview, editable copy, contextual art direction, draft saving, import, copy/export, and a separate review action. Stories use a portrait stage; carousels use a square stage. These are composition previews, not fabricated finished image exports.
5. Portal shell: Satoshi body type, Clash Display headings, an ink sidebar, violet actions, coral/cyan format accents, consistent surfaces, compact app bar and responsive navigation. Dark mode, visible focus and reduced-motion support remain first-class.

## Interaction contract

Opening, filtering and switching workspace views never edits a record. Editing copy changes a local draft; Save writes the current project to D1 and confirms success. Review is a separate action. Approved/in-review items are read-only to clients. Unsaved changes warn before closing or switching projects. Network errors preserve edits. Import validates structured data before saving. Generated manual skeletons do not count as completed copy. No payment, email or publishing action fires from preview or review controls.

## Engineering approach

Keep the proven APIs and authentication. Add a dedicated Studio controller and stylesheet rather than mixing another large feature into the inline portal renderer. Preserve the existing generator forms and their IDs, moving them into the new Create view. Unify project presentation while keeping story and carousel payloads separate. Add a scoped story draft-save operation with status guards; use the existing carousel save operation. No database replacement or data migration is needed for this release.

## Verification gates

Run all existing backend tests plus draft-save/isolation/status tests. Verify source syntax, every preserved form ID, creation, search/filter, board mode, opening each format, slide switching, editing, saving/reloading, importing, copy, review guards, unsaved protection, keyboard operation, light/dark appearance and 390px layout. Verify on a deployed preview first; publish the validated source to production and retest login and Studio.

## The wider renovation plan

Next, make Home a short daily agenda, Content a calendar and delivery board, Plans a milestone timeline, Team a contact surface, and Performance a focused diagnostic workspace with chart drill-downs. Move account and connection settings into a dedicated workspace rather than burying them inside Revenue. Reuse Studio's components, tokens and interaction states across those surfaces.

Then apply that same system to the operator dashboard: cross-client command center, client workspace switching, unified review inbox and delivery management. Read the canonical dashboard repository before implementation because its source and deployment differ from this portal.

Separate capability work follows the visual renovation: durable reel ideas; provider-backed social imports; verified email delivery; provider account connection tests; and scheduling/publishing only where authorized APIs exist. These require actual backend capabilities and must not be implied by animated controls.

## What makes it personal

The first screen should show that client's actual open projects, voice and proof. The brief should draw from their brain. The review should preserve their wording and show specific feedback. A first-week checklist and a welcome recording can make the initial workspace feel prepared without inventing results or activity.
