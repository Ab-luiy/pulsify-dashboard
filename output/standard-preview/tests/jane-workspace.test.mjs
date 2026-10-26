// Jane reads the client's own work and results (founder 2026-10-26: "scan everything there is in the
// backend ... connect the dots"). Real SQLite: plan, projects, Instagram log, proof; missing tables come
// back as a note, never a crash; a public draft hides money, names and proof not cleared for use; the
// lookup loop accepts the fixed area ids and feeds the numbers to the draft check.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { readWorkspace, WORKSPACE_AREAS } from "../functions/_shared/jane-workspace.ts";
import { createJaneTools, gatherJaneContext } from "../functions/_shared/copy-agent.ts";
import { janeRoute } from "../functions/_shared/jane-context.ts";

const sql = new DatabaseSync(":memory:");
for (const file of ["0014_client_brain.sql", "0013_client_dashboard_metrics.sql", "0021_workspace_records.sql", "0026_workspace_preferences.sql"]) {
  sql.exec(readFileSync(new URL(`../migrations/${file}`, import.meta.url), "utf8"));
}
sql.exec(`
  INSERT INTO workspace_preferences VALUES ('acme','content-plan','{"slots":[{"date":"2026-10-28","time":"12:30","format":"youtube","title":"Why your entries fail","repeat":"weekly"}]}','2026-10-26T10:00:00Z');
  INSERT INTO workspace_preferences VALUES ('other','content-plan','{"slots":[{"date":"2026-10-28","title":"OTHER CLIENT PLAN"}]}','2026-10-26T10:00:00Z');
  INSERT INTO workspace_records (id, client_id, kind, title, data_json, created_at, updated_at) VALUES ('r1','acme','youtube','Premium and discount live','{"stage":"build","headline":"1 concept that fixed my students"}','2026-10-20','2026-10-25');
  INSERT INTO sequence_log (client_id, posted_on, type, topic, slide_count, slide_views_json, dms, profile_visits, notes, created_at, updated_at) VALUES ('acme','2026-10-24','value','Location over entry',8,'[1000,800,600,500]',12,40,NULL,'x','x');
  INSERT INTO proof_items (client_id, kind, url, claim, permission, created_at) VALUES ('acme','image-link','/m/acme/a.png','Student passed a 50k challenge','granted','2026-10-01');
  INSERT INTO proof_items (client_id, kind, url, claim, permission, created_at) VALUES ('acme','image-link','/m/acme/b.png','Private DM result','unknown','2026-10-02');
`);
const env = { DB: {
  prepare(query) {
    let args = [];
    const statement = {
      bind(...values) { args = values; return statement; },
      async first() { return sql.prepare(query).get(...args) || null; },
      async all() { return { results: sql.prepare(query).all(...args) }; },
    };
    return statement;
  },
} };

test("each area reads only this client's records", async () => {
  const plan = await readWorkspace(env, "acme", "plan");
  assert.equal(plan.slots[0].title, "Why your entries fail");
  assert.doesNotMatch(JSON.stringify(plan), /OTHER CLIENT/);
  const projects = await readWorkspace(env, "acme", "projects");
  assert.equal(projects.projects[0].stage, "build");
  const instagram = await readWorkspace(env, "acme", "instagram");
  assert.equal(instagram.sequences[0].completion, "50%");
  assert.equal(instagram.sequences[0].dms, 12);
});

test("a public draft only sees proof cleared for public use", async () => {
  const all = await readWorkspace(env, "acme", "proof");
  assert.equal(all.items.length, 2);
  const cleared = await readWorkspace(env, "acme", "proof", { publicDraft: true });
  assert.deepEqual(cleared.items.map((item) => item.claim), ["Student passed a 50k challenge"]);
});

test("areas whose tables are missing come back as a note, never a crash", async () => {
  for (const area of ["videos", "leads", "calls"]) {
    const result = await readWorkspace(env, "acme", area);
    assert.ok(result.error || result.note, `${area} answered`);
  }
  assert.match((await readWorkspace(env, "acme", "nope")).error, /Unknown area/);
  assert.deepEqual([...WORKSPACE_AREAS], ["videos", "leads", "calls", "plan", "projects", "instagram", "proof"]);
});

test("the lookup loop accepts a workspace area without a search and passes the numbers to the draft check", async () => {
  let round = 0;
  const binding = { async run() {
    round += 1;
    return { response: JSON.stringify(round === 1 ? { calls: [{ tool: "read_workspace", query: "story completion", id: "instagram" }] } : { calls: [] }) };
  } };
  const tools = createJaneTools({ env, client: "acme", brainData: { rows: [] } });
  const found = await gatherJaneContext({ binding, tools, message: "Which of my story sequences kept people watching?" });
  assert.equal(found.calls, 1);
  assert.match(found.prompt_text, /Location over entry/);
  assert.match(found.brain_text, /Workspace instagram/);
});

test("any real question goes to the lookup planner; greetings and simple edits do not", () => {
  assert.equal(janeRoute("hi"), "social");
  assert.equal(janeRoute("shorten it"), "edit");
  assert.equal(janeRoute("which video should I remake next?"), "lookup");
  assert.equal(janeRoute("why is nobody booking calls"), "lookup");
});
