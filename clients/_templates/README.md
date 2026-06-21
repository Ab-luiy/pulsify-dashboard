# Client delivery templates

Ready-to-fill templates for every recurring client-facing artifact in [[wiki/playbooks/pulsify-delivery-sop]]. Copy the file into `clients/{name}/`, fill the brackets, run the voice-guard pass from `raw-sources/prompts/_voice-guard.md`, send.

| File | When it fires | SOP reference |
|---|---|---|
| `welcome-email.md` | Within hours of payment | Pre-engagement step 5 |
| `credentials-checklist.md` | Attached to the welcome email, due Day 3 | Week 1 |
| `week-1-diagnosis-doc.md` | Day 7 deliverable | Week 1 (generate via `raw-sources/prompts/client-diagnosis-prompt.md`) |
| `weekly-report.md` | Every Monday from Week 2 | Weeks 6-8 formally, start earlier (generate via `raw-sources/prompts/weekly-client-report-prompt.md`) |
| `offboarding-pack.md` | Engagement close (success or exit) | Off-boarding section |

Rules that apply to every artifact: no emojis, no exclamation marks, sentence-case headings, never a stat without a source. These templates are starting points — anything client-specific beats the template line.
