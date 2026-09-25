---
name: project_frank_creator_profile
description: Frank Wieler was only a real lead we ran the landing-page tests on; founder 2026-09-25 said he is not a client or a test figure and had him removed; keep the design, never use Frank as the sample again
metadata:
  type: project
---

Frank Wieler (IG `@Frank_wieler1`, YouTube `@franz_wieler1`) was a real outreach lead. We used him as the test subject while building the landing-page system in July 2026, so his name ended up everywhere: the first mock, the `frank` / `frank-wieler` page rows, the `frank-wieler.pages.dev` and `pulsify-frank.pages.dev` sites, code defaults and test fixtures. He never signed and was never a client.

Founder, 2026-09-25: "he became an important test figure but he isn't really. You can delete him... As long as we retain the Landing page design you can do whatever."

**Why:** he is a lead, not a case study and not a fixture. Treating him as special kept a real person's name on public test pages.

**How to apply:**
- Never use Frank as a sample, default, demo client or test name again. Use made-up names (tests now use "Rowan Hale").
- His student result (~$1M revenue, ~$100K peak MRR) is HIS proof, not Pulsify's. Never cite it as a Pulsify result.
- The landing-page design stays: `output/standard-preview/templates/canonical` and `templates/variant-02` render every page, and none of it depends on Frank's data. See [[project_landing_page_standard]].
- The research file `raw-sources/client-raw/frank-wieler/profile.md` stays (raw sources are immutable). He can still be worked as an ordinary lead.

**Removal DONE 2026-09-25 (founder said deploy + delete both):** D1 rows exported then deleted; opt-in page, unused script, defaults and admin link removed and deployed (Pages 35d80f55); Pages projects `frank-wieler` and `pulsify-frank` deleted, all their URLs dead. The export sits in `clients/_archive/frank-2026-09-25-final.json` and `clients/_archive/frank-sites-2026-09-25/`, gitignored and local-only (the auto-mode classifier blocked pushing production data to GitHub).

Gotcha found doing it: Cloudflare kept replaying the deleted `optin.html` at `/optin` for days (a 7-day cache on the static layer, survives deploys, only the exact URL). Fix was answering the path in `functions/[slug].js` (RETIRED_SLUGS) so it never reaches the static layer. Removing any public page later: do the same, then curl the exact URL.
