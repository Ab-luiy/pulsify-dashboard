// Migration 0063: the client_brain table takes the onboarding v2 sections and keeps every row it already had.
// Real SQLite: build the table the way production has it (0014), add rows, run 0063, check.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const read = (name) => readFileSync(new URL(`../migrations/${name}`, import.meta.url), "utf8");

test("a new section is refused before 0063 and accepted after, and old rows survive the rebuild", () => {
  const sql = new DatabaseSync(":memory:");
  sql.exec(read("0014_client_brain.sql"));
  const insert = sql.prepare("INSERT INTO client_brain (client_id, section, field, value_json, source, updated_at) VALUES (?,?,?,?,?,?)");
  insert.run("alpha", "identity", "name", '"Rio"', "client-form", "2026-10-01T00:00:00.000Z");
  insert.run("alpha", "proof", "has_proof", "true", "operator", "2026-10-02T00:00:00.000Z");
  insert.run("beta", "icp", "client_guess", '"Traders"', "client-form", "2026-10-03T00:00:00.000Z");
  assert.throws(() => insert.run("alpha", "intent", "why_joined", '["no-buyers"]', "client-form", "2026-10-15T00:00:00.000Z"), /CHECK constraint failed/);

  const before = sql.prepare("SELECT id, client_id, section, field, value_json, source, updated_at FROM client_brain ORDER BY id").all();
  sql.exec(read("0063_client_brain_sections.sql"));
  const after = sql.prepare("SELECT id, client_id, section, field, value_json, source, updated_at FROM client_brain ORDER BY id").all();
  assert.deepEqual(after, before, "every row, id included, is unchanged");

  insert.run("alpha", "intent", "why_joined", '["no-buyers"]', "client-form", "2026-10-15T00:00:00.000Z");
  for (const section of ["money", "positioning", "content", "program", "commitment"]) insert.run("alpha", section, "x", '"y"', "client-form", "2026-10-15T00:00:00.000Z");
  assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM client_brain WHERE client_id='alpha'").get().n, 8);

  // The unique key and the source check still hold, and the next id carries on from the old rows.
  assert.throws(() => insert.run("alpha", "intent", "why_joined", '"again"', "client-form", "x"), /UNIQUE constraint failed/);
  assert.throws(() => insert.run("alpha", "intent", "other", '"z"', "someone", "x"), /CHECK constraint failed/);
  assert.ok(sql.prepare("SELECT MAX(id) AS id FROM client_brain").get().id > Math.max(...before.map((row) => row.id)));
  const index = sql.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_client_brain_client_section'").get();
  assert.ok(index, "the lookup index is back");
});
