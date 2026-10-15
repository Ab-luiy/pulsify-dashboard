# Onboarding v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 16-question client onboarding with the founder-approved onboarding v2 (about 100 short screens in 14 parts, branching, talk or type, autosaved drafts), store "How you found us" as Pulsify's own record, and give the operator a plain-English Onboarding tab with a "needs figuring out" list.

**Architecture:** The questions become a typed schema (one file per part) read by a pure engine (`visibleScreens`, `problemWith`, `fieldsFor`, `minutesLeft`), so branching, required checks and saving are tested without a browser. The screen component renders whichever control a screen's `kind` names. Answers save to the client brain on Continue (as today); everything typed also autosaves as a draft (server + browser copy) through one reusable hook. The backend (Pages Functions in the Brain repo) gains six brain sections, three small endpoints and one migration.

**Tech Stack:** Next.js 16 / React 19 / TypeScript / Zod 4 / Tailwind 4 / motion / TanStack Query (pulsify-saas). Cloudflare Pages Functions (plain JS modules) + D1 + R2 + Workers AI Whisper (Brain `output/standard-preview`). Tests: Playwright (pulsify-saas, browser and pure), `node --test` scripts (backend).

**Spec (source of truth for every question's wording):** Pulsify-Brain `wiki/synthesis/onboarding-v2-spec-2026-10-15.md`. Where this plan says "title from spec 4.6", copy that question's sentence from the spec exactly, in straight quotes.

## Global Constraints

- One stack: React + Next.js + TypeScript for the screens, Zod for every API shape (founder 2026-10-10). Backend stays in Brain `output/standard-preview/functions` until the #58 cutover; every backend change is written up in pulsify-saas `docs/backend-wiring.md` in the same commit as the screen (founder 2026-10-12).
- Nothing a client types is ever lost: every field autosaves a draft about 1 second after typing stops, to the server and to the browser, and comes back exactly where they left off (founder 2026-10-15, ticket #67).
- Niches come only from `src/lib/niches.ts` (`trading`, `ecommerce`, `tiktok-shop`, `amazon-fba`, `ht-sales`, plus "other" with their own words). Never fitness, real estate or any generic niche (founder 2026-10-15).
- The app says TOF, MOF and BOF by name, with niche examples (founder 2026-10-15).
- Money questions (3.1 to 3.3) are exact and required. Funnel metrics are ranges with "I don't know" always allowed. Nobody is forced to give exact rates.
- Part A ("How you found us") is saved to `sale_stories` when its last question is answered and is never readable by any generator.
- `money` and `commitment` brain sections never go into generator context.
- App wording: never "health" anywhere people read; client status is On track / Watch / At risk / Needs onboarding.
- Copy: Pulsify voice. No exclamation marks, no emojis, sentence case, straight quotes, "->" not arrow glyphs in code strings.
- Design kit: `docs/design-system.md` (Geist, roomy question density 32-40px questions, 12px card corners, glow accent for "do this", silver-white primary buttons). Founder overrides for onboarding: glowing custom cursor on the onboarding page only (off on touch and reduced motion); the glowing logo loader (`BrandLoader`) for loading, slightly bigger than today.
- Releases: pulsify-saas `main` is live. Do not merge to main, deploy, or apply the migration to the live database until the founder has walked through the preview and said yes (spec: "We go through this together before anything goes live").
- Coordination: before editing any Brain file, add a claim to Brain `AGENT_CHAT.md` (Codex works the same repo) and log the result there when done.

## Where the work happens

| Repo | Path for this build | Branch |
|---|---|---|
| pulsify-saas (screens, tests, docs) | `C:\Users\Abdullah\Desktop\pulsify-saas-onboarding-v2` (new worktree) | `claude/onboarding-v2` from `origin/main` |
| Pulsify-Brain (backend, migration, backend tests) | `C:\Users\Abdullah\Desktop\Pulsify-Brain\.claude\worktrees\mvp-prd-pricing-blockers-97ead8` (this worktree) | `claude/onboarding-v2-build` from `brain/main` |

Backend tests run from the Brain worktree root: `node --test output/standard-preview/tests/<file>.test.mjs`.
Frontend checks run from the pulsify-saas worktree: `npx playwright test tests/<file>.spec.ts` (starts `next dev` itself), and `npm run check` before handing over.

## File map

**Brain (`output/standard-preview/`)**
- Create `migrations/0062_onboarding_v2.sql`: tables `form_drafts`, `sale_stories`, `onboarding_needs`, `client_brain_history`.
- Modify `functions/api/client-brain.js`: six new sections, new client-writable fields, history rows, operator `?history=1`.
- Modify `functions/_shared/client-brain-context.js`: section order and labels; `money` and `commitment` excluded from generators.
- Create `functions/api/form-drafts.js`: GET/PUT/DELETE a client's draft for one form.
- Create `functions/api/sale-story.js`: client POST once part A is done; operator GET.
- Create `functions/api/onboarding-needs.js`: operator GET/POST of ticked needs.
- Tests: `tests/onboarding-v2-brain.test.mjs`, `tests/form-drafts.test.mjs`, `tests/sale-story.test.mjs`, `tests/onboarding-needs.test.mjs`; extend the mock in `tests/client-brain.test.mjs`.

**pulsify-saas**
- Create `src/lib/api/form-drafts.ts`, `src/lib/api/sale-story.ts`, `src/lib/api/onboarding-needs.ts`.
- Create `src/lib/use-form-draft.ts` (the app-wide draft hook, #67).
- Create `src/features/onboarding/schema/types.ts`, `schema/build.ts`, `schema/parts/*.ts` (one file per part), `schema/index.ts`.
- Create `src/features/onboarding/engine.ts` (pure).
- Create `src/features/onboarding/niche-content.ts` (TOF/MOF/BOF examples, quiz items, starter buyer cards per niche).
- Create `src/features/onboarding/readout.ts` (pure: brain -> plain-English bullets per part; shared by the client read-back and the operator tab).
- Create `src/features/onboarding/needs.ts` (pure: brain -> "needs figuring out" list).
- Create `src/features/onboarding/controls-v2.tsx` (new controls), `src/features/onboarding/voice-tools.tsx` (mic on every text answer, read aloud), `src/features/onboarding/glow-cursor.tsx`.
- Rewrite `src/features/onboarding/onboarding-screen.tsx` on the engine. Keep `controls.tsx`. Delete `answers.ts` and `questions.ts` once nothing imports them (Task 15 moves `onboardingProgress` and `onboardingLink`).
- Modify `src/features/brain/model.ts` (client field mirror, section colours and labels), `src/features/brain/brain-section.tsx` (render `json` fields read-only), `src/features/brain/brain-screen.tsx` (new Onboarding tab), create `src/features/brain/onboarding-tab.tsx`.
- Modify `src/components/shell/brand-loader.tsx` (logo a little bigger).
- Modify `src/features/portal-workspace/access/access-screen.tsx` (return to onboarding after connecting).
- Tests: `tests/onboarding-engine.spec.ts` (pure), `tests/onboarding-readout.spec.ts` (pure), `tests/onboarding.spec.ts` (rewritten, browser), `tests/brain-onboarding-tab.spec.ts` (browser), `tests/onboarding.screens.spec.ts` (updated captures).
- Docs: `docs/backend-wiring.md` (Onboarding section rewritten).

## Out of scope (separate tickets, do not build here)

- Rolling the draft hook out to every other form in the app (#67 beyond onboarding): the hook is built here and used by onboarding; other screens adopt it in a follow-up.
- Blurred preview cards across the app (#63), the watch time chart (#64), the loader everywhere (#65, beyond the size change here), the program builder (#66), free testers (#68).
- Real one-tap YouTube/Instagram sign-in beyond what `client-connect.js` already does (#15). Note: connecting currently fails with "full" until the founder adds a payment method on Zernio (docs/backend-wiring.md, 2026-10-13). The Connect step must show that reason plainly and let them skip.
- Adding up positioning/content/funnel answers across clients for outreach angles (spec "Where the answers go"): data is stored here; the cross-client view comes later.
- Brand Brain cards in the client portal for adding to answers later, and nudges when something new happens (spec "Every answer is something they build on"). For now a client changes answers by reopening `/portal/onboarding`, which opens on "Welcome back" with everything filled in. The read-back says exactly that.
- AI-chosen follow-up questions (spec "AI follow-ups later"); this build has the rule-based "say more" nudge only.

---

### Task 0: Set up both workspaces and claim the files

**Files:** Brain `AGENT_CHAT.md`.

- [ ] **Step 1: Create the pulsify-saas worktree**

```bash
cd /c/Users/Abdullah/Desktop/pulsify-saas
git fetch origin
git worktree add ../pulsify-saas-onboarding-v2 -b claude/onboarding-v2 origin/main
cd ../pulsify-saas-onboarding-v2
npm ci
```
Expected: `Preparing worktree (new branch 'claude/onboarding-v2')` and npm finishing without errors.

- [ ] **Step 2: Branch the Brain worktree (this plan is on the current branch) and take the latest main**

```bash
cd "/c/Users/Abdullah/Desktop/Pulsify-Brain/.claude/worktrees/mvp-prd-pricing-blockers-97ead8"
git switch -c claude/onboarding-v2-build
git fetch brain
git merge --no-edit brain/main
```
Expected: `Switched to a new branch 'claude/onboarding-v2-build'` and a clean merge.

- [ ] **Step 3: Confirm the backend tests pass before touching anything**

```bash
node --test output/standard-preview/tests/client-brain.test.mjs output/standard-preview/tests/client-brain-phase2.test.mjs
```
Expected: both report `pass`. If either fails before any change, stop and tell the founder; do not build on a red baseline.

- [ ] **Step 4: Claim the files in AGENT_CHAT.md**

Append to Brain `AGENT_CHAT.md`:

```markdown
### [YYYY-MM-DD] CLAUDE
CLAIM onboarding v2 build (plan: docs/superpowers/plans/2026-10-15-onboarding-v2.md). Brain files: output/standard-preview/functions/api/client-brain.js, functions/_shared/client-brain-context.js, new functions/api/form-drafts.js, sale-story.js, onboarding-needs.js, migrations/0062_onboarding_v2.sql, their tests. pulsify-saas branch claude/onboarding-v2. Nothing deploys until the founder walks the preview.
```

- [ ] **Step 5: Commit**

```bash
git add AGENT_CHAT.md
git commit -m "Claim onboarding v2 build files"
```

## Phase 1: Backend (Brain repo)

All paths in Phase 1 are relative to `output/standard-preview/` in the Brain worktree unless they start with `wiki/`.

### Task 1: Migration, new brain sections and fields, answer history

**Files:**
- Create: `migrations/0062_onboarding_v2.sql`
- Modify: `functions/api/client-brain.js` (constants at the top, `saveClientSubmission`, `handle_onRequestGet`, `sectionLabel`)
- Modify: `functions/_shared/client-brain-context.js:3-14`
- Modify: every test mock that handles `INSERT INTO client_brain` (`tests/client-brain.test.mjs`, `tests/onboarding-form.test.mjs`, `tests/niches.test.mjs`, `tests/impersonation.test.mjs`, `tests/pulse-feed.test.mjs`)
- Create: `tests/onboarding-v2-brain.test.mjs`

**Interfaces:**
- Produces: brain sections `intent`, `money`, `positioning`, `content`, `program`, `commitment`; field type `"json"` for object values; the client-writable field list below (pulsify-saas mirrors it in Task 6); operator `GET /api/client-brain?client=X&history=1` adds `history: [{section, field, value, source, replaced_at}]` (newest first, at most 200).

- [ ] **Step 1: Write the migration**

Create `migrations/0062_onboarding_v2.sql`:

```sql
-- Onboarding v2 (founder 2026-10-15, wiki/synthesis/onboarding-v2-spec-2026-10-15.md).

-- Everything a client has typed in a form, saved while they type (pulsify-saas #67).
CREATE TABLE IF NOT EXISTS form_drafts (
  client_id TEXT NOT NULL,
  form_key TEXT NOT NULL,
  draft_json TEXT NOT NULL,
  position TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (client_id, form_key)
);

-- Part A "How you found us": Pulsify's own record of how the client was sold. Never read by a generator.
CREATE TABLE IF NOT EXISTS sale_stories (
  client_id TEXT PRIMARY KEY,
  answers_json TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- The operator's ticks on "What this client needs figured out" (pulsify-saas #70). state: done | call.
CREATE TABLE IF NOT EXISTS onboarding_needs (
  client_id TEXT NOT NULL,
  need_key TEXT NOT NULL,
  state TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (client_id, need_key)
);

-- The answer a client replaced, so the operator can see what it said before.
CREATE TABLE IF NOT EXISTS client_brain_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT NOT NULL,
  section TEXT NOT NULL,
  field TEXT NOT NULL,
  value_json TEXT NOT NULL,
  source TEXT,
  replaced_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_client_brain_history ON client_brain_history (client_id, replaced_at);
```

- [ ] **Step 2: Write the failing test**

Create `tests/onboarding-v2-brain.test.mjs`:

```js
import { strict as assert } from "node:assert";
import * as clientBrainApi from "../functions/api/client-brain.js";
import { buildGeneratorBrainContext } from "../functions/_shared/client-brain-context.js";

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

class MockDB {
  constructor(seed = {}) {
    this.configs = seed.configs || [];
    this.brain = seed.brain || [];
    this.history = [];
    this.nextId = 1;
  }
  prepare(sql) {
    return new MockStatement(this, sql);
  }
  async batch(statements) {
    const out = [];
    for (const statement of statements) out.push(await statement.run());
    return out;
  }
}

class MockStatement {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql.replace(/\s+/g, " ").trim();
    this.values = [];
  }
  bind(...values) {
    this.values = values;
    return this;
  }
  async first() {
    if (this.sql.includes("FROM client_config") && this.sql.includes("portal_token_hash")) {
      const row = this.db.configs.find((entry) => entry.portal_token_hash === this.values[0]);
      return row ? { client: row.client, client_name: row.client } : null;
    }
    if (this.sql.includes("FROM client_config")) return { client_name: this.values[0] };
    throw new Error(`Unexpected first: ${this.sql}`);
  }
  async all() {
    if (this.sql.includes("FROM client_brain_history")) {
      return { results: this.db.history.filter((row) => row.client_id === this.values[0]).reverse() };
    }
    if (this.sql.includes("FROM client_brain")) return { results: this.db.brain.filter((row) => row.client_id === this.values[0]) };
    if (this.sql.includes("FROM proof_items")) return { results: [] };
    throw new Error(`Unexpected all: ${this.sql}`);
  }
  async run() {
    if (this.sql.startsWith("INSERT INTO client_brain_history")) {
      // INSERT ... SELECT: copy the current row when its value differs from the new one.
      const [replacedAt, clientId, section, field, newValue] = this.values;
      const current = this.db.brain.find((row) => row.client_id === clientId && row.section === section && row.field === field);
      if (!current || current.value_json === newValue) return { meta: { changes: 0 } };
      this.db.history.push({ id: this.nextId++, client_id: clientId, section, field, value_json: current.value_json, source: current.source, replaced_at: replacedAt });
      return { meta: { changes: 1 } };
    }
    if (this.sql.startsWith("INSERT INTO client_brain")) {
      const [clientId, section, field, valueJson, source, updatedAt] = this.values;
      const existing = this.db.brain.find((row) => row.client_id === clientId && row.section === section && row.field === field);
      if (existing) Object.assign(existing, { value_json: valueJson, source, updated_at: updatedAt });
      else this.db.brain.push({ client_id: clientId, section, field, value_json: valueJson, source, updated_at: updatedAt });
      return { meta: { changes: 1 } };
    }
    if (this.sql.startsWith("DELETE FROM client_brain")) return { meta: { changes: 0 } };
    throw new Error(`Unexpected run: ${this.sql}`);
  }
}

const TOKEN = "client-token-v2";
const post = (body) =>
  new Request("https://funnels.test/api/client-brain", {
    method: "POST",
    headers: { "content-type": "application/json", "x-portal-token": TOKEN },
    body: JSON.stringify(body),
  });

async function env() {
  return { DB: new MockDB({ configs: [{ client: "alpha", portal_token_hash: await sha256Hex(TOKEN) }] }) };
}

async function testNewSectionsAcceptClientAnswers() {
  const e = await env();
  const response = await clientBrainApi.onRequestPost({
    request: post({
      client: "alpha",
      answers: {
        money: { last_3_months: [{ month: "2026-09", revenue: 12400, profit: 7600 }], monthly_income: "12400" },
        positioning: { mechanism_status: "unnamed", method_walkthrough: "Step one, step two." },
        content: { yt_format: "miro" },
        commitment: { understood: "yes", promised: "in" },
        funnel: { leak: { pick: "no-show", more: "They ghost after booking." } },
        identity: { age: "27" },
        nope: { anything: "dropped" },
      },
    }),
    env: e,
  });
  assert.equal(response.status, 200);
  const saved = e.DB.brain.map((row) => `${row.section}.${row.field}`).sort();
  assert.deepEqual(saved, [
    "commitment.promised",
    "commitment.understood",
    "content.yt_format",
    "funnel.leak",
    "identity.age",
    "money.last_3_months",
    "money.monthly_income",
    "positioning.mechanism_status",
    "positioning.method_walkthrough",
  ]);
  assert.ok(e.DB.brain.every((row) => row.source === "client-form"));
}

async function testHistoryKeepsTheReplacedAnswer() {
  const e = await env();
  await clientBrainApi.onRequestPost({ request: post({ client: "alpha", answers: { story: { start_type: "broke" } } }), env: e });
  await clientBrainApi.onRequestPost({ request: post({ client: "alpha", answers: { story: { start_type: "job" } } }), env: e });
  await clientBrainApi.onRequestPost({ request: post({ client: "alpha", answers: { story: { start_type: "job" } } }), env: e });
  assert.equal(e.DB.history.length, 1, "an unchanged answer writes no history");
  assert.equal(JSON.parse(e.DB.history[0].value_json), "broke");
}

async function testGeneratorsNeverSeeMoneyOrCommitment() {
  const rows = [
    { section: "money", field: "monthly_income", value_json: JSON.stringify("12400") },
    { section: "commitment", field: "promised", value_json: JSON.stringify("in") },
    { section: "positioning", field: "love_topics", value_json: JSON.stringify("Prop firm psychology") },
    { section: "content", field: "yt_format", value_json: JSON.stringify("miro") },
  ];
  const context = buildGeneratorBrainContext({ rows, proof_items: [] });
  assert.match(context.prompt_text, /Prop firm psychology/);
  assert.match(context.prompt_text, /miro/);
  assert.doesNotMatch(context.prompt_text, /12400/);
  assert.doesNotMatch(context.prompt_text, /The deal|Promised/);
}

async function testGroupedBrainListsNewSections() {
  const grouped = clientBrainApi.groupBrainRows([]);
  const keys = grouped.sections.map((section) => section.key);
  for (const key of ["intent", "money", "positioning", "content", "program", "commitment"]) assert.ok(keys.includes(key), key);
  const money = grouped.sections.find((section) => section.key === "money");
  assert.equal(money.fields.find((field) => field.key === "last_3_months").type, "json");
}

try {
  await testNewSectionsAcceptClientAnswers();
  await testHistoryKeepsTheReplacedAnswer();
  await testGeneratorsNeverSeeMoneyOrCommitment();
  await testGroupedBrainListsNewSections();
  console.log("PASS onboarding v2 brain: new sections, history, generator privacy");
} catch (error) {
  console.error(`FAIL onboarding v2 brain: ${error?.stack || error}`);
  process.exitCode = 1;
}
```

- [ ] **Step 3: Run it to verify it fails**

Run: `node --test output/standard-preview/tests/onboarding-v2-brain.test.mjs`
Expected: FAIL (the new sections are rejected, so `saved` is empty).

- [ ] **Step 4: Add the sections and field definitions**

In `functions/api/client-brain.js`:

Replace the `SECTIONS` line with:

```js
const SECTIONS = ["identity", "intent", "money", "offer", "icp", "story", "positioning", "voice", "content", "proof", "funnel", "program", "commitment", "donot"];
```

Append these definitions to the existing arrays in `FIELD_DEFINITIONS` (existing fields stay where they are):

```js
// identity (append)
field("nickname", "What people call them", "text"),
field("age", "Age", "text"),
field("relationship_status", "Relationship status", "text"),
field("niche_line", "What people learn from them, in one line", "text"),
// offer (append)
field("history", "Offer so far", "text"),
field("current_name", "Current offer", "text"),
field("price", "Current price", "text"),
field("walkthrough", "What someone gets", "textarea"),
field("result", "Result they walk away with", "textarea"),
field("type", "Kind of offer", "text"),
field("past_offer", "The offer they stopped", "textarea"),
field("target_type", "What they want to sell", "text"),
field("target_price", "Price they want", "text"),
field("payment_platforms", "How they take payments", "list"),
field("past_growth_help", "Who they worked with before", "json"),
// icp (append)
field("known", "Knows their buyer", "text"),
field("best_client", "Best client ever", "textarea"),
field("age_range", "Buyer age", "list"),
field("gender_mix", "Buyer gender mix", "text"),
field("life_stage", "Buyer life", "list"),
field("daily_life", "A normal day for the buyer", "textarea"),
field("income", "Buyer income", "text"),
field("payment_style", "How buyers pay", "text"),
field("engagers", "Who comments and DMs", "text"),
field("before_state", "Stuck on before buying", "textarea"),
field("tried_before", "Tried before", "textarea"),
field("buying_behaviour", "How they act before buying", "list"),
field("tipping_point", "What tips them into buying", "textarea"),
field("client_objections", "Objections the client hears", "list"),
field("client_language", "Buyer's own words", "textarea"),
field("never_client", "Who they never want", "textarea"),
field("starter_profile", "Starter buyer profile", "json"),
// story (append)
field("start_type", "Where the story starts", "text"),
// voice (append)
field("persona", "How they want to be seen", "text"),
field("persona_second", "Second persona", "text"),
field("persona_other", "Persona in their words", "text"),
field("unhinged_level", "How unhinged on camera (1-5)", "text"),
field("filter", "Thinks first or says it", "text"),
field("flagged_level", "Slang or flaggable words", "text"),
field("flagged_words", "Words fine to use and never to use", "json"),
field("sliders", "Calm to hype, polished to raw", "json"),
field("never_say", "Words they'd never say", "textarea"),
// proof (append)
field("own_best", "Their own best result", "textarea"),
field("own_how", "How they got it", "textarea"),
field("own_proof", "Proof of their own result", "list"),
field("level", "Student results", "text"),
field("best_result", "Best student result", "json"),
field("count", "How many results", "text"),
field("top_results", "Top results", "json"),
field("storage", "Where proof lives", "json"),
field("own_enough", "Own result enough to bring people in", "json"),
field("closest_thing", "Closest thing to a student result", "json"),
// funnel (append)
field("stage_focus", "TOF, MOF, BOF they work on", "json"),
field("terms_known", "Funnel words they know", "list"),
field("tried", "Funnels tried", "json"),
field("wanted", "Funnel they want", "json"),
field("has_funnel", "Has a funnel", "json"),
field("sales_method", "How people buy today", "json"),
field("lead_sources", "Where buyers find them", "json"),
field("path", "Their funnel, step by step", "list"),
field("step_links", "Links for each step", "json"),
field("tools", "Tools behind the funnel", "json"),
field("owners", "Who handles each part", "json"),
field("tracks_numbers", "Tracks their numbers", "json"),
field("metrics", "Funnel numbers", "json"),
field("leak", "Where it leaks", "json"),
field("non_buyer_followup", "What happens to people who don't buy", "json"),
field("ads", "Ads", "json"),
field("ads_detail", "Ad spend and cost per booked call", "json"),
field("ads_stopped_why", "Why they stopped ads", "textarea"),
```

Add the new sections to `FIELD_DEFINITIONS` (after `identity` for `intent` and `money`, the rest in any order; `groupBrainRows` follows `SECTIONS`):

```js
intent: [
  field("why_joined", "Why they said yes", "list"),
  field("decision_story", "The moment they decided", "textarea"),
  field("win_90d", "A win in 90 days", "json"),
],
money: [
  field("last_3_months", "Revenue and profit, last 3 months", "json"),
  field("monthly_income", "Monthly income now", "text"),
  field("content_revenue_baseline", "Income from content now (the 30% starting line)", "json"),
],
positioning: [
  field("mechanism_status", "Unique mechanism", "text"),
  field("mechanism", "Mechanism name and steps", "json"),
  field("method_walkthrough", "How they get a result, step by step", "textarea"),
  field("difference_known", "Knows what makes them different", "text"),
  field("difference", "Why them and not others", "textarea"),
  field("competitors", "Competition", "list"),
  field("competitor_gap", "What they do that others don't", "textarea"),
  field("content_shows_it", "Content shows the difference", "text"),
  field("love_topics", "What they love talking about", "textarea"),
  field("hour_topic", "What they could talk about for an hour", "textarea"),
  field("avoid_topics", "Never on camera", "textarea"),
],
content: [
  field("home_platform", "More at home on", "text"),
  field("longform_awareness", "Knew long form comes first", "text"),
  field("hard_parts", "What feels hard", "list"),
  field("hard_why", "Why it's hard", "textarea"),
  field("yt_format", "YouTube format", "text"),
  field("format_why", "Why that format", "textarea"),
  field("cadence", "Posting now, per platform", "json"),
  field("process", "How they make a video", "textarea"),
  field("video_time", "Time per video", "text"),
  field("script_time", "Time scripting", "text"),
  field("daily_time", "Time a day on content", "text"),
  field("schedule", "When they make content", "text"),
  field("film_hours", "Hours a week for filming", "text"),
  field("best_post", "Best post or video", "url"),
  field("skills", "What they already know", "json"),
  field("hates", "What they hate doing", "list"),
  field("helpers", "Who helps them", "list"),
],
program: [
  field("status", "Paid program", "text"),
  field("missing", "What the program is missing", "list"),
],
commitment: [
  field("understood", "Understood the deal", "text"),
  field("promised", "Promised to do the work", "text"),
],
```

- [ ] **Step 5: Make every new field client-writable**

Below the `CLIENT_FIELDS` map, add:

```js
// Onboarding v2 (pulsify-saas src/features/brain/model.ts mirrors this list). Everything the client
// answers in the form is theirs to write; research and operator fields stay operator-only.
const ONBOARDING_V2_FIELDS = {
  identity: ["nickname", "age", "relationship_status", "niche_line"],
  intent: ["why_joined", "decision_story", "win_90d"],
  money: ["last_3_months", "monthly_income", "content_revenue_baseline"],
  offer: ["history", "current_name", "price", "walkthrough", "result", "type", "past_offer", "target_type", "target_price", "payment_platforms", "past_growth_help"],
  icp: ["known", "best_client", "age_range", "gender_mix", "life_stage", "daily_life", "income", "payment_style", "engagers", "before_state", "tried_before", "buying_behaviour", "tipping_point", "client_objections", "client_language", "never_client", "starter_profile"],
  story: ["start_type"],
  positioning: ["mechanism_status", "mechanism", "method_walkthrough", "difference_known", "difference", "competitors", "competitor_gap", "content_shows_it", "love_topics", "hour_topic", "avoid_topics"],
  voice: ["persona", "persona_second", "persona_other", "unhinged_level", "filter", "flagged_level", "flagged_words", "sliders", "never_say"],
  content: ["home_platform", "longform_awareness", "hard_parts", "hard_why", "yt_format", "format_why", "cadence", "process", "video_time", "script_time", "daily_time", "schedule", "film_hours", "best_post", "skills", "hates", "helpers"],
  proof: ["own_best", "own_how", "own_proof", "level", "best_result", "count", "top_results", "storage", "own_enough", "closest_thing"],
  funnel: ["stage_focus", "terms_known", "tried", "wanted", "has_funnel", "sales_method", "lead_sources", "path", "step_links", "tools", "owners", "tracks_numbers", "metrics", "leak", "non_buyer_followup", "ads", "ads_detail", "ads_stopped_why"],
  program: ["status", "missing"],
  commitment: ["understood", "promised"],
};
for (const [section, keys] of Object.entries(ONBOARDING_V2_FIELDS)) {
  for (const key of keys) CLIENT_FIELDS.set(`${section}.${key}`, "client-form");
}
```

Extend `sectionLabel`:

```js
function sectionLabel(section) {
  return ({
    identity: "Identity", intent: "Why now", money: "Money", offer: "Offer", icp: "ICP", story: "Story",
    positioning: "Positioning", voice: "Voice", content: "Content", proof: "Proof vault", funnel: "Funnel facts",
    program: "Program", commitment: "The deal", donot: "Do-not list",
  })[section] || labelFromKey(section);
}
```

- [ ] **Step 6: Write history rows inside the same batch**

In `saveClientSubmission`, replace the line `writes.push(upsertBrain(env, client, section, key, normalized, source, now));` with:

```js
        const valueJson = JSON.stringify(normalized);
        // Keep what the answer said before when it changes, in the same batch (no extra read).
        writes.push(
          env.DB.prepare(
            `INSERT INTO client_brain_history (client_id, section, field, value_json, source, replaced_at)
             SELECT client_id, section, field, value_json, source, ?
               FROM client_brain
              WHERE client_id=? AND section=? AND field=? AND value_json<>?`,
          ).bind(now, client, section, key, valueJson),
        );
        writes.push(upsertBrain(env, client, section, key, normalized, source, now));
```

Note the bind order `(now, client, section, key, valueJson)`; the test mock reads it in that order.

- [ ] **Step 7: Return history to the operator**

In `handle_onRequestGet`, inside the operator branch, remember the flag: add `const wantsHistory = new URL(request.url).searchParams.get("history") === "1";` next to the `client = cleanId(...)` line (declare `let wantsHistory = false;` above the `if`). Then before `return json({...})` add:

```js
  let history;
  if (wantsHistory) {
    const rows = await env.DB.prepare(
      `SELECT section, field, value_json, source, replaced_at
         FROM client_brain_history
        WHERE client_id=?
        ORDER BY replaced_at DESC, id DESC
        LIMIT 200`,
    ).bind(client).all();
    history = (rows.results || []).map((row) => ({ section: row.section, field: row.field, value: parseValue(row.value_json), source: row.source || null, replaced_at: row.replaced_at }));
  }
```

and add `...(history ? { history } : {}),` to the returned object. Clients never get `history`.

- [ ] **Step 8: Keep money and the deal out of generators**

In `functions/_shared/client-brain-context.js`, replace lines 3-14 with:

```js
const SECTION_ORDER = ["identity", "intent", "money", "offer", "icp", "story", "positioning", "voice", "content", "proof", "funnel", "program", "commitment", "donot"];
const SECTION_LABELS = {
  identity: "Identity",
  intent: "Why now",
  money: "Money",
  offer: "Offer",
  icp: "ICP",
  story: "Story",
  positioning: "Positioning",
  voice: "Voice",
  content: "Content habits",
  proof: "Proof vault",
  funnel: "Funnel facts",
  program: "Program",
  commitment: "The deal",
  donot: "Do-not list",
};
// money (private numbers) and commitment (the deal) never reach a generator (onboarding v2 spec).
const GENERATOR_SECTION_ORDER = ["offer", "positioning", "icp", "voice", "proof", "donot", "story", "identity", "content", "intent", "program", "funnel"];
```

- [ ] **Step 9: Teach the other test mocks about history rows**

In each of `tests/client-brain.test.mjs`, `tests/onboarding-form.test.mjs`, `tests/niches.test.mjs`, `tests/impersonation.test.mjs`, `tests/pulse-feed.test.mjs`, find the mock `run()` method and add this as its first line (before any `INSERT INTO client_brain` branch, because that prefix also matches the history table):

```js
    if (this.sql.startsWith("INSERT INTO client_brain_history")) return { meta: { changes: 0 } };
```

If a file's mock has no `run()` handling `client_brain`, leave it unchanged.

- [ ] **Step 10: Run the new test and the whole backend suite**

Run: `node --test output/standard-preview/tests/onboarding-v2-brain.test.mjs`
Expected: `PASS onboarding v2 brain: new sections, history, generator privacy`.

Run: `node --test output/standard-preview/tests/*.test.mjs`
Expected: every file passes. The 2026-10-12 baseline was 238/238; the count is now higher. If a test that asserted "all eight sections" fails, update its expectation to the new section list and say so in the commit message.

- [ ] **Step 11: Commit**

```bash
git add output/standard-preview/migrations/0062_onboarding_v2.sql output/standard-preview/functions/api/client-brain.js output/standard-preview/functions/_shared/client-brain-context.js output/standard-preview/tests
git commit -m "Brain: onboarding v2 sections and fields, answer history, money and deal kept from generators"
```

---

### Task 2: Draft endpoint (`/api/form-drafts`)

**Files:**
- Create: `functions/api/form-drafts.js`
- Create: `tests/form-drafts.test.mjs`

**Interfaces:**
- Produces:
  - `GET /api/form-drafts?form=<key>` (client session or token; operator previews allowed) -> `{ ok: true, form, draft: unknown | null, position: string | null, updated_at: string | null }`
  - `PUT /api/form-drafts` body `{ form, draft, position? }` (client only, not operator previews) -> `{ ok: true, form, updated_at }`. 422 when `form` is not `/^[a-z0-9-]{1,40}$/` or the draft is over 200,000 characters as JSON.
  - `DELETE /api/form-drafts?form=<key>` (client only) -> `{ ok: true, form }`.

- [ ] **Step 1: Write the failing test**

Create `tests/form-drafts.test.mjs`:

```js
import { strict as assert } from "node:assert";
import * as drafts from "../functions/api/form-drafts.js";

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

class MockDB {
  constructor(configs) {
    this.configs = configs;
    this.rows = [];
  }
  prepare(sql) {
    const db = this;
    const text = sql.replace(/\s+/g, " ").trim();
    return {
      values: [],
      bind(...values) {
        this.values = values;
        return this;
      },
      async first() {
        if (text.includes("portal_token_hash")) {
          const row = db.configs.find((entry) => entry.portal_token_hash === this.values[0]);
          return row ? { client: row.client, client_name: row.client } : null;
        }
        if (text.startsWith("SELECT draft_json")) {
          const [client, form] = this.values;
          return db.rows.find((row) => row.client_id === client && row.form_key === form) || null;
        }
        throw new Error(`Unexpected first: ${text}`);
      },
      async run() {
        if (text.startsWith("INSERT INTO form_drafts")) {
          const [client, form, draftJson, position, updatedAt] = this.values;
          db.rows = db.rows.filter((row) => !(row.client_id === client && row.form_key === form));
          db.rows.push({ client_id: client, form_key: form, draft_json: draftJson, position, updated_at: updatedAt });
          return { meta: { changes: 1 } };
        }
        if (text.startsWith("DELETE FROM form_drafts")) {
          const [client, form] = this.values;
          db.rows = db.rows.filter((row) => !(row.client_id === client && row.form_key === form));
          return { meta: { changes: 1 } };
        }
        throw new Error(`Unexpected run: ${text}`);
      },
    };
  }
}

const TOKEN = "draft-token";
const headers = { "content-type": "application/json", "x-portal-token": TOKEN };

async function setup() {
  return { DB: new MockDB([{ client: "alpha", portal_token_hash: await sha256Hex(TOKEN) }]) };
}

async function testSaveThenRead() {
  const env = await setup();
  const put = await drafts.onRequestPut({
    request: new Request("https://funnels.test/api/form-drafts", { method: "PUT", headers, body: JSON.stringify({ form: "onboarding-v2", draft: { "you.name": "Rio" }, position: "you.age" }) }),
    env,
  });
  assert.equal(put.status, 200);
  const got = await drafts.onRequestGet({ request: new Request("https://funnels.test/api/form-drafts?form=onboarding-v2", { headers }), env });
  const body = await got.json();
  assert.deepEqual(body.draft, { "you.name": "Rio" });
  assert.equal(body.position, "you.age");
  assert.ok(body.updated_at);
}

async function testEmptyReadIsNull() {
  const env = await setup();
  const got = await drafts.onRequestGet({ request: new Request("https://funnels.test/api/form-drafts?form=onboarding-v2", { headers }), env });
  const body = await got.json();
  assert.equal(body.ok, true);
  assert.equal(body.draft, null);
}

async function testRejectsBadKeyAndHugeDraft() {
  const env = await setup();
  const bad = await drafts.onRequestPut({
    request: new Request("https://funnels.test/api/form-drafts", { method: "PUT", headers, body: JSON.stringify({ form: "../x", draft: {} }) }),
    env,
  });
  assert.equal(bad.status, 422);
  const huge = await drafts.onRequestPut({
    request: new Request("https://funnels.test/api/form-drafts", { method: "PUT", headers, body: JSON.stringify({ form: "onboarding-v2", draft: { text: "x".repeat(200_001) } }) }),
    env,
  });
  assert.equal(huge.status, 422);
}

async function testNoTokenIsRefused() {
  const env = await setup();
  const got = await drafts.onRequestGet({ request: new Request("https://funnels.test/api/form-drafts?form=onboarding-v2"), env });
  assert.notEqual(got.status, 200);
}

async function testDelete() {
  const env = await setup();
  await drafts.onRequestPut({
    request: new Request("https://funnels.test/api/form-drafts", { method: "PUT", headers, body: JSON.stringify({ form: "onboarding-v2", draft: { a: 1 } }) }),
    env,
  });
  const del = await drafts.onRequestDelete({ request: new Request("https://funnels.test/api/form-drafts?form=onboarding-v2", { method: "DELETE", headers }), env });
  assert.equal(del.status, 200);
  assert.equal(env.DB.rows.length, 0);
}

try {
  await testSaveThenRead();
  await testEmptyReadIsNull();
  await testRejectsBadKeyAndHugeDraft();
  await testNoTokenIsRefused();
  await testDelete();
  console.log("PASS form drafts: save, read, size and key limits, auth, delete");
} catch (error) {
  console.error(`FAIL form drafts: ${error?.stack || error}`);
  process.exitCode = 1;
}
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test output/standard-preview/tests/form-drafts.test.mjs`
Expected: FAIL with a module-not-found error for `functions/api/form-drafts.js`.

- [ ] **Step 3: Write the endpoint**

Create `functions/api/form-drafts.js`:

```js
// Drafts for client forms (pulsify-saas #67, founder 2026-10-15: "if there was a field they filled
// and they had to go and come back to it it needs to be there"). One row per client and form: the
// whole draft as JSON plus where they were. Drafts are never answers: nothing here feeds a generator.
//   GET    /api/form-drafts?form=onboarding-v2
//   PUT    /api/form-drafts {form, draft, position}
//   DELETE /api/form-drafts?form=onboarding-v2
import { withOperator } from "../_shared/access.js";
import { json, nowIso, str } from "../_shared/common.js";
import { resolveClientAccess } from "../_shared/client-auth.js";

const FORM_KEY = /^[a-z0-9-]{1,40}$/;
export const MAX_DRAFT_CHARS = 200_000;

async function handleGet({ request, env }) {
  const access = await resolveClientAccess(request, env, { allowHeaderToken: true, allowQueryToken: false, allowImpersonated: true });
  if (access.error) return access.error;
  const form = str(new URL(request.url).searchParams.get("form"));
  if (!FORM_KEY.test(form)) return json({ ok: false, error: "valid form key required" }, 422);
  const row = await env.DB.prepare(
    "SELECT draft_json, position, updated_at FROM form_drafts WHERE client_id=? AND form_key=?",
  ).bind(access.client, form).first();
  let draft = null;
  try {
    draft = row ? JSON.parse(row.draft_json) : null;
  } catch {
    draft = null;
  }
  return json({ ok: true, form, draft, position: row?.position || null, updated_at: row?.updated_at || null });
}

async function handlePut({ request, env }) {
  const access = await resolveClientAccess(request, env, { allowHeaderToken: true, allowQueryToken: false });
  if (access.error) return access.error;
  const body = await request.json().catch(() => ({}));
  const form = str(body.form);
  if (!FORM_KEY.test(form)) return json({ ok: false, error: "valid form key required" }, 422);
  const draftJson = JSON.stringify(body.draft ?? null);
  if (draftJson.length > MAX_DRAFT_CHARS) return json({ ok: false, error: "draft is too large" }, 422);
  const position = str(body.position).slice(0, 80) || null;
  const now = nowIso();
  await env.DB.prepare(
    `INSERT INTO form_drafts (client_id, form_key, draft_json, position, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(client_id, form_key) DO UPDATE SET
       draft_json=excluded.draft_json, position=excluded.position, updated_at=excluded.updated_at`,
  ).bind(access.client, form, draftJson, position, now).run();
  return json({ ok: true, form, updated_at: now });
}

async function handleDelete({ request, env }) {
  const access = await resolveClientAccess(request, env, { allowHeaderToken: true, allowQueryToken: false });
  if (access.error) return access.error;
  const form = str(new URL(request.url).searchParams.get("form"));
  if (!FORM_KEY.test(form)) return json({ ok: false, error: "valid form key required" }, 422);
  await env.DB.prepare("DELETE FROM form_drafts WHERE client_id=? AND form_key=?").bind(access.client, form).run();
  return json({ ok: true, form });
}

export const onRequestGet = withOperator(handleGet);
export const onRequestPut = withOperator(handlePut);
export const onRequestDelete = withOperator(handleDelete);
```

Check that `str` and `nowIso` are exported by `functions/_shared/common.js` (they are imported the same way in `client-brain.js`).

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test output/standard-preview/tests/form-drafts.test.mjs`
Expected: `PASS form drafts: save, read, size and key limits, auth, delete`.

- [ ] **Step 5: Commit**

```bash
git add output/standard-preview/functions/api/form-drafts.js output/standard-preview/tests/form-drafts.test.mjs
git commit -m "API: form drafts, saved while clients type (#67)"
```

---

### Task 3: "How you found us" endpoint (`/api/sale-story`)

**Files:**
- Create: `functions/api/sale-story.js`
- Create: `tests/sale-story.test.mjs`

**Interfaces:**
- Produces:
  - `POST /api/sale-story` (client only) body `{ answers: { believed, decision_time, sooner_if?, almost_stopped: {pick, more}, video: {link?, pick?}, confidence: {score, more}, touchpoints: [{pick, rating, note}] } }` -> `{ ok: true, completed_at }`. 422 when `believed`, `decision_time`, `almost_stopped.pick`, `confidence.score` or `touchpoints` is missing. Unknown keys are dropped. Posting again updates `answers_json` and `updated_at`, keeps `completed_at`.
  - `GET /api/sale-story?client=X` (operator only) -> `{ ok: true, story: {answers, completed_at, updated_at} | null }`. `GET /api/sale-story` with no client (operator only) -> `{ ok: true, stories: [{client_id, answers, completed_at}] }` (newest first, at most 500). Clients get 403.

- [ ] **Step 1: Write the failing test**

Create `tests/sale-story.test.mjs`:

```js
import { strict as assert } from "node:assert";
import * as saleStory from "../functions/api/sale-story.js";

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function mockDb(configs) {
  const db = { configs, rows: [] };
  db.prepare = (sql) => {
    const text = sql.replace(/\s+/g, " ").trim();
    return {
      values: [],
      bind(...values) {
        this.values = values;
        return this;
      },
      async first() {
        if (text.includes("portal_token_hash")) {
          const row = db.configs.find((entry) => entry.portal_token_hash === this.values[0]);
          return row ? { client: row.client, client_name: row.client } : null;
        }
        if (text.startsWith("SELECT answers_json")) return db.rows.find((row) => row.client_id === this.values[0]) || null;
        throw new Error(`Unexpected first: ${text}`);
      },
      async all() {
        if (text.startsWith("SELECT client_id, answers_json")) return { results: [...db.rows] };
        throw new Error(`Unexpected all: ${text}`);
      },
      async run() {
        if (text.startsWith("INSERT INTO sale_stories")) {
          const [client, answersJson, completedAt, updatedAt] = this.values;
          const existing = db.rows.find((row) => row.client_id === client);
          if (existing) Object.assign(existing, { answers_json: answersJson, updated_at: updatedAt });
          else db.rows.push({ client_id: client, answers_json: answersJson, completed_at: completedAt, updated_at: updatedAt });
          return { meta: { changes: 1 } };
        }
        throw new Error(`Unexpected run: ${text}`);
      },
    };
  };
  return db;
}

const TOKEN = "story-token";
const full = {
  believed: "Your breakdown of my funnel.",
  decision_time: "few-days",
  almost_stopped: { pick: "price", more: "It was a stretch." },
  video: { link: "https://youtu.be/abc" },
  confidence: { score: 7, more: "I liked the call." },
  touchpoints: [{ pick: "dm", rating: 4, note: "" }],
  secret: "dropped",
};

async function setup() {
  return { DB: mockDb([{ client: "alpha", portal_token_hash: await sha256Hex(TOKEN) }]) };
}

const clientPost = (answers) =>
  new Request("https://funnels.test/api/sale-story", {
    method: "POST",
    headers: { "content-type": "application/json", "x-portal-token": TOKEN },
    body: JSON.stringify({ answers }),
  });

async function testClientSavesOnce() {
  const env = await setup();
  const response = await saleStory.onRequestPost({ request: clientPost(full), env });
  assert.equal(response.status, 200);
  const stored = JSON.parse(env.DB.rows[0].answers_json);
  assert.equal(stored.secret, undefined);
  assert.equal(stored.confidence.score, 7);
  const first = env.DB.rows[0].completed_at;
  await saleStory.onRequestPost({ request: clientPost({ ...full, believed: "Changed." }), env });
  assert.equal(env.DB.rows.length, 1);
  assert.equal(env.DB.rows[0].completed_at, first);
  assert.equal(JSON.parse(env.DB.rows[0].answers_json).believed, "Changed.");
}

async function testIncompleteIsRefused() {
  const env = await setup();
  const response = await saleStory.onRequestPost({ request: clientPost({ believed: "Only this." }), env });
  assert.equal(response.status, 422);
  assert.equal(env.DB.rows.length, 0);
}

async function testClientCannotRead() {
  const env = await setup();
  const response = await saleStory.onRequestGet({
    request: new Request("https://funnels.test/api/sale-story?client=alpha", { headers: { "x-portal-token": TOKEN } }),
    env,
  });
  assert.equal(response.status, 403);
}

try {
  await testClientSavesOnce();
  await testIncompleteIsRefused();
  await testClientCannotRead();
  console.log("PASS sale story: client saves part A, incomplete refused, clients cannot read");
} catch (error) {
  console.error(`FAIL sale story: ${error?.stack || error}`);
  process.exitCode = 1;
}
```

The operator read is covered by the browser test in Task 16 (the operator check needs Cloudflare Access headers that this mock does not model).

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test output/standard-preview/tests/sale-story.test.mjs`
Expected: FAIL, module not found.

- [ ] **Step 3: Write the endpoint**

Create `functions/api/sale-story.js`:

```js
// Part A of onboarding v2, "How you found us" (founder 2026-10-15: "whenever it stops at the last
// question I want that data registered to be ours"). Saved once the client answers the last
// question of the part; it is Pulsify's record of how the sale happened and no generator reads it.
//   POST /api/sale-story {answers}   client
//   GET  /api/sale-story?client=     operator: one client's story
//   GET  /api/sale-story             operator: every story, newest first
import { hasOperator, withOperator } from "../_shared/access.js";
import { checkAdmin, cleanId, json, nowIso, str } from "../_shared/common.js";
import { resolveClientAccess } from "../_shared/client-auth.js";

const clip = (value, max = 4000) => str(value).slice(0, max);
const pickMore = (value) => ({ pick: clip(value?.pick, 40), more: clip(value?.more) });

export function cleanSaleStory(answers) {
  const a = answers && typeof answers === "object" ? answers : {};
  const touchpoints = (Array.isArray(a.touchpoints) ? a.touchpoints : []).slice(0, 10).map((entry) => ({
    pick: clip(entry?.pick, 40),
    rating: Math.min(5, Math.max(0, Number(entry?.rating) || 0)),
    note: clip(entry?.note, 1000),
  })).filter((entry) => entry.pick);
  return {
    believed: clip(a.believed),
    decision_time: clip(a.decision_time, 40),
    sooner_if: clip(a.sooner_if),
    almost_stopped: pickMore(a.almost_stopped),
    video: { link: clip(a.video?.link, 500), pick: clip(a.video?.pick, 40) },
    confidence: { score: Math.min(10, Math.max(0, Number(a.confidence?.score) || 0)), more: clip(a.confidence?.more) },
    touchpoints,
  };
}

const complete = (s) => Boolean(s.believed && s.decision_time && s.almost_stopped.pick && s.confidence.score && s.touchpoints.length);

async function handlePost({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const access = await resolveClientAccess(request, env, { allowHeaderToken: true, allowQueryToken: false });
  if (access.error) return access.error;
  const body = await request.json().catch(() => ({}));
  const story = cleanSaleStory(body.answers);
  if (!complete(story)) return json({ ok: false, error: "answer every question in this part first" }, 422);
  const now = nowIso();
  await env.DB.prepare(
    `INSERT INTO sale_stories (client_id, answers_json, completed_at, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(client_id) DO UPDATE SET answers_json=excluded.answers_json, updated_at=excluded.updated_at`,
  ).bind(access.client, JSON.stringify(story), now, now).run();
  return json({ ok: true, completed_at: now });
}

async function handleGet({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  if (!(hasOperator(request, env) || request.headers.get("x-admin-key") != null)) return json({ ok: false, error: "operators only" }, 403);
  const auth = checkAdmin(request, env);
  if (auth) return auth;
  const client = cleanId(new URL(request.url).searchParams.get("client"));
  if (client) {
    const row = await env.DB.prepare("SELECT answers_json, completed_at, updated_at FROM sale_stories WHERE client_id=?").bind(client).first();
    return json({ ok: true, story: row ? { answers: JSON.parse(row.answers_json), completed_at: row.completed_at, updated_at: row.updated_at } : null });
  }
  const rows = await env.DB.prepare(
    "SELECT client_id, answers_json, completed_at FROM sale_stories ORDER BY completed_at DESC LIMIT 500",
  ).all();
  return json({ ok: true, stories: (rows.results || []).map((row) => ({ client_id: row.client_id, answers: JSON.parse(row.answers_json), completed_at: row.completed_at })) });
}

export const onRequestPost = withOperator(handlePost);
export const onRequestGet = withOperator(handleGet);
```

`hasOperator` is imported from `../_shared/access.js` exactly as `client-brain.js` does.

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test output/standard-preview/tests/sale-story.test.mjs`
Expected: `PASS sale story: client saves part A, incomplete refused, clients cannot read`.

- [ ] **Step 5: Commit**

```bash
git add output/standard-preview/functions/api/sale-story.js output/standard-preview/tests/sale-story.test.mjs
git commit -m "API: sale story, part A of onboarding saved as Pulsify's own record"
```

---

### Task 4: Ticked needs endpoint (`/api/onboarding-needs`)

**Files:**
- Create: `functions/api/onboarding-needs.js`
- Create: `tests/onboarding-needs.test.mjs`

**Interfaces:**
- Produces (operator only):
  - `GET /api/onboarding-needs?client=X` -> `{ ok: true, states: { [need_key]: "done" | "call" } }`
  - `POST /api/onboarding-needs` `{ client, key, state }` where `state` is `"done"`, `"call"` or `"open"` (open deletes the row) -> `{ ok: true }`. 422 for an unknown state or a key not matching `/^[a-z0-9-]{1,40}$/`.

- [ ] **Step 1: Write the failing test**

Create `tests/onboarding-needs.test.mjs`:

```js
import { strict as assert } from "node:assert";
import * as needs from "../functions/api/onboarding-needs.js";

async function testClientsAreRefused() {
  const env = { DB: { prepare() { throw new Error("no query expected"); } } };
  const response = await needs.onRequestGet({ request: new Request("https://funnels.test/api/onboarding-needs?client=alpha", { headers: { "x-portal-token": "t" } }), env });
  assert.equal(response.status, 403);
}

async function testValidation() {
  assert.equal(needs.validNeed("mechanism", "done"), true);
  assert.equal(needs.validNeed("mechanism", "open"), true);
  assert.equal(needs.validNeed("../x", "done"), false);
  assert.equal(needs.validNeed("mechanism", "maybe"), false);
}

try {
  await testClientsAreRefused();
  await testValidation();
  console.log("PASS onboarding needs: operators only, key and state validated");
} catch (error) {
  console.error(`FAIL onboarding needs: ${error?.stack || error}`);
  process.exitCode = 1;
}
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test output/standard-preview/tests/onboarding-needs.test.mjs`
Expected: FAIL, module not found.

- [ ] **Step 3: Write the endpoint**

Create `functions/api/onboarding-needs.js`:

```js
// The operator's ticks on "What this client needs figured out" (pulsify-saas #70). The list itself
// is worked out in the app from the client's answers; only the ticks are stored here.
import { hasOperator, withOperator } from "../_shared/access.js";
import { checkAdmin, cleanId, json, nowIso, str } from "../_shared/common.js";

const KEY = /^[a-z0-9-]{1,40}$/;
const STATES = new Set(["done", "call", "open"]);
export const validNeed = (key, state) => KEY.test(key) && STATES.has(state);

function operatorOnly(request, env) {
  if (!(hasOperator(request, env) || request.headers.get("x-admin-key") != null)) return json({ ok: false, error: "operators only" }, 403);
  return checkAdmin(request, env);
}

async function handleGet({ request, env }) {
  const denied = operatorOnly(request, env);
  if (denied) return denied;
  const client = cleanId(new URL(request.url).searchParams.get("client"));
  if (!client) return json({ ok: false, error: "valid client id required" }, 422);
  const rows = await env.DB.prepare("SELECT need_key, state FROM onboarding_needs WHERE client_id=?").bind(client).all();
  return json({ ok: true, states: Object.fromEntries((rows.results || []).map((row) => [row.need_key, row.state])) });
}

async function handlePost({ request, env }) {
  const denied = operatorOnly(request, env);
  if (denied) return denied;
  const body = await request.json().catch(() => ({}));
  const client = cleanId(body.client);
  const key = str(body.key);
  const state = str(body.state);
  if (!client || !validNeed(key, state)) return json({ ok: false, error: "client, key and state required" }, 422);
  if (state === "open") {
    await env.DB.prepare("DELETE FROM onboarding_needs WHERE client_id=? AND need_key=?").bind(client, key).run();
  } else {
    await env.DB.prepare(
      `INSERT INTO onboarding_needs (client_id, need_key, state, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(client_id, need_key) DO UPDATE SET state=excluded.state, updated_at=excluded.updated_at`,
    ).bind(client, key, state, nowIso()).run();
  }
  return json({ ok: true });
}

export const onRequestGet = withOperator(handleGet);
export const onRequestPost = withOperator(handlePost);
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test output/standard-preview/tests/onboarding-needs.test.mjs`
Expected: `PASS onboarding needs: operators only, key and state validated`.

If `hasOperator` reads something on `env` that is missing in the test and throws, pass `env = { DB: ... }` plus whatever `hasOperator` checks (read `functions/_shared/access.js` `hasOperator`), keeping the assertion that a token-only request gets 403.

- [ ] **Step 5: Run the whole backend suite and commit**

Run: `node --test output/standard-preview/tests/*.test.mjs`
Expected: all pass.

```bash
git add output/standard-preview/functions/api/onboarding-needs.js output/standard-preview/tests/onboarding-needs.test.mjs
git commit -m "API: onboarding needs ticks for the operator (#70)"
```

## Phase 2: App foundation (pulsify-saas worktree)

All paths in Phases 2 to 5 are relative to `C:\Users\Abdullah\Desktop\pulsify-saas-onboarding-v2` unless they start with `output/` (Brain).

### Task 5: API clients and the draft hook (#67)

**Files:**
- Create: `src/lib/api/form-drafts.ts`, `src/lib/api/sale-story.ts`, `src/lib/api/onboarding-needs.ts`
- Create: `src/lib/use-form-draft.ts`
- Create: `tests/form-draft.spec.ts`

**Interfaces:**
- Consumes: the endpoints from Tasks 2 to 4.
- Produces:
  - `fetchDraft(form: string, signal?: AbortSignal): Promise<{ draft: unknown | null; position: string | null; updated_at: string | null }>`
  - `saveDraft(form: string, draft: unknown, position: string | null): Promise<unknown>`
  - `clearDraft(form: string): Promise<unknown>`
  - `saveSaleStory(answers: SaleStoryAnswers): Promise<unknown>`, `fetchSaleStory(client: string): Promise<{ story: SaleStoryRecord | null }>`
  - `fetchNeedStates(client: string): Promise<Record<string, "done" | "call">>`, `setNeedState(client: string, key: string, state: "done" | "call" | "open"): Promise<unknown>`
  - `useFormDraft<T>({ form, scope, enabled, delay? }): { loaded: boolean; restored: StoredDraft<T> | null; status: DraftStatus; save(draft: T, position: string | null): void; flush(): Promise<void> }`
  - `type DraftStatus = "idle" | "saving" | "saved" | "offline"`, `type StoredDraft<T> = { draft: T; position: string | null; updated_at: string }`
  - `pickNewer<T>(local: StoredDraft<T> | null, server: StoredDraft<T> | null): StoredDraft<T> | null`

- [ ] **Step 1: Write the failing test (pure part of the hook)**

Create `tests/form-draft.spec.ts`:

```ts
import { expect, test } from "@playwright/test";
import { pickNewer } from "../src/lib/use-form-draft";

/* The draft hook's rule for two copies of one draft (#67): the newer one wins, either may be missing. */

const at = (iso: string) => ({ draft: { iso }, position: null, updated_at: iso });

test("the newer copy of a draft wins, and a missing copy never wins", () => {
  expect(pickNewer(at("2026-10-15T10:00:00.000Z"), at("2026-10-15T09:00:00.000Z"))?.draft).toEqual({ iso: "2026-10-15T10:00:00.000Z" });
  expect(pickNewer(at("2026-10-15T08:00:00.000Z"), at("2026-10-15T09:00:00.000Z"))?.draft).toEqual({ iso: "2026-10-15T09:00:00.000Z" });
  expect(pickNewer(null, at("2026-10-15T09:00:00.000Z"))?.updated_at).toBe("2026-10-15T09:00:00.000Z");
  expect(pickNewer(at("2026-10-15T09:00:00.000Z"), null)?.updated_at).toBe("2026-10-15T09:00:00.000Z");
  expect(pickNewer(null, null)).toBeNull();
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx playwright test tests/form-draft.spec.ts`
Expected: FAIL, cannot find module `../src/lib/use-form-draft`.

- [ ] **Step 3: Write the API clients**

Create `src/lib/api/form-drafts.ts`:

```ts
import { z } from "zod";
import { api } from "./client";

/*
 * Drafts for client forms (ticket #67, founder 2026-10-15: nothing a client types is ever lost).
 * Backend: Pulsify-Brain output/standard-preview/functions/api/form-drafts.js
 *   GET    /api/form-drafts?form=   -> {draft, position, updated_at}
 *   PUT    /api/form-drafts {form, draft, position}
 *   DELETE /api/form-drafts?form=
 */

const client = { audience: "client" } as const;
const ok = z.object({ ok: z.literal(true) }).loose();
const draftSchema = z
  .object({
    ok: z.literal(true),
    draft: z.unknown().optional(),
    position: z.string().nullish(),
    updated_at: z.string().nullish(),
  })
  .loose()
  .transform((row) => ({ draft: row.draft ?? null, position: row.position ?? null, updated_at: row.updated_at ?? null }));

export function fetchDraft(form: string, signal?: AbortSignal) {
  return api(`/api/form-drafts?form=${encodeURIComponent(form)}`, draftSchema, { ...client, signal });
}

export function saveDraft(form: string, draft: unknown, position: string | null) {
  return api("/api/form-drafts", ok, { ...client, method: "PUT", body: { form, draft, position } });
}

export function clearDraft(form: string) {
  return api(`/api/form-drafts?form=${encodeURIComponent(form)}`, ok, { ...client, method: "DELETE" });
}
```

Create `src/lib/api/sale-story.ts`:

```ts
import { z } from "zod";
import { api } from "./client";

/*
 * Part A of onboarding, "How you found us": Pulsify's own record of how the client was sold.
 * Backend: Pulsify-Brain functions/api/sale-story.js. The client posts it once the part's last
 * question is answered; only operators read it. No generator ever sees it.
 */

export type SaleStoryAnswers = {
  believed: string;
  decision_time: string;
  sooner_if: string;
  almost_stopped: { pick: string; more: string };
  video: { link: string; pick: string };
  confidence: { score: number; more: string };
  touchpoints: { pick: string; rating: number; note: string }[];
};

const storySchema = z
  .object({
    ok: z.literal(true),
    story: z
      .object({ answers: z.record(z.string(), z.unknown()), completed_at: z.string(), updated_at: z.string() })
      .loose()
      .nullish(),
  })
  .loose();

export type SaleStoryRecord = NonNullable<z.infer<typeof storySchema>["story"]>;

export function saveSaleStory(answers: SaleStoryAnswers) {
  return api("/api/sale-story", z.object({ ok: z.literal(true) }).loose(), { audience: "client", body: { answers } });
}

export function fetchSaleStory(clientId: string, signal?: AbortSignal) {
  return api(`/api/sale-story?client=${encodeURIComponent(clientId)}`, storySchema, { signal });
}
```

Create `src/lib/api/onboarding-needs.ts`:

```ts
import { z } from "zod";
import { api } from "./client";

/* The operator's ticks on "What this client needs figured out" (#70). Backend: functions/api/onboarding-needs.js. */

export type NeedState = "done" | "call";

const statesSchema = z
  .object({ ok: z.literal(true), states: z.record(z.string(), z.enum(["done", "call"])).catch({}).default({}) })
  .loose();

export async function fetchNeedStates(clientId: string, signal?: AbortSignal) {
  const result = await api(`/api/onboarding-needs?client=${encodeURIComponent(clientId)}`, statesSchema, { signal });
  return result.states as Record<string, NeedState>;
}

export function setNeedState(clientId: string, key: string, state: NeedState | "open") {
  return api("/api/onboarding-needs", z.object({ ok: z.literal(true) }).loose(), { body: { client: clientId, key, state } });
}
```

- [ ] **Step 4: Write the hook**

Create `src/lib/use-form-draft.ts`:

```ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchDraft, saveDraft } from "@/lib/api/form-drafts";

/*
 * Nothing a client types is ever lost (founder 2026-10-15, ticket #67). Every change is written to
 * the browser at once and to the server about a second after typing stops. On return the newer of
 * the two copies comes back with the position, so the form reopens where they left off. Going
 * offline keeps the browser copy and sends it when the connection is back; hiding the tab sends it
 * straight away. Operator previews pass enabled: false and nothing is written.
 *
 * Any form can use it: pick a stable form key (letters, digits, dashes) and pass the client id as
 * scope so two clients on one browser never see each other's drafts.
 */

export type DraftStatus = "idle" | "saving" | "saved" | "offline";
export type StoredDraft<T> = { draft: T; position: string | null; updated_at: string };

const storageKey = (scope: string, form: string) => `pulsify:draft:${scope}:${form}`;

function readLocal<T>(key: string): StoredDraft<T> | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as StoredDraft<T>) : null;
  } catch {
    return null;
  }
}

function writeLocal<T>(key: string, value: StoredDraft<T>) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: the server copy still saves.
  }
}

/** The newer of two copies; a missing copy never wins. */
export function pickNewer<T>(local: StoredDraft<T> | null, server: StoredDraft<T> | null): StoredDraft<T> | null {
  if (!local) return server;
  if (!server) return local;
  return local.updated_at > server.updated_at ? local : server;
}

export function useFormDraft<T>({ form, scope, enabled, delay = 900 }: { form: string; scope: string; enabled: boolean; delay?: number }) {
  const key = storageKey(scope, form);
  const [loaded, setLoaded] = useState(false);
  const [restored, setRestored] = useState<StoredDraft<T> | null>(null);
  const [status, setStatus] = useState<DraftStatus>("idle");
  const pending = useRef<StoredDraft<T> | null>(null);
  const timer = useRef(0);

  useEffect(() => {
    let live = true;
    const local = readLocal<T>(key);
    void (async () => {
      let server: StoredDraft<T> | null = null;
      try {
        const record = await fetchDraft(form);
        if (record.draft != null && record.updated_at) server = { draft: record.draft as T, position: record.position, updated_at: record.updated_at };
      } catch {
        // Offline or not signed in: the browser copy still counts.
      }
      if (!live) return;
      setRestored(pickNewer(local, server));
      setLoaded(true);
    })();
    return () => {
      live = false;
    };
  }, [key, form]);

  const flush = useCallback(async () => {
    const next = pending.current;
    if (!next || !enabled) return;
    window.clearTimeout(timer.current);
    setStatus("saving");
    try {
      await saveDraft(form, next.draft, next.position);
      if (pending.current === next) pending.current = null;
      setStatus("saved");
    } catch {
      setStatus("offline");
    }
  }, [enabled, form]);

  const save = useCallback(
    (draft: T, position: string | null) => {
      if (!enabled) return;
      const stored: StoredDraft<T> = { draft, position, updated_at: new Date().toISOString() };
      pending.current = stored;
      writeLocal(key, stored);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void flush(), delay);
    },
    [enabled, key, delay, flush],
  );

  useEffect(() => {
    const online = () => void flush();
    const hidden = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    window.addEventListener("online", online);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("online", online);
      document.removeEventListener("visibilitychange", hidden);
      window.clearTimeout(timer.current);
    };
  }, [flush]);

  return { loaded, restored, status, save, flush };
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx playwright test tests/form-draft.spec.ts`
Expected: 1 passed.

- [ ] **Step 6: Commit**

```bash
git add src/lib/api/form-drafts.ts src/lib/api/sale-story.ts src/lib/api/onboarding-needs.ts src/lib/use-form-draft.ts tests/form-draft.spec.ts
git commit -m "Draft hook and API clients for onboarding v2 (#67)"
```

---

### Task 6: Brain mirrors, json fields on the operator screen, slightly bigger loader

**Files:**
- Modify: `src/features/brain/model.ts` (the client-field mirror object that ends with `"funnel.email_platform_tags": "client-form"`, and `SECTION_COLORS`)
- Modify: `src/features/brain/brain-section.tsx:207-280` (field editor)
- Modify: `src/components/shell/brand-loader.tsx`
- Test: `tests/brain.spec.ts` (existing operator brain tests must stay green)

**Interfaces:**
- Produces: `ONBOARDING_V2_FIELDS` (same object as the backend's, exported from `model.ts`) so Task 7's test can check every schema field is client-writable; `SECTION_COLORS` entries for `intent`, `money`, `positioning`, `content`, `program`, `commitment`.

- [ ] **Step 1: Mirror the backend field list**

In `src/features/brain/model.ts`, directly after the existing client-field mirror object, add:

```ts
/** Onboarding v2 fields the client writes (mirror of ONBOARDING_V2_FIELDS in Pulsify-Brain functions/api/client-brain.js). */
export const ONBOARDING_V2_FIELDS: Record<string, readonly string[]> = {
  identity: ["nickname", "age", "relationship_status", "niche_line"],
  intent: ["why_joined", "decision_story", "win_90d"],
  money: ["last_3_months", "monthly_income", "content_revenue_baseline"],
  offer: ["history", "current_name", "price", "walkthrough", "result", "type", "past_offer", "target_type", "target_price", "payment_platforms", "past_growth_help"],
  icp: ["known", "best_client", "age_range", "gender_mix", "life_stage", "daily_life", "income", "payment_style", "engagers", "before_state", "tried_before", "buying_behaviour", "tipping_point", "client_objections", "client_language", "never_client", "starter_profile"],
  story: ["start_type"],
  positioning: ["mechanism_status", "mechanism", "method_walkthrough", "difference_known", "difference", "competitors", "competitor_gap", "content_shows_it", "love_topics", "hour_topic", "avoid_topics"],
  voice: ["persona", "persona_second", "persona_other", "unhinged_level", "filter", "flagged_level", "flagged_words", "sliders", "never_say"],
  content: ["home_platform", "longform_awareness", "hard_parts", "hard_why", "yt_format", "format_why", "cadence", "process", "video_time", "script_time", "daily_time", "schedule", "film_hours", "best_post", "skills", "hates", "helpers"],
  proof: ["own_best", "own_how", "own_proof", "level", "best_result", "count", "top_results", "storage", "own_enough", "closest_thing"],
  funnel: ["stage_focus", "terms_known", "tried", "wanted", "has_funnel", "sales_method", "lead_sources", "path", "step_links", "tools", "owners", "tracks_numbers", "metrics", "leak", "non_buyer_followup", "ads", "ads_detail", "ads_stopped_why"],
  program: ["status", "missing"],
  commitment: ["understood", "promised"],
};

/** Every "section.field" a client may write: the original form's fields plus onboarding v2. */
export const CLIENT_WRITABLE = new Set<string>([
  ...Object.keys(CLIENT_FIELD_SOURCES),
  ...Object.entries(ONBOARDING_V2_FIELDS).flatMap(([section, keys]) => keys.map((key) => `${section}.${key}`)),
]);
```

`CLIENT_FIELD_SOURCES` above is a stand-in for the existing mirror object's real name: open `model.ts`, find the object whose last entry is `"funnel.email_platform_tags": "client-form"`, and use its name.

Extend `SECTION_COLORS`:

```ts
export const SECTION_COLORS: Record<string, string> = {
  identity: "var(--chart-1)",
  intent: "var(--chart-2)",
  money: "var(--chart-critical)",
  offer: "var(--chart-2)",
  icp: "var(--chart-3)",
  story: "var(--chart-4)",
  positioning: "var(--chart-3)",
  voice: "var(--chart-5)",
  content: "var(--chart-5)",
  proof: "var(--chart-6)",
  funnel: "var(--chart-7)",
  program: "var(--chart-6)",
  commitment: "var(--chart-context)",
  donot: "var(--chart-critical)",
};
```

- [ ] **Step 2: Show json fields read-only on the operator brain screen**

In `src/features/brain/brain-section.tsx`, where the field editor branches on `type` (around line 253, `type === "boolean" ? (...)`), add a branch before the boolean one so json fields are shown, not edited:

```tsx
          {type === "json" ? (
            <pre className="max-h-72 overflow-auto rounded-lg bg-muted/60 p-3 font-mono text-[12.5px] leading-relaxed whitespace-pre-wrap">
              {JSON.stringify(field.value ?? null, null, 2)}
            </pre>
          ) : type === "boolean" ? (
```

and close the extra branch where the existing ternary ends. Also make the Edit button not appear for `type === "json"` (find where the edit button renders and add `type !== "json" &&` to its condition). The client's answers stay theirs; the readable version lives in the new Onboarding view (Task 16).

- [ ] **Step 3: Make the loader logo a little bigger (founder: "slightly bigger, not huge")**

In `src/components/shell/brand-loader.tsx` change the glow `size-28` to `size-32`, and the image `width={56} height={56}` / `size-14` to `width={64} height={64}` / `size-16`.

- [ ] **Step 4: Typecheck and run the operator brain tests**

Run: `npm run typecheck`
Expected: no errors.

Run: `npx playwright test tests/brain.spec.ts`
Expected: all pass. If a test counted the sidebar sections (it used to be 8), update it to 14 and note why in the commit.

- [ ] **Step 5: Commit**

```bash
git add src/features/brain src/components/shell/brand-loader.tsx tests/brain.spec.ts
git commit -m "Brain: onboarding v2 field mirror, section colours, json fields read-only; loader a little bigger"
```

---

### Task 7: Question schema types and the engine

**Files:**
- Create: `src/features/onboarding/schema/types.ts`
- Create: `src/features/onboarding/schema/handles.ts`
- Create: `src/features/onboarding/engine.ts`
- Create: `tests/onboarding-engine.spec.ts`

**Interfaces:**
- Produces (used by every later task):
  - Types `Answers`, `Option`, `Ctx`, `Read`, `PartKey`, `Screen`, `ScreenDraft`, `MoneyRow`, `AmountOrPercent`, `PerPick`, `Persona`, `LinkOrChoice`, `ProofFiles`, `ProofCard`, `StarterVerdicts`, `HandlesValue`.
  - `PART_LABELS: Record<PartKey, string | null>`, `PART_ORDER: PartKey[]`, `inPart(part, drafts): Screen[]`, `opts(...pairs): Option[]`.
  - `MORE(id: string): string` (the answers key of a screen's "Say more" box).
  - `ctxOf(answers): Ctx`, `resolve(text, ctx): string`.
  - `visibleScreens(answers, screens): Screen[]`
  - `isBlank(value): boolean`
  - `problemWith(screen, answers): string | null`
  - `fieldsFor(screen, answers): Record<string, unknown>`
  - `changedFields(fields, saved): Record<string, Record<string, unknown>> | null`
  - `prefill(read, screens): Answers`
  - `withInitial(screen, answers): Answers`
  - `minutesLeft(screens, index): number`
  - `partBars(screens, index): { part, label, done, total, current }[]`
  - `resumeIndex(screens, answers, position): number`
  - `lastThreeMonths(today: Date): string[]` (`"2026-07"` style, oldest first)
  - `handlesList(value)`, `parseHandles(value)`, `platformHandles(lines)`, `handleOf(text)`, `normalizeLink(text)`

The engine never imports React. The screens list is passed in (`SCREENS` from Task 8 onwards), so the tests can use small fake schemas.

- [ ] **Step 1: Write the failing test**

Create `tests/onboarding-engine.spec.ts`:

```ts
import { expect, test } from "@playwright/test";
import {
  changedFields,
  fieldsFor,
  isBlank,
  lastThreeMonths,
  minutesLeft,
  MORE,
  partBars,
  prefill,
  problemWith,
  resumeIndex,
  visibleScreens,
  withInitial,
} from "../src/features/onboarding/engine";
import { inPart, opts, type Screen } from "../src/features/onboarding/schema/types";

/* The onboarding engine (onboarding v2): branching, required checks, what is saved, timing. Pure, no browser. */

const SCREENS: Screen[] = [
  ...inPart("offer", [
    { id: "offer.status", ref: "4.1", kind: "choice", title: "Have you had an offer before?", required: true, field: "offer.history", options: opts(["selling", "Selling"], ["never", "Never"]) },
    { id: "offer.result", ref: "4.4", kind: "long", title: "What's the result?", required: true, field: "offer.result", when: (a) => a["offer.status"] === "selling" },
  ]),
  ...inPart("money", [
    { id: "money.months", ref: "3.1", kind: "money", title: "Last 3 months", required: true, field: "money.last_3_months", seconds: 60 },
    { id: "money.monthly", ref: "3.2", kind: "number", title: "Monthly now", required: true, field: "money.monthly_income", initial: (a) => (a["money.months"] as { revenue: string }[] | undefined)?.at(-1)?.revenue },
  ]),
  ...inPart("funnel", [
    { id: "funnel.leak", ref: "10.12", kind: "choice", title: "Where does it leak?", field: "funnel.leak", sayMore: "What's your guess why?", options: opts(["no-show", "They book but don't show"]) },
  ]),
];

test("branches show only the screens their answers open", () => {
  expect(visibleScreens({}, SCREENS).map((s) => s.id)).toEqual(["offer.status", "money.months", "money.monthly", "funnel.leak"]);
  expect(visibleScreens({ "offer.status": "selling" }, SCREENS).map((s) => s.id)).toContain("offer.result");
});

test("required screens say what is missing; optional ones never block", () => {
  const [status, , months, monthly, leak] = SCREENS;
  expect(problemWith(status, {})).toBe("Choose one to continue.");
  expect(problemWith(status, { "offer.status": "never" })).toBeNull();
  expect(problemWith(months, { "money.months": [{ month: "2026-07", revenue: "100", profit: "" }] })).toBe("Fill in revenue and profit for all three months.");
  expect(
    problemWith(months, {
      "money.months": [
        { month: "2026-07", revenue: "100", profit: "40" },
        { month: "2026-08", revenue: "0", profit: "0" },
        { month: "2026-09", revenue: "12,400", profit: "7,600" },
      ],
    }),
  ).toBeNull();
  expect(problemWith(monthly, { "money.monthly": "abc" })).toBe("Add a number to continue.");
  expect(problemWith(leak, {})).toBeNull();
});

test("a Say more screen saves the pick and the words together", () => {
  const leak = SCREENS[4];
  expect(fieldsFor(leak, { "funnel.leak": "no-show", [MORE("funnel.leak")]: " They ghost. " })).toEqual({ "funnel.leak": { pick: "no-show", more: "They ghost." } });
});

test("blank answers never clear a field and unchanged answers are not sent again", () => {
  expect(isBlank({ pick: null, more: "" })).toBe(true);
  expect(changedFields({ "offer.history": "never", "offer.result": "" }, { "offer.history": "never" })).toBeNull();
  expect(changedFields({ "offer.history": "selling" }, { "offer.history": "never" })).toEqual({ offer: { history: "selling" } });
});

test("prefill reads saved answers back, splitting Say more objects", () => {
  const stored: Record<string, unknown> = { "offer.history": "selling", "funnel.leak": { pick: "no-show", more: "Ghosting" } };
  const answers = prefill((section, field) => stored[`${section}.${field}`] ?? null, SCREENS);
  expect(answers["offer.status"]).toBe("selling");
  expect(answers["funnel.leak"]).toBe("no-show");
  expect(answers[MORE("funnel.leak")]).toBe("Ghosting");
});

test("an initial value fills a blank screen from an earlier answer, never over a real one", () => {
  const monthly = SCREENS[3];
  const months = [{ month: "2026-09", revenue: "12400", profit: "7600" }];
  expect(withInitial(monthly, { "money.months": months })["money.monthly"]).toBe("12400");
  expect(withInitial(monthly, { "money.months": months, "money.monthly": "9000" })["money.monthly"]).toBe("9000");
});

test("time left counts the remaining visible screens, at least one minute", () => {
  const visible = visibleScreens({}, SCREENS);
  expect(minutesLeft(visible, 0)).toBe(2);
  expect(minutesLeft(visible, visible.length - 1)).toBe(1);
});

test("part bars count done screens per part", () => {
  const visible = visibleScreens({}, SCREENS);
  const bars = partBars(visible, 2);
  expect(bars.map((bar) => [bar.part, bar.done, bar.total, bar.current])).toEqual([
    ["offer", 1, 1, false],
    ["money", 1, 2, true],
    ["funnel", 0, 1, false],
  ]);
});

test("resume goes to the saved position, else the first unanswered required screen", () => {
  const visible = visibleScreens({}, SCREENS);
  expect(resumeIndex(visible, {}, "money.monthly")).toBe(2);
  expect(resumeIndex(visible, { "offer.status": "never" }, null)).toBe(1);
  expect(resumeIndex(visible, {}, "gone.screen")).toBe(0);
});

test("the last three full months, oldest first", () => {
  expect(lastThreeMonths(new Date("2026-10-15T12:00:00Z"))).toEqual(["2026-07", "2026-08", "2026-09"]);
  expect(lastThreeMonths(new Date("2026-02-01T12:00:00Z"))).toEqual(["2025-11", "2025-12", "2026-01"]);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx playwright test tests/onboarding-engine.spec.ts`
Expected: FAIL, cannot find module `../src/features/onboarding/engine`.

- [ ] **Step 3: Write the schema types**

Create `src/features/onboarding/schema/types.ts`:

```ts
/*
 * The onboarding v2 question schema (founder 2026-10-15; spec: Pulsify-Brain
 * wiki/synthesis/onboarding-v2-spec-2026-10-15.md). One screen per question. A screen's kind names
 * the control it shows; `when` decides whether it is shown for these answers; `field` (or `save`)
 * says which client-brain field it writes. Answers are keyed by screen id; a screen's "Say more"
 * box is stored under MORE(id).
 */

export type PartKey =
  | "connect"
  | "welcome"
  | "sale"
  | "you"
  | "why"
  | "money"
  | "offer"
  | "buyer"
  | "story"
  | "positioning"
  | "camera"
  | "content"
  | "funnel"
  | "proof"
  | "program"
  | "deal"
  | "readback";

export const PART_ORDER: PartKey[] = ["connect", "welcome", "sale", "you", "why", "money", "offer", "buyer", "story", "positioning", "camera", "content", "funnel", "proof", "program", "deal", "readback"];

/** Names on the progress bar and in the read-back. null: not a part of the form (no bar). */
export const PART_LABELS: Record<PartKey, string | null> = {
  connect: null,
  welcome: null,
  sale: "How you found us",
  you: "You",
  why: "Why now",
  money: "Money",
  offer: "Your offer",
  buyer: "Your buyer",
  story: "Your story",
  positioning: "Positioning",
  camera: "On camera",
  content: "Your content",
  funnel: "Your funnel",
  proof: "Your proof",
  program: "Your program",
  deal: "The deal",
  readback: null,
};

export type Answers = Record<string, unknown>;
export type Option = { value: string; label: string; note?: string };
export type Ctx = { answers: Answers; niche: string };
export type Read = (section: string, field: string) => unknown;
export type Text = string | ((ctx: Ctx) => string);

export type MoneyRow = { month: string; revenue: string; profit: string };
export type AmountOrPercent = { mode: "amount" | "percent"; value: string };
export type PerPick = Record<string, { rating?: number; verdict?: string; note?: string }>;
export type Persona = { first: string; second?: string; other?: string };
export type LinkOrChoice = { link?: string; pick?: string };
export type ProofFiles = { types: string[]; uploads: { id: number; url: string }[] };
export type ProofCard = { who: string; result: string; time: string; permission: string; upload?: { id: number; url: string } };
export type StarterVerdicts = Record<string, { verdict: "yes" | "fix"; fix?: string }>;
export type HandlesValue = { picked: string[]; handles: Record<string, string> };

type Input = { key: string; label: string; placeholder?: string; inputMode?: "text" | "url" | "numeric"; long?: boolean; optional?: boolean };

export type Kind =
  | { kind: "connect" }
  | { kind: "welcome" }
  | { kind: "readback" }
  | { kind: "info"; body?: Text; bullets?: string[] }
  | { kind: "text"; placeholder?: string; inputMode?: "text" | "url" | "numeric" }
  | { kind: "long"; placeholder?: string; talk?: boolean; copyFrom?: string }
  | { kind: "number"; prefix?: string }
  | { kind: "choice"; options: Option[] }
  | { kind: "multi"; options: Option[]; exclusive?: string[] }
  | { kind: "scale"; min: number; max: number; labels?: Record<number, string> }
  | { kind: "sliders"; sliders: { key: string; left: string; right: string }[] }
  | { kind: "fields"; inputs: Input[] }
  | { kind: "chips"; placeholder: string }
  | { kind: "handles"; platforms: Option[] }
  | { kind: "niche" }
  | { kind: "money" }
  | { kind: "amount-or-percent" }
  | { kind: "rows"; rows: (ctx: Ctx) => Option[]; levels: Option[] }
  | { kind: "per-pick"; from: string; options: Option[]; prompt: string; rating?: { min: number; max: number }; verdicts?: Option[] }
  | { kind: "persona"; options: Option[] }
  | { kind: "path"; steps: Option[] }
  | { kind: "step-links"; steps: Option[] }
  | { kind: "facts"; cards: { title: string; body: string }[] }
  | { kind: "stages" }
  | { kind: "horizontal" }
  | { kind: "quiz" }
  | { kind: "starter" }
  | { kind: "proof-files"; types: Option[] }
  | { kind: "proof-cards" }
  | { kind: "link-or-choice"; options: Option[] };

type Common = {
  id: string;
  part: PartKey;
  /** The question number in the spec, for tracing a screen back to the founder's wording. */
  ref: string;
  title: Text;
  note?: Text;
  /** A line above the title that builds on an earlier answer ("You told us about..."). */
  intro?: (ctx: Ctx) => string | null;
  when?: (answers: Answers) => boolean;
  required?: boolean;
  /** Label of the "Say more" box under the control (type or talk). Saved with the answer as {pick, more}. */
  sayMore?: string;
  /** Rough seconds to answer, for "about N min left". Default 20. */
  seconds?: number;
  /** The client-brain field this screen writes, "section.field". */
  field?: string;
  /** Custom save for screens that write several fields or a shaped value. */
  save?: (answers: Answers) => Record<string, unknown>;
  /** Custom prefill from the brain; returns answer keys to set. */
  read?: (read: Read) => Answers;
  /** A value to start with when the screen is blank, from earlier answers. */
  initial?: (answers: Answers) => unknown;
};

export type Screen = Kind & Common;

/** A screen without its part, so each part file only names its part once. */
export type ScreenDraft = Screen extends infer S ? (S extends Screen ? Omit<S, "part"> : never) : never;

export function inPart(part: PartKey, drafts: ScreenDraft[]): Screen[] {
  return drafts.map((draft) => ({ ...draft, part }) as Screen);
}

/** Options from [value, label, note?] triples. */
export function opts(...pairs: [string, string, string?][]): Option[] {
  return pairs.map(([value, label, note]) => (note ? { value, label, note } : { value, label }));
}
```

- [ ] **Step 4: Move the handle helpers**

Create `src/features/onboarding/schema/handles.ts` with `normalizeLink`, `platformHandles` and `handleOf` copied unchanged from today's `src/features/onboarding/answers.ts` (the functions of those names, with their comments), plus:

```ts
import type { HandlesValue } from "./types";

const PLATFORM_LABELS: Record<string, string> = { youtube: "YouTube", instagram: "Instagram", tiktok: "TikTok", x: "X", other: "Other" };

/** {picked, handles} -> the identity.handles list, one "Platform: handle" line per picked platform. */
export function handlesList(value: unknown): string[] {
  const v = (value ?? { picked: [], handles: {} }) as HandlesValue;
  return (v.picked ?? [])
    .map((platform) => [PLATFORM_LABELS[platform] ?? platform, (v.handles?.[platform] ?? "").trim()] as const)
    .filter(([, handle]) => handle)
    .map(([label, handle]) => `${label}: ${handle}`);
}

/** The identity.handles list back into {picked, handles}. Older bare entries ("@rio") are read as Instagram or YouTube links. */
export function parseHandles(value: unknown): HandlesValue {
  const lines = Array.isArray(value) ? value.map(String) : typeof value === "string" ? value.split(/\r?\n/) : [];
  const out: HandlesValue = { picked: [], handles: {} };
  const legacy: string[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    const match = line.match(/^(YouTube|Instagram|TikTok|X|Other):\s*(.+)$/i);
    if (match) {
      const key = Object.keys(PLATFORM_LABELS).find((k) => PLATFORM_LABELS[k].toLowerCase() === match[1].toLowerCase())!;
      if (!out.picked.includes(key)) out.picked.push(key);
      out.handles[key] = match[2].trim();
    } else if (line) legacy.push(line);
  }
  const found = platformHandles(legacy);
  for (const key of ["instagram", "youtube"] as const) {
    if (found[key] && !out.handles[key]) {
      out.picked.push(key);
      out.handles[key] = `@${found[key]}`;
    }
  }
  return out;
}
```

- [ ] **Step 5: Write the engine**

The engine imports `nicheContent` from `./niche-content`, which Task 8 writes. Do Task 8 before this step, or create `niche-content.ts` now from Task 8 Step 1 and commit it with this task.

Create `src/features/onboarding/engine.ts`:

```ts
import { readNiche } from "@/lib/niches";
import { nicheContent } from "./niche-content";
import { PART_LABELS, type Answers, type Ctx, type MoneyRow, type PartKey, type Read, type Screen, type Text } from "./schema/types";
export { handleOf, handlesList, normalizeLink, parseHandles, platformHandles } from "./schema/handles";

/*
 * The onboarding v2 engine. Pure: which screens show for these answers, what blocks Continue,
 * what each screen writes to the brain, what comes back on return, and how long is left.
 */

export const MORE = (id: string) => `${id}:more`;
export const DEFAULT_SECONDS = 20;

export function ctxOf(answers: Answers): Ctx {
  const niche = readNiche(answers["you.niche"]);
  return { answers, niche: niche.id === "" ? "" : niche.id };
}

export const resolve = (text: Text | undefined, ctx: Ctx) => (typeof text === "function" ? text(ctx) : (text ?? ""));

export function visibleScreens(answers: Answers, screens: Screen[]): Screen[] {
  return screens.filter((screen) => !screen.when || screen.when(answers));
}

export function isBlank(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "string") return !value.trim();
  if (typeof value === "number") return Number.isNaN(value);
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.values(value as Record<string, unknown>).every(isBlank);
  return false;
}

/** "12,400" or "$12400" -> 12400; anything else -> null. */
export function num(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[$,\s]/g, "");
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  return Number(cleaned);
}

export function problemWith(screen: Screen, answers: Answers): string | null {
  if (!screen.required) return null;
  const value = answers[screen.id];
  switch (screen.kind) {
    case "money": {
      const rows = (value as MoneyRow[] | undefined) ?? [];
      return rows.length === 3 && rows.every((row) => num(row.revenue) != null && num(row.profit) != null) ? null : "Fill in revenue and profit for all three months.";
    }
    case "number":
      return num(value) != null ? null : "Add a number to continue.";
    case "amount-or-percent": {
      const v = value as { value?: string } | undefined;
      return num(v?.value) != null ? null : "Add a number or a percent to continue.";
    }
    case "choice":
    case "niche":
      return isBlank(value) ? "Choose one to continue." : null;
    case "multi":
      return Array.isArray(value) && value.length ? null : "Choose at least one to continue.";
    case "scale":
      return typeof value === "number" ? null : "Tap a number to continue.";
    case "fields": {
      const v = (value ?? {}) as Record<string, string>;
      return screen.inputs.every((input) => input.optional || !isBlank(v[input.key])) ? null : "Fill in the boxes to continue.";
    }
    case "per-pick": {
      const picks = ((answers[screen.from] as string[] | undefined) ?? []).filter((pick) => screen.options.some((o) => o.value === pick));
      const v = (value ?? {}) as Record<string, { rating?: number; verdict?: string }>;
      const ok = picks.every((pick) => (screen.rating ? typeof v[pick]?.rating === "number" : true) && (screen.verdicts ? Boolean(v[pick]?.verdict) : true));
      return ok ? null : screen.rating ? "Rate each one to continue." : "Answer each one to continue.";
    }
    case "link-or-choice": {
      const v = (value ?? {}) as { link?: string; pick?: string };
      return isBlank(v.link) && isBlank(v.pick) ? "Paste the link, or tap where you saw us." : null;
    }
    case "persona":
      return isBlank((value as { first?: string } | undefined)?.first) ? "Pick how you want to be seen." : null;
    case "path":
      return Array.isArray(value) && value.length >= 2 ? null : "Add at least two steps, in order.";
    case "proof-files":
      return isBlank((value as { types?: string[] } | undefined)?.types) ? "Pick one to continue." : null;
    case "starter": {
      const verdicts = (value ?? {}) as Record<string, { verdict?: string }>;
      const cards = nicheContent(ctxOf(answers).niche).starter;
      return cards.every((card) => verdicts[card.key]?.verdict) ? null : "Answer every card to continue.";
    }
    default:
      return isBlank(value) ? "Add an answer to continue." : null;
  }
}

export function fieldsFor(screen: Screen, answers: Answers): Record<string, unknown> {
  if (screen.save) return screen.save(answers);
  if (!screen.field) return {};
  const value = answers[screen.id];
  if (screen.sayMore) return { [screen.field]: { pick: value ?? null, more: String(answers[MORE(screen.id)] ?? "").trim() } };
  return { [screen.field]: typeof value === "string" ? value.trim() : value };
}

/** Only changed, non-blank values go out; a blank never clears a field the operator may have filled. */
export function changedFields(fields: Record<string, unknown>, saved: Record<string, unknown>) {
  const out: Record<string, Record<string, unknown>> = {};
  let count = 0;
  for (const [key, value] of Object.entries(fields)) {
    if (isBlank(value) || JSON.stringify(saved[key] ?? null) === JSON.stringify(value)) continue;
    const [section, field] = key.split(".");
    out[section] = { ...out[section], [field]: value };
    count += 1;
  }
  return count ? out : null;
}

export function prefill(read: Read, screens: Screen[]): Answers {
  const answers: Answers = {};
  for (const screen of screens) {
    if (screen.read) {
      Object.assign(answers, screen.read(read));
      continue;
    }
    if (!screen.field) continue;
    const [section, field] = screen.field.split(".");
    const stored = read(section, field);
    if (stored == null) continue;
    if (screen.sayMore && typeof stored === "object" && !Array.isArray(stored)) {
      const { pick, more } = stored as { pick?: unknown; more?: unknown };
      if (pick != null) answers[screen.id] = pick;
      if (typeof more === "string" && more) answers[MORE(screen.id)] = more;
    } else answers[screen.id] = stored;
  }
  return answers;
}

export function withInitial(screen: Screen, answers: Answers): Answers {
  if (!screen.initial || !isBlank(answers[screen.id])) return answers;
  const value = screen.initial(answers);
  return isBlank(value) ? answers : { ...answers, [screen.id]: value };
}

export function minutesLeft(screens: Screen[], index: number): number {
  const seconds = screens.slice(Math.max(index, 0)).reduce((sum, screen) => sum + (screen.seconds ?? DEFAULT_SECONDS), 0);
  return Math.max(1, Math.round(seconds / 60));
}

export function partBars(screens: Screen[], index: number) {
  // Parts in the order the screens show them; parts with no label (connect, welcome, read-back) get no bar.
  const parts = [...new Set(screens.map((screen) => screen.part))].filter((part) => PART_LABELS[part]);
  return parts.map((part: PartKey) => {
    const positions = screens.flatMap((screen, i) => (screen.part === part ? [i] : []));
    return { part, label: PART_LABELS[part] as string, done: positions.filter((i) => i < index).length, total: positions.length, current: screens[index]?.part === part };
  });
}

export function resumeIndex(screens: Screen[], answers: Answers, position: string | null): number {
  if (position) {
    const at = screens.findIndex((screen) => screen.id === position);
    if (at !== -1) return at;
  }
  const open = screens.findIndex((screen) => screen.required && problemWith(screen, answers));
  return open === -1 ? 0 : open;
}

export function lastThreeMonths(today: Date): string[] {
  const out: string[] = [];
  for (let back = 3; back >= 1; back -= 1) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - back, 1));
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}
```

The resume test expects `resumeIndex(visible, {}, "gone.screen")` to be 0: with no answers the first required screen (`offer.status`, index 0) is open. It expects `resumeIndex(visible, { "offer.status": "never" }, null)` to be 1: `money.months` is the first open required screen.

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx playwright test tests/onboarding-engine.spec.ts`
Expected: 10 passed.

- [ ] **Step 7: Commit**

```bash
git add src/features/onboarding/schema/types.ts src/features/onboarding/schema/handles.ts src/features/onboarding/engine.ts tests/onboarding-engine.spec.ts
git commit -m "Onboarding v2: question schema types and pure engine"
```

---

## Phase 3: The questions

Every title, note and option label below is the spec's wording. If you find a difference between this plan and the spec, the spec wins; fix the plan's code to match and mention it in the commit.

### Task 8: Niche content (TOF/MOF/BOF examples, quiz, starter buyer cards)

**Files:**
- Create: `src/features/onboarding/niche-content.ts`

**Interfaces:**
- Produces: `type Stage = "tof" | "mof" | "bof"`, `type NicheContent = { line: string; stages: Record<Stage, string>; quiz: { line: string; answer: Stage }[]; starter: { key: string; label: string; text: string }[] }`, `nicheContent(niche: string): NicheContent` (falls back to `other`), `STARTER_KEYS`.

Founder rules that apply: our make-money-online niches only; examples are written for the client to confirm or fix, so they never claim a statistic as fact (the one "90%" title is the founder-approved spec example). Starter cards use the pain language from Brain `wiki/content-engine/youtube-lead-sourcing-query-bank.md`; high-ticket sales and "other" have no query-bank section, so their cards are general and say so in a comment.

- [ ] **Step 1: Write the file**

Create `src/features/onboarding/niche-content.ts`:

```ts
import type { NicheId } from "@/lib/niches";

/*
 * Niche examples for onboarding v2: the TOF/MOF/BOF examples (10.1), the quick check (10.1b) and
 * the starter buyer cards for clients who don't know their buyer yet (5.5n). The client confirms or
 * fixes every card; nothing here is shown as fact. Pain language for trading, ecommerce, TikTok Shop
 * and Amazon FBA comes from Pulsify-Brain wiki/content-engine/youtube-lead-sourcing-query-bank.md.
 * High-ticket sales and "other" have no query-bank section yet, so their cards stay general.
 */

export type Stage = "tof" | "mof" | "bof";
export type NicheContent = {
  line: string;
  stages: Record<Stage, string>;
  quiz: { line: string; answer: Stage }[];
  starter: { key: string; label: string; text: string }[];
};

export const STARTER_KEYS = ["age", "life", "money", "stuck", "behaviour", "objections", "words"] as const;
const LABELS: Record<(typeof STARTER_KEYS)[number], string> = {
  age: "Age",
  life: "Their life",
  money: "Money",
  stuck: "What they're stuck on",
  behaviour: "How they act before buying",
  objections: "What they say when they say no",
  words: "The words they use",
};
const cards = (texts: Record<(typeof STARTER_KEYS)[number], string>) => STARTER_KEYS.map((key) => ({ key, label: LABELS[key], text: texts[key] }));

const NICHE_CONTENT: Record<NicheId | "other", NicheContent> = {
  trading: {
    line: "For example: prop firm challenges",
    stages: {
      tof: "Why 90% of traders blow their first prop firm challenge.",
      mof: "The exact mistake that cost me 3 challenges in a row.",
      bof: "If you've passed a challenge but keep losing the funded account, this is for you.",
    },
    quiz: [
      { line: "Why most traders never become consistent.", answer: "tof" },
      { line: "How I stopped overtrading my funded account.", answer: "mof" },
      { line: "If you keep failing the same prop firm rule, here's how my students fix it.", answer: "bof" },
    ],
    starter: cards({
      age: "Mostly 20 to 35, plenty of them still in a 9-5 they want out of.",
      life: "Trades around a job: charts at night and on weekends, watches a lot of free YouTube.",
      money: "Has already paid for courses, signals or challenge fees.",
      stuck: "Can't stay consistent: revenge trading, overtrading, failing prop firm challenges.",
      behaviour: "Watches for months, asks questions in DMs, buys after seeing student payouts.",
      objections: '"I\'ve tried courses before." "I need to pass a challenge first."',
      words: '"I keep blowing accounts." "I know the strategy, I just can\'t follow it."',
    }),
  },
  ecommerce: {
    line: "For example: dropshipping with organic TikTok",
    stages: {
      tof: "Why most new stores never make a sale.",
      mof: "I got traffic but no sales for 3 weeks. Here's what fixed it.",
      bof: "If your ads spend but your store won't convert, this is for you.",
    },
    quiz: [
      { line: "Why most new stores fail in their first month.", answer: "tof" },
      { line: "The product test that finally got my store its first sales.", answer: "mof" },
      { line: "If your ROAS dies every time you scale, here's how we fix it inside my program.", answer: "bof" },
    ],
    starter: cards({
      age: "Mostly 20 to 35, often starting the store next to a job or studies.",
      life: "Works on the store at night, tests products, watches dropshipping YouTube.",
      money: "Has spent on ads and apps already, often with little back.",
      stuck: "Getting traffic but no sales, ads not converting, can't find a winning product.",
      behaviour: "Tries alone first, burns ad money, then looks for someone who has done it.",
      objections: '"I don\'t have money left for ads." "I\'ve bought a course before."',
      words: '"My store isn\'t selling." "My ads stopped working."',
    }),
  },
  "tiktok-shop": {
    line: "For example: TikTok Shop affiliate videos",
    stages: {
      tof: "Why most TikTok Shop sellers get views and no orders.",
      mof: "How I got my first affiliates to post my product.",
      bof: "If you've got TikTok Shop views but no sales, this is for you.",
    },
    quiz: [
      { line: "Why TikTok Shop is the easiest place to start selling right now.", answer: "tof" },
      { line: "How I got my first affiliates posting my product.", answer: "mof" },
      { line: "If you have views but your orders won't move, this is how my students fix it.", answer: "bof" },
    ],
    starter: cards({
      age: "Mostly 18 to 30, already on TikTok every day.",
      life: "Posts videos around a job or studies, tries products and affiliate links.",
      money: "Small budget, wants to start without big ad spend.",
      stuck: "Views but no orders, can't get affiliates to post, sales won't grow.",
      behaviour: "Moves fast, buys when they see someone like them getting orders.",
      objections: '"TikTok Shop is saturated." "I don\'t have time to post every day."',
      words: '"I get views but no sales." "No one is buying from my shop."',
    }),
  },
  "amazon-fba": {
    line: "For example: private label product launches",
    stages: {
      tof: "Why most Amazon products never rank.",
      mof: "My PPC was burning money until I changed this.",
      bof: "If your listing is live but not selling, this is for you.",
    },
    quiz: [
      { line: "Why most people quit Amazon FBA in their first year.", answer: "tof" },
      { line: "How I lowered my ACoS without losing rank.", answer: "mof" },
      { line: "If your launch flopped and your listing is stuck, here's how we relaunch it together.", answer: "bof" },
    ],
    starter: cards({
      age: "Mostly 25 to 45, many with a job and some savings to invest.",
      life: "Researches products in the evenings, deals with suppliers and listings.",
      money: "Has money tied up in stock and PPC, so every mistake costs.",
      stuck: "Product not ranking, PPC not converting, margins too low, launch flopped.",
      behaviour: "Careful: compares programs, wants proof and case studies before buying.",
      objections: '"Amazon is too competitive now." "I can\'t afford to lose more on stock."',
      words: '"My product isn\'t selling." "My ACoS is killing me."',
    }),
  },
  "ht-sales": {
    line: "For example: closing for coaching offers",
    stages: {
      tof: "Why most people who try sales quit in their first few months.",
      mof: "The question that turned my 'let me think about it' calls into closes.",
      bof: "If you're taking calls but your close rate is stuck, this is for you.",
    },
    quiz: [
      { line: "Why sales is one of the best skills to learn right now.", answer: "tof" },
      { line: "How I handle 'I need to think about it' on every call.", answer: "mof" },
      { line: "If your close rate is stuck and you want a spot on a real team, this is for you.", answer: "bof" },
    ],
    starter: cards({
      age: "Mostly 20 to 35, often coming from a job they're tired of.",
      life: "Takes calls or wants to, learns from free content, looking for a team to join.",
      money: "Little to invest, wants commission income fast.",
      stuck: "Can't close, no steady offers to sell, doesn't know how to get placed.",
      behaviour: "Decides on the call, wants to see placements and income proof.",
      objections: '"I\'ve never sold before." "Is this commission only?"',
      words: '"I keep getting \'let me think about it\'." "I don\'t know how to get on a team."',
    }),
  },
  other: {
    line: "In your own words, as specific as you can",
    stages: {
      tof: "The biggest mistake beginners make in your world.",
      mof: "What I got wrong for a year, and what fixed it.",
      bof: "If you're stuck on the exact problem my program solves, this is for you.",
    },
    quiz: [
      { line: "The mistake almost every beginner makes.", answer: "tof" },
      { line: "What I got wrong for a year, and what fixed it.", answer: "mof" },
      { line: "If you're stuck on the exact problem my program solves, this is for you.", answer: "bof" },
    ],
    starter: cards({
      age: "Adults who want to earn from this skill, often next to a job.",
      life: "Learns from free content in their spare time.",
      money: "Has tried something before and wants it to work this time.",
      stuck: "Knows the basics but can't get consistent results.",
      behaviour: "Watches for a while, asks questions, buys when they see proof.",
      objections: '"I\'ve tried before." "I don\'t have the time right now."',
      words: '"I know what to do, I just can\'t make it work."',
    }),
  },
};

export function nicheContent(niche: string): NicheContent {
  return NICHE_CONTENT[niche as NicheId] ?? NICHE_CONTENT.other;
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors (the `NicheId` keys must match `src/lib/niches.ts`; if a niche id there changed, follow it).

- [ ] **Step 3: Commit**

```bash
git add src/features/onboarding/niche-content.ts
git commit -m "Onboarding v2: niche examples, quick check and starter buyer cards"
```

---

### Task 9: Parts 0, A, 1 to 4 (connect, welcome, how you found us, you, why now, money, offer)

**Files:**
- Create: `src/features/onboarding/schema/parts/start.ts` (connect + welcome)
- Create: `src/features/onboarding/schema/parts/sale.ts`
- Create: `src/features/onboarding/schema/parts/you.ts`
- Create: `src/features/onboarding/schema/parts/why.ts`
- Create: `src/features/onboarding/schema/parts/money.ts`
- Create: `src/features/onboarding/schema/parts/offer.ts`

**Interfaces:**
- Consumes: `inPart`, `opts`, types (Task 7); `handlesList`, `parseHandles`, `normalizeLink` (Task 7); `nicheContent` (Task 8).
- Produces: `START`, `SALE`, `SALE_LAST = "sale.touchpoints_rated"`, `YOU`, `WHY`, `MONEY`, `OFFER` arrays; `saleStoryFrom(answers): SaleStoryAnswers`.

- [ ] **Step 1: Connect and welcome**

Create `src/features/onboarding/schema/parts/start.ts`:

```ts
import { inPart } from "../types";

/* Before onboarding: connect (spec "Before onboarding: paid, then connect"), then the welcome. */
export const START = [
  ...inPart("connect", [
    {
      id: "connect",
      ref: "0a",
      kind: "connect",
      title: "Connect your accounts",
      note: "Connect YouTube and Instagram so your numbers fill in. One tap each. You can skip and come back.",
      seconds: 30,
    },
  ]),
  ...inPart("welcome", [{ id: "welcome", ref: "0", kind: "welcome", title: "Let's get you set up.", note: "Talk or type, whatever's easier.", seconds: 10 }]),
];
```

- [ ] **Step 2: Part A, How you found us**

Create `src/features/onboarding/schema/parts/sale.ts`:

```ts
import type { SaleStoryAnswers } from "@/lib/api/sale-story";
import { MORE } from "../../engine";
import { inPart, opts, type Answers, type LinkOrChoice, type PerPick } from "../types";

/*
 * Part A (spec A1-A7, from the founder's Typeform vCwxUyWv). Answers stay in the draft only; when
 * the client leaves SALE_LAST, the form posts saleStoryFrom(answers) to /api/sale-story. No field
 * here ever writes to the client brain.
 */

const TOUCHPOINTS = opts(
  ["dm", "The DM"],
  ["voice-note", "A voice note"],
  ["custom-asset", "A custom video or asset we made for you"],
  ["youtube", "Our YouTube"],
  ["stories", "Our stories"],
  ["other", "Other"],
);

export const SALE_LAST = "sale.touchpoints_rated";

export const SALE = inPart("sale", [
  { id: "sale.believed", ref: "A1", kind: "long", talk: true, required: true, title: "What made you believe we could actually solve your problem?", seconds: 45 },
  {
    id: "sale.decision_time",
    ref: "A2",
    kind: "choice",
    required: true,
    title: "How long did it take you to decide?",
    options: opts(["same-day", "Same day"], ["few-days", "A few days"], ["1-2-weeks", "1-2 weeks"], ["over-month", "Over a month"], ["followed", "I'd followed you for a while"]),
  },
  { id: "sale.sooner_if", ref: "A3", kind: "long", title: "What could we have done to get you to say yes sooner?" },
  {
    id: "sale.almost_stopped",
    ref: "A4",
    kind: "choice",
    required: true,
    title: "What was the ONE thing that almost made you not buy?",
    sayMore: "Tell me more about that.",
    options: opts(["price", "Price"], ["trust", "Trust"], ["timing", "Timing"], ["tried-before", "Tried something before"], ["nothing", "Nothing"], ["other", "Other"]),
  },
  {
    id: "sale.video",
    ref: "A5",
    kind: "link-or-choice",
    required: true,
    title: "Which video made you want to book a call?",
    note: "Paste the link. No link? Tap where you saw us.",
    options: opts(["youtube", "Saw it on YouTube"], ["instagram", "Instagram"], ["dm", "It was the DM"], ["referral", "Someone referred me"], ["other", "Other"]),
  },
  {
    id: "sale.confidence",
    ref: "A6",
    kind: "scale",
    min: 1,
    max: 10,
    required: true,
    title: "Before the call, how sure were you that you'd sign up?",
    sayMore: "What made you unsure, or so sure?",
  },
  { id: "sale.touchpoints", ref: "A7", kind: "multi", required: true, title: "What did you see from us before booking?", options: TOUCHPOINTS },
  {
    id: SALE_LAST,
    ref: "A7 (F)",
    kind: "per-pick",
    from: "sale.touchpoints",
    options: TOUCHPOINTS,
    rating: { min: 1, max: 5 },
    prompt: "How much did it help? Honest thoughts are welcome.",
    required: true,
    title: "How much did each one help?",
    seconds: 40,
  },
  { id: "sale.thanks", ref: "A end", kind: "info", title: "Thanks. Now let's get to you.", body: "That part was about us. Everything from here is about you and your business.", seconds: 5 },
]);

const str = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export function saleStoryFrom(a: Answers): SaleStoryAnswers {
  const video = (a["sale.video"] ?? {}) as LinkOrChoice;
  const rated = (a[SALE_LAST] ?? {}) as PerPick;
  return {
    believed: str(a["sale.believed"]),
    decision_time: str(a["sale.decision_time"]),
    sooner_if: str(a["sale.sooner_if"]),
    almost_stopped: { pick: str(a["sale.almost_stopped"]), more: str(a[MORE("sale.almost_stopped")]) },
    video: { link: str(video.link), pick: str(video.pick) },
    confidence: { score: Number(a["sale.confidence"]) || 0, more: str(a[MORE("sale.confidence")]) },
    touchpoints: ((a["sale.touchpoints"] as string[] | undefined) ?? []).map((pick) => ({ pick, rating: rated[pick]?.rating ?? 0, note: str(rated[pick]?.note) })),
  };
}
```

`engine.ts` imports nothing from the parts, so importing `MORE` from it here is not circular.

- [ ] **Step 3: Part 1, You**

Create `src/features/onboarding/schema/parts/you.ts`:

```ts
import { nicheContent } from "../../niche-content";
import { handlesList, parseHandles } from "../handles";
import { inPart, opts } from "../types";

const text = (value: unknown) => (typeof value === "string" ? value : "");

export const YOU = inPart("you", [
  {
    id: "you.name",
    ref: "1.1",
    kind: "fields",
    required: true,
    title: "What should we call you?",
    note: "This is how we make your content sound like your life, not a template.",
    inputs: [
      { key: "name", label: "First name" },
      { key: "nickname", label: "What people actually call you, if it's different", optional: true },
    ],
    save: (a) => {
      const v = (a["you.name"] ?? {}) as Record<string, string>;
      return { "identity.name": (v.name ?? "").trim(), "identity.nickname": (v.nickname ?? "").trim() };
    },
    read: (read) => ({ "you.name": { name: text(read("identity", "name")), nickname: text(read("identity", "nickname")) } }),
  },
  { id: "you.age", ref: "1.2", kind: "number", title: "How old are you?", field: "identity.age", seconds: 8 },
  {
    id: "you.relationship",
    ref: "1.3",
    kind: "choice",
    title: "Relationship status?",
    field: "identity.relationship_status",
    options: opts(["single", "Single"], ["relationship", "In a relationship"], ["married", "Married"], ["rather-not", "Rather not say"]),
    seconds: 8,
  },
  {
    id: "you.platforms",
    ref: "1.4",
    kind: "handles",
    title: "Where are you posting?",
    note: "Tap each one you use, then add your handle.",
    platforms: opts(["youtube", "YouTube"], ["instagram", "Instagram"], ["tiktok", "TikTok"], ["x", "X"], ["other", "Other"]),
    save: (a) => ({ "identity.handles": handlesList(a["you.platforms"]) }),
    read: (read) => ({ "you.platforms": parseHandles(read("identity", "handles")) }),
    seconds: 30,
  },
  { id: "you.niche", ref: "1.5", kind: "niche", required: true, title: "What do you teach?", field: "identity.niche" },
  {
    id: "you.niche_line",
    ref: "1.5 (F)",
    kind: "text",
    required: true,
    title: "In one line, what do people learn from you?",
    note: (ctx) => nicheContent(ctx.niche).line,
    field: "identity.niche_line",
  },
]);
```

The form also sends the Instagram and YouTube handles to `/api/client-integrations` after `you.platforms` saves (Task 13 keeps today's `saveHandle` behaviour).

- [ ] **Step 4: Part 2, Why now**

Create `src/features/onboarding/schema/parts/why.ts`:

```ts
import { inPart, opts } from "../types";

export const WHY = inPart("why", [
  {
    id: "why.reasons",
    ref: "2.1",
    kind: "multi",
    required: true,
    title: "What made you say yes to this?",
    field: "intent.why_joined",
    options: opts(
      ["no-buyers", "My content isn't bringing in buyers"],
      ["no-time", "No time to make content"],
      ["stuck-income", "I'm stuck at the same income"],
      ["agency", "An agency let me down"],
      ["system", "I want a system, not guesswork"],
      ["other", "Other"],
    ),
  },
  { id: "why.moment", ref: "2.2", kind: "long", talk: true, title: "Tell me about the moment you decided.", note: "Talking works best here.", field: "intent.decision_story", seconds: 45 },
  {
    id: "why.win",
    ref: "2.3",
    kind: "fields",
    required: true,
    title: "What would make the next 90 days a win?",
    field: "intent.win_90d",
    inputs: [
      { key: "per_month", label: "$ a month", inputMode: "numeric", placeholder: "10000" },
      { key: "line", label: "Anything else that would make it a win", optional: true },
    ],
  },
]);
```

- [ ] **Step 5: Part 3, Money**

Create `src/features/onboarding/schema/parts/money.ts`:

```ts
import { num } from "../../engine";
import { inPart, type AmountOrPercent, type MoneyRow } from "../types";

/* Founder 2026-10-15: exact numbers, can't be skipped. The 30% fee is measured from 3.3. */
const NOTE = "Exact numbers. This is the starting line we measure your growth from.";

export const MONEY = inPart("money", [
  {
    id: "money.months",
    ref: "3.1",
    kind: "money",
    required: true,
    title: "What did you make in each of the last 3 months?",
    note: NOTE,
    seconds: 60,
    save: (a) => ({
      "money.last_3_months": ((a["money.months"] as MoneyRow[] | undefined) ?? []).map((row) => ({ month: row.month, revenue: num(row.revenue), profit: num(row.profit) })),
    }),
    read: (read) => {
      const rows = read("money", "last_3_months");
      if (!Array.isArray(rows)) return {};
      return { "money.months": rows.map((row: { month?: string; revenue?: number | null; profit?: number | null }) => ({ month: row.month ?? "", revenue: row.revenue == null ? "" : String(row.revenue), profit: row.profit == null ? "" : String(row.profit) })) };
    },
  },
  {
    id: "money.monthly",
    ref: "3.2",
    kind: "number",
    prefix: "$",
    required: true,
    title: "What's your monthly income right now, exactly?",
    note: NOTE,
    field: "money.monthly_income",
    initial: (a) => (a["money.months"] as MoneyRow[] | undefined)?.at(-1)?.revenue,
  },
  {
    id: "money.content",
    ref: "3.3",
    kind: "amount-or-percent",
    required: true,
    title: "How much of that comes from your content?",
    note: "An exact number or a percent. This is the starting point the 30% fee is measured from.",
    field: "money.content_revenue_baseline",
    save: (a) => {
      const v = (a["money.content"] ?? { mode: "amount", value: "" }) as AmountOrPercent;
      return { "money.content_revenue_baseline": { mode: v.mode, value: num(v.value) } };
    },
    read: (read) => {
      const v = read("money", "content_revenue_baseline") as { mode?: "amount" | "percent"; value?: number | null } | null;
      return v ? { "money.content": { mode: v.mode ?? "amount", value: v.value == null ? "" : String(v.value) } } : {};
    },
  },
]);
```

`num` must be exported from `engine.ts` (it is, in Task 7).

- [ ] **Step 6: Part 4, Your offer**

Create `src/features/onboarding/schema/parts/offer.ts`:

```ts
import { inPart, opts, type Answers, type PerPick } from "../types";

const selling = (a: Answers) => a["offer.status"] === "selling";
const HELP = opts(
  ["agency", "An agency"],
  ["growth-operator", "A growth operator"],
  ["ran-offer", "Someone who ran my offer"],
  ["coach", "A coach or mentor"],
  ["freelancers", "Freelancers (editor, setter, closer)"],
  ["never", "Never"],
);
const helpSave = (a: Answers) => ({ "offer.past_growth_help": { picks: (a["offer.past_help"] as string[] | undefined) ?? [], details: (a["offer.past_help_detail"] as PerPick | undefined) ?? {} } });

export const OFFER = inPart("offer", [
  {
    id: "offer.status",
    ref: "4.1",
    kind: "choice",
    required: true,
    title: "Have you had an offer before?",
    field: "offer.history",
    options: opts(["selling", "Yes, I'm selling one now"], ["stopped", "I had one, but stopped"], ["never", "Never had one"]),
  },
  {
    id: "offer.current",
    ref: "4.2",
    kind: "fields",
    required: true,
    when: selling,
    title: "What is it and how much is it?",
    inputs: [
      { key: "name", label: "Offer name" },
      { key: "price", label: "Exact price in $", inputMode: "numeric" },
    ],
    save: (a) => {
      const v = (a["offer.current"] ?? {}) as Record<string, string>;
      return { "offer.current_name": (v.name ?? "").trim(), "offer.price": (v.price ?? "").trim() };
    },
    read: (read) => ({ "offer.current": { name: String(read("offer", "current_name") ?? ""), price: String(read("offer", "price") ?? "") } }),
  },
  { id: "offer.walkthrough", ref: "4.3", kind: "long", talk: true, required: true, when: selling, title: "Walk me through what someone gets when they buy.", note: "A voice note works best.", field: "offer.walkthrough", seconds: 60 },
  { id: "offer.result", ref: "4.4", kind: "long", required: true, when: selling, title: "What's the result they walk away with?", field: "offer.result" },
  {
    id: "offer.type",
    ref: "4.5",
    kind: "choice",
    when: selling,
    title: "What kind of offer is it?",
    field: "offer.type",
    options: opts(["one-to-one", "1-1 mentorship"], ["group", "Group program"], ["course", "Course"], ["community", "Community"], ["mix", "A mix"]),
  },
  { id: "offer.past", ref: "4.2s", kind: "long", required: true, when: (a) => a["offer.status"] === "stopped", title: "What was it, what did it cost, and why did it stop?", field: "offer.past_offer" },
  {
    id: "offer.want_type",
    ref: "4.6",
    kind: "choice",
    required: true,
    title: "What do you want to sell from here?",
    note: "Most creators we work with start with high-ticket 1-1 mentorship. It gets cash and proof in fastest.",
    field: "offer.target_type",
    options: opts(["one-to-one", "1-1 mentorship"], ["group", "Group program"], ["course", "Course"], ["community", "Community"], ["not-sure", "Not sure, help me decide"]),
  },
  {
    id: "offer.want_price",
    ref: "4.7",
    kind: "choice",
    required: true,
    title: "What price do you want to sell at?",
    field: "offer.target_price",
    options: opts(["under-1k", "Under $1k"], ["1-3k", "$1-3k"], ["3-5k", "$3-5k"], ["5-10k", "$5-10k"], ["10k-plus", "$10k+"], ["not-sure", "Not sure"]),
  },
  {
    id: "offer.payments",
    ref: "4.8",
    kind: "multi",
    required: true,
    exclusive: ["none"],
    title: "How do you take payments?",
    field: "offer.payment_platforms",
    options: opts(["whop", "Whop"], ["fanbasis", "Fanbasis"], ["stripe", "Stripe"], ["crypto", "Crypto"], ["paypal", "PayPal"], ["bank", "Bank transfer"], ["none", "None yet"]),
  },
  {
    id: "offer.past_help",
    ref: "4.9",
    kind: "multi",
    required: true,
    exclusive: ["never"],
    title: "Have you worked with anyone on your growth before?",
    intro: (ctx) => (ctx.answers["sale.almost_stopped"] === "tried-before" ? "You said trying something before almost stopped you. Was it one of these?" : null),
    options: HELP,
    save: helpSave,
    read: (read) => {
      const v = read("offer", "past_growth_help") as { picks?: string[]; details?: PerPick } | null;
      return v ? { "offer.past_help": v.picks ?? [], "offer.past_help_detail": v.details ?? {} } : {};
    },
  },
  {
    id: "offer.past_help_detail",
    ref: "4.9 (F)",
    kind: "per-pick",
    from: "offer.past_help",
    options: HELP.filter((option) => option.value !== "never"),
    prompt: "What did they do, what came of it, and why did it end?",
    when: (a) => ((a["offer.past_help"] as string[] | undefined) ?? []).some((pick) => pick !== "never"),
    title: "Tell us about each one.",
    save: helpSave,
    seconds: 60,
  },
]);
```

- [ ] **Step 7: Typecheck and commit**

Run: `npm run typecheck`
Expected: no errors.

```bash
git add src/features/onboarding/schema/parts
git commit -m "Onboarding v2: connect, welcome, how you found us, you, why now, money, offer"
```

---

### Task 10: Parts 5 to 8 (buyer, story, positioning, on camera)

**Files:**
- Create: `src/features/onboarding/schema/parts/buyer.ts`, `story.ts`, `positioning.ts`, `camera.ts`

**Interfaces:**
- Consumes: Task 7 types, Task 8 `nicheContent`, `STARTER_KEYS`.
- Produces: `BUYER`, `STORY`, `POSITIONING`, `CAMERA`; `starterSave(answers)`.

- [ ] **Step 1: Part 5, Your buyer**

Create `src/features/onboarding/schema/parts/buyer.ts`:

```ts
import { readNiche } from "@/lib/niches";
import { nicheContent } from "../../niche-content";
import { inPart, opts, type Answers, type StarterVerdicts } from "../types";

/*
 * Founder 2026-10-15: ask whether they know their buyer. Yes or Kind of: the full breakdown. Not
 * really: three easy questions and a starter profile for their niche, card by card, then we do the
 * research after onboarding. Order matters: buyer.engagers is shared by both branches.
 */

const knows = (a: Answers) => a["buyer.known"] === "yes" || a["buyer.known"] === "kind-of";
const doesNot = (a: Answers) => a["buyer.known"] === "no";
const NOT_SURE: [string, string] = ["not-sure", "Not sure"];

export function starterSave(a: Answers) {
  const niche = readNiche(a["you.niche"]).id;
  const verdicts = (a["buyer.starter"] ?? {}) as StarterVerdicts;
  return {
    "icp.starter_profile": {
      niche,
      cards: nicheContent(niche).starter.map((card) => ({ key: card.key, text: card.text, verdict: verdicts[card.key]?.verdict ?? null, fix: verdicts[card.key]?.fix ?? "" })),
    },
  };
}

export const BUYER = inPart("buyer", [
  {
    id: "buyer.known",
    ref: "5.1",
    kind: "choice",
    required: true,
    title: "Do you know who your buyers are, and who's actually interacting with your content?",
    field: "icp.known",
    options: opts(["yes", "Yes, I know them well"], ["kind-of", "Kind of"], ["no", "Not really"]),
  },
  { id: "buyer.best", ref: "5.2", kind: "long", talk: true, required: true, when: knows, title: "Describe your best client ever. Who were they before they bought from you?", field: "icp.best_client", seconds: 45 },
  {
    id: "buyer.want_help",
    ref: "5.2n",
    kind: "long",
    talk: true,
    required: true,
    when: doesNot,
    title: "Who do you most want to help? Or describe the best client you've had so far.",
    intro: () => "No problem. Most creators don't have this written down. Let's build it together.",
    field: "icp.best_client",
  },
  {
    id: "buyer.age",
    ref: "5.3",
    kind: "multi",
    when: knows,
    title: "How old are most of your buyers?",
    field: "icp.age_range",
    options: opts(["under-18", "Under 18"], ["18-24", "18-24"], ["25-34", "25-34"], ["35-44", "35-44"], ["45-plus", "45+"], NOT_SURE),
  },
  { id: "buyer.gender", ref: "5.3b", kind: "choice", when: knows, title: "Mostly men, mostly women, or mixed?", field: "icp.gender_mix", options: opts(["men", "Mostly men"], ["women", "Mostly women"], ["mixed", "Mixed"], NOT_SURE) },
  {
    id: "buyer.life",
    ref: "5.4",
    kind: "multi",
    when: knows,
    title: "What kind of life do they lead?",
    field: "icp.life_stage",
    options: opts(["student", "Student"], ["job", "9-5 job"], ["own-business", "Own business"], ["between-jobs", "Between jobs"], ["parents", "Parents"], ["other", "Other"], NOT_SURE),
  },
  { id: "buyer.day", ref: "5.4 (F)", kind: "long", when: knows, title: "Walk me through a normal day for them.", field: "icp.daily_life" },
  {
    id: "buyer.income",
    ref: "5.5",
    kind: "choice",
    when: knows,
    title: "What do they earn, roughly?",
    field: "icp.income",
    options: opts(["under-2k", "Under $2k a month"], ["2-5k", "$2-5k a month"], ["5-10k", "$5-10k a month"], ["10k-plus", "$10k+ a month"], NOT_SURE),
  },
  { id: "buyer.pays", ref: "5.5b", kind: "choice", when: knows, title: "And how do they pay for your offer?", field: "icp.payment_style", options: opts(["full", "Pay in full"], ["plan", "Payment plan"], ["stretch", "Stretch to afford it"], NOT_SURE) },
  {
    id: "buyer.engagers",
    ref: "5.6 / 5.3n",
    kind: "choice",
    when: (a) => knows(a) || doesNot(a),
    title: "Who comments and DMs you most: the people who buy, or someone else?",
    field: "icp.engagers",
    options: opts(["buyers", "Mostly buyers"], ["beginners", "Lots of beginners and freebie seekers"], ["creators", "Other creators"], ["mix", "Mix"], ["dont-know", "Don't know"]),
  },
  { id: "buyer.stuck", ref: "5.7", kind: "long", when: knows, title: "What were they stuck on right before they found you?", field: "icp.before_state" },
  { id: "buyer.tried", ref: "5.7 (F)", kind: "long", when: knows, title: "What have they already tried that didn't work?", field: "icp.tried_before" },
  {
    id: "buyer.behaviour",
    ref: "5.8",
    kind: "multi",
    when: knows,
    title: "How do they act before buying?",
    field: "icp.buying_behaviour",
    options: opts(["fast", "Buy fast"], ["watch", "Watch for months, then buy"], ["dm-questions", "Ask lots of questions in DMs"], ["quiet", "Book a call, then go quiet"], ["partner", "Need a partner's OK"], ["fence", "Always on the fence"]),
  },
  { id: "buyer.tips", ref: "5.8 (F)", kind: "long", when: knows, title: "What finally tips them into buying?", field: "icp.tipping_point" },
  {
    id: "buyer.objections",
    ref: "5.9",
    kind: "multi",
    when: knows,
    title: "When someone says no, what do they usually say?",
    field: "icp.client_objections",
    options: opts(["expensive", "Too expensive"], ["think", "Need to think"], ["timing", "Not the right time"], ["partner", "Ask my partner"], ["other", "Other"]),
  },
  {
    id: "buyer.words",
    ref: "5.10",
    kind: "long",
    talk: true,
    when: knows,
    title: "What do they say when they describe their problem, in their own words?",
    note: "Talking works best here. These exact phrases go into your hooks and titles.",
    field: "icp.client_language",
    seconds: 40,
  },
  { id: "buyer.never", ref: "5.4n", kind: "long", when: doesNot, title: "Who would you never want as a client?", field: "icp.never_client" },
  {
    id: "buyer.starter",
    ref: "5.5n",
    kind: "starter",
    required: true,
    when: doesNot,
    title: "Here's a first draft of your buyer.",
    note: "Tap 'Sounds like my buyers' or 'Not quite' on each card, and fix it in a line.",
    save: starterSave,
    read: (read) => {
      const v = read("icp", "starter_profile") as { cards?: { key: string; verdict: "yes" | "fix" | null; fix: string }[] } | null;
      if (!v?.cards) return {};
      return { "buyer.starter": Object.fromEntries(v.cards.filter((card) => card.verdict).map((card) => [card.key, { verdict: card.verdict, fix: card.fix }])) };
    },
    seconds: 70,
  },
  {
    id: "buyer.research_note",
    ref: "5.6n",
    kind: "info",
    when: doesNot,
    title: "We'll take it from here.",
    body: "After onboarding, we run the full buyer research for you as part of the service. It lands in your portal for you to confirm. Your answers here are the starting point.",
    seconds: 5,
  },
]);
```

The `starter` kind is required: `problemWith` (Task 7) blocks Continue until every card for their niche has a verdict.

- [ ] **Step 2: Part 6, Your story**

Create `src/features/onboarding/schema/parts/story.ts`:

```ts
import { inPart, opts } from "../types";

export const STORY = inPart("story", [
  {
    id: "story.start",
    ref: "6.1",
    kind: "choice",
    required: true,
    title: "Where does your story start?",
    field: "story.start_type",
    options: opts(["broke", "Broke and figured it out"], ["job", "Had a job and left it"], ["failed", "Failed first, then cracked it"], ["mentor", "Learned from a mentor"], ["other", "Other"]),
  },
  { id: "story.tell", ref: "6.2", kind: "long", talk: true, required: true, title: "Tell it like you would on camera.", note: "Talking is suggested here.", field: "story.narrative", seconds: 90 },
]);
```

- [ ] **Step 3: Part 7, Positioning**

Create `src/features/onboarding/schema/parts/positioning.ts`:

```ts
import { inPart, opts, type Answers } from "../types";

const mech = (value: string) => (a: Answers) => a["pos.mechanism"] === value;

export const POSITIONING = inPart("positioning", [
  {
    id: "pos.mechanism",
    ref: "7.1",
    kind: "choice",
    required: true,
    title: "Do you have a unique mechanism?",
    note: "Your own named method. The reason your way works when other ways don't. Most creators haven't nailed this yet. That's fine, it's the first thing we build.",
    field: "positioning.mechanism_status",
    options: opts(["named", "Yes, and it has a name"], ["unnamed", "I have a method, but no name"], ["none", "No"]),
  },
  {
    id: "pos.mechanism_named",
    ref: "7.1 (F)",
    kind: "fields",
    required: true,
    when: mech("named"),
    title: "What's it called, and what are its steps?",
    field: "positioning.mechanism",
    inputs: [
      { key: "name", label: "What it's called" },
      { key: "steps", label: "Its steps", long: true },
    ],
  },
  { id: "pos.method", ref: "7.1 (F)", kind: "long", talk: true, required: true, when: mech("unnamed"), title: "Walk me through how you get someone a result, step by step.", note: "This is the raw material we name it from.", field: "positioning.method_walkthrough", seconds: 60 },
  { id: "pos.mechanism_none", ref: "7.1 (F)", kind: "info", when: mech("none"), title: "No problem.", body: "We build it with you, and it comes before the content.", seconds: 5 },
  { id: "pos.difference", ref: "7.2", kind: "choice", title: "Do you know what makes you different from everyone else in your niche?", field: "positioning.difference_known", options: opts(["yes", "Yes"], ["kind-of", "Kind of"], ["no", "No"]) },
  { id: "pos.difference_line", ref: "7.2 (F)", kind: "text", when: (a) => a["pos.difference"] === "yes" || a["pos.difference"] === "kind-of", title: "In one line: why you and not them?", field: "positioning.difference" },
  { id: "pos.competitors", ref: "7.3", kind: "chips", placeholder: "A name or @handle", title: "Who do you see as your competition?", note: "Names or handles. Press Enter after each one.", field: "positioning.competitors" },
  {
    id: "pos.competitor_gap",
    ref: "7.3 (F)",
    kind: "long",
    when: (a) => ((a["pos.competitors"] as string[] | undefined) ?? []).length > 0,
    title: "What do they do that you don't, and what do you do that they don't?",
    field: "positioning.competitor_gap",
  },
  {
    id: "pos.content_shows",
    ref: "7.4",
    kind: "choice",
    title: "Does your content show that difference?",
    field: "positioning.content_shows_it",
    options: opts(["clearly", "Yes, clearly"], ["sometimes", "Sometimes"], ["anyone", "No, my content could be anyone's"], ["not-sure", "Not sure"]),
  },
  { id: "pos.love", ref: "7.5", kind: "long", talk: true, required: true, title: "What do you love talking about?", note: "Talking works best.", field: "positioning.love_topics", seconds: 40 },
  { id: "pos.hour", ref: "7.5 (F)", kind: "long", talk: true, title: "What could you talk about for an hour with no notes?", field: "positioning.hour_topic" },
  { id: "pos.avoid", ref: "7.6", kind: "long", title: "Anything you never want to talk about on camera?", field: "positioning.avoid_topics" },
]);
```

- [ ] **Step 4: Part 8, On camera**

Create `src/features/onboarding/schema/parts/camera.ts`:

```ts
import { normalizeLink } from "../handles";
import { inPart, opts, type Persona } from "../types";

/* The old form stored curse_slang as frequently / sometimes / rarely / never; read those into the new picks. */
const LEGACY_SWEAR: Record<string, string> = { frequently: "how-i-talk", sometimes: "little", rarely: "little", never: "never" };

export const CAMERA = inPart("camera", [
  {
    id: "cam.persona",
    ref: "8.1",
    kind: "persona",
    required: true,
    title: "How do you want your audience to see you?",
    note: "No wrong answers. The more honest, the more it sounds like you. Pick one, then a second if you like.",
    options: opts(
      ["big-brother", "Big brother", "Looks out for you, tells it straight, has been where you are."],
      ["authority", "The authority", "Knows the numbers, speaks with certainty, people come to learn."],
      ["friend", "The friend", "On your level, warm, figures it out with you."],
      ["bro", "One of the bros", "Banter, jokes, feels like the group chat."],
      ["hardass", "Hardass mentor", "Tough love, calls out excuses, demands results."],
      ["teacher", "Calm teacher", "Patient, clear, step by step."],
      ["rebel", "The rebel", "Says what others won't, divides people on purpose."],
      ["other", "Other", "Describe it in your own words."],
    ),
    save: (a) => {
      const v = (a["cam.persona"] ?? {}) as Persona;
      return { "voice.persona": v.first ?? "", "voice.persona_second": v.second ?? "", "voice.persona_other": (v.other ?? "").trim() };
    },
    read: (read) => {
      const first = read("voice", "persona");
      if (typeof first !== "string" || !first) return {};
      return { "cam.persona": { first, second: String(read("voice", "persona_second") ?? ""), other: String(read("voice", "persona_other") ?? "") } };
    },
    seconds: 30,
  },
  { id: "cam.unhinged", ref: "8.2", kind: "scale", min: 1, max: 5, labels: { 1: "Buttoned-up", 3: "Some edge", 5: "Completely unhinged" }, title: "How unhinged are you on camera?", field: "voice.unhinged_level" },
  {
    id: "cam.filter",
    ref: "8.3",
    kind: "choice",
    title: "When you talk, do you think first or say whatever comes to mind?",
    field: "voice.filter",
    options: opts(["very-careful", "Very careful"], ["mostly-careful", "Mostly careful"], ["depends", "Depends on the day"], ["whatever", "Whatever comes to mind"]),
  },
  {
    id: "cam.swear",
    ref: "8.4",
    kind: "choice",
    required: true,
    title: "Do you swear?",
    field: "voice.curse_slang",
    options: opts(["never", "Never"], ["little", "A little"], ["how-i-talk", "It's how I talk"]),
    read: (read) => {
      const v = read("voice", "curse_slang");
      return typeof v === "string" && v ? { "cam.swear": LEGACY_SWEAR[v] ?? v } : {};
    },
  },
  { id: "cam.slang", ref: "8.5", kind: "choice", title: "Do you use slang or words that could get flagged?", field: "voice.flagged_level", options: opts(["no", "No"], ["some", "Some slang"], ["lots", "Yes, a lot"]) },
  {
    id: "cam.words",
    ref: "8.5 (F)",
    kind: "fields",
    when: (a) => a["cam.slang"] === "some" || a["cam.slang"] === "lots",
    title: "Which words are fine for us to use, and which should we never write for you?",
    note: "We match your voice, but we keep words platforms punish out of titles, captions and thumbnails unless you say otherwise.",
    field: "voice.flagged_words",
    inputs: [
      { key: "ok", label: "Fine for us to use", long: true, optional: true },
      { key: "never", label: "Never write these for me", long: true, optional: true },
    ],
  },
  {
    id: "cam.sliders",
    ref: "8.6",
    kind: "sliders",
    title: "Slide it.",
    field: "voice.sliders",
    sliders: [
      { key: "calm_hype", left: "Calm", right: "Hype" },
      { key: "polished_raw", left: "Polished", right: "Raw" },
    ],
  },
  { id: "cam.never_say", ref: "8.7", kind: "long", title: "Any words or phrases you'd never say?", field: "voice.never_say" },
  {
    id: "cam.samples",
    ref: "8.8",
    kind: "chips",
    placeholder: "Paste a link",
    title: "Drop 1-3 links where you sound most like you.",
    note: "Optional. Press Enter after each one.",
    field: "voice.sample_links",
    save: (a) => ({ "voice.sample_links": ((a["cam.samples"] as string[] | undefined) ?? []).map(normalizeLink) }),
  },
]);
```

- [ ] **Step 5: Typecheck and commit**

Run: `npm run typecheck`
Expected: no errors.

```bash
git add src/features/onboarding/schema/parts
git commit -m "Onboarding v2: buyer, story, positioning, on camera"
```

---

### Task 11: Parts 9 to 14 (content, funnel, proof, program, the deal, read-back) and the full schema test

**Files:**
- Create: `src/features/onboarding/schema/parts/content.ts`, `funnel.ts`, `proof.ts`, `program.ts`, `deal.ts`
- Create: `src/features/onboarding/schema/index.ts`
- Modify: `tests/onboarding-engine.spec.ts` (add schema-wide tests)

**Interfaces:**
- Produces: `SCREENS: Screen[]` (every part in order), `FORM_KEY = "onboarding-v2"`, `PATH_STEPS: Option[]`, `METRIC_IDS`, `hasProofFrom(answers): boolean`.

- [ ] **Step 1: Part 9, Your content**

Create `src/features/onboarding/schema/parts/content.ts`:

```ts
import { inPart, opts, type HandlesValue } from "../types";

const PLATFORM_LABELS: Record<string, string> = { youtube: "YouTube", instagram: "Instagram", tiktok: "TikTok", x: "X", other: "Other" };

export const CONTENT = inPart("content", [
  {
    id: "content.why",
    ref: "9 intro",
    kind: "info",
    title: "A few questions about how you work.",
    body: "You'll have covered some of this on your call. We ask again here so the app learns how you actually work, and fits itself around you instead of the other way round.",
    seconds: 8,
  },
  {
    id: "content.facts",
    ref: "9.1",
    kind: "facts",
    title: "What each one does.",
    cards: [
      { title: "YouTube long form", body: "The main asset. About one a week, and everything else is cut from it. People who've watched 3-5 of your videos before a call are the easiest buyers there are." },
      { title: "Reels", body: "Cut from your long form. They reach new people. They come after long form, not instead of it." },
      { title: "Story sequences", body: "What closes. Most creators skip them." },
      { title: "Carousels", body: "For proof and breakdowns, mostly when something big happens." },
    ],
    seconds: 30,
  },
  { id: "content.home", ref: "9.2", kind: "choice", title: "Where are you more at home right now?", field: "content.home_platform", options: opts(["youtube", "YouTube"], ["reels", "Reels"], ["both", "Both"], ["neither", "Neither yet"]) },
  {
    id: "content.longform_known",
    ref: "9.3",
    kind: "choice",
    title: "Before today, did you know long form should come before short form?",
    note: "No judgement. It tells us where to start.",
    field: "content.longform_awareness",
    options: opts(["yes-do", "Yes, and I do it"], ["yes-dont", "Yes, but I don't do it"], ["new", "No, that's new to me"]),
  },
  {
    id: "content.hard",
    ref: "9.4",
    kind: "multi",
    exclusive: ["nothing"],
    title: "What feels hard?",
    field: "content.hard_parts",
    options: opts(["start-long", "Starting long form"], ["consistent-long", "Staying consistent with long form"], ["short", "Short form"], ["camera", "Being on camera"], ["ideas", "Coming up with ideas"], ["nothing", "Nothing, I just need time"]),
  },
  { id: "content.hard_why", ref: "9.4 (F)", kind: "long", when: (a) => ((a["content.hard"] as string[] | undefined) ?? []).some((pick) => pick !== "nothing"), title: "What makes it hard?", field: "content.hard_why" },
  {
    id: "content.format",
    ref: "9.5",
    kind: "choice",
    title: "Have you picked a YouTube format?",
    field: "content.yt_format",
    options: opts(["miro", "Miro board"], ["face", "Face to camera"], ["both", "Both"], ["student-call", "Student call"], ["group-call", "Group coaching call"], ["in-person", "In-person student video"], ["not-yet", "Not yet"]),
  },
  { id: "content.format_why", ref: "9.5 (F)", kind: "long", when: (a) => Boolean(a["content.format"]) && a["content.format"] !== "not-yet", title: "Why that one?", field: "content.format_why" },
  {
    id: "content.cadence",
    ref: "9.6",
    kind: "rows",
    title: "How often do you post right now?",
    note: "We plan your reels with you (2-5 a day), but we never script them. Reels stay raw and natural.",
    field: "content.cadence",
    rows: (ctx) => [
      ...(((ctx.answers["you.platforms"] as HandlesValue | undefined)?.picked ?? []).map((platform) => ({ value: platform, label: PLATFORM_LABELS[platform] ?? platform }))),
      { value: "reels", label: "Reels" },
    ],
    levels: opts(["rarely", "Rarely"], ["weekly", "Weekly"], ["few-week", "Few times a week"], ["daily", "Daily"]),
    seconds: 30,
  },
  { id: "content.process", ref: "9.7", kind: "long", talk: true, title: "Walk me through how you make a YouTube video, from idea to upload.", note: "Talking works best.", field: "content.process", seconds: 60 },
  {
    id: "content.video_time",
    ref: "9.8",
    kind: "choice",
    title: "How long does one video take you, start to finish?",
    field: "content.video_time",
    options: opts(["under-3h", "Under 3 hours"], ["3-6h", "3-6 hours"], ["6-12h", "6-12 hours"], ["1-2d", "1-2 days"], ["longer", "Longer"], ["none-yet", "I haven't made one"]),
  },
  {
    id: "content.script_time",
    ref: "9.8b",
    kind: "choice",
    when: (a) => Boolean(a["content.video_time"]) && a["content.video_time"] !== "none-yet",
    title: "How much of that is scripting?",
    field: "content.script_time",
    options: opts(["wing-it", "Hardly any, I wing it"], ["under-1h", "Under an hour"], ["1-3h", "1-3 hours"], ["most", "Most of it"]),
  },
  { id: "content.daily", ref: "9.9", kind: "choice", title: "How much time a day goes into content overall?", field: "content.daily_time", options: opts(["under-30m", "Under 30 min"], ["30-60m", "30-60 min"], ["1-2h", "1-2 hours"], ["2-4h", "2-4 hours"], ["more", "More"]) },
  {
    id: "content.when",
    ref: "9.10",
    kind: "choice",
    title: "When do you make content?",
    field: "content.schedule",
    options: opts(["set-days", "Set days every week"], ["weekends", "Weekends"], ["whenever", "Whenever I feel like it"], ["monthly-batch", "One big batch a month"], ["not-now", "I don't right now"]),
  },
  { id: "content.film_hours", ref: "9.11", kind: "choice", title: "How many hours a week can you give to filming?", field: "content.film_hours", options: opts(["1-2", "1-2"], ["3-5", "3-5"], ["5-10", "5-10"], ["10-plus", "10+"]) },
  { id: "content.best_post", ref: "9.12", kind: "text", inputMode: "url", placeholder: "https://", title: "What's your best-performing post or video ever?", note: "Paste a link.", field: "content.best_post" },
  {
    id: "content.skills",
    ref: "9.13",
    kind: "rows",
    title: "What you already know.",
    note: "Tap one level for each.",
    field: "content.skills",
    rows: () => opts(["copy", "Writing copy"], ["scripting", "Scripting videos"], ["titles", "Titles"], ["thumbnails", "Thumbnails"], ["stories", "Story sequences"], ["carousels", "Carousels"], ["editing", "Editing"]),
    levels: opts(["never", "Never done it"], ["tried", "I've tried"], ["good", "I'm good at it"]),
    seconds: 30,
  },
  {
    id: "content.hates",
    ref: "9.14",
    kind: "multi",
    title: "Which parts do you hate doing?",
    field: "content.hates",
    options: opts(["ideas", "Ideas"], ["scripting", "Scripting"], ["filming", "Filming"], ["editing", "Editing"], ["thumbnails", "Thumbnails"], ["captions", "Captions"], ["posting", "Posting"]),
  },
  {
    id: "content.helpers",
    ref: "9.15",
    kind: "multi",
    exclusive: ["nobody"],
    title: "Who helps you right now?",
    field: "content.helpers",
    options: opts(["copywriter", "Copywriter"], ["editor", "Editor"], ["thumbnail", "Thumbnail designer"], ["va", "VA"], ["setter", "Setter"], ["closer", "Closer"], ["nobody", "Nobody"]),
  },
]);
```

The fact cards' sources are listed in the spec (9.1); keep them in a comment above `content.facts` when you write the file: `[[playbooks/content-operating-rhythm]]`, the vault's core rule that long form is the main revenue engine, and the founder's 2026-10-15 carousel rule.

- [ ] **Step 2: Part 10, Your funnel**

Create `src/features/onboarding/schema/parts/funnel.ts`:

```ts
import { normalizeLink } from "../handles";
import { inPart, opts, type Answers, type PerPick } from "../types";

/*
 * Founder 2026-10-15: what they know about funnels, what they've tried, then their own funnel:
 * deep if they have one, short if not. Every chip question has a "Say more" box. Metrics are ranges
 * with "I don't know"; nobody is forced to give exact rates. Names and healthy ranges come from
 * Pulsify-Brain wiki/frameworks/call-funnel-framework.md and wiki/concepts/profile-funnel.md, and are
 * never shown to the client as a grade.
 */

const SAY_MORE = "Say more (type or talk)";
const RANGES_NOTE = "Ranges are fine. 'I don't know' is a real answer, and it tells us what to set up first.";
const UNKNOWN: [string, string] = ["unknown", "I don't know"];

export const PATH_STEPS = opts(
  ["youtube-video", "YouTube video"],
  ["reel", "Reel"],
  ["story", "Story"],
  ["bio-link", "Bio link"],
  ["dm-trigger", "Comment or DM trigger word"],
  ["lead-magnet", "Free guide or lead magnet"],
  ["email-list", "Email list"],
  ["landing-page", "Landing page"],
  ["vsl", "VSL"],
  ["application", "Application form"],
  ["booking-page", "Booking page"],
  ["setter", "Setter conversation"],
  ["sales-call", "Sales call"],
  ["checkout", "Checkout page"],
  ["webinar", "Webinar"],
  ["ads", "Ads"],
  ["other", "Other"],
);
const LINKABLE = new Set(["bio-link", "landing-page", "vsl", "application", "booking-page", "checkout", "lead-magnet"]);
const FUNNELS = opts(
  ["profile", "Profile funnel (bio, DMs, stories)"],
  ["landing-vsl", "Landing page + VSL"],
  ["application", "Application funnel"],
  ["lead-magnet", "Lead magnet + emails"],
  ["webinar", "Webinar"],
  ["challenge", "Challenge"],
  ["none", "None"],
);

const has = (a: Answers) => a["funnel.has"] === "yes" || a["funnel.has"] === "kind-of";
const hasNot = (a: Answers) => a["funnel.has"] === "no";
const path = (a: Answers) => (a["funnel.path"] as string[] | undefined) ?? [];
const pathHas = (...steps: string[]) => (a: Answers) => has(a) && steps.some((step) => path(a).includes(step));

export const METRIC_IDS = ["funnel.m_leads", "funnel.m_booked", "funnel.m_show", "funnel.m_close", "funnel.m_deal", "funnel.m_reply", "funnel.m_cycle"] as const;
const metricsSave = (a: Answers) => ({
  "funnel.metrics": Object.fromEntries(METRIC_IDS.filter((id) => a[id] != null && a[id] !== "").map((id) => [id.replace("funnel.m_", ""), a[id]])),
});
const metricsRead = (read: (s: string, f: string) => unknown) => {
  const v = read("funnel", "metrics") as Record<string, unknown> | null;
  return v ? Object.fromEntries(Object.entries(v).map(([key, value]) => [`funnel.m_${key}`, value])) : {};
};
const triedSave = (a: Answers) => ({ "funnel.tried": { picks: (a["funnel.tried"] as string[] | undefined) ?? [], verdicts: (a["funnel.tried_verdicts"] as PerPick | undefined) ?? {} } });

export const FUNNEL = inPart("funnel", [
  { id: "funnel.stages", ref: "10.1", kind: "stages", title: "How a funnel works: TOF, MOF, BOF.", seconds: 30 },
  { id: "funnel.horizontal", ref: "10.1", kind: "horizontal", title: "One video can do all three.", note: "So a niche video can still get big views.", seconds: 20 },
  { id: "funnel.quiz", ref: "10.1b", kind: "quiz", title: "Quick check.", note: "Which stage is this? Tap TOF, MOF or BOF. It's not scored.", seconds: 30 },
  {
    id: "funnel.focus",
    ref: "10.1c",
    kind: "multi",
    title: "Which stages are you making content for right now?",
    field: "funnel.stage_focus",
    sayMore: "Say more: what are you making for each one?",
    options: opts(["tof", "TOF"], ["mof", "MOF"], ["bof", "BOF"], ["all-in-one", "All three inside the same videos"], ["none", "None yet"], ["not-sure", "Not sure"]),
  },
  {
    id: "funnel.terms",
    ref: "10.2",
    kind: "multi",
    title: "Tap the ones you know. It's not a test.",
    note: "Whatever you don't know, we handle.",
    field: "funnel.terms_known",
    options: opts(
      ["funnel", "Funnel"],
      ["lead-magnet", "Lead magnet"],
      ["vsl", "VSL"],
      ["show-rate", "Show rate"],
      ["close-rate", "Close rate"],
      ["high-ticket", "High-ticket"],
      ["setter", "Setter"],
      ["closer", "Closer"],
      ["retargeting", "Retargeting"],
      ["mechanism", "Unique mechanism"],
      ["icp", "ICP"],
      ["dream-follower", "Dream follower"],
      ["tof-mof-bof", "TOF, MOF, BOF"],
    ),
  },
  { id: "funnel.tried", ref: "10.3", kind: "multi", exclusive: ["none"], title: "Which funnels have you tried, now or before?", options: FUNNELS, save: triedSave, read: (read) => {
    const v = read("funnel", "tried") as { picks?: string[]; verdicts?: PerPick } | null;
    return v ? { "funnel.tried": v.picks ?? [], "funnel.tried_verdicts": v.verdicts ?? {} } : {};
  } },
  {
    id: "funnel.tried_verdicts",
    ref: "10.3 (F)",
    kind: "per-pick",
    from: "funnel.tried",
    options: FUNNELS.filter((option) => option.value !== "none"),
    prompt: "Did it work? One line on why.",
    verdicts: opts(["worked", "Worked"], ["kind-of", "Kind of"], ["didnt", "Didn't"]),
    when: (a) => ((a["funnel.tried"] as string[] | undefined) ?? []).some((pick) => pick !== "none"),
    required: true,
    title: "Did each one work?",
    save: triedSave,
    seconds: 40,
  },
  { id: "funnel.want", ref: "10.4", kind: "choice", title: "What kind of funnel do you want?", field: "funnel.wanted", sayMore: SAY_MORE, options: [...FUNNELS.filter((option) => option.value !== "none"), { value: "you-pick", label: "Whatever works, you pick" }] },
  {
    id: "funnel.has",
    ref: "10.5",
    kind: "choice",
    required: true,
    title: "Do you have a funnel running now?",
    note: "In plain words: a set path that takes someone from watching you to paying you.",
    field: "funnel.has_funnel",
    sayMore: SAY_MORE,
    options: opts(["yes", "Yes"], ["kind-of", "Kind of (people DM me and I sell them)"], ["no", "No"]),
  },
  // No funnel: short.
  {
    id: "funnel.buy_today",
    ref: "10.6n",
    kind: "choice",
    when: hasNot,
    intro: () => "No problem. Building it is part of what we do.",
    title: "How do people buy from you today, if at all?",
    field: "funnel.sales_method",
    sayMore: SAY_MORE,
    options: opts(["dms", "DMs"], ["calls", "Calls"], ["checkout", "A checkout link"], ["word", "Word of mouth"], ["nobody", "Nobody yet"]),
  },
  { id: "funnel.found", ref: "10.7n", kind: "multi", when: hasNot, title: "Where do most buyers find you?", field: "funnel.lead_sources", sayMore: SAY_MORE, options: opts(["youtube", "YouTube"], ["instagram", "Instagram"], ["tiktok", "TikTok"], ["referrals", "Referrals"], ["not-sure", "Not sure"]) },
  {
    id: "funnel.links_now",
    ref: "10.8n",
    kind: "fields",
    when: hasNot,
    title: "Links you already have.",
    note: "All optional.",
    inputs: [
      { key: "bio", label: "Link in bio", inputMode: "url", optional: true },
      { key: "booking", label: "Booking page", inputMode: "url", optional: true },
      { key: "other", label: "Anything else you send people (one per line)", long: true, optional: true },
    ],
    save: (a) => {
      const v = (a["funnel.links_now"] ?? {}) as Record<string, string>;
      return {
        "funnel.link_in_bio": normalizeLink(v.bio ?? ""),
        "funnel.booking_link": normalizeLink(v.booking ?? ""),
        "funnel.current_funnel_links": (v.other ?? "").split(/\r?\n/).map((line) => normalizeLink(line)).filter(Boolean),
      };
    },
  },
  // Has a funnel: the deep dive.
  { id: "funnel.path", ref: "10.6", kind: "path", required: true, when: has, title: "Build your funnel.", note: "Tap the steps in the order a buyer goes through them.", field: "funnel.path", steps: PATH_STEPS, seconds: 60 },
  {
    id: "funnel.step_links",
    ref: "10.7",
    kind: "step-links",
    steps: PATH_STEPS,
    when: (a) => has(a) && path(a).some((step) => LINKABLE.has(step)),
    title: "Add the link for each step.",
    save: (a) => {
      const links = (a["funnel.step_links"] ?? {}) as Record<string, string>;
      const clean = Object.fromEntries(Object.entries(links).map(([step, link]) => [step, normalizeLink(link)]).filter(([, link]) => link));
      return { "funnel.step_links": clean, "funnel.link_in_bio": clean["bio-link"] ?? "", "funnel.booking_link": clean["booking-page"] ?? "" };
    },
  },
  {
    id: "funnel.tools",
    ref: "10.8",
    kind: "multi",
    when: has,
    title: "What runs it behind the scenes?",
    note: "Payment platforms were covered earlier.",
    field: "funnel.tools",
    sayMore: SAY_MORE,
    options: opts(["calendly", "Calendly"], ["cal-com", "Cal.com"], ["typeform", "Typeform"], ["kit", "Kit"], ["mailchimp", "Mailchimp"], ["beehiiv", "Beehiiv"], ["ghl", "GoHighLevel"], ["manychat", "ManyChat"], ["stan", "Stan"], ["other", "Other"], ["by-hand", "Nothing, I do it by hand"]),
  },
  {
    id: "funnel.owners",
    ref: "10.9",
    kind: "rows",
    when: has,
    title: "Who handles each part?",
    field: "funnel.owners",
    rows: () => opts(["dms", "DMs"], ["calls", "Calls"], ["followups", "Follow-ups"]),
    levels: opts(["me", "Me"], ["setter", "Setter"], ["closer", "Closer"], ["va", "VA"], ["automated", "Automated"], ["nobody", "Nobody yet"]),
    initial: (a) => {
      const helpers = (a["content.helpers"] as string[] | undefined) ?? [];
      return { dms: helpers.includes("setter") ? "setter" : "me", calls: helpers.includes("closer") ? "closer" : "me", followups: helpers.includes("va") ? "va" : "me" };
    },
  },
  { id: "funnel.tracks", ref: "10.10", kind: "choice", when: has, title: "Do you track your numbers?", field: "funnel.tracks_numbers", sayMore: SAY_MORE, options: opts(["sheet", "Yes, in a sheet or CRM"], ["head", "Roughly, in my head"], ["no", "No"]) },
  { id: "funnel.m_leads", ref: "10.11", kind: "choice", when: has, title: "Leads a month (DMs, opt-ins, applications)", note: RANGES_NOTE, save: metricsSave, read: metricsRead, options: opts(["under-20", "Under 20"], ["20-50", "20-50"], ["50-150", "50-150"], ["150-plus", "150+"], UNKNOWN) },
  { id: "funnel.m_booked", ref: "10.11", kind: "choice", when: pathHas("booking-page", "sales-call"), title: "Calls booked a month", note: RANGES_NOTE, save: metricsSave, options: opts(["under-5", "Under 5"], ["5-15", "5-15"], ["15-40", "15-40"], ["40-plus", "40+"], UNKNOWN) },
  { id: "funnel.m_show", ref: "10.11", kind: "choice", when: pathHas("booking-page", "sales-call"), title: "Show rate: out of 10 booked calls, how many turn up?", note: RANGES_NOTE, save: metricsSave, options: opts(["under-4", "Under 4"], ["4-6", "4-6"], ["6-8", "6-8"], ["8-plus", "8+"], UNKNOWN) },
  { id: "funnel.m_close", ref: "10.11", kind: "choice", when: pathHas("booking-page", "sales-call"), title: "Close rate: out of 10 calls that happen, how many buy?", note: RANGES_NOTE, save: metricsSave, options: opts(["under-1", "Under 1"], ["1-2", "1-2"], ["2-3", "2-3"], ["3-plus", "3+"], UNKNOWN) },
  {
    id: "funnel.m_deal",
    ref: "10.11",
    kind: "number",
    prefix: "$",
    when: has,
    title: "Average deal size",
    note: "Leave it blank if you don't know.",
    save: metricsSave,
    initial: (a) => (a["offer.current"] as { price?: string } | undefined)?.price,
  },
  { id: "funnel.m_reply", ref: "10.11", kind: "choice", when: pathHas("dm-trigger", "setter", "booking-page"), title: "How fast does a new lead hear back?", note: RANGES_NOTE, save: metricsSave, options: opts(["minutes", "Minutes"], ["hour", "Within the hour"], ["same-day", "Same day"], ["next-day", "Next day or later"], UNKNOWN) },
  { id: "funnel.m_cycle", ref: "10.11", kind: "choice", when: has, title: "First message to paid, usually", note: RANGES_NOTE, save: metricsSave, options: opts(["same-day", "Same day"], ["week", "Within a week"], ["1-4-weeks", "1-4 weeks"], ["longer", "Longer"], UNKNOWN) },
  {
    id: "funnel.leak",
    ref: "10.12",
    kind: "choice",
    when: has,
    title: "Where do you think it leaks?",
    field: "funnel.leak",
    sayMore: "What's your guess why?",
    options: opts(["few-leads", "Not enough leads"], ["wrong-leads", "Wrong leads"], ["no-show", "They book but don't show"], ["no-buy", "They show but don't buy"], ["slow", "I'm slow to reply"], ["dont-know", "I don't know"]),
  },
  { id: "funnel.non_buyers", ref: "10.13", kind: "multi", when: has, title: "What happens to people who don't buy?", field: "funnel.non_buyer_followup", sayMore: SAY_MORE, options: opts(["nothing", "Nothing"], ["dms", "I follow up in DMs"], ["email", "Email sequence"], ["setter", "Setter follows up"], ["retargeting", "Retargeting ads"]) },
  // Everyone.
  { id: "funnel.ads", ref: "10.14", kind: "choice", title: "Have you run ads?", field: "funnel.ads", sayMore: SAY_MORE, options: opts(["never", "Never"], ["stopped", "Tried and stopped"], ["running", "Running now"]) },
  {
    id: "funnel.ads_detail",
    ref: "10.14 (F)",
    kind: "fields",
    when: (a) => a["funnel.ads"] === "stopped" || a["funnel.ads"] === "running",
    title: "What did you spend, and what did a booked call cost?",
    field: "funnel.ads_detail",
    inputs: [
      { key: "spend", label: "Monthly spend in $", inputMode: "numeric", optional: true },
      { key: "cpbc", label: "Cost per booked call, if you know it", inputMode: "numeric", optional: true },
    ],
  },
  { id: "funnel.ads_why", ref: "10.14 (F)", kind: "long", when: (a) => a["funnel.ads"] === "stopped", title: "Why did you stop?", field: "funnel.ads_stopped_why" },
]);
```

Note: only `funnel.m_leads` carries `read: metricsRead`; reading the metrics once fills every metric screen.

- [ ] **Step 3: Part 11, Your proof**

Create `src/features/onboarding/schema/parts/proof.ts`:

```ts
import { inPart, opts, type Answers, type ProofFiles } from "../types";

/*
 * Founder 2026-10-15: their own result first (no glazing), then student results. If they have no
 * student results, link back to their own result instead of asking again. Uploads go into the
 * proof vault the moment they are added (uploadProof); these screens save what they said about them.
 */

const level = (a: Answers) => a["proof.students"] as string | undefined;
const students = (a: Answers) => level(a) === "plenty" || level(a) === "few";
const noStudents = (a: Answers) => level(a) === "not-yet";
const ownShown = (a: Answers) => ((a["proof.own_files"] as ProofFiles | undefined)?.types ?? []).some((type) => type !== "none");
const clip = (value: unknown, max = 140) => {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
};

const bestSave = (a: Answers) => ({
  "proof.best_result": {
    story: String(a["proof.best"] ?? "").trim(),
    detail: String(a["proof.best_detail"] ?? "").trim(),
    proof: (a["proof.best_files"] as ProofFiles | undefined)?.types ?? [],
    more: String(a["proof.best_more"] ?? "").trim(),
    permission: String(a["proof.best_permission"] ?? ""),
  },
});

export function hasProofFrom(a: Answers): boolean {
  return students(a) || ownShown(a);
}

export const PROOF = inPart("proof", [
  {
    id: "proof.own",
    ref: "11.1",
    kind: "long",
    talk: true,
    required: true,
    title: "What's the best result you've gotten yourself?",
    note: "Your own account, store, payouts or income. Give it to us straight. Small and real beats big and made up.",
    field: "proof.own_best",
    seconds: 45,
  },
  { id: "proof.own_how", ref: "11.1 (F)", kind: "long", talk: true, title: "How did you do it, and how long did it take?", field: "proof.own_how" },
  {
    id: "proof.own_files",
    ref: "11.2",
    kind: "proof-files",
    required: true,
    title: "Do you have proof of it?",
    types: opts(["screenshot", "Screenshot"], ["payment", "Payment or revenue screenshot"], ["video", "Video"], ["none", "Nothing I can show yet"]),
    save: (a) => ({ "proof.own_proof": (a["proof.own_files"] as ProofFiles | undefined)?.types ?? [] }),
    read: (read) => {
      const types = read("proof", "own_proof");
      return Array.isArray(types) ? { "proof.own_files": { types, uploads: [] } } : {};
    },
  },
  { id: "proof.students", ref: "11.3", kind: "choice", required: true, title: "Do you have client or student results?", field: "proof.level", options: opts(["plenty", "Yes, plenty"], ["few", "A few"], ["not-yet", "Not yet"]) },
  {
    id: "proof.best",
    ref: "11.4",
    kind: "long",
    talk: true,
    copyFrom: "buyer.best",
    required: true,
    when: students,
    title: "What's the best result you've gotten someone else?",
    intro: (ctx) => (ctx.answers["buyer.best"] ? `Earlier you told us about: "${clip(ctx.answers["buyer.best"])}" Is that your best result?` : null),
    save: bestSave,
    read: (read) => {
      const v = read("proof", "best_result") as Record<string, unknown> | null;
      if (!v) return {};
      return {
        "proof.best": v.story ?? "",
        "proof.best_detail": v.detail ?? "",
        "proof.best_files": { types: Array.isArray(v.proof) ? v.proof : [], uploads: [] },
        "proof.best_more": v.more ?? "",
        "proof.best_permission": v.permission ?? "",
      };
    },
  },
  { id: "proof.best_detail", ref: "11.4 (F)", kind: "long", talk: true, when: students, title: "Who were they before, what did they do, and what happened after?", save: bestSave },
  {
    id: "proof.best_files",
    ref: "11.5",
    kind: "proof-files",
    when: students,
    title: "Do you have proof of that one?",
    types: opts(["screenshot", "Screenshot"], ["video-testimonial", "Video testimonial"], ["written", "Written testimonial"], ["payment", "Payment or revenue screenshot"], ["dm", "DM or chat screenshot"], ["none", "No proof yet"]),
    save: bestSave,
  },
  {
    id: "proof.best_more",
    ref: "11.6",
    kind: "long",
    talk: true,
    when: students,
    title: "Tell us more about it.",
    note: "How long it took, the exact number (money made, payout, first sale, followers), what made it work. This is the story we turn into content.",
    save: bestSave,
  },
  {
    id: "proof.best_permission",
    ref: "11.7",
    kind: "choice",
    when: students,
    title: "Can we use their name and face?",
    options: opts(["yes", "Yes"], ["first-name", "First name only"], ["no-names", "No names, results only"], ["ask", "I need to ask them"]),
    save: bestSave,
  },
  { id: "proof.count", ref: "11.8", kind: "choice", when: students, title: "How many results can you show?", field: "proof.count", options: opts(["1-2", "1-2"], ["3-5", "3-5"], ["6-10", "6-10"], ["10-plus", "10+"]) },
  {
    id: "proof.top",
    ref: "11.8 (F)",
    kind: "proof-cards",
    when: students,
    title: "Your top results.",
    note: (ctx) => (["6-10", "10-plus"].includes(String(ctx.answers["proof.count"])) ? "One card each for your top 5." : "One card each for your top 3."),
    field: "proof.top_results",
    seconds: 120,
  },
  {
    id: "proof.storage",
    ref: "11.9",
    kind: "multi",
    when: students,
    title: "Where does proof live right now?",
    field: "proof.storage",
    sayMore: "Share link for your folder or Discord (optional)",
    options: opts(["phone", "Phone screenshots"], ["drive", "A Google Drive folder"], ["discord", "Discord"], ["whop", "Whop"], ["highlights", "Instagram highlights"], ["nowhere", "Nowhere organised"]),
  },
  {
    id: "proof.own_enough",
    ref: "11.4n",
    kind: "choice",
    when: (a) => noStudents(a) && ownShown(a),
    title: (ctx) => `You told us about "${clip(ctx.answers["proof.own"])}". Do you think that's enough to show people you can get them there?`,
    field: "proof.own_enough",
    sayMore: "Why?",
    options: opts(["yes", "Yes"], ["partly", "Partly"], ["no", "No, I need student results"]),
  },
  {
    id: "proof.closest",
    ref: "11.5n",
    kind: "choice",
    when: noStudents,
    title: "What's the closest thing to a student result you have?",
    field: "proof.closest_thing",
    sayMore: "Tell us about it.",
    options: opts(["free-student", "A free student or beta client"], ["halfway", "Someone who's halfway there"], ["nothing", "Nothing yet"]),
  },
  {
    id: "proof.closest_files",
    ref: "11.5n (F)",
    kind: "proof-files",
    when: (a) => noStudents(a) && Boolean(a["proof.closest"]) && a["proof.closest"] !== "nothing",
    title: "Add anything you have from them.",
    types: opts(["screenshot", "Screenshot"], ["video", "Video"], ["dm", "DM or chat screenshot"], ["none", "Nothing to show yet"]),
  },
  {
    id: "proof.first",
    ref: "11.6n",
    kind: "info",
    when: noStudents,
    title: "That's normal.",
    body: "Getting your first proof is part of the plan. Your portal gets a \"first proof\" step, and early work aims at getting one result on record.",
    seconds: 5,
  },
]);
```

- [ ] **Step 4: Parts 12 to 14**

Create `src/features/onboarding/schema/parts/program.ts`:

```ts
import { inPart, opts } from "../types";

export const PROGRAM = inPart("program", [
  { id: "program.status", ref: "12.1", kind: "choice", title: "Do you have a paid program or mentorship yet?", field: "program.status", options: opts(["runs-well", "Yes, it runs well"], ["messy", "Yes, but it's messy"], ["not-yet", "Not yet"]) },
  {
    id: "program.missing",
    ref: "12.1 (F)",
    kind: "multi",
    when: (a) => a["program.status"] === "messy" || a["program.status"] === "not-yet",
    title: "What's missing?",
    field: "program.missing",
    options: opts(["curriculum", "Curriculum"], ["calls", "How to run 1-1 calls"], ["material", "Teaching material"], ["tracking", "Tracking who paid"], ["whop", "Whop setup"], ["other", "Other"]),
  },
]);
```

Create `src/features/onboarding/schema/parts/deal.ts`:

```ts
import { inPart, opts } from "../types";

/*
 * The deal (founder 2026-10-15): set the frame before they finish. We never ask "how determined are
 * you"; we ask them to confirm they understand, twice. Both answers are kept with their time
 * (client_brain.updated_at). A "No" or "Not sure yet" never blocks Finish; it shows on the
 * operator's needs list (Task 16).
 */
export const DEAL = inPart("deal", [
  {
    id: "deal.terms",
    ref: "13.1",
    kind: "info",
    title: "How this works.",
    bullets: [
      "We give you the system: the plan, the tools, the drafts, the funnel and a weekly review.",
      "You do the parts only you can do: record your videos (1-2 a week), post your own reels (2-5 a day, raw, unscripted), show up to the weekly review, approve drafts, reply to your leads, take your calls and look after your students.",
      "If the content doesn't go out, nothing we build can work. Pulsify isn't responsible for results from work that never gets posted.",
      "Our side: if anything we promised isn't delivered, we keep working at no extra cost until it is.",
    ],
    seconds: 30,
  },
  { id: "deal.understood", ref: "13.2", kind: "choice", required: true, title: "Do you understand this?", field: "commitment.understood", options: opts(["yes", "Yes"], ["explain", "No, explain it again"]) },
  {
    id: "deal.simple",
    ref: "13.2 (F)",
    kind: "info",
    when: (a) => a["deal.understood"] === "explain",
    title: "In short:",
    bullets: ["We build it. You film it, post it and show up.", "If you don't post, it can't work.", "If we miss something we promised, we fix it for free.", "Questions? Message us at hello@pulsify-ai.com."],
    seconds: 15,
  },
  {
    id: "deal.promise",
    ref: "13.3",
    kind: "choice",
    required: true,
    title: "And do you promise yourself you'll put in the work to make this work?",
    field: "commitment.promised",
    options: opts(["in", "Yes, I'm in"], ["not-sure", "Not sure yet"]),
  },
]);

export const READBACK = inPart("readback", [{ id: "readback", ref: "14", kind: "readback", title: "Here's what we heard.", note: "You can come back and change any of this later.", seconds: 45 }]);
```

- [ ] **Step 5: The schema index**

Create `src/features/onboarding/schema/index.ts`:

```ts
import { BUYER } from "./parts/buyer";
import { CAMERA } from "./parts/camera";
import { CONTENT } from "./parts/content";
import { DEAL, READBACK } from "./parts/deal";
import { FUNNEL } from "./parts/funnel";
import { MONEY } from "./parts/money";
import { OFFER } from "./parts/offer";
import { POSITIONING } from "./parts/positioning";
import { PROGRAM } from "./parts/program";
import { PROOF } from "./parts/proof";
import { SALE } from "./parts/sale";
import { START } from "./parts/start";
import { STORY } from "./parts/story";
import { WHY } from "./parts/why";
import { YOU } from "./parts/you";
import type { Screen } from "./types";

/* Onboarding v2, every screen in order (spec order: connect, welcome, A, 1-13, read-back). */
export const SCREENS: Screen[] = [...START, ...SALE, ...YOU, ...WHY, ...MONEY, ...OFFER, ...BUYER, ...STORY, ...POSITIONING, ...CAMERA, ...CONTENT, ...FUNNEL, ...PROOF, ...PROGRAM, ...DEAL, ...READBACK];

/** The draft's form key (form_drafts.form_key). */
export const FORM_KEY = "onboarding-v2";

export { SALE_LAST, saleStoryFrom } from "./parts/sale";
export { hasProofFrom } from "./parts/proof";
```

- [ ] **Step 6: Add schema-wide tests**

Append to `tests/onboarding-engine.spec.ts`:

```ts
import { CLIENT_WRITABLE } from "../src/features/brain/model";
import { SCREENS } from "../src/features/onboarding/schema";
import { fieldsFor as save } from "../src/features/onboarding/engine";

test("every screen id is unique and every saved field is client-writable on the server", () => {
  const ids = SCREENS.map((screen) => screen.id);
  expect(new Set(ids).size).toBe(ids.length);
  const written = new Set<string>();
  for (const screen of SCREENS) {
    if (screen.field) written.add(screen.field);
    if (screen.save) for (const key of Object.keys(screen.save({}))) written.add(key);
  }
  const missing = [...written].filter((key) => !CLIENT_WRITABLE.has(key));
  expect(missing).toEqual([]);
});

test("part A writes nothing to the client brain", () => {
  for (const screen of SCREENS.filter((s) => s.part === "sale")) expect(save(screen, { [screen.id]: "x" })).toEqual({});
});

test("the funnel branch: no funnel is short, a funnel opens the deep dive and its metrics follow the path", () => {
  const ids = (answers: Record<string, unknown>) => visibleScreens(answers, SCREENS).filter((s) => s.part === "funnel").map((s) => s.id);
  expect(ids({ "funnel.has": "no" })).toEqual(expect.arrayContaining(["funnel.buy_today", "funnel.found", "funnel.links_now", "funnel.ads"]));
  expect(ids({ "funnel.has": "no" })).not.toContain("funnel.path");
  const deep = ids({ "funnel.has": "yes", "funnel.path": ["reel", "dm-trigger", "sales-call"] });
  expect(deep).toEqual(expect.arrayContaining(["funnel.path", "funnel.m_booked", "funnel.m_show", "funnel.m_close", "funnel.m_reply"]));
  expect(deep).not.toContain("funnel.step_links");
});

test("the buyer branch: Not really skips the breakdown and shows the starter profile", () => {
  const ids = visibleScreens({ "buyer.known": "no" }, SCREENS).filter((s) => s.part === "buyer").map((s) => s.id);
  expect(ids).toEqual(["buyer.known", "buyer.want_help", "buyer.engagers", "buyer.never", "buyer.starter", "buyer.research_note"]);
});

test("proof links back to their own result when they have no student results", () => {
  const ids = visibleScreens({ "proof.students": "not-yet", "proof.own_files": { types: ["payment"], uploads: [] } }, SCREENS).filter((s) => s.part === "proof").map((s) => s.id);
  expect(ids).toContain("proof.own_enough");
  expect(ids).not.toContain("proof.best");
});
```

(Move the new imports to the top of the file with the others.)

- [ ] **Step 7: Run the tests**

Run: `npx playwright test tests/onboarding-engine.spec.ts`
Expected: 15 passed. If "every saved field is client-writable" fails, the listed keys are missing from `ONBOARDING_V2_FIELDS` on one side: add them to BOTH `src/features/brain/model.ts` and Brain `functions/api/client-brain.js` (and `FIELD_DEFINITIONS`), then rerun this test and the Task 1 backend test.

- [ ] **Step 8: Commit**

```bash
git add src/features/onboarding/schema tests/onboarding-engine.spec.ts
git commit -m "Onboarding v2: content, funnel, proof, program, the deal, read-back; schema-wide tests"
```

---

## Phase 4: The form on screen

### Task 12: Voice tools, glowing cursor and the controls for every kind

**Files:**
- Create: `src/features/onboarding/voice-tools.tsx`
- Create: `src/features/onboarding/glow-cursor.tsx`
- Create: `src/features/onboarding/controls-v2.tsx`
- Modify: `src/app/globals.css` (one keyframe-free cursor rule set, see Step 2)

**Interfaces:**
- Consumes: `useRecorder`, `clock`, `takeName`, `MAX_RECORDING_MS` (`@/features/portal-workspace/voice/recorder`); `uploadVoiceNote`, `uploadProof`, `writeFailure` (`@/lib/api/portal-workspace`); `ChoiceCards`, `BigInput`, `BigTextarea`, `ChipsInput`, `Part`, `AUTOFOCUS` (`./controls`); `NICHES`, `nicheValue`, `readNiche` (`@/lib/niches`); schema types (Task 7); `nicheContent` (Task 8); `PATH_STEPS` (Task 11); `lastThreeMonths`, `num`, `MORE`, `resolve` (Task 7).
- Produces:
  - `MicButton({ client, readOnly, onText, label? })`: records, uploads to `/api/voice-note` (store only; never `action=apply`), calls `onText(transcript)`.
  - `useReadAloud(): { supported: boolean; speak(text: string): void; stop(): void }` (browser speech, free).
  - `GlowCursor()`: renders nothing on touch screens or with reduced motion.
  - `ScreenControl(props: ControlProps)`, `SayMore(props)`, `type ControlProps`.

- [ ] **Step 1: Voice tools**

Create `src/features/onboarding/voice-tools.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Mic, Square, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clock, MAX_RECORDING_MS, takeName, useRecorder } from "@/features/portal-workspace/voice/recorder";
import { uploadVoiceNote, writeFailure } from "@/lib/api/portal-workspace";

/*
 * Talk or type on every question (onboarding v2). The mic records in the browser, the note goes to
 * /api/voice-note (Workers AI Whisper, free) and the words come back into the answer box, where the
 * client can fix them. The note is stored only; it is never applied to the brain by itself.
 * Questions can be read out loud with the browser's own voice (free); a nicer voice comes later.
 */

export function MicButton({ client, readOnly, onText, label = "Talk instead" }: { client: string; readOnly: boolean; onText: (text: string) => void; label?: string }) {
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const recorder = useRecorder({
    onError: setMessage,
    onTake: (take) => void send(take.blob),
  });
  const recording = recorder.state === "recording";

  async function send(blob: Blob) {
    if (!blob.size) return setMessage("That recording is empty. Try again.");
    setUploading(true);
    setMessage("Turning your voice into text.");
    try {
      const note = await uploadVoiceNote(client, blob, takeName(blob));
      const text = (note.transcript ?? "").trim();
      if (text) {
        onText(text);
        setMessage("Added. Fix anything we got wrong.");
      } else setMessage("We saved it but couldn't hear the words. Type the short version instead.");
      recorder.discard();
    } catch (error) {
      setMessage(writeFailure(error, "That recording didn't upload. Try again."));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant={recording ? "destructive" : "outline"}
        size="sm"
        disabled={readOnly || uploading}
        aria-label={recording ? "Stop recording" : label}
        onClick={() => {
          if (recording) return recorder.stop();
          setMessage("");
          void recorder.start();
        }}
      >
        {uploading ? <Loader2 className="animate-spin" aria-hidden /> : recording ? <Square aria-hidden /> : <Mic aria-hidden />}
        {recording ? `Stop ${clock(recorder.elapsed)} / ${clock(MAX_RECORDING_MS)}` : label}
      </Button>
      <span role="status" aria-live="polite" className="text-[13px] text-muted-foreground">
        {message}
      </span>
    </div>
  );
}

export function useReadAloud() {
  const [supported, setSupported] = useState(false);
  useEffect(() => setSupported(typeof window !== "undefined" && "speechSynthesis" in window), []);
  const stop = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);
  const speak = useCallback(
    (text: string) => {
      if (!supported || !text.trim()) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      window.speechSynthesis.speak(utterance);
    },
    [supported],
  );
  useEffect(() => stop, [stop]);
  return { supported, speak, stop };
}

export function SpeakButton({ text, speak, supported }: { text: string; speak: (text: string) => void; supported: boolean }) {
  if (!supported) return null;
  return (
    <Button type="button" variant="ghost" size="icon-sm" aria-label="Read this question out loud" onClick={() => speak(text)}>
      <Volume2 aria-hidden />
    </Button>
  );
}
```

Check `Button` supports `variant="destructive"` and `size="icon-sm"` in `src/components/ui/button.tsx`; if a name differs, use the closest existing variant and size (do not add new ones).

- [ ] **Step 2: Glowing cursor (onboarding only)**

Create `src/features/onboarding/glow-cursor.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";

/*
 * The onboarding page's own cursor (founder 2026-10-15): a small ring with a soft glow in the
 * client's glow colour that follows the pointer. Only on screens with a fine pointer and without
 * reduced motion; text fields keep the normal text cursor. Lives on the onboarding page only.
 */
export function GlowCursor() {
  const dot = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)");
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setOn(fine.matches && !calm.matches);
    update();
    fine.addEventListener("change", update);
    calm.addEventListener("change", update);
    return () => {
      fine.removeEventListener("change", update);
      calm.removeEventListener("change", update);
    };
  }, []);

  useEffect(() => {
    if (!on) return;
    document.documentElement.classList.add("glow-cursor-on");
    const move = (event: PointerEvent) => {
      const node = dot.current;
      if (!node) return;
      node.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
      const target = event.target as HTMLElement | null;
      node.dataset.text = target?.closest("input:not([type=radio]):not([type=checkbox]), textarea, [contenteditable=true]") ? "1" : "0";
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => {
      document.documentElement.classList.remove("glow-cursor-on");
      window.removeEventListener("pointermove", move);
    };
  }, [on]);

  if (!on) return null;
  return <div ref={dot} aria-hidden className="glow-cursor" />;
}
```

Append to `src/app/globals.css`:

```css
/* Onboarding's glowing cursor (src/features/onboarding/glow-cursor.tsx). */
.glow-cursor-on,
.glow-cursor-on * {
  cursor: none;
}
.glow-cursor-on input:not([type="radio"]):not([type="checkbox"]),
.glow-cursor-on textarea {
  cursor: text;
}
.glow-cursor {
  position: fixed;
  top: -9px;
  left: -9px;
  z-index: 70;
  width: 18px;
  height: 18px;
  border-radius: 9999px;
  border: 1.5px solid rgb(var(--glow) / 0.9);
  box-shadow: 0 0 18px 6px rgb(var(--glow) / 0.35);
  pointer-events: none;
  transition: opacity 150ms ease;
}
.glow-cursor[data-text="1"] {
  opacity: 0;
}
```

`--glow` is defined in `globals.css` as `r g b` (design system "The glow colour"); confirm the exact token name there before using it.

- [ ] **Step 3: The controls**

Create `src/features/onboarding/controls-v2.tsx`. One component per kind, all driven by the same props. Everything below is the full file:

```tsx
"use client";

import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { uploadProof, writeFailure } from "@/lib/api/portal-workspace";
import { NICHES, nicheValue, readNiche } from "@/lib/niches";
import { cn } from "@/lib/utils";
import { AUTOFOCUS, BigInput, BigTextarea, ChipsInput, ChoiceCards, Part } from "./controls";
import { lastThreeMonths, MORE, num, resolve } from "./engine";
import { nicheContent, type Stage } from "./niche-content";
import type { Answers, AmountOrPercent, Ctx, HandlesValue, MoneyRow, PerPick, Persona, ProofCard, ProofFiles, Screen, StarterVerdicts } from "./schema/types";
import { MicButton } from "./voice-tools";

export type ControlProps = {
  screen: Screen;
  answers: Answers;
  ctx: Ctx;
  value: unknown;
  /** Set this screen's answer. */
  set: (value: unknown) => void;
  /** Set any answer key (Say more boxes, linked answers). */
  setKey: (key: string, value: unknown) => void;
  client: string;
  readOnly: boolean;
  /** Move on by itself after a first pick on a one-answer screen. */
  advance: () => void;
};

const STAGE_LABEL: Record<Stage, string> = { tof: "TOF, top of funnel", mof: "MOF, middle of funnel", bof: "BOF, bottom of funnel" };
const STAGE_SHORT: Record<Stage, string> = { tof: "TOF", mof: "MOF", bof: "BOF" };
const appendText = (current: unknown, add: string) => [typeof current === "string" ? current.trim() : "", add].filter(Boolean).join(" ");

export function ScreenControl(props: ControlProps) {
  const { screen } = props;
  switch (screen.kind) {
    case "text":
      return <TextControl {...props} />;
    case "long":
      return <LongControl {...props} />;
    case "number":
      return <NumberControl {...props} />;
    case "choice":
      return <SingleChoice {...props} />;
    case "multi":
      return <MultiChoice {...props} />;
    case "scale":
      return <ScaleControl {...props} />;
    case "sliders":
      return <SlidersControl {...props} />;
    case "fields":
      return <FieldsControl {...props} />;
    case "chips":
      return <ChipsInput label={resolve(screen.title, props.ctx)} placeholder={screen.placeholder} values={(props.value as string[] | undefined) ?? []} onChange={props.set} disabled={props.readOnly} />;
    case "handles":
      return <HandlesControl {...props} />;
    case "niche":
      return <NicheControl {...props} />;
    case "money":
      return <MoneyControl {...props} />;
    case "amount-or-percent":
      return <AmountOrPercentControl {...props} />;
    case "rows":
      return <RowsControl {...props} />;
    case "per-pick":
      return <PerPickControl {...props} />;
    case "persona":
      return <PersonaControl {...props} />;
    case "path":
      return <PathControl {...props} />;
    case "step-links":
      return <StepLinksControl {...props} />;
    case "facts":
      return <FactsControl {...props} />;
    case "stages":
      return <StagesControl {...props} />;
    case "horizontal":
      return <HorizontalControl {...props} />;
    case "quiz":
      return <QuizControl {...props} />;
    case "starter":
      return <StarterControl {...props} />;
    case "proof-files":
      return <ProofFilesControl {...props} />;
    case "proof-cards":
      return <ProofCardsControl {...props} />;
    case "link-or-choice":
      return <LinkOrChoiceControl {...props} />;
    case "info":
      return <InfoControl {...props} />;
    default:
      // connect, welcome and readback are drawn by the screen itself (Tasks 13 to 15).
      return null;
  }
}

/** The "Say more" box under a control: type or talk, saved with the answer as {pick, more}. */
export function SayMore({ label, answers, setKey, id, client, readOnly }: { label: string; answers: Answers; setKey: ControlProps["setKey"]; id: string; client: string; readOnly: boolean }) {
  const key = MORE(id);
  const value = (answers[key] as string | undefined) ?? "";
  return (
    <div className="mt-5 grid gap-2">
      <label htmlFor={`more-${id}`} className="text-sm font-medium">
        {label}
      </label>
      <Textarea
        id={`more-${id}`}
        value={value}
        disabled={readOnly}
        onChange={(event) => setKey(key, event.target.value)}
        rows={3}
        className="min-h-20 rounded-xl bg-card text-base leading-relaxed shadow-elev-1 md:text-base dark:bg-card"
      />
      <MicButton client={client} readOnly={readOnly} onText={(text) => setKey(key, appendText(value, text))} />
    </div>
  );
}

function TextControl({ screen, value, set, client, readOnly }: ControlProps) {
  if (screen.kind !== "text") return null;
  return (
    <div className="grid gap-3">
      <BigInput aria-label={typeof screen.title === "string" ? screen.title : "Your answer"} inputMode={screen.inputMode} placeholder={screen.placeholder} value={(value as string) ?? ""} disabled={readOnly} onChange={(event) => set(event.target.value)} />
      {screen.inputMode !== "url" && <MicButton client={client} readOnly={readOnly} onText={(text) => set(appendText(value, text))} />}
    </div>
  );
}

function LongControl({ screen, value, set, answers, client, readOnly }: ControlProps) {
  if (screen.kind !== "long") return null;
  const earlier = screen.copyFrom ? answers[screen.copyFrom] : null;
  return (
    <div className="grid gap-3">
      {typeof earlier === "string" && earlier.trim() && !value && (
        <Button type="button" variant="outline" className="justify-self-start" onClick={() => set(earlier)}>
          Yes, that's the one. Use what I said.
        </Button>
      )}
      <BigTextarea aria-label="Your answer" placeholder={screen.placeholder} value={(value as string) ?? ""} disabled={readOnly} onChange={(event) => set(event.target.value)} />
      <MicButton client={client} readOnly={readOnly} label={screen.talk ? "Talk it through" : "Talk instead"} onText={(text) => set(appendText(value, text))} />
    </div>
  );
}

function NumberControl({ screen, value, set, readOnly }: ControlProps) {
  if (screen.kind !== "number") return null;
  return (
    <div className="flex items-center gap-2">
      {screen.prefix && <span className="text-lg text-muted-foreground">{screen.prefix}</span>}
      <BigInput aria-label="Number" inputMode="decimal" className="max-w-56 tabular-nums" value={value == null ? "" : String(value)} disabled={readOnly} onChange={(event) => set(event.target.value)} />
    </div>
  );
}

function SingleChoice({ screen, value, set, advance, readOnly }: ControlProps) {
  if (screen.kind !== "choice") return null;
  return (
    <ChoiceCards
      name={screen.id}
      label={typeof screen.title === "string" ? screen.title : "Choose one"}
      options={screen.options}
      value={(value as string) ?? ""}
      disabled={readOnly}
      onChange={(next) => {
        // A first pick moves on by itself; a screen with a Say more box waits for the words.
        if (!value && !screen.sayMore) advance();
        set(String(next));
      }}
    />
  );
}

function MultiChoice({ screen, value, set, readOnly }: ControlProps) {
  if (screen.kind !== "multi") return null;
  const exclusive = new Set(screen.exclusive ?? []);
  return (
    <ChoiceCards
      name={screen.id}
      label={typeof screen.title === "string" ? screen.title : "Choose any"}
      multiple
      options={screen.options}
      value={(value as string[]) ?? []}
      disabled={readOnly}
      onChange={(next) => {
        const picks = next as string[];
        const before = new Set((value as string[]) ?? []);
        const added = picks.find((pick) => !before.has(pick));
        // "None" and "Never" clear the others; picking anything else clears them.
        if (added && exclusive.has(added)) return set([added]);
        set(picks.filter((pick) => !exclusive.has(pick)));
      }}
    />
  );
}

function ScaleControl({ screen, value, set, readOnly }: ControlProps) {
  if (screen.kind !== "scale") return null;
  const numbers = Array.from({ length: screen.max - screen.min + 1 }, (_, i) => screen.min + i);
  return (
    <div role="radiogroup" aria-label="Pick a number" className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        {numbers.map((n, index) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            disabled={readOnly}
            onClick={() => set(n)}
            className={cn(
              "grid size-12 place-items-center rounded-xl border bg-card text-lg font-medium tabular-nums shadow-elev-1 transition-colors duration-(--dur) hover:border-foreground/25 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              value === n && "border-brand bg-brand/8",
            )}
            {...(index === 0 ? AUTOFOCUS : {})}
          >
            {n}
          </button>
        ))}
      </div>
      {screen.labels && (
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-[13px] text-muted-foreground">
          {Object.entries(screen.labels).map(([n, label]) => (
            <span key={n}>
              {n}: {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function SlidersControl({ screen, value, set, readOnly }: ControlProps) {
  if (screen.kind !== "sliders") return null;
  const v = (value ?? {}) as Record<string, number>;
  return (
    <div className="grid gap-6">
      {screen.sliders.map((slider, index) => (
        <label key={slider.key} className="grid gap-2">
          <span className="flex justify-between text-sm font-medium">
            <span>{slider.left}</span>
            <span>{slider.right}</span>
          </span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={v[slider.key] ?? 50}
            disabled={readOnly}
            aria-label={`${slider.left} to ${slider.right}`}
            onChange={(event) => set({ ...v, [slider.key]: Number(event.target.value) })}
            className="accent-[var(--brand)]"
            {...(index === 0 ? AUTOFOCUS : {})}
          />
        </label>
      ))}
    </div>
  );
}

function FieldsControl({ screen, value, set, client, readOnly }: ControlProps) {
  if (screen.kind !== "fields") return null;
  const v = (value ?? {}) as Record<string, string>;
  return (
    <div className="grid gap-5">
      {screen.inputs.map((input, index) => (
        <Part key={input.key} label={input.optional ? `${input.label} (optional)` : input.label} htmlFor={`${screen.id}-${input.key}`}>
          {input.long ? (
            <>
              <BigTextarea id={`${screen.id}-${input.key}`} autoFocus={index === 0} className="min-h-28" value={v[input.key] ?? ""} disabled={readOnly} onChange={(event) => set({ ...v, [input.key]: event.target.value })} />
              <MicButton client={client} readOnly={readOnly} onText={(text) => set({ ...v, [input.key]: appendText(v[input.key], text) })} />
            </>
          ) : (
            <BigInput
              id={`${screen.id}-${input.key}`}
              autoFocus={index === 0}
              inputMode={input.inputMode}
              placeholder={input.placeholder}
              value={v[input.key] ?? ""}
              disabled={readOnly}
              onChange={(event) => set({ ...v, [input.key]: event.target.value })}
            />
          )}
        </Part>
      ))}
    </div>
  );
}

function HandlesControl({ screen, value, set, readOnly }: ControlProps) {
  if (screen.kind !== "handles") return null;
  const v = (value ?? { picked: [], handles: {} }) as HandlesValue;
  return (
    <div className="grid gap-4">
      <ChoiceCards
        name={screen.id}
        label="Platforms"
        multiple
        compact
        options={screen.platforms}
        value={v.picked}
        disabled={readOnly}
        onChange={(next) => set({ ...v, picked: next as string[] })}
      />
      {v.picked.map((platform) => (
        <Part key={platform} label={`${screen.platforms.find((p) => p.value === platform)?.label ?? platform} handle`} htmlFor={`handle-${platform}`}>
          <BigInput id={`handle-${platform}`} autoFocus={false} placeholder="@yourhandle or a profile link" value={v.handles[platform] ?? ""} disabled={readOnly} onChange={(event) => set({ ...v, handles: { ...v.handles, [platform]: event.target.value } })} />
        </Part>
      ))}
    </div>
  );
}

/** Our niches (src/lib/niches.ts) as cards, and "Something else" for their own words (ticket #62). */
function NicheControl({ value, set, advance, readOnly }: ControlProps) {
  const saved = readNiche(value);
  const [otherOpen, setOtherOpen] = useState(saved.id === "other");
  const picked = otherOpen ? "other" : saved.id;
  return (
    <div className="grid gap-4">
      <ChoiceCards
        name="niche"
        label="Your niche"
        options={[...NICHES.map(({ id, label, note }) => ({ value: id, label, note })), { value: "other", label: "Something else", note: "Write it in your own words" }]}
        value={picked}
        disabled={readOnly}
        onChange={(next) => {
          setOtherOpen(next === "other");
          if (!value && next !== "other") advance();
          set(next === "other" ? saved.text : String(next));
        }}
      />
      {otherOpen && <BigInput aria-label="Your niche, in your words" placeholder="In your own words" maxLength={80} value={saved.text} onChange={(event) => set(nicheValue("other", event.target.value))} />}
    </div>
  );
}

function MoneyControl({ value, set, readOnly }: ControlProps) {
  const months = lastThreeMonths(new Date());
  const rows: MoneyRow[] = months.map((month) => ((value as MoneyRow[] | undefined) ?? []).find((row) => row.month === month) ?? { month, revenue: "", profit: "" });
  const update = (index: number, patch: Partial<MoneyRow>) => set(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  const margin = (row: MoneyRow) => {
    const revenue = num(row.revenue);
    const profit = num(row.profit);
    return revenue && profit != null ? Math.round((profit / revenue) * 100) : null;
  };
  const totals = rows.reduce((sum, row) => ({ revenue: sum.revenue + (num(row.revenue) ?? 0), profit: sum.profit + (num(row.profit) ?? 0) }), { revenue: 0, profit: 0 });
  const average = totals.revenue ? Math.round((totals.profit / totals.revenue) * 100) : null;
  const monthName = (month: string) => new Date(`${month}-01T12:00:00Z`).toLocaleString("en", { month: "long", year: "numeric", timeZone: "UTC" });
  return (
    <div className="grid gap-3">
      {rows.map((row, index) => (
        <fieldset key={row.month} className="grid gap-2 rounded-xl bg-card p-4 shadow-elev-1 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
          <legend className="mb-1 text-sm font-medium">{monthName(row.month)}</legend>
          <label className="grid gap-1 text-[12px] text-muted-foreground">
            Revenue ($)
            <input inputMode="decimal" disabled={readOnly} value={row.revenue} onChange={(event) => update(index, { revenue: event.target.value })} className="h-11 rounded-lg border border-input bg-transparent px-3 text-base tabular-nums text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" {...(index === 0 ? AUTOFOCUS : {})} />
          </label>
          <label className="grid gap-1 text-[12px] text-muted-foreground">
            Profit after costs ($)
            <input inputMode="decimal" disabled={readOnly} value={row.profit} onChange={(event) => update(index, { profit: event.target.value })} className="h-11 rounded-lg border border-input bg-transparent px-3 text-base tabular-nums text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" />
          </label>
          <p className="text-sm tabular-nums text-muted-foreground sm:col-span-2 sm:pb-3">{margin(row) == null ? "Margin shows here" : `Margin ${margin(row)}%`}</p>
        </fieldset>
      ))}
      <p className="text-sm tabular-nums">{average == null ? "" : `3-month margin: ${average}%`}</p>
    </div>
  );
}

function AmountOrPercentControl({ value, set, readOnly }: ControlProps) {
  const v = (value ?? { mode: "amount", value: "" }) as AmountOrPercent;
  return (
    <div className="grid gap-3">
      <ChoiceCards name="amount-mode" label="Amount or percent" compact shortcuts={false} autoFocus={false} options={[{ value: "amount", label: "A $ amount" }, { value: "percent", label: "A percent" }]} value={v.mode} disabled={readOnly} onChange={(mode) => set({ ...v, mode })} />
      <div className="flex items-center gap-2">
        {v.mode === "amount" && <span className="text-lg text-muted-foreground">$</span>}
        <BigInput aria-label={v.mode === "amount" ? "Amount a month" : "Percent of income"} inputMode="decimal" className="max-w-56 tabular-nums" value={v.value} disabled={readOnly} onChange={(event) => set({ ...v, value: event.target.value })} />
        {v.mode === "percent" && <span className="text-lg text-muted-foreground">%</span>}
      </div>
    </div>
  );
}

function RowsControl({ screen, value, set, ctx, readOnly }: ControlProps) {
  if (screen.kind !== "rows") return null;
  const v = (value ?? {}) as Record<string, string>;
  return (
    <div className="grid gap-4">
      {screen.rows(ctx).map((row, index) => (
        <fieldset key={row.value} className="grid gap-2">
          <legend className="text-sm font-medium">{row.label}</legend>
          <ChoiceCards name={`${screen.id}-${row.value}`} label={row.label} compact shortcuts={false} autoFocus={index === 0} options={screen.levels} value={v[row.value] ?? ""} disabled={readOnly} onChange={(level) => set({ ...v, [row.value]: String(level) })} />
        </fieldset>
      ))}
    </div>
  );
}

function PerPickControl({ screen, answers, value, set, client, readOnly }: ControlProps) {
  if (screen.kind !== "per-pick") return null;
  const picks = ((answers[screen.from] as string[] | undefined) ?? []).filter((pick) => screen.options.some((option) => option.value === pick));
  const v = (value ?? {}) as PerPick;
  const patch = (pick: string, next: PerPick[string]) => set({ ...v, [pick]: { ...v[pick], ...next } });
  return (
    <div className="grid gap-4">
      {picks.map((pick, index) => {
        const option = screen.options.find((o) => o.value === pick)!;
        return (
          <section key={pick} className="grid gap-3 rounded-xl bg-card p-4 shadow-elev-1" aria-label={option.label}>
            <h2 className="text-[15px] font-medium">{option.label}</h2>
            <p className="text-[13px] text-muted-foreground">{screen.prompt}</p>
            {screen.rating && (
              <div role="radiogroup" aria-label={`${option.label}: how much it helped`} className="flex gap-2">
                {Array.from({ length: screen.rating.max - screen.rating.min + 1 }, (_, i) => screen.rating!.min + i).map((n) => (
                  <button key={n} type="button" role="radio" aria-checked={v[pick]?.rating === n} disabled={readOnly} onClick={() => patch(pick, { rating: n })} className={cn("grid size-10 place-items-center rounded-lg border tabular-nums", v[pick]?.rating === n && "border-brand bg-brand/8")} {...(index === 0 && n === screen.rating!.min ? AUTOFOCUS : {})}>
                    {n}
                  </button>
                ))}
              </div>
            )}
            {screen.verdicts && <ChoiceCards name={`${screen.id}-${pick}`} label={`${option.label}: did it work`} compact shortcuts={false} autoFocus={false} options={screen.verdicts} value={v[pick]?.verdict ?? ""} disabled={readOnly} onChange={(verdict) => patch(pick, { verdict: String(verdict) })} />}
            <Textarea aria-label={`${option.label}: notes`} rows={2} value={v[pick]?.note ?? ""} disabled={readOnly} onChange={(event) => patch(pick, { note: event.target.value })} className="min-h-16 rounded-lg" />
            <MicButton client={client} readOnly={readOnly} onText={(text) => patch(pick, { note: appendText(v[pick]?.note, text) })} />
          </section>
        );
      })}
    </div>
  );
}

function PersonaControl({ screen, value, set, readOnly }: ControlProps) {
  if (screen.kind !== "persona") return null;
  const v = (value ?? { first: "" }) as Persona;
  const pick = (option: string) => {
    if (v.first === option) return set({ ...v, first: v.second ?? "", second: "" });
    if (v.second === option) return set({ ...v, second: "" });
    if (!v.first) return set({ ...v, first: option });
    set({ ...v, second: option });
  };
  return (
    <div className="grid gap-3">
      <div className="grid gap-2.5 sm:grid-cols-2">
        {screen.options.map((option, index) => {
          const rank = v.first === option.value ? "First" : v.second === option.value ? "Second" : null;
          return (
            <button key={option.value} type="button" disabled={readOnly} aria-pressed={Boolean(rank)} onClick={() => pick(option.value)} className={cn("grid gap-0.5 rounded-xl border bg-card px-4 py-3.5 text-left shadow-elev-1 transition-colors duration-(--dur) hover:border-foreground/25", rank && "border-brand bg-brand/8")} {...(index === 0 ? AUTOFOCUS : {})}>
              <span className="flex items-center justify-between text-[15px] font-medium">
                {option.label}
                {rank && <span className="rounded-sm bg-brand px-1.5 py-0.5 text-[11px] text-brand-foreground">{rank}</span>}
              </span>
              {option.note && <span className="text-[13px] text-muted-foreground">{option.note}</span>}
            </button>
          );
        })}
      </div>
      {(v.first === "other" || v.second === "other") && <BigInput aria-label="Describe it in your own words" autoFocus={false} value={v.other ?? ""} disabled={readOnly} onChange={(event) => set({ ...v, other: event.target.value })} />}
    </div>
  );
}

function PathControl({ screen, value, set, readOnly }: ControlProps) {
  if (screen.kind !== "path") return null;
  const steps = (value as string[] | undefined) ?? [];
  const label = (step: string) => screen.steps.find((option) => option.value === step)?.label ?? step;
  const move = (index: number, by: number) => {
    const next = [...steps];
    const [item] = next.splice(index, 1);
    next.splice(index + by, 0, item);
    set(next);
  };
  return (
    <div className="grid gap-5">
      <ol aria-label="Your funnel so far" className="flex min-h-12 flex-wrap items-center gap-2 rounded-xl border border-dashed p-3">
        {steps.length === 0 && <li className="text-[13px] text-muted-foreground">Tap the steps below, first to last.</li>}
        {steps.map((step, index) => (
          <li key={`${step}-${index}`} className="flex items-center gap-1.5">
            {index > 0 && <span aria-hidden className="text-muted-foreground">-&gt;</span>}
            <span className="inline-flex items-center gap-1 rounded-full bg-brand/12 py-1 pr-1 pl-3 text-[13.5px]">
              {label(step)}
              <button type="button" aria-label={`Move ${label(step)} earlier`} disabled={readOnly || index === 0} onClick={() => move(index, -1)} className="grid size-5 place-items-center rounded-full hover:bg-foreground/10 disabled:opacity-30">
                <ArrowUp className="size-3" aria-hidden />
              </button>
              <button type="button" aria-label={`Move ${label(step)} later`} disabled={readOnly || index === steps.length - 1} onClick={() => move(index, 1)} className="grid size-5 place-items-center rounded-full hover:bg-foreground/10 disabled:opacity-30">
                <ArrowDown className="size-3" aria-hidden />
              </button>
              <button type="button" aria-label={`Remove ${label(step)}`} disabled={readOnly} onClick={() => set(steps.filter((_, i) => i !== index))} className="grid size-5 place-items-center rounded-full hover:bg-foreground/10">
                <X className="size-3" aria-hidden />
              </button>
            </span>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        {screen.steps.map((option, index) => (
          <Button key={option.value} type="button" variant="outline" size="sm" disabled={readOnly} onClick={() => set([...steps, option.value])} {...(index === 0 ? AUTOFOCUS : {})}>
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

const LINKABLE = new Set(["bio-link", "landing-page", "vsl", "application", "booking-page", "checkout", "lead-magnet"]);
function StepLinksControl({ screen, answers, value, set, readOnly }: ControlProps) {
  if (screen.kind !== "step-links") return null;
  const v = (value ?? {}) as Record<string, string>;
  const steps = [...new Set(((answers["funnel.path"] as string[] | undefined) ?? []).filter((step) => LINKABLE.has(step)))];
  return (
    <div className="grid gap-4">
      {steps.map((step, index) => (
        <Part key={step} label={screen.steps.find((option) => option.value === step)?.label ?? step} htmlFor={`link-${step}`}>
          <BigInput id={`link-${step}`} autoFocus={index === 0} inputMode="url" placeholder="https://" value={v[step] ?? ""} disabled={readOnly} onChange={(event) => set({ ...v, [step]: event.target.value })} />
        </Part>
      ))}
    </div>
  );
}

function FactsControl({ screen }: ControlProps) {
  if (screen.kind !== "facts") return null;
  return (
    <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0">
      {screen.cards.map((card) => (
        <li key={card.title} className="w-[78%] shrink-0 snap-start rounded-xl bg-card p-4 shadow-elev-1 sm:w-auto">
          <p className="text-[15px] font-medium">{card.title}</p>
          <p className="mt-1 text-[13.5px] leading-relaxed text-muted-foreground">{card.body}</p>
        </li>
      ))}
    </ul>
  );
}

function StagesControl({ ctx }: ControlProps) {
  const content = nicheContent(ctx.niche);
  const meaning: Record<Stage, string> = {
    tof: "Speaks to everyone, to get the view.",
    mof: "Speaks to your dream follower: a problem that's still broad, with your buyer inside it.",
    bof: "Speaks only to your buyer, their exact pains and wants, and moves them toward buying. Then the landing page, VSL, booking and the call.",
  };
  return (
    <ol className="grid gap-3">
      {(["tof", "mof", "bof"] as Stage[]).map((stage, index) => (
        <li key={stage} className="rounded-xl bg-card p-4 shadow-elev-1" style={{ marginInline: `${index * 6}%` }}>
          <p className="text-[15px] font-medium">{STAGE_LABEL[stage]}</p>
          <p className="mt-1 text-[13.5px] text-muted-foreground">{meaning[stage]}</p>
          <p className="mt-2 text-[13.5px]">Example: &quot;{content.stages[stage]}&quot;</p>
        </li>
      ))}
    </ol>
  );
}

function HorizontalControl({ ctx }: ControlProps) {
  const content = nicheContent(ctx.niche);
  const parts: { stage: Stage; width: string; caption: string }[] = [
    { stage: "tof", width: "20%", caption: "Wide opening" },
    { stage: "mof", width: "45%", caption: "Narrows to your dream follower" },
    { stage: "bof", width: "35%", caption: "Lands on your buyer" },
  ];
  return (
    <div className="grid gap-4">
      <div role="img" aria-label="One video, left to right: the first 20 percent is TOF, the middle is MOF, the end is BOF" className="flex h-12 overflow-hidden rounded-xl">
        {parts.map((part, index) => (
          <div key={part.stage} className="grid place-items-center text-[13px] font-medium" style={{ width: part.width, background: `rgb(var(--glow) / ${0.18 + index * 0.18})` }}>
            {STAGE_SHORT[part.stage]}
          </div>
        ))}
      </div>
      <ul className="grid gap-2 sm:grid-cols-3">
        {parts.map((part) => (
          <li key={part.stage} className="rounded-lg bg-muted/60 p-3 text-[13px]">
            <p className="font-medium">{part.caption}</p>
            <p className="mt-1 text-muted-foreground">&quot;{content.stages[part.stage]}&quot;</p>
          </li>
        ))}
      </ul>
      <p className="text-[13px] text-muted-foreground">From the reel breakdown in our playbook: every video can serve all three stages.</p>
    </div>
  );
}

function QuizControl({ ctx, value, set, readOnly }: ControlProps) {
  const content = nicheContent(ctx.niche);
  const items = [...content.quiz, { line: `A video that opens with "${content.stages.tof}", narrows to "${content.stages.mof}" and ends with "${content.stages.bof}". Which stage is the ending?`, answer: "bof" as Stage }];
  const v = (value ?? {}) as Record<string, Stage>;
  return (
    <ol className="grid gap-4">
      {items.map((item, index) => {
        const answer = v[index];
        return (
          <li key={index} className="grid gap-2 rounded-xl bg-card p-4 shadow-elev-1">
            <p className="text-[14px]">{item.line}</p>
            <div className="flex gap-2">
              {(["tof", "mof", "bof"] as Stage[]).map((stage) => (
                <Button key={stage} type="button" size="sm" variant={answer === stage ? "default" : "outline"} disabled={readOnly || Boolean(answer)} onClick={() => set({ ...v, [index]: stage })}>
                  {STAGE_SHORT[stage]}
                </Button>
              ))}
            </div>
            {answer && (
              <p role="status" className={cn("text-[13px]", answer === item.answer ? "text-success" : "text-muted-foreground")}>
                {answer === item.answer ? "Right." : `It's ${STAGE_SHORT[item.answer]}. ${item.answer === "tof" ? "It speaks to everyone." : item.answer === "mof" ? "It's broad, but your buyer is inside it." : "It speaks only to your buyer."}`}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function StarterControl({ ctx, value, set, readOnly }: ControlProps) {
  const cards = nicheContent(ctx.niche).starter;
  const v = (value ?? {}) as StarterVerdicts;
  return (
    <ul className="grid gap-3">
      {cards.map((card, index) => (
        <li key={card.key} className="grid gap-2 rounded-xl bg-card p-4 shadow-elev-1">
          <p className="text-[12px] font-medium text-muted-foreground">{card.label}</p>
          <p className="text-[14.5px]">{card.text}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant={v[card.key]?.verdict === "yes" ? "default" : "outline"} disabled={readOnly} onClick={() => set({ ...v, [card.key]: { verdict: "yes" } })} {...(index === 0 ? AUTOFOCUS : {})}>
              Sounds like my buyers
            </Button>
            <Button type="button" size="sm" variant={v[card.key]?.verdict === "fix" ? "default" : "outline"} disabled={readOnly} onClick={() => set({ ...v, [card.key]: { verdict: "fix", fix: v[card.key]?.fix ?? "" } })}>
              Not quite
            </Button>
          </div>
          {v[card.key]?.verdict === "fix" && <BigInput aria-label={`${card.label}: fix it in a line`} autoFocus value={v[card.key]?.fix ?? ""} disabled={readOnly} onChange={(event) => set({ ...v, [card.key]: { verdict: "fix", fix: event.target.value } })} />}
        </li>
      ))}
    </ul>
  );
}

const PROOF_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
function useProofUpload(onAdded: (item: { id: number; url: string }) => void) {
  const [uploading, setUploading] = useState(0);
  const [message, setMessage] = useState("");
  async function add(files: File[], claim: string) {
    setMessage("");
    for (const file of files) {
      if (!PROOF_TYPES.includes(file.type)) {
        setMessage(`${file.name} is not a PNG, JPG, WebP or GIF image.`);
        continue;
      }
      if (!file.size || file.size > 10 * 1024 * 1024) {
        setMessage(`${file.name} must be 10 MB or smaller.`);
        continue;
      }
      setUploading((n) => n + 1);
      try {
        const item = await uploadProof(file, claim);
        onAdded({ id: item.id, url: item.url ?? "" });
      } catch (error) {
        setMessage(writeFailure(error, `${file.name} could not be uploaded.`));
      } finally {
        setUploading((n) => n - 1);
      }
    }
  }
  return { uploading, message, add };
}

function ProofFilesControl({ screen, value, set, readOnly }: ControlProps) {
  if (screen.kind !== "proof-files") return null;
  const v = (value ?? { types: [], uploads: [] }) as ProofFiles;
  const latest = useRef(v);
  latest.current = v;
  const input = useRef<HTMLInputElement>(null);
  const claim = typeof screen.title === "string" ? screen.title : "Proof";
  const upload = useProofUpload((item) => set({ ...latest.current, uploads: [...latest.current.uploads, item] }));
  const showsSomething = v.types.some((type) => type !== "none");
  return (
    <div className="grid gap-4">
      <ChoiceCards
        name={screen.id}
        label="What you have"
        multiple
        options={screen.types}
        value={v.types}
        disabled={readOnly}
        onChange={(next) => {
          const picks = next as string[];
          const added = picks.find((pick) => !v.types.includes(pick));
          set({ ...v, types: added === "none" ? ["none"] : picks.filter((pick) => pick !== "none") });
        }}
      />
      {showsSomething && (
        <div className="grid gap-3 rounded-2xl border border-dashed p-4">
          {v.uploads.length > 0 && (
            <ul className="grid grid-cols-3 gap-2">
              {v.uploads.map((item) => (
                // eslint-disable-next-line @next/next/no-img-element -- served by /api/media, same origin
                <li key={item.id}><img src={item.url} alt="" className="aspect-square w-full rounded-lg bg-muted object-cover" /></li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
            <ImagePlus className="size-4" aria-hidden />
            <span>Add screenshots (PNG, JPG, WebP or GIF, up to 10 MB). Videos: paste the link in the next box.</span>
            <Button type="button" variant="outline" size="sm" disabled={readOnly} onClick={() => input.current?.click()}>
              Choose images
            </Button>
            <input ref={input} type="file" multiple accept={PROOF_TYPES.join(",")} className="sr-only" aria-label="Choose proof images" onChange={(event) => { void upload.add(Array.from(event.target.files ?? []), claim); event.target.value = ""; }} />
          </div>
          {(upload.uploading > 0 || upload.message) && (
            <p role="status" className={cn("text-[13px]", upload.message ? "text-destructive" : "text-muted-foreground")}>
              {upload.uploading > 0 && <Loader2 className="mr-1.5 inline size-3.5 animate-spin" aria-hidden />}
              {upload.uploading > 0 ? `Uploading ${upload.uploading}` : upload.message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ProofCardsControl({ answers, value, set, readOnly }: ControlProps) {
  const count = ["6-10", "10-plus"].includes(String(answers["proof.count"])) ? 5 : 3;
  const cards = Array.from({ length: count }, (_, i) => ((value as ProofCard[] | undefined) ?? [])[i] ?? { who: "", result: "", time: "", permission: "" });
  const patch = (index: number, next: Partial<ProofCard>) => set(cards.map((card, i) => (i === index ? { ...card, ...next } : card)));
  return (
    <ol className="grid gap-3">
      {cards.map((card, index) => (
        <li key={index} className="grid gap-3 rounded-xl bg-card p-4 shadow-elev-1">
          <p className="text-sm font-medium">Result {index + 1}</p>
          <BigInput aria-label={`Result ${index + 1}: who they were before`} autoFocus={index === 0} placeholder="Who they were before" value={card.who} disabled={readOnly} onChange={(event) => patch(index, { who: event.target.value })} />
          <BigInput aria-label={`Result ${index + 1}: the result and number`} autoFocus={false} placeholder="The result, with the number" value={card.result} disabled={readOnly} onChange={(event) => patch(index, { result: event.target.value })} />
          <BigInput aria-label={`Result ${index + 1}: how long it took`} autoFocus={false} placeholder="How long it took" value={card.time} disabled={readOnly} onChange={(event) => patch(index, { time: event.target.value })} />
          <ChoiceCards name={`proof-card-${index}`} label={`Result ${index + 1}: can we use their name`} compact shortcuts={false} autoFocus={false} options={[{ value: "yes", label: "Use their name" }, { value: "first-name", label: "First name only" }, { value: "no-names", label: "No names" }, { value: "ask", label: "I need to ask" }]} value={card.permission} disabled={readOnly} onChange={(permission) => patch(index, { permission: String(permission) })} />
        </li>
      ))}
    </ol>
  );
}

function LinkOrChoiceControl({ screen, value, set, readOnly }: ControlProps) {
  if (screen.kind !== "link-or-choice") return null;
  const v = (value ?? {}) as { link?: string; pick?: string };
  return (
    <div className="grid gap-4">
      <BigInput aria-label="Link to the video" inputMode="url" placeholder="https://" value={v.link ?? ""} disabled={readOnly} onChange={(event) => set({ ...v, link: event.target.value })} />
      <ChoiceCards name={screen.id} label="Where you saw us" compact autoFocus={false} options={screen.options} value={v.pick ?? ""} disabled={readOnly} onChange={(pick) => set({ ...v, pick: String(pick) })} />
    </div>
  );
}

function InfoControl({ screen, ctx }: ControlProps) {
  if (screen.kind !== "info") return null;
  const body = resolve(screen.body, ctx);
  return (
    <div className="grid gap-3">
      {body && <p className="max-w-[60ch] text-[15px] leading-relaxed">{body}</p>}
      {screen.bullets && (
        <ul className="grid gap-2.5">
          {screen.bullets.map((bullet) => (
            <li key={bullet} className="flex gap-3 rounded-xl bg-card p-4 text-[14.5px] leading-relaxed shadow-elev-1">
              {bullet}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

React rules: `ProofFilesControl` calls hooks after an early `return null`. Move the `if (screen.kind !== "proof-files") return null;` below the hooks (read `screen.types` with a cast) so hooks always run in the same order; do the same anywhere lint (`react-hooks/rules-of-hooks`) complains.

- [ ] **Step 4: Lint and typecheck**

Run: `npm run lint && npm run typecheck`
Expected: no errors. Fix anything flagged; don't silence rules.

- [ ] **Step 5: Commit**

```bash
git add src/features/onboarding/voice-tools.tsx src/features/onboarding/glow-cursor.tsx src/features/onboarding/controls-v2.tsx src/app/globals.css
git commit -m "Onboarding v2: controls for every kind, talk on every answer, read aloud, glowing cursor"
```

---

### Task 13: The form, rebuilt on the engine (with drafts, saving, part A, link-backs)

**Files:**
- Rewrite: `src/features/onboarding/onboarding-screen.tsx`
- Rewrite: `tests/onboarding.spec.ts`

**Interfaces:**
- Consumes: everything from Tasks 5 to 12; `saveAnswers` and `saveHandle` from `src/lib/api/onboarding.ts` (unchanged); `useStepHistory` from `src/lib/use-step-history.ts` (`{ forward(next), back() }`); `BrandLoader`.
- Produces: the `/portal/onboarding` page. `Done` and `Welcome` stay as components in this file.

Behaviour the code must have (the test in Step 1 checks each one):
1. Loading shows `BrandLoader` (not skeletons): founder rule, logo glow on loads.
2. Answers start as `prefill(brainRead, SCREENS)` overlaid with the restored draft's `answers` (the draft is newer than the brain).
3. Every change calls `draft.save({ answers, saleSent, connectSkipped }, currentScreenId)`.
4. Continue: run `problemWith`; then `fieldsFor` -> `changedFields` against a snapshot of what the brain holds -> `saveAnswers(client, changed)` if anything changed; update the snapshot.
5. After `you.platforms` saves, send Instagram and YouTube handles with `saveHandle` (same rule as today: only when changed).
6. Leaving `SALE_LAST` posts `saveSaleStory(saleStoryFrom(answers))` once (`saleSent` in the draft); a failure shows the error and stays on the screen.
7. A screen whose saved value came from the operator (source `operator` or `research`) and that the client has not touched yet shows "From your call with us. Is this right?" above the control (spec: "Don't re-ask what we know").
8. `intro` lines render above the title. The header shows "about N min left" from `minutesLeft(visible, index)` and the part bars from `partBars`.
9. Optional screens read "Skip" until they have an answer. Choice screens without a Say more box move on 320 ms after the first pick (today's behaviour).
10. The welcome screen's two toggles: "Read questions to me" (speaks each new title and note) and "I'd rather talk" (opens the mic first on long answers). Both are saved in the draft under `prefs`.
11. Connect is hidden when both Instagram and YouTube are connected (`integrations.data` rows with `connected: true`) or the client pressed "Skip for now" (`connectSkipped`).
12. Read-only operator preview: clicking through saves nothing (no draft, no brain, no sale story).
13. The page shows `GlowCursor`.
14. On the read-back screen, Finish writes `proof: { has_proof: hasProofFrom(answers) }` (this is how the brain knows onboarding is finished, unchanged), then shows `Done`.
15. The "say more" nudge (spec "Rules so it never repeats itself"): on a `long` screen, a first Continue with 1 to 7 words shows a gentle line under the box, "Say a bit more? One or two more lines makes a big difference.", and stays. A second Continue goes on. Once per screen; never on blank optional screens; never in the operator preview.

- [ ] **Step 1: Rewrite the browser test**

Replace `tests/onboarding.spec.ts` with a suite built on the same fixtures as today's file (`watchConsole`, `mockPortalWorkspaceApi`, `asPortalClient`, `writesOf`). Keep its `brainWith`, `open`, `question`, `problem` and `next` helpers. Route the new endpoints inside `open`:

```ts
  const drafts: { form: string; draft: unknown; position: string | null }[] = [];
  await page.route("**/api/form-drafts**", (route) => {
    const request = route.request();
    if (request.method() === "GET") return route.fulfill({ json: { ok: true, draft: options.draft ?? null, position: options.position ?? null, updated_at: options.draft ? "2026-10-15T10:00:00.000Z" : null } });
    drafts.push(request.postDataJSON());
    return route.fulfill({ json: { ok: true, updated_at: new Date().toISOString() } });
  });
  const stories: unknown[] = [];
  await page.route("**/api/sale-story**", (route) => {
    stories.push(route.request().postDataJSON());
    return route.fulfill({ json: { ok: true, completed_at: "2026-10-15T10:00:00.000Z" } });
  });
```

and return `{ calls, drafts, stories }` from `open` (extend its options type with `draft?: unknown; position?: string | null`).

Write these tests (each one is a `test(...)` block; use `page.getByRole` locators as the old file does):

1. **"a first visit shows the glowing logo while loading, then connect, then the welcome"**: delay the brain GET by 300 ms, assert `page.getByRole("status", { name: "Loading your form" })` is visible, then heading "Connect your accounts"; press "Skip for now"; heading "Let's get you set up."; the toggles "Read questions to me" and "I'd rather talk" exist.
2. **"part A blocks blank answers, then posts the sale story once and never writes it to the brain"**: answer A1 to A7 (type in A1, pick "A few days", skip A3, pick "Price" and type a Say more line, paste a link in A5, tap 7 in A6, pick "The DM" and "Our YouTube" in A7, rate both in the follow-up). Assert Continue on blank A1 shows "Add an answer to continue."; assert `stories` has exactly one body whose `answers.confidence.score` is 7 and `answers.touchpoints` has 2 entries; assert no `/api/client-brain` POST body contains a `sale` key or the A1 text; the next heading is "Thanks. Now let's get to you."
3. **"answers save to the brain on Continue, only when changed"**: from part 1, fill the name, press Enter, assert one `/api/client-brain` POST `{ client: "demo-rio", answers: { identity: { name: "Rio" } } }`; go Back and Continue again, assert no second POST.
4. **"drafts save while typing and come back where the client left off"**: type in `you.niche_line` without pressing Continue; wait 1.2 s; assert the last `drafts` entry has `form: "onboarding-v2"`, `position: "you.niche_line"` and the typed text inside `draft.answers["you.niche_line"]`. Then open a fresh page with `draft: { answers: { "you.niche_line": "Prop firm challenges" } }, position: "you.niche_line"` and assert the textbox shows "Prop firm challenges" and the welcome-back screen offers "Continue where I stopped".
5. **"money is exact and required, with the margin worked out"**: on 3.1 press Continue blank -> "Fill in revenue and profit for all three months."; fill 3 months; assert text "Margin 61%" for revenue 12400 / profit 7600; continue; assert 3.2 is pre-filled with the latest month's revenue.
6. **"the buyer branch: Not really shows the starter cards and blocks until every card is answered"**: pick niche Trading earlier (set via draft to save time), pick "Not really" on 5.1, walk to the starter screen, assert 7 cards, Continue blocked with "Answer every card to continue.", answer all, Continue works; the saved `icp.starter_profile.cards` has 7 entries with verdicts.
7. **"the funnel: TOF, MOF and BOF by name, and no funnel keeps it short"**: on 10.1 assert the text "TOF, top of funnel" and the trading example; on the quiz tap TOF for the first line and see "Right."; on 10.5 pick "No"; assert the next heading is "How do people buy from you today, if at all?" and that "Build your funnel." never appears before "Have you run ads?".
8. **"proof links back to the client's own result when they have no student results"**: type an own result, pick "Payment or revenue screenshot", pick "Not yet" on 11.3, assert the next heading contains the start of their own result in quotes.
9. **"the deal: both confirmations are saved, and Not sure still lets them finish"**: pick "Yes", then "Not sure yet"; assert POST bodies `{ commitment: { understood: "yes" } }` and `{ commitment: { promised: "not-sure" } }`; reach the read-back.
10. **"the operator preview walks the whole form and saves nothing"**: open with `impersonated: true`; click through to the read-back with Continue only; assert no writes to `/api/client-brain`, `/api/form-drafts` or `/api/sale-story`.
11. **"a short answer gets one gentle 'say more' nudge"**: type "Your breakdown." in A1, press Continue, assert the status text "Say a bit more? One or two more lines makes a big difference." and that the heading is still A1; press Continue again and assert the heading is A2.
12. **"the form passes axe on the first question"**: run `new AxeBuilder({ page }).analyze()` on A1 and expect no violations (the old file has the same pattern).

To reach late parts quickly, seed the draft (`draft.answers`) with earlier answers and a `position`; the form opens there through "Continue where I stopped".

- [ ] **Step 2: Run it to verify it fails**

Run: `npx playwright test tests/onboarding.spec.ts`
Expected: FAIL (the old screen has none of these screens).

- [ ] **Step 3: Rewrite the screen**

Rewrite `src/features/onboarding/onboarding-screen.tsx`. Keep from today's file: the `"use client"` header comment (updated), `OnboardingScreen`'s session/brain/integrations loading and the `?t=` token stripping, `Frame` (add `minutes?: number` shown next to the save state as "about N min left"), the `slide` motion variants, `Welcome` (rewritten below) and `Done` (unchanged). Replace `Flow`, `Progress`, `Control`, `NicheControl`, `OfferVoice` and `ProofAnswer` with the code below.

```tsx
// Imports to add (drop the ones the old Flow used and nothing else uses):
import { BrandLoader } from "@/components/shell/brand-loader";
import { brainSource } from "@/lib/api/portal-workspace";
import { saveSaleStory } from "@/lib/api/sale-story";
import { useFormDraft } from "@/lib/use-form-draft";
import { useStepHistory } from "@/lib/use-step-history";
import { ScreenControl, SayMore } from "./controls-v2";
import { changedFields, ctxOf, fieldsFor, handleOf, isBlank, minutesLeft, partBars, prefill, problemWith, resolve, resumeIndex, visibleScreens, withInitial } from "./engine";
import { GlowCursor } from "./glow-cursor";
import { FORM_KEY, hasProofFrom, SALE_LAST, saleStoryFrom, SCREENS } from "./schema";
import type { Answers, HandlesValue, Screen } from "./schema/types";
import { SpeakButton, useReadAloud } from "./voice-tools";

type DraftShape = { answers: Answers; saleSent?: boolean; connectSkipped?: boolean; prefs?: { readAloud?: boolean; talk?: boolean } };

/** Flat "section.field" -> stored value for every field the form writes, for "only send what changed". */
function snapshot(brain: ClientBrain) {
  const out: Record<string, unknown> = {};
  for (const screen of SCREENS) {
    const keys = screen.field ? [screen.field] : screen.save ? Object.keys(screen.save({})) : [];
    for (const key of keys) {
      const [section, field] = key.split(".");
      out[key] = brainValue(brain, section, field);
    }
  }
  return out;
}

/** Screens whose saved answer came from Pulsify (a call, research): the client confirms instead of retyping. */
function fromUs(brain: ClientBrain, screen: Screen) {
  const keys = screen.field ? [screen.field] : screen.save ? Object.keys(screen.save({})) : [];
  return keys.some((key) => {
    const [section, field] = key.split(".");
    const source = brainSource(brain, section, field);
    return (source === "operator" || source === "research") && brainValue(brain, section, field) != null;
  });
}
```

`OnboardingScreen` now renders, once `brain.data` and `integrations.isFetched` are ready:

```tsx
  const connected = new Set((integrations.data ?? []).filter((row) => (row as { connected?: boolean }).connected).map((row) => row.provider));
  return <Flow key={client} client={client} name={portalClientName(session)} readOnly={readOnly} brain={brain.data!} connectedBoth={connected.has("instagram") && connected.has("youtube")} />;
```

and the loading branch becomes `body = <BrandLoader fullscreen={false} label="Loading your form" />;`.

`Flow` waits for the draft, then hands off to `Steps`:

```tsx
function Flow(props: { client: string; name: string; readOnly: boolean; brain: ClientBrain; connectedBoth: boolean }) {
  const draft = useFormDraft<DraftShape>({ form: FORM_KEY, scope: props.client, enabled: !props.readOnly });
  if (!draft.loaded)
    return (
      <Frame name={props.name} readOnly={props.readOnly}>
        <BrandLoader fullscreen={false} label="Loading your form" />
      </Frame>
    );
  return <Steps {...props} draft={draft} />;
}
```

`Steps` holds the form:

```tsx
function Steps({
  client,
  name,
  readOnly,
  brain,
  connectedBoth,
  draft,
}: {
  client: string;
  name: string;
  readOnly: boolean;
  brain: ClientBrain;
  connectedBoth: boolean;
  draft: ReturnType<typeof useFormDraft<DraftShape>>;
}) {
  const queryClient = useQueryClient();
  const restored = draft.restored?.draft;
  const [answers, setAnswers] = useState<Answers>(() => ({ ...prefill((section, field) => brainValue(brain, section, field), SCREENS), ...(restored?.answers ?? {}) }));
  const [meta, setMeta] = useState({ saleSent: Boolean(restored?.saleSent), connectSkipped: Boolean(restored?.connectSkipped), prefs: restored?.prefs ?? {} });
  const touched = useRef(new Set<string>(Object.keys(restored?.answers ?? {})));
  const saved = useRef(snapshot(brain));
  const savedHandles = useRef({ instagram: "", youtube: "" });
  const visible = visibleScreens(answers, SCREENS).filter((screen) => !(screen.part === "connect" && (connectedBoth || meta.connectSkipped)));
  const [index, setIndex] = useState(() => (draft.restored ? Math.max(0, visible.findIndex((s) => s.kind === "welcome")) : 0));
  const resumeAt = resumeIndex(visible, answers, draft.restored?.position ?? null);
  const { forward, back } = useStepHistory(index, setIndex);
  const [direction, setDirection] = useState(1);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [nudge, setNudge] = useState<string | null>(null);
  const nudged = useRef(new Set<string>());
  const form = useRef<HTMLFormElement>(null);
  const advanceTimer = useRef(0);
  const voice = useReadAloud();
  const screen = visible[Math.min(index, visible.length - 1)];
  const ctx = ctxOf(answers);

  const persist = useCallback(
    (next: Answers, nextMeta = meta, position = screen?.id ?? null) => draft.save({ answers: next, ...nextMeta }, position),
    [draft, meta, screen?.id],
  );

  // Fill a blank screen from earlier answers when it opens (e.g. 3.2 from the latest month).
  useEffect(() => {
    if (!screen) return;
    setAnswers((current) => withInitial(screen, current));
  }, [screen]);

  // Read the question out loud when asked to.
  useEffect(() => {
    if (meta.prefs.readAloud && screen && screen.kind !== "welcome") voice.speak(`${resolve(screen.title, ctx)} ${resolve(screen.note, ctx)}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- speak once per screen, not on every keystroke
  }, [screen?.id, meta.prefs.readAloud]);

  const setKey = useCallback(
    (key: string, value: unknown) => {
      setProblem(null);
      touched.current.add(key);
      setAnswers((current) => {
        const next = { ...current, [key]: value };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const advance = useCallback(() => {
    window.clearTimeout(advanceTimer.current);
    advanceTimer.current = window.setTimeout(() => form.current?.requestSubmit(), 320);
  }, []);
  useEffect(() => () => window.clearTimeout(advanceTimer.current), []);

  function go(to: number) {
    window.clearTimeout(advanceTimer.current);
    setDirection(to >= index ? 1 : -1);
    setProblem(null);
    setNudge(null);
    if (to > index) forward(to);
    else setIndex(to);
    window.scrollTo({ top: 0 });
  }

  async function saveScreen(current: Screen) {
    const changed = changedFields(fieldsFor(current, answers), saved.current);
    if (changed) {
      await saveAnswers(client, changed);
      for (const [section, values] of Object.entries(changed)) for (const [field, value] of Object.entries(values)) saved.current[`${section}.${field}`] = value;
    }
    if (current.id === "you.platforms") {
      const v = (answers["you.platforms"] ?? { picked: [], handles: {} }) as HandlesValue;
      for (const provider of ["instagram", "youtube"] as const) {
        const handle = v.picked.includes(provider) ? handleOf(v.handles[provider] ?? "") : "";
        if (!handle || handle === savedHandles.current[provider]) continue;
        await saveHandle(provider, handle);
        savedHandles.current = { ...savedHandles.current, [provider]: handle };
      }
    }
    if (current.id === SALE_LAST && !meta.saleSent) {
      await saveSaleStory(saleStoryFrom(answers));
      const nextMeta = { ...meta, saleSent: true };
      setMeta(nextMeta);
      persist(answers, nextMeta);
    }
    if (current.kind === "readback") {
      await saveAnswers(client, { proof: { has_proof: hasProofFrom(answers) } });
      void queryClient.invalidateQueries({ queryKey: ["portal"] });
      void queryClient.invalidateQueries({ queryKey: portalKeys.brain(client) });
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy || !screen) return;
    if (readOnly) return go(index + 1);
    const issue = problemWith(screen, answers);
    if (issue) return setProblem(issue);
    if (screen.kind === "long" && !nudged.current.has(screen.id)) {
      const words = String(answers[screen.id] ?? "").trim().split(/\s+/).filter(Boolean).length;
      if (words > 0 && words < 8) {
        nudged.current.add(screen.id);
        return setNudge("Say a bit more? One or two more lines makes a big difference.");
      }
    }
    setBusy(true);
    try {
      await saveScreen(screen);
      void draft.flush();
      go(index + 1);
    } catch (error) {
      setProblem(writeFailure(error, "Could not save that answer. Try again."));
    } finally {
      setBusy(false);
    }
  }

  const focusOnMount = useCallback((node: HTMLElement | null) => {
    node?.querySelector<HTMLElement>("[data-autofocus]")?.focus({ preventScroll: true });
  }, []);

  let body: ReactNode;
  if (index >= visible.length) body = <Done readOnly={readOnly} onBack={() => go(visible.length - 1)} />;
  else if (screen.kind === "connect")
    body = (
      <ConnectStep
        readOnly={readOnly}
        onSkip={() => {
          const nextMeta = { ...meta, connectSkipped: true };
          setMeta(nextMeta);
          persist(answers, nextMeta);
          go(index + 1);
        }}
      />
    );
  else if (screen.kind === "welcome")
    body = (
      <Welcome
        name={name}
        resuming={Boolean(draft.restored)}
        prefs={meta.prefs}
        onPrefs={(prefs) => {
          const nextMeta = { ...meta, prefs };
          setMeta(nextMeta);
          persist(answers, nextMeta);
        }}
        onStart={() => go(index + 1)}
        onResume={() => go(Math.max(resumeAt, index + 1))}
        readAloudSupported={voice.supported}
      />
    );
  else {
    const optional = !screen.required && !hasAnything(screen, answers);
    const last = screen.kind === "readback";
    const intro = screen.intro?.(ctx);
    body = (
      <form ref={form} noValidate onSubmit={onSubmit} aria-labelledby="onboarding-question">
        {intro && <p className="mb-3 max-w-[60ch] text-[14px] leading-relaxed text-muted-foreground">{intro}</p>}
        <div className="flex items-start gap-2">
          <h1 id="onboarding-question" className="text-2xl leading-tight font-medium tracking-[-0.03em] text-balance sm:text-[34px]">
            {resolve(screen.title, ctx)}
          </h1>
          <SpeakButton text={`${resolve(screen.title, ctx)} ${resolve(screen.note, ctx)}`} speak={voice.speak} supported={voice.supported} />
        </div>
        {screen.note && <p className="mt-2.5 max-w-[60ch] text-[15px] leading-relaxed text-muted-foreground">{resolve(screen.note, ctx)}</p>}
        {fromUs(brain, screen) && !touched.current.has(screen.id) && (
          <p className="mt-3 rounded-lg bg-brand/8 px-3 py-2 text-[13.5px]">From your call with us. Is this right? Change anything that isn&apos;t.</p>
        )}
        <div className="mt-7">
          {screen.kind === "readback" ? (
            <ReadBack answers={answers} onEdit={(part) => go(visible.findIndex((s) => s.part === part))} />
          ) : (
            <ScreenControl screen={screen} answers={answers} ctx={ctx} value={answers[screen.id]} set={(value) => setKey(screen.id, value)} setKey={setKey} client={client} readOnly={readOnly} advance={advance} />
          )}
          {screen.sayMore && <SayMore label={screen.sayMore} answers={answers} setKey={setKey} id={screen.id} client={client} readOnly={readOnly} />}
        </div>
        {nudge && (
          <p role="status" className="mt-3 text-[13.5px] text-muted-foreground">
            {nudge}
          </p>
        )}
        <p role="alert" className="mt-3 min-h-5 text-[13px] text-destructive">
          {problem}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button type="button" variant="ghost" onClick={() => (index > 0 ? back() : undefined)} disabled={busy || index === 0}>
            <ArrowLeft aria-hidden /> Back
          </Button>
          <Button type="submit" size="lg" className="min-w-32" disabled={busy} aria-busy={busy}>
            {busy && <Loader2 className="animate-spin" aria-hidden />}
            {last ? "Finish" : optional ? "Skip" : "Continue"}
          </Button>
          <span className="hidden text-xs text-muted-foreground sm:inline">
            or press <kbd className="rounded border bg-muted px-1.5 py-0.5 font-sans text-xs">Enter</kbd>
          </span>
        </div>
      </form>
    );
  }

  return (
    <Frame name={name} readOnly={readOnly} saveState={draft.status === "saving" ? "saving" : draft.status === "saved" ? "saved" : "idle"} minutes={index < visible.length ? minutesLeft(visible, index) : undefined} progress={<Bars bars={partBars(visible, index)} />}>
      <GlowCursor />
      <AnimatePresence mode="wait" custom={direction} initial={false}>
        <motion.div key={screen?.id ?? "done"} ref={focusOnMount} custom={direction} variants={slide} initial="enter" animate="center" exit="exit">
          {body}
        </motion.div>
      </AnimatePresence>
    </Frame>
  );
}

const hasAnything = (screen: Screen, answers: Answers) => !isBlank(answers[screen.id]) || (screen.sayMore ? !isBlank(answers[`${screen.id}:more`]) : false);
```

`Bars` replaces `Progress`: the same markup as today's `Progress`, but driven by `partBars(...)` (`label`, `done/total` for the fill width, `current` for the bold label) and coloured with `var(--brand)` for every part (the brain section colours no longer map one-to-one onto parts). `Frame` shows `about {minutes} min left` (tabular numbers) next to the save state when `minutes` is set and the screen is not read-only.

`Welcome` (rewrite):

```tsx
function Welcome({ name, resuming, prefs, onPrefs, onStart, onResume, readAloudSupported }: {
  name: string;
  resuming: boolean;
  prefs: { readAloud?: boolean; talk?: boolean };
  onPrefs: (prefs: { readAloud?: boolean; talk?: boolean }) => void;
  onStart: () => void;
  onResume: () => void;
  readAloudSupported: boolean;
}) {
  return (
    <section aria-labelledby="onboarding-welcome">
      <p className="text-[13px] font-medium text-muted-foreground">Onboarding</p>
      <h1 id="onboarding-welcome" className="mt-3 text-[28px] leading-tight font-medium tracking-[-0.03em] sm:text-[38px]">
        {resuming ? "Welcome back." : "Let's get you set up."}
      </h1>
      <p className="mt-3 max-w-[58ch] text-[15px] leading-relaxed text-muted-foreground">
        {resuming ? "Everything you wrote is saved. Pick up where you stopped." : `${name}, talk or type, whatever's easier. It saves as you go, so you can stop and come back any time.`}
      </p>
      <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
        {readAloudSupported && (
          <label className="flex items-center gap-3 rounded-xl bg-card px-4 py-3 shadow-elev-1">
            <input type="checkbox" checked={Boolean(prefs.readAloud)} onChange={(event) => onPrefs({ ...prefs, readAloud: event.target.checked })} className="size-4 accent-[var(--brand)]" />
            <span className="text-sm font-medium">Read questions to me</span>
          </label>
        )}
        <label className="flex items-center gap-3 rounded-xl bg-card px-4 py-3 shadow-elev-1">
          <input type="checkbox" checked={Boolean(prefs.talk)} onChange={(event) => onPrefs({ ...prefs, talk: event.target.checked })} className="size-4 accent-[var(--brand)]" />
          <span className="text-sm font-medium">I&apos;d rather talk</span>
        </label>
      </div>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        {resuming ? (
          <>
            <Button size="lg" className="min-w-40" onClick={onResume} {...AUTOFOCUS}>
              Continue where I stopped
            </Button>
            <Button size="lg" variant="ghost" onClick={onStart}>
              Start from the top
            </Button>
          </>
        ) : (
          <Button size="lg" className="min-w-40" onClick={onStart} {...AUTOFOCUS}>
            Start
          </Button>
        )}
      </div>
    </section>
  );
}
```

When `prefs.talk` is on, `LongControl` should show the mic before the text box; pass `talkFirst={Boolean(meta.prefs.talk)}` through `ScreenControl` props (add an optional `talkFirst?: boolean` to `ControlProps` and swap the order in `LongControl`).

`ConnectStep` and `ReadBack` come from Tasks 14 and 15; until then, stub them in this file as:

```tsx
function ConnectStep({ onSkip }: { readOnly: boolean; onSkip: () => void }) {
  return <Button onClick={onSkip}>Skip for now</Button>;
}
function ReadBack(_: { answers: Answers; onEdit: (part: string) => void }) {
  return null;
}
```

- [ ] **Step 4: Run the test**

Run: `npx playwright test tests/onboarding.spec.ts`
Expected: tests 2 to 11 pass; test 1 (connect) and any read-back assertion wait for Tasks 14 and 15. Fix failures in the screen, not in the test, unless the test contradicts the spec.

- [ ] **Step 5: Commit**

```bash
git add src/features/onboarding/onboarding-screen.tsx tests/onboarding.spec.ts
git commit -m "Onboarding v2: the form on the engine, drafts while typing, part A to sale story, link-backs"
```

---

### Task 14: Connect step and coming back after connecting

**Files:**
- Modify: `src/features/onboarding/onboarding-screen.tsx` (replace the `ConnectStep` stub)
- Modify: `src/features/portal-workspace/access/access-screen.tsx` (`useConnectResult`)
- Test: `tests/onboarding.spec.ts` (test 1)

**Interfaces:**
- Consumes: `selfConnectHref(platform)` from `src/lib/api/portal-workspace.ts` (`/api/client-connect?action=start&platform=`), which returns the client to `/app/portal/access?connected=<platform>` or `?connect_error=<platform>&reason=<reason>`.
- Produces: localStorage key `pulsify:after-connect` = `"/portal/onboarding"`; the access page sends the client back there after showing its toast.

- [ ] **Step 1: Write the connect step**

Replace the stub with:

```tsx
const AFTER_CONNECT = "pulsify:after-connect";

function ConnectStep({ readOnly, onSkip }: { readOnly: boolean; onSkip: () => void }) {
  const start = (platform: "instagram" | "youtube") => {
    try {
      window.localStorage.setItem(AFTER_CONNECT, "/portal/onboarding");
    } catch {
      // Storage blocked: they land on the access page and can come back from Home.
    }
    window.location.href = selfConnectHref(platform);
  };
  return (
    <section aria-labelledby="onboarding-connect">
      <h1 id="onboarding-connect" className="text-[28px] leading-tight font-medium tracking-[-0.03em] sm:text-[36px]">
        Connect your accounts
      </h1>
      <p className="mt-3 max-w-[58ch] text-[15px] leading-relaxed text-muted-foreground">Connect YouTube and Instagram so your numbers fill in. One tap each. You can skip and come back.</p>
      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        {(["youtube", "instagram"] as const).map((platform) => (
          <Button key={platform} size="lg" variant="outline" className="justify-start" disabled={readOnly} onClick={() => start(platform)}>
            Connect your {platform === "youtube" ? "YouTube" : "Instagram"}
          </Button>
        ))}
      </div>
      <div className="mt-6">
        <Button variant="ghost" onClick={onSkip} {...AUTOFOCUS}>
          Skip for now
        </Button>
      </div>
    </section>
  );
}
```

Use the YouTube and Instagram marks from `src/components/patterns/brand-icons.tsx` inside the two buttons (app wording rules: those platforms always use their own marks). The blurred preview cards are ticket #63 and are not part of this task.

- [ ] **Step 2: Send them back after connecting**

In `useConnectResult` (`access-screen.tsx`), after the toast and before `window.history.replaceState(...)`, add:

```tsx
    let back: string | null = null;
    try {
      back = window.localStorage.getItem("pulsify:after-connect");
      window.localStorage.removeItem("pulsify:after-connect");
    } catch {
      back = null;
    }
    if (back === "/portal/onboarding") {
      window.location.href = "/app/portal/onboarding";
      return;
    }
```

(Only that one path is allowed back, so the key can never send anyone elsewhere.)

- [ ] **Step 3: Finish test 1 and run it**

Make test 1 also click "Connect your YouTube" with `page.route("**/api/client-connect**", ...)` fulfilling a 302 to `/app/portal/access?connected=youtube`, and assert the page ends on `/app/portal/onboarding`. Add a test in `tests/portal-access.spec.ts` (or the existing access test file) that `?connected=youtube` without the key stays on the access page.

Run: `npx playwright test tests/onboarding.spec.ts tests/portal-access.spec.ts`
Expected: pass. If the access tests live in a differently named file, use that file.

- [ ] **Step 4: Commit**

```bash
git add src/features/onboarding/onboarding-screen.tsx src/features/portal-workspace/access/access-screen.tsx tests
git commit -m "Onboarding v2: connect first, and come back to the form after connecting"
```

---

### Task 15: Read-back, progress, and retiring the old form files

**Files:**
- Create: `src/features/onboarding/readout.ts`
- Create: `src/features/onboarding/progress.ts` (replaces `questions.ts`'s `onboardingProgress` and `onboardingLink`)
- Modify: `src/features/onboarding/onboarding-screen.tsx` (replace the `ReadBack` stub)
- Modify: `src/features/brain/overview.tsx:12`, `src/features/client-setup/action-sections.tsx:21`, `src/features/onboarding/nudge.tsx:10` (import from `./progress`)
- Delete: `src/features/onboarding/questions.ts`, `src/features/onboarding/answers.ts`
- Create: `tests/onboarding-readout.spec.ts`

**Interfaces:**
- Produces:
  - `describe(screen, answers): string` (one plain-English answer; "" when blank)
  - `moneySummary(answers): string | null` ("Makes $12,400 a month, about $8,000 from content. Margin 61% over 3 months.")
  - `readout(answers): ReadoutPart[]` with `type ReadoutPart = { part: PartKey; label: string; summary: string | null; bullets: { id: string; question: string; answer: string; gap: boolean }[] }`
  - `onboardingProgress(sections)` with the same return shape as today (`answered`, `total`, `finished`, `lastAt`, `chapters[{ key, label, answered, total }]`), `onboardingLink(origin, client, token)` unchanged.

- [ ] **Step 1: Write the failing test**

Create `tests/onboarding-readout.spec.ts`:

```ts
import { expect, test } from "@playwright/test";
import { describe, moneySummary, readout } from "../src/features/onboarding/readout";
import { SCREENS } from "../src/features/onboarding/schema";

/* Plain-English read-back of onboarding answers (client read-back and the operator's Onboarding view, #70). */

const screen = (id: string) => SCREENS.find((s) => s.id === id)!;

test("choices read as their labels, Say more words in quotes", () => {
  expect(describe(screen("funnel.leak"), { "funnel.leak": "no-show", "funnel.leak:more": "They ghost after booking." })).toBe('They book but don\'t show "They ghost after booking."');
  expect(describe(screen("why.reasons"), { "why.reasons": ["no-buyers", "system"] })).toBe("My content isn't bringing in buyers, I want a system, not guesswork");
});

test("the funnel path reads as steps with arrows", () => {
  expect(describe(screen("funnel.path"), { "funnel.path": ["reel", "dm-trigger", "sales-call"] })).toBe("Reel -> Comment or DM trigger word -> Sales call");
});

test("money reads as one sentence", () => {
  const answers = {
    "money.months": [
      { month: "2026-07", revenue: "10000", profit: "6000" },
      { month: "2026-08", revenue: "11000", profit: "6800" },
      { month: "2026-09", revenue: "12400", profit: "7600" },
    ],
    "money.monthly": "12400",
    "money.content": { mode: "amount", value: "8000" },
  };
  expect(moneySummary(answers)).toBe("Makes $12,400 a month, about $8,000 from content. Margin 61% over 3 months.");
});

test("hidden branches never show as Skipped; visible blanks do", () => {
  const parts = readout({ "buyer.known": "no", "funnel.has": "no" });
  const buyer = parts.find((part) => part.part === "buyer")!;
  expect(buyer.bullets.map((b) => b.id)).not.toContain("buyer.age");
  expect(buyer.bullets.find((b) => b.id === "buyer.never")).toMatchObject({ answer: "Skipped", gap: true });
});
```

The 3-month margin is (6000 + 6800 + 7600) / (10000 + 11000 + 12400) = 20400 / 33400 = 61%.

- [ ] **Step 2: Run it to verify it fails**

Run: `npx playwright test tests/onboarding-readout.spec.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Write `readout.ts`**

Create `src/features/onboarding/readout.ts`:

```ts
import { nicheLabel } from "@/lib/niches";
import { ctxOf, isBlank, MORE, num, resolve, visibleScreens } from "./engine";
import { nicheContent } from "./niche-content";
import { SCREENS } from "./schema";
import { PART_LABELS, type AmountOrPercent, type Answers, type HandlesValue, type MoneyRow, type PartKey, type PerPick, type Persona, type ProofCard, type ProofFiles, type Screen, type StarterVerdicts } from "./schema/types";

/*
 * Onboarding answers in plain English (founder 2026-10-15: "read to me basically their onboarding
 * form... in bullet points"). Used by the client's read-back screen and the operator's Onboarding
 * view. Screens a branch hides are left out, so only real gaps read "Skipped".
 */

export type ReadoutBullet = { id: string; question: string; answer: string; gap: boolean };
export type ReadoutPart = { part: PartKey; label: string; summary: string | null; bullets: ReadoutBullet[] };

const NOT_ANSWERS = new Set(["connect", "welcome", "readback", "info", "facts", "stages", "horizontal", "quiz"]);
const dollars = (n: number | null) => (n == null ? "" : `$${n.toLocaleString("en-US")}`);
const monthName = (month: string) => new Date(`${month}-01T12:00:00Z`).toLocaleString("en", { month: "long", timeZone: "UTC" });

function margin(rows: MoneyRow[]) {
  const revenue = rows.reduce((sum, row) => sum + (num(row.revenue) ?? 0), 0);
  const profit = rows.reduce((sum, row) => sum + (num(row.profit) ?? 0), 0);
  return revenue ? Math.round((profit / revenue) * 100) : null;
}

export function describe(screen: Screen, answers: Answers): string {
  const ctx = ctxOf(answers);
  const value = answers[screen.id];
  const optionLabel = (v: string) => ("options" in screen ? screen.options.find((o) => o.value === v)?.label : undefined) ?? v;
  let text = "";
  switch (screen.kind) {
    case "choice":
      text = typeof value === "string" ? optionLabel(value) : "";
      break;
    case "multi":
      text = Array.isArray(value) ? value.map(optionLabel).join(", ") : "";
      break;
    case "text":
    case "long":
    case "number":
      text = value == null ? "" : String(value).trim();
      break;
    case "niche":
      text = nicheLabel(value);
      break;
    case "chips":
      text = Array.isArray(value) ? value.join(", ") : "";
      break;
    case "scale":
      text = typeof value === "number" ? `${value} out of ${screen.max}${screen.labels?.[value] ? ` (${screen.labels[value]})` : ""}` : "";
      break;
    case "sliders": {
      const v = (value ?? {}) as Record<string, number>;
      text = screen.sliders
        .filter((s) => typeof v[s.key] === "number")
        .map((s) => (v[s.key] < 40 ? s.left : v[s.key] > 60 ? s.right : `Between ${s.left.toLowerCase()} and ${s.right.toLowerCase()}`))
        .join(", ");
      break;
    }
    case "fields": {
      const v = (value ?? {}) as Record<string, string>;
      text = screen.inputs.filter((input) => !isBlank(v[input.key])).map((input) => `${input.label}: ${v[input.key].trim()}`).join(". ");
      break;
    }
    case "handles": {
      const v = value as HandlesValue | undefined;
      text = (v?.picked ?? []).map((p) => `${screen.platforms.find((o) => o.value === p)?.label ?? p}${v?.handles?.[p] ? ` ${v.handles[p]}` : ""}`).join(", ");
      break;
    }
    case "money": {
      const rows = ((value as MoneyRow[] | undefined) ?? []).filter((row) => num(row.revenue) != null);
      text = rows.map((row) => `${monthName(row.month)}: ${dollars(num(row.revenue))} revenue, ${dollars(num(row.profit))} profit`).join("; ");
      break;
    }
    case "amount-or-percent": {
      const v = value as AmountOrPercent | undefined;
      const n = num(v?.value);
      text = n == null ? "" : v?.mode === "percent" ? `${n}%` : dollars(n);
      break;
    }
    case "rows": {
      const v = (value ?? {}) as Record<string, string>;
      text = screen.rows(ctx).filter((row) => v[row.value]).map((row) => `${row.label}: ${screen.levels.find((l) => l.value === v[row.value])?.label ?? v[row.value]}`).join(", ");
      break;
    }
    case "per-pick": {
      const v = (value ?? {}) as PerPick;
      text = Object.entries(v)
        .filter(([pick]) => screen.options.some((o) => o.value === pick))
        .map(([pick, entry]) =>
          [
            screen.options.find((o) => o.value === pick)?.label,
            entry.rating ? `${entry.rating}/${screen.rating?.max ?? 5}` : "",
            entry.verdict ? (screen.verdicts?.find((o) => o.value === entry.verdict)?.label ?? entry.verdict) : "",
            entry.note?.trim() ? `"${entry.note.trim()}"` : "",
          ]
            .filter(Boolean)
            .join(" "),
        )
        .join("; ");
      break;
    }
    case "persona": {
      const v = value as Persona | undefined;
      const name = (key?: string) => (key ? (screen.options.find((o) => o.value === key)?.label ?? key) : "");
      text = [name(v?.first), v?.second ? `then ${name(v.second)}` : "", v?.other?.trim() ? `("${v.other.trim()}")` : ""].filter(Boolean).join(", ");
      break;
    }
    case "path":
      text = Array.isArray(value) ? value.map((step) => screen.steps.find((o) => o.value === step)?.label ?? step).join(" -> ") : "";
      break;
    case "step-links":
      text = Object.entries((value ?? {}) as Record<string, string>)
        .filter(([, link]) => link.trim())
        .map(([step, link]) => `${screen.steps.find((o) => o.value === step)?.label ?? step}: ${link.trim()}`)
        .join(", ");
      break;
    case "link-or-choice": {
      const v = (value ?? {}) as { link?: string; pick?: string };
      text = [v.link?.trim(), v.pick ? optionLabel(v.pick) : ""].filter(Boolean).join(", ");
      break;
    }
    case "proof-files": {
      const v = value as ProofFiles | undefined;
      const types = (v?.types ?? []).map((t) => screen.types.find((o) => o.value === t)?.label ?? t).join(", ");
      text = types + (v?.uploads?.length ? `, ${v.uploads.length} uploaded` : "");
      break;
    }
    case "proof-cards": {
      const cards = ((value as ProofCard[] | undefined) ?? []).filter((card) => !isBlank(card.result));
      text = cards.map((card) => `${card.result.trim()}${card.who ? ` (before: ${card.who.trim()})` : ""}${card.time ? `, ${card.time.trim()}` : ""}`).join("; ");
      break;
    }
    case "starter": {
      const v = (value ?? {}) as StarterVerdicts;
      const entries = Object.values(v);
      const fixes = entries.filter((e) => e.verdict === "fix" && e.fix?.trim()).map((e) => e.fix!.trim());
      text = entries.length ? `${entries.filter((e) => e.verdict === "yes").length} of ${nicheContent(ctx.niche).starter.length} cards confirmed${fixes.length ? `. Fixed: ${fixes.join("; ")}` : ""}` : "";
      break;
    }
    default:
      text = "";
  }
  const more = screen.sayMore ? String(answers[MORE(screen.id)] ?? "").trim() : "";
  return [text, more ? `"${more}"` : ""].filter(Boolean).join(" ");
}

export function moneySummary(answers: Answers): string | null {
  const monthly = num(answers["money.monthly"]);
  if (monthly == null) return null;
  const content = answers["money.content"] as AmountOrPercent | undefined;
  const share = num(content?.value);
  const from = share == null ? "" : content?.mode === "percent" ? `, about ${share}% from content` : `, about ${dollars(share)} from content`;
  const m = margin((answers["money.months"] as MoneyRow[] | undefined) ?? []);
  return `Makes ${dollars(monthly)} a month${from}.${m == null ? "" : ` Margin ${m}% over 3 months.`}`;
}

export function readout(answers: Answers): ReadoutPart[] {
  const ctx = ctxOf(answers);
  const screens = visibleScreens(answers, SCREENS).filter((screen) => !NOT_ANSWERS.has(screen.kind) && PART_LABELS[screen.part]);
  const parts: ReadoutPart[] = [];
  for (const screen of screens) {
    let part = parts.find((entry) => entry.part === screen.part);
    if (!part) {
      part = { part: screen.part, label: PART_LABELS[screen.part] as string, summary: screen.part === "money" ? moneySummary(answers) : null, bullets: [] };
      parts.push(part);
    }
    const answer = describe(screen, answers);
    part.bullets.push({ id: screen.id, question: resolve(screen.title, ctx), answer: answer || "Skipped", gap: !answer });
  }
  return parts;
}
```

- [ ] **Step 4: Run the readout test**

Run: `npx playwright test tests/onboarding-readout.spec.ts`
Expected: 4 passed.

- [ ] **Step 5: The read-back screen**

Replace the `ReadBack` stub in `onboarding-screen.tsx`:

```tsx
function ReadBack({ answers, onEdit }: { answers: Answers; onEdit: (part: string) => void }) {
  const parts = readout(answers).filter((part) => part.part !== "sale");
  return (
    <div className="grid gap-3">
      {parts.map((part) => (
        <section key={part.part} aria-label={part.label} className="rounded-xl bg-card p-4 shadow-elev-1">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[15px] font-medium">{part.label}</h2>
            <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(part.part)}>
              Edit
            </Button>
          </div>
          {part.summary && <p className="mt-2 text-[14px]">{part.summary}</p>}
          <ul className="mt-2 grid gap-1.5">
            {part.bullets.filter((b) => !b.gap).slice(0, 6).map((bullet) => (
              <li key={bullet.id} className="line-clamp-2 text-[13.5px] text-muted-foreground">
                {bullet.answer}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
```

Part A is left out of the client's read-back: it is Pulsify's record. Add test 13 to `tests/onboarding.spec.ts`: "the read-back shows each part with an Edit button, and Edit jumps back to that part": seed a draft at the read-back, click Edit on "Your offer", assert the heading is "Have you had an offer before?".

- [ ] **Step 6: Progress and the old files**

Create `src/features/onboarding/progress.ts`:

```ts
import { isBlank, prefill, visibleScreens } from "./engine";
import { SCREENS } from "./schema";
import { PART_LABELS, type PartKey } from "./schema/types";

/*
 * How far a client got through onboarding v2, read from their brain (the operator's brain screen and
 * the client's Home nudge). Only client answers count. Finished = the read-back's Finish wrote
 * proof.has_proof (same rule as the old form).
 */

export const CLIENT_SOURCES = new Set(["client-form", "voice-note", "transcript"]);

type FieldLike = { key: string; value?: unknown; gap?: boolean | null; source?: string | null; updated_at?: string | null };
type SectionLike = { key: string; fields: FieldLike[] };

export type OnboardingProgress = {
  answered: number;
  total: number;
  finished: boolean;
  lastAt: string | null;
  chapters: { key: PartKey; label: string; answered: number; total: number }[];
};

export function onboardingProgress(sections: SectionLike[]): OnboardingProgress {
  let lastAt: string | null = null;
  const clientField = (section: string, field: string) => {
    const found = sections.find((s) => s.key === section)?.fields.find((f) => f.key === field);
    if (!found || found.gap || !found.source || !CLIENT_SOURCES.has(found.source)) return null;
    if (found.updated_at && (!lastAt || found.updated_at > lastAt)) lastAt = found.updated_at;
    return found.value ?? null;
  };
  const answers = prefill(clientField, SCREENS);
  const counted = visibleScreens(answers, SCREENS).filter((screen) => (screen.field || screen.save) && PART_LABELS[screen.part] && screen.part !== "sale");
  const done = (id: string) => !isBlank(answers[id]);
  const parts = [...new Set(counted.map((screen) => screen.part))];
  return {
    answered: counted.filter((screen) => done(screen.id)).length,
    total: counted.length,
    finished: clientField("proof", "has_proof") != null,
    lastAt,
    chapters: parts.map((part) => {
      const own = counted.filter((screen) => screen.part === part);
      return { key: part, label: PART_LABELS[part] as string, answered: own.filter((screen) => done(screen.id)).length, total: own.length };
    }),
  };
}

/** The private link a client opens the form with (the portal gate signs them in from ?t=). */
export function onboardingLink(origin: string, client: string, token: string) {
  return `${origin}/app/portal/onboarding?client=${encodeURIComponent(client)}&t=${encodeURIComponent(token)}`;
}
```

Point the three importers at `@/features/onboarding/progress` (`nudge.tsx` uses `./progress`). If `overview.tsx` colours chapters with `sectionColor(chapter.key)`, keep it: unknown part keys fall back to `var(--chart-context)`. Then delete `questions.ts` and `answers.ts`.

Run: `npm run typecheck`
Expected: no errors and no remaining imports of the deleted files (`git grep -n "onboarding/questions\|onboarding/answers" src tests` prints nothing).

- [ ] **Step 7: Run the affected suites and commit**

Run: `npx playwright test tests/onboarding.spec.ts tests/onboarding-readout.spec.ts tests/onboarding-engine.spec.ts tests/brain.spec.ts tests/portal-home.spec.ts`
Expected: all pass (if the home or brain tests counted "16 questions" or the old parts, update them to the new parts and say why in the commit).

```bash
git add -A src/features/onboarding src/features/brain/overview.tsx src/features/client-setup/action-sections.tsx tests
git commit -m "Onboarding v2: read-back with Edit per part, progress from the new form, old form files removed"
```

---

## Phase 5: Operator view, docs, checks, founder walkthrough

### Task 16: The operator's Onboarding view and "needs figuring out" list (#70)

**Files:**
- Create: `src/features/onboarding/needs.ts`
- Create: `src/features/brain/onboarding-view.tsx`
- Modify: `src/lib/api/brain.ts` (add `fetchBrainHistory`)
- Modify: `src/features/brain/brain-screen.tsx` (a "Sections | Onboarding" switch, `?view=onboarding`)
- Create: `tests/brain-onboarding-view.spec.ts`
- Modify: `tests/onboarding-readout.spec.ts` (needs tests)

**Interfaces:**
- Consumes: `readout`, `prefill`, `SCREENS`, `fetchSaleStory`, `fetchNeedStates`, `setNeedState`.
- Produces: `needsFrom(answers, finished): Need[]` with `type Need = { key: string; text: string; from: string[] }`; `saleAnswersFrom(story): Answers`; `fetchBrainHistory(client): Promise<{ section; field; value; source; replaced_at }[]>`.

- [ ] **Step 1: Write the failing needs tests**

Append to `tests/onboarding-readout.spec.ts`:

```ts
import { needsFrom } from "../src/features/onboarding/needs";

test("needs: no mechanism, no buyer, no funnel, a leak, unknown numbers, no proof, the deal", () => {
  const needs = needsFrom(
    {
      "you.niche": "trading",
      "pos.mechanism": "none",
      "buyer.known": "no",
      "buyer.starter": { age: { verdict: "yes" }, life: { verdict: "fix", fix: "Mostly students" } },
      "funnel.has": "yes",
      "funnel.leak": "no-show",
      "funnel.m_show": "unknown",
      "funnel.m_close": "unknown",
      "proof.students": "not-yet",
      "proof.own_enough": "partly",
      "offer.status": "never",
      "program.status": "messy",
      "program.missing": ["curriculum", "calls"],
      "deal.understood": "yes",
      "deal.promise": "not-sure",
    },
    true,
  );
  expect(needs.map((need) => need.key)).toEqual(["mechanism", "buyer", "leak", "tracking", "proof", "offer", "program", "deal"]);
  expect(needs.find((n) => n.key === "mechanism")?.text).toBe("Needs a mechanism built from scratch. Start here, before content.");
  expect(needs.find((n) => n.key === "buyer")?.text).toBe("Needs buyer research. Starter profile confirmed: 1 of 7 cards.");
  expect(needs.find((n) => n.key === "leak")?.text).toBe("Funnel leaks at: They book but don't show.");
  expect(needs.find((n) => n.key === "tracking")?.text).toBe("Not tracking: show rate, close rate. Set up tracking first.");
  expect(needs.find((n) => n.key === "program")?.text).toBe("Program needs: Curriculum, How to run 1-1 calls.");
});

test("needs: an unfinished form and thin answers are flagged", () => {
  const needs = needsFrom({ "story.tell": "Grew up broke.", "pos.love": "Trading." }, false);
  expect(needs.map((n) => n.key)).toEqual(expect.arrayContaining(["unfinished", "thin"]));
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx playwright test tests/onboarding-readout.spec.ts`
Expected: FAIL, module `needs` not found.

- [ ] **Step 3: Write `needs.ts`**

Create `src/features/onboarding/needs.ts`:

```ts
import { ctxOf, isBlank } from "./engine";
import { nicheContent } from "./niche-content";
import { SCREENS } from "./schema";
import type { Answers, StarterVerdicts } from "./schema/types";

/*
 * "What this client needs figured out" (founder 2026-10-15, ticket #70): a short list the operator
 * reads before the first call, built from the client's onboarding answers. Plain lines, each linked to
 * the answers behind it. The operator ticks items off (functions/api/onboarding-needs.js).
 */

export type Need = { key: string; text: string; from: string[] };

const label = (id: string, value: unknown) => {
  const screen = SCREENS.find((s) => s.id === id);
  return screen && "options" in screen ? (screen.options.find((o) => o.value === value)?.label ?? String(value)) : String(value);
};
const words = (value: unknown) => (typeof value === "string" ? value.trim().split(/\s+/).filter(Boolean).length : 0);
const THIN = [
  ["story.tell", "story"],
  ["pos.love", "what they love talking about"],
  ["offer.walkthrough", "their offer"],
  ["buyer.best", "their best client"],
] as const;
const METRICS: [string, string][] = [
  ["funnel.m_leads", "leads"],
  ["funnel.m_booked", "calls booked"],
  ["funnel.m_show", "show rate"],
  ["funnel.m_close", "close rate"],
  ["funnel.m_reply", "reply speed"],
  ["funnel.m_cycle", "time to paid"],
];

export function needsFrom(a: Answers, finished: boolean): Need[] {
  const out: Need[] = [];
  if (a["pos.mechanism"] === "none" || (a["pos.mechanism"] === "unnamed" && words(a["pos.method"]) < 25))
    out.push({
      key: "mechanism",
      text: a["pos.mechanism"] === "none" ? "Needs a mechanism built from scratch. Start here, before content." : "Has a method but no name, and the walkthrough is thin. Pull the steps out on a call.",
      from: ["pos.mechanism", "pos.method"],
    });
  if (a["buyer.known"] === "no") {
    const verdicts = Object.values((a["buyer.starter"] ?? {}) as StarterVerdicts);
    const total = nicheContent(ctxOf(a).niche).starter.length;
    out.push({ key: "buyer", text: `Needs buyer research. Starter profile confirmed: ${verdicts.filter((v) => v.verdict === "yes").length} of ${total} cards.`, from: ["buyer.known", "buyer.starter"] });
  }
  if (a["funnel.has"] === "no") out.push({ key: "funnel", text: "Needs a funnel built.", from: ["funnel.has"] });
  if (a["funnel.leak"] && a["funnel.leak"] !== "dont-know") out.push({ key: "leak", text: `Funnel leaks at: ${label("funnel.leak", a["funnel.leak"])}.`, from: ["funnel.leak"] });
  const unknown = METRICS.filter(([id]) => a[id] === "unknown").map(([, name]) => name);
  if (unknown.length) out.push({ key: "tracking", text: `Not tracking: ${unknown.join(", ")}. Set up tracking first.`, from: METRICS.map(([id]) => id) });
  if (a["proof.students"] === "not-yet" && a["proof.own_enough"] !== "yes") out.push({ key: "proof", text: "Needs a first result on record.", from: ["proof.students", "proof.own_enough"] });
  if (a["offer.status"] === "never") out.push({ key: "offer", text: "Needs an offer built.", from: ["offer.status"] });
  if (a["program.status"] === "messy" || a["program.status"] === "not-yet") {
    const missing = ((a["program.missing"] as string[] | undefined) ?? []).map((pick) => label("program.missing", pick));
    out.push({ key: "program", text: missing.length ? `Program needs: ${missing.join(", ")}.` : "Program needs work.", from: ["program.status", "program.missing"] });
  }
  if (a["deal.understood"] === "explain" || a["deal.promise"] === "not-sure") out.push({ key: "deal", text: "Didn't confirm they'll do the work. Talk to them before starting.", from: ["deal.understood", "deal.promise"] });
  if (!finished) out.push({ key: "unfinished", text: "Onboarding isn't finished yet.", from: [] });
  const thin = THIN.filter(([id]) => !isBlank(a[id]) && words(a[id]) < 12).map(([, name]) => name);
  if (thin.length) out.push({ key: "thin", text: `Answers on ${thin.join(" and ")} are thin. Ask on the next call.`, from: THIN.map(([id]) => id) });
  return out;
}
```

The first test passes `finished: true` and leaves the thin-answer screens blank, so neither "unfinished" nor "thin" appears there.

Run: `npx playwright test tests/onboarding-readout.spec.ts`
Expected: 6 passed.

- [ ] **Step 4: History in the API layer**

In `src/lib/api/brain.ts` add:

```ts
const historySchema = z
  .object({
    ok: z.literal(true),
    history: z
      .array(z.object({ section: z.string(), field: z.string(), value: z.unknown(), source: z.string().nullish(), replaced_at: z.string() }).loose())
      .catch([])
      .default([]),
  })
  .loose();

/** Answers a client replaced, newest first (operator only; Brain client-brain.js ?history=1). */
export async function fetchBrainHistory(client: string, signal?: AbortSignal) {
  const result = await api(`/api/client-brain?client=${encodeURIComponent(client)}&history=1`, historySchema, { signal });
  return result.history;
}
```

(Use the same `api` import and operator audience as `fetchBrain` in that file.)

- [ ] **Step 5: The view**

Create `src/features/brain/onboarding-view.tsx`. It renders, for the selected client:

1. **"What this client needs figured out"** card: `needsFrom(answers, progress.finished)` where `answers = { ...prefill(read, SCREENS), ...saleAnswersFrom(story) }` and `read` reads the operator's `Brain` data (`sections[].fields[].value`, skipping gaps). Each need is a row: the text, then two buttons "Done" and "Handled on a call" (`setNeedState(client, key, "done" | "call")`), and an "Undo" on handled rows (`"open"`). Handled rows collapse under "Handled (n)". Clicking a need scrolls to the first bullet in `need.from`.
2. **"How you found us"** card from `fetchSaleStory(client)`: the seven answers as bullets ("Believed us because: ...", "Decided in: A few days", "Almost stopped by: Price, "..."", "The video: <link>", "Sure before the call: 7 out of 10", "Saw before booking: The DM 4/5, Our YouTube 5/5"). "Not answered yet" when `story` is null.
3. One card per part from `readout(answers)` (skip `sale`, shown above): the part name; the money summary first for Money; each bullet as the question in 12px muted text above the answer in 14px; answers longer than 4 lines clamp with "Show all"; gaps in muted "Skipped". When `fetchBrainHistory` has rows for a field this bullet writes, show "Updated <date>" and a "Before" disclosure with the previous value(s).
4. The funnel path (bullet `funnel.path`) drawn as chips joined by "->"; proof thumbnails from `brain.proof_items` with image URLs under the Proof card.

`saleAnswersFrom` (in the same file):

```ts
export function saleAnswersFrom(story: { answers: Record<string, unknown> } | null | undefined): Answers {
  if (!story) return {};
  const a = story.answers as Record<string, any>;
  return {
    "sale.believed": a.believed,
    "sale.decision_time": a.decision_time,
    "sale.sooner_if": a.sooner_if,
    "sale.almost_stopped": a.almost_stopped?.pick,
    "sale.almost_stopped:more": a.almost_stopped?.more,
    "sale.video": a.video,
    "sale.confidence": a.confidence?.score,
    "sale.confidence:more": a.confidence?.more,
    "sale.touchpoints": (a.touchpoints ?? []).map((t: { pick: string }) => t.pick),
    "sale.touchpoints_rated": Object.fromEntries((a.touchpoints ?? []).map((t: { pick: string; rating: number; note: string }) => [t.pick, { rating: t.rating, note: t.note }])),
  };
}
```

and the "How you found us" bullets come from `readout({...})` filtered to `part === "sale"`, so the wording matches the form. Replace `any` with a typed shape if lint refuses `any`.

Use `useQuery` for the three reads (`["sale-story", client]`, `["onboarding-needs", client]`, `["brain-history", client]`) and `useMutation` + `invalidateQueries(["onboarding-needs", client])` for ticks. Loading: skeletons in the final layout (operator console density, design system). Errors: say what failed and offer Retry. Never the word "health".

- [ ] **Step 6: The switch on the brain screen**

In `brain-screen.tsx`, above the three summary cards, add a two-tab switch "Sections" / "Onboarding" bound to `?view=` (`useSearchParams` is already imported; write with `router.replace` keeping `client`). When `view === "onboarding"`, render `<OnboardingView client={client} data={data} />` instead of the sections grid; the summary cards stay.

- [ ] **Step 7: Browser test**

Create `tests/brain-onboarding-view.spec.ts` with the operator fixtures the existing `tests/brain.spec.ts` uses (copy its setup). Mock `/api/client-brain` GET with fields for `positioning.mechanism_status: "none"`, `funnel.has_funnel: { pick: "yes", more: "" }`, `funnel.leak: { pick: "no-show", more: "They ghost." }`, `money.monthly_income: "12400"`, `proof.has_proof: true` (all `source: "client-form"`); mock `/api/sale-story` with a story; mock `/api/onboarding-needs` GET `{ ok: true, states: {} }`; `?history=1` returns one older `money.monthly_income` row. Assert:
- `/app/brain?client=demo-rio&view=onboarding` shows "What this client needs figured out" with "Needs a mechanism built from scratch. Start here, before content." and "Funnel leaks at: They book but don't show."
- clicking "Done" on the mechanism row POSTs `{ client: "demo-rio", key: "mechanism", state: "done" }`;
- "How you found us" shows "7 out of 10";
- the Money card shows "Makes $12,400 a month" and "Updated";
- `new AxeBuilder({ page }).analyze()` finds no violations;
- the page text never contains "health" (`expect(await page.locator("main").innerText()).not.toMatch(/health/i)`).

Run: `npx playwright test tests/brain-onboarding-view.spec.ts tests/brain.spec.ts`
Expected: pass.

- [ ] **Step 8: Commit**

```bash
git add src/features/onboarding/needs.ts src/features/brain src/lib/api/brain.ts tests
git commit -m "Operator: Onboarding view with the needs list, how they found us and plain-English answers (#70)"
```

---

### Task 17: Docs, full checks, screenshots, and the founder walkthrough

**Files:**
- Modify: `docs/backend-wiring.md` (replace the "Onboarding: built" section)
- Modify: `tests/onboarding.screens.spec.ts`
- Brain: `AGENT_CHAT.md`, `wiki/log.md`, `wiki/synthesis/onboarding-v2-spec-2026-10-15.md` (status line)

- [ ] **Step 1: Backend wiring notes**

Replace the "## Onboarding: built" section of `docs/backend-wiring.md` with:

```markdown
## Onboarding v2: built, not released (founder walkthrough pending)

Spec: Pulsify-Brain `wiki/synthesis/onboarding-v2-spec-2026-10-15.md`. Plan: Brain `docs/superpowers/plans/2026-10-15-onboarding-v2.md`.

- **Questions:** `src/features/onboarding/schema/parts/*.ts`, one file per part, read by the pure engine `engine.ts`. Branching (`when`), required checks (`problemWith`), what each screen writes (`field` / `save`) and prefill (`read`) all live in the schema.
- **Brain:** six new sections (`intent`, `money`, `positioning`, `content`, `program`, `commitment`) and the client-writable fields in `ONBOARDING_V2_FIELDS` (Brain `functions/api/client-brain.js`, mirrored in `src/features/brain/model.ts`). Object answers are field type `json` (read-only on the operator brain screen). `money` and `commitment` never reach a generator (`client-brain-context.js` `GENERATOR_SECTION_ORDER`). A changed answer keeps its old value in `client_brain_history`; operators read it with `?history=1`.
- **Drafts (#67):** `src/lib/use-form-draft.ts` + `functions/api/form-drafts.js` (table `form_drafts`). Browser copy at once, server copy about 1 second after typing stops; the newer copy wins on return. Any form can use it with its own form key.
- **Part A, How you found us:** `functions/api/sale-story.js` (table `sale_stories`), posted once when the last question of part A is answered. Operators only read it. Never in the brain, never in a generator.
- **Talk or type:** every text answer has a mic (`voice-tools.tsx`) that stores the note through `/api/voice-note` and puts the words in the box; nothing is applied to the brain until Continue. Read aloud uses the browser's speech (free).
- **Connect first:** after payment, the first screen is Connect (`client-connect.js`); `pulsify:after-connect` brings them back to the form. Connecting fails with "full" until Zernio has a payment method (2026-10-13).
- **Operator:** `/brain?view=onboarding` (`src/features/brain/onboarding-view.tsx`): needs list (`needs.ts`, ticks in `functions/api/onboarding-needs.js`, table `onboarding_needs`), how they found us, every answer in plain English (`readout.ts`), "Updated" and "Before" from the history.
- **Migration:** `migrations/0062_onboarding_v2.sql`, applied with `npx wrangler d1 execute pulsify-portal --remote --file migrations/0062_onboarding_v2.sql` from `output/standard-preview` (the repo's migrations were never recorded by wrangler, so `migrations apply` is not used).
- **Missing:** the voice recordings behind typed answers are kept in `voice_notes` but not linked to the answer they filled (the operator view shows the words, not a play button); per-client AI follow-up questions (rule-based "say more" only for now); adding positioning/content/funnel answers up across clients.
```

- [ ] **Step 2: Screenshots**

Update `tests/onboarding.screens.spec.ts` to capture, in dark and light at desktop and mobile: Connect, Welcome, A1, A6 (scale), 3.1 (money table filled), 5.5n (starter cards), 8.1 (persona), 10.1 (TOF/MOF/BOF), 10.1 horizontal, 10.6 (path builder), 11.8 (proof cards), 13.1 (the deal), the read-back, Done, and the operator Onboarding view. Seed each screen through the draft mock (`position` + `answers`).

Run: `SCREENS=1 npx playwright test tests/onboarding.screens.spec.ts` (PowerShell: `$env:SCREENS=1; npx playwright test tests/onboarding.screens.spec.ts`)
Expected: images in `test-results/screens/`. Open every image and check: nothing overlaps at 390px, text never under 12px, the glow accent only on "do this" elements, primary buttons silver-white, no "health". Fix and recapture until clean (founder perfection standard: no known flaws shown).

- [ ] **Step 3: The full check**

Run: `npm run check`
Expected: lint, typecheck, build and the static browser suite all pass. Note the known intermittent call-note test from 2026-10-12: if only that test fails, rerun it alone three times and record the result honestly.

Run (Brain worktree root): `node --test output/standard-preview/tests/*.test.mjs`
Expected: all pass.

- [ ] **Step 4: Push the branches (not main)**

```bash
cd /c/Users/Abdullah/Desktop/pulsify-saas-onboarding-v2
git push -u origin claude/onboarding-v2
cd "/c/Users/Abdullah/Desktop/Pulsify-Brain/.claude/worktrees/mvp-prd-pricing-blockers-97ead8"
git push -u brain claude/onboarding-v2-build
```

- [ ] **Step 5: Founder walkthrough**

Two ways to show it; ask the founder which he wants:
1. **Screenshots only (no risk):** send the set from Step 2.
2. **A clickable preview (recommended):** in the saas worktree run `npm run release` (copies the build into Brain `output/standard-preview/app`), then from Brain `output/standard-preview` run `npx wrangler pages deploy . --project-name pulsify-funnels --branch onboarding-v2-preview`. A branch deploy never replaces production, but it uses the same database, so the 0062 migration must be applied first (Task 18 Step 1). Ask the founder before applying it; the tables are new and touch nothing that exists. Use a test client's form link, never a real client's.

Send him, in plain words, the screenshots or the preview link and these open points from the spec ("Points to settle in review"):
1. Is 35-45 minutes OK, or should proof uploads and the program part move to a "finish your setup" step in the first week?
2. Should the read-back send him a notification for each new client?
3. "The deal": at the end (as built) or right after part A?
4. Voice answers arrive as text; the recordings are kept but not attached to each answer. OK for now?

Then stop. Do not release until he says yes.

- [ ] **Step 6: Log it**

Brain `AGENT_CHAT.md`: a DONE entry with both branch names, test counts and "waiting for founder walkthrough". Brain `wiki/log.md`: `## [YYYY-MM-DD] decision | Onboarding v2 built, waiting for founder walkthrough` with one short paragraph. Spec status line: `status: BUILT on branches claude/onboarding-v2 (pulsify-saas) and claude/onboarding-v2-build (Brain); not live`.

```bash
git add AGENT_CHAT.md wiki/log.md wiki/synthesis/onboarding-v2-spec-2026-10-15.md
git commit -m "Log onboarding v2 build, waiting for the founder's walkthrough"
git push brain claude/onboarding-v2-build
```

---

### Task 18: Release (only after the founder says yes)

**Files:** none new.

- [ ] **Step 1: Apply the migration to the live database**

From the Brain worktree, `output/standard-preview`:

```bash
npx wrangler d1 execute pulsify-portal --remote --file migrations/0062_onboarding_v2.sql
npx wrangler d1 execute pulsify-portal --remote --command "SELECT name FROM sqlite_master WHERE name IN ('form_drafts','sale_stories','onboarding_needs','client_brain_history')"
```
Expected: the second command lists all four tables.

- [ ] **Step 2: Backend to Brain main**

```bash
git fetch brain
git switch claude/onboarding-v2-build
git merge --no-edit brain/main
node --test output/standard-preview/tests/*.test.mjs
git push brain HEAD:main
```
Expected: tests pass before the push.

- [ ] **Step 3: App to pulsify-saas main (main is live)**

Open a PR from `claude/onboarding-v2` to `main`, then bind it with the ccd_pr tools and read its CI. Merge only when CI is green and the founder has approved. Then, on a clean, pushed `main`:

```bash
cd /c/Users/Abdullah/Desktop/pulsify-saas-onboarding-v2
git switch main && git pull
npm run release
```
`npm run release` builds and copies the app into Brain `output/standard-preview/app` (scripts/sync-preview.mjs); commit that copy in Brain and push it to `brain/main`.

- [ ] **Step 4: Deploy and check live**

From Brain `output/standard-preview`:

```bash
npx wrangler pages deploy . --project-name pulsify-funnels --branch main
```

Then check on production with a test client (never a real client): open the form link from `/app/brain` -> "Get the form link" for the test client, answer part A, confirm one row in `sale_stories`, type a half answer, reload, confirm it comes back, finish, and open `/app/brain?client=<test>&view=onboarding`. Record what you checked in `AGENT_CHAT.md` and `wiki/log.md`.

---

## Self-review notes (for the executor)

- The spec's questions map to screens by `ref`; `git grep -n "ref: \"" src/features/onboarding/schema` lists them all next to the spec's numbers.
- If a test in this plan contradicts the spec, the spec wins. Fix the test, say so in the commit.
- If any step needs a fact this plan does not give (a component's real prop name, a fixture's real export), read the file and use what is there. Do not guess names.
