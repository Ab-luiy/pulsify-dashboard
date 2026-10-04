// MVP phase 1: a provisioned workspace opens with a roadmap, a short to-do list and a team, never empty screens.
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { seedDashboard, seedSections } from "../functions/_shared/workspace-seed.js";

const sql = new DatabaseSync(":memory:");
sql.exec(readFileSync(new URL("../migrations/0011_client_dashboard_auth.sql", import.meta.url), "utf8"));
sql.exec("CREATE TABLE team_members(id TEXT PRIMARY KEY,client_id TEXT,name TEXT,role TEXT,active INTEGER,created_at TEXT,updated_at TEXT)");
const DB = {
  prepare(query) {
    let args = [];
    const statement = {
      bind(...values) { args = values; return statement; },
      async first() { return sql.prepare(query).get(...args) || null; },
      async all() { return { results: sql.prepare(query).all(...args) }; },
      async run() { const result = sql.prepare(query).run(...args); return { meta: { changes: result.changes } }; },
    };
    return statement;
  },
};
const env = { DB };

const sections = seedSections("2026-10-05T09:00:00.000Z");
assert.equal(sections.plans.length, 8, "eight phases, one per row of the offer's week table");
assert.equal(sections.plans[0].start_date, "2026-10-05");
assert.equal(sections.plans[0].end_date, "2026-10-11");
assert.equal(sections.plans[5].start_date, "2026-11-09", "weeks 6 to 8 start on day 36");
assert.equal(sections.plans[7].end_date, "2026-12-27", "the last phase ends on day 84");
assert.deepEqual(sections.plans.map((plan) => plan.status), ["In progress", ...Array(7).fill("Queued")]);
assert.ok(sections.todos.every((todo) => todo.done === false && todo.label && todo.owner === "You"));
assert.ok(sections.team.length >= 1 && sections.team.every((member) => member.name && member.role));
const text = JSON.stringify(sections);
assert.doesNotMatch(text, /Abdullah|gmail|Turkey|!/, "no personal details or exclamation marks in client-facing copy");

await seedDashboard(env, "acme", "2026-10-05T09:00:00.000Z");
const rows = sql.prepare("SELECT section FROM client_dashboard_content WHERE client_id='acme' ORDER BY section").all().map((row) => row.section);
assert.deepEqual(rows, ["plans", "team", "todos"]);

// Never overwrites what the operator already wrote, and running twice changes nothing.
sql.prepare("UPDATE client_dashboard_content SET json=? WHERE client_id='acme' AND section='plans'").run('[{"title":"Custom plan"}]');
await seedDashboard(env, "acme");
assert.equal(sql.prepare("SELECT json FROM client_dashboard_content WHERE client_id='acme' AND section='plans'").get().json, '[{"title":"Custom plan"}]');
assert.equal(sql.prepare("SELECT COUNT(*) n FROM client_dashboard_content WHERE client_id='acme'").get().n, 3);
assert.equal(sql.prepare("SELECT COUNT(*) n FROM team_members WHERE client_id='acme'").get().n,1);
assert.equal(sql.prepare("SELECT name FROM team_members WHERE client_id='acme'").get().name,'You');

// Another client's workspace is separate.
await seedDashboard(env, "beta");
assert.equal(sql.prepare("SELECT COUNT(*) n FROM client_dashboard_content WHERE client_id='beta'").get().n, 3);

console.log("PASS workspace seed: roadmap dates follow the offer's weeks, to-dos only client-owned, team is the brand not a person, idempotent, never overwrites operator content.");
