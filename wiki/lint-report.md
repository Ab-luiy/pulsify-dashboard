---
type: synthesis
tags: [content, offer, funnel, outreach, sales, product]
sources: [[wiki/index]], [[wiki/synthesis/funnel-portal-pipeline]], [[wiki/synthesis/client-brain-spec]], [[wiki/synthesis/pulsify-portal-master-architecture]], sprint records in [[wiki/log]]
created: 2026-07-03
updated: 2026-07-18
---

# Wiki lint report, 2026-07-18

Focused post-sprint lint of the pages most affected by the 2026-07-13 through 2026-07-16 portal builds. This pass checked contradictions, stale claims, orphan pages, missing cross-links, index freshness, and voice violations. It reports findings only.

## Verdict

The implementation record is ahead of the architecture pages. The largest risk is not missing knowledge. It is old future-tense copy that now describes live systems as unbuilt, plus one direct contradiction between the original invisible impersonation vision and the shipped visible read-only banner.

## Findings

### L1 | Master architecture status block is stale | High

- Page and lines: [[synthesis/pulsify-portal-master-architecture]], lines 22, 97-126.
- Finding: line 22 says impersonation and the cross-client rollup are new work. Lines 97-101 say the follow-up queue still needs to be added. Lines 103-111 list the client brain, proof vault, pulse feed, health score, and impersonation audit as layers to add. Lines 115-126 repeat those shipped systems under "New" and in the future build order.
- Current state: the follow-up queue, client brain phases 1 and 2, native proof upload, operator command center, proof vault, pulse feed, Trakyo production port, read-only impersonation, Kit composer, carousel studio, and retest loop are live.
- Suggested fix: update the frontmatter date, rewrite "What exists vs what is new," mark completed build-order steps, and leave only founder-gated or genuinely unbuilt work in the future list.

### L2 | Impersonation visibility contradicts the shipped security design | High

- Page and line: [[synthesis/pulsify-portal-master-architecture]], line 20.
- Finding: the architecture says the operator opens a client account "invisibly to the client." The shipped design deliberately shows a fixed "Operator view, read only" banner and enforces a 30-minute, audited, non-escalating session.
- Suggested fix: replace invisible impersonation with the shipped visible read-only operator view. Keep the audit, expiry, and non-escalation guarantees explicit.

### L3 | Client-brain spec still treats live proof infrastructure as future work | Medium

- Page and lines: [[synthesis/client-brain-spec]], lines 61-77 and 98-102.
- Finding: the build contract is still headed "when fired," names a proposed proof_assets table instead of the shipped proof_items table, and says R2 upload remains later work. The open question still recommends paste-links until R2 exists.
- Current state: native proof upload is live through the MEDIA R2 binding, UUID-keyed client paths, /m/ serving, proof rows, captions, permissions, and scoped deletion.
- Suggested fix: split the page into shipped state and remaining work. Replace the proposed schema name with the actual schema, close the R2 question, and retain transcription, automated ICP research, and direct client export as open work where still accurate.

### L4 | Funnel pipeline open questions were closed by the sprint | Medium

- Page and lines: [[synthesis/funnel-portal-pipeline]], lines 75-80.
- Finding: the page still says the shared API is on the Frank project, client-facing authentication uses the admin gate, and booking plus closed-revenue attribution are the next data legs.
- Current state: the production project is pulsify-funnels; clients have credentialed login and token-scoped access; payment and integration-event infrastructure is live. The exact remaining booking gap should be restated from the current integration status instead of the 2026-07-01 state.
- Suggested fix: replace the old open questions with the current custom-domain, OAuth/media-gallery, email-domain, and payment-rail blockers.

### L5 | The master architecture and client-brain spec disagree on the brain structure | Medium

- Pages and lines: [[synthesis/pulsify-portal-master-architecture]], line 26; [[synthesis/client-brain-spec]], lines 19-43 and 83-88.
- Finding: the master architecture lists lifestyle as a first-class brain field. The approved eight-section spec does not. It stores humanizing life details under Story, rejects flex positioning, and keeps Funnel facts operator-only.
- Suggested fix: make the master page point to the approved eight-section schema and describe lifestyle only as humanizing story material under the proof-currency rule.

### L6 | Client-brain spec is effectively orphaned | Medium

- Page: [[synthesis/client-brain-spec]].
- Finding: its only inbound wiki link is from [[wiki/index]]. The master architecture describes the client brain extensively but does not link to the implemented field and security contract.
- Suggested fix: add a direct link from [[synthesis/pulsify-portal-master-architecture]] in the client-brain section and from any onboarding or generator page that relies on the schema.

### L7 | Index freshness is materially behind the repo | Medium

- Page and lines: [[wiki/index]], lines 2, 149, 152-153.
- Finding: frontmatter still says updated: 2026-07-01. The lint summary describes the 2026-07-03 audit. The client-brain and master-architecture summaries still read as future build specs instead of reflecting the shipped 2026-07-15 and 2026-07-16 state.
- Coverage check: 155 Markdown files exist under wiki/. Six content pages are absent from the index: frameworks/generic-mmo-application-questionnaire, synthesis/client-dashboard-redesign-spec-2026-07-12, synthesis/dashboards-audit-and-portal-strategy-2026-07-12, synthesis/niksetting-extractions/18-attract-buyers-not-broke-people, synthesis/operator-console-spec, and synthesis/proof-wall-redesign-spec. The special wiki/log.md file is also unlisted.
- Suggested fix: refresh the index date, summaries, lint entry, and missing rows in one dedicated index pass.

### L8 | Voice drift appears in the north-star pages | Low

- Pages and lines: [[synthesis/pulsify-portal-master-architecture]], lines 15, 20, 56, 99, and 105; [[synthesis/client-brain-spec]], line 92.
- Finding: phrases such as "ultimate portal," "looks beautiful," "Good news," "This is the moat," "Nobody else," and "dumb-proof" read as promotional or generic AI copy. They weaken the direct operating voice.
- Suggested fix: replace each phrase with the concrete product behavior or acceptance standard it is trying to describe.

## Checks that passed

- No contradiction was found between the funnel page's tracked-link model and the shipped acquisition-page implementation. The client slug scopes config reads, the private token attributes only the matching page, IP remains supporting evidence, and operator-preview mode suppresses browser event sends.
- [[synthesis/funnel-portal-pipeline]] has healthy inbound linking from the landing-page, dashboard, integrations, onboarding, QA, and outreach-roadmap pages.
- The proof-currency rule is consistent across the three focused pages: student results and real work artifacts are allowed; lifestyle flex is not proof.
- The current index links for the three focused synthesis pages resolve.

## Recommended order

1. Refresh [[synthesis/pulsify-portal-master-architecture]] because it creates the most wrong future work.
2. Reconcile [[synthesis/client-brain-spec]] with the live R2 and proof_items implementation.
3. Close the stale auth and pipeline gaps in [[synthesis/funnel-portal-pipeline]].
4. Refresh [[wiki/index]] after the page updates so its summaries describe the final state.

## Scope

Full reads: [[synthesis/funnel-portal-pipeline]], [[synthesis/client-brain-spec]], [[synthesis/pulsify-portal-master-architecture]], the prior lint report, the relevant 2026-07-13 through 2026-07-16 [[wiki/log]] and AGENT_CHAT.md records, plus index coverage checks across every Markdown path under wiki/. Historical pages outside the sprint-sensitive set were not re-read in full.
