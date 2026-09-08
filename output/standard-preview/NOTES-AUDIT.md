# Portal notes audit — September 8, 2026

Compared both founder briefs in this conversation against the current implementation. This is a requirements audit, not another claim that passing tests means the whole brief is complete. No product changes were made during this audit.

## Missing or partial

| Request | Status | What remains |
|---|---|---|
| Integrated Instagram HUD, lead and DM tracking | Partial | Manual lead records and pasted-conversation AI summaries exist. No connected Instagram inbox, automatic conversation ingestion, live reply workflow or automatic lead creation from DMs. |
| Instagram/YouTube integrations feeding real-time updates | Missing for social data | Cards store delegated-access information. They do not perform social OAuth or import channel analytics/inbox data. Other provider webhook infrastructure exists; that does not establish the requested end-to-end live social feed. |
| Contract signature creates the client portal automatically | Missing | No DocuSign signature-to-provisioning handler. Manual client creation and invitation/password onboarding exist. |
| Self-service registration and adaptable onboarding | Partial | `/portal/register` requires a personal setup invitation. Intake saves structured client context. The register page exists. The missing part is automated provisioning and rules that configure the product around the client's selected requirements. |
| One founder login for dashboard and portals | Partial | Destination screen, dashboard, client management and add-client entry exist. Operator authentication still uses an admin key; client authentication is separate. No unified account session with the separate SDR dashboard. |
| A populated story gallery for every sequence type | Partial | Built-in references: credibility 3 panels, breakdown 3, CTA 2, start-here 18. Value-driven, Q&A, day in the life, lifestyle and story launch have zero built-in screenshots. Reference excerpts reuse the supplied source sequence. Users can file their own uploaded references. |
| Choose a designed story template or start from scratch | Partial | Each type has its own arc, materials, opening and closing. Creation produces blank editable panels with instructions. It is not a library of finished, reusable visual sequences carrying their images, text positions and composition into a new project. |
| Instagram fonts and drawing tools | Partial | Drawing, background selection, four font approximations and PNG export exist. These are Arial/Georgia/monospace/Arial Black styles, not native Instagram typography and stickers. Export also uses a simpler text layout than the preview, so visual parity remains incomplete. |
| Upload many images, then reorganize them | Partial | Batch upload and queue ordering exist. Persistent ordering of already-uploaded media is not implemented. |
| Ready-made YouTube thumbnails and video/title suggestions | Partial | Three formats, static title patterns, four illustrated layout guides and 45 archive images exist. The video wizard saves written thumbnail direction; it does not load an editable thumbnail composition or produce personalized video/title/thumbnail suggestions inside that flow. |
| Actual titles paired with real thumbnails/video packaging | Partial | Supplied archive images do not have verified original published titles/creator metadata. Users can add a real video URL, published title and notes manually. The archive is not a fully catalogued packaging library. |
| Our title formulas fitted to each process step | Partial | Nine structural patterns are mapped to the three formats, with title and opening steps. This does not establish a complete, traced catalogue of the founder's exact formula library with worked examples and performance evidence. |
| Rebuild the whole skeleton and break up every dense page | Partial | New outer portal/operator shells and focused major workflows exist. Content calendar, Plans, Team, To-dos and Leads still mount previous inner panels. Account, carousel and parts of operator setup also retain existing forms. A fully rebuilt interior across every section is unfinished. |

## Implemented

| Request | Current implementation |
|---|---|
| Dashboard visual redesign | New portal home and operator navigation/dashboard presentation. Separate SDR/outreach dashboard was not redesigned. |
| Coordinated colors, fonts and aligned boxes | Shared graphite/lavender direction with Inter typography, responsive cards and light/dark styling on the rebuilt surfaces. Visual acceptance remains the founder's decision. |
| Backtracking | Main Back control, browser history, nested routes and previous-step buttons. |
| Channel-specific sidebar | Instagram, YouTube, Copywriter and other sections have contextual secondary menus. |
| Different story types | Nine distinct arcs, prompts, materials and example topics replace the identical type flow. This does not complete their visual galleries. |
| Richer Copywriter with AI | Six starting points, real hosted generation, rewrite/shorten/hook actions, editable saved drafts and client context. Panel-level AI assistance also exists. |
| Performance decluttering | Overview, retention, sequence history and weekly progress are separated; logging opens a dialog. |
| Revenue blocks and graph | Metric cards, monthly chart and separate transactions page. |
| Media white-background cleanup | Dark image contact sheet, image preview, batch-upload and caption dialogs. |
| Connection cards, popups and real icons | Eight service marks, branded cards and two-step setup dialogs. Visual completion does not mean provider activation. |
| More thumbnail pictures | 45 unique images imported from the existing supplied/reference folders. |
| All-time tracker | Direct tenant-scoped database totals, including older sequence logs. |
| Client login redesign | Centered login replaces the earlier split layout. |

## Source locations

- `portal/workspace-content.js`: type-specific content, reference arrays, static formulas and layout descriptions.
- `portal/workspace-shell.js`: route dispatch, legacy panel mounting, blank storyboard creation, video wizard, references, AI interactions and connections.
- `portal/media-workspace.js`: upload queue ordering, approximate fonts, drawing and canvas export.
- `portal/login/index.html`, `admin.html`, `functions/_shared/client-auth.js`: invitation registration and separate client/admin authentication.
- `functions/api/client-integrations.js`, `functions/_shared/integrations.js`, `functions/_shared/hooks.js`: stored access and existing provider plumbing.
- `functions/api/copywriter.js`, `functions/api/workspace-summary.js`: implemented hosted AI and database totals.
- `onboard/index.html`: structured intake.
- `WORKSPACE-REDESIGN.md`: preceding release verification and explicitly deferred integrations.

## Suggested execution order

First finish the product gaps that require no new provider connection: designed story templates and missing example galleries, usable thumbnail compositions and richer title/video suggestions, persistent media organization and preview/export parity, then the remaining dense interiors. Next implement the unified founder account and contract-to-onboarding path. Social OAuth, permissions, imports and event handling are a separate integration workstream; provider credentials alone will not finish that code.
