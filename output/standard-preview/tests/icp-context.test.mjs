import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import { icpContext, validateIcp } from "../functions/_shared/icp-context.js";

// The ICP avatar (pulsify-saas #105): what the portal may store, and the one text Jane will read about it.
const load = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const marcus = () => load("../../../wiki/people/marcus-icp.json");
const alex = () => load("../../../clients/nick/icp-alex.json");

test("both avatars in the vault are valid ICP records", () => {
  assert.deepEqual(validateIcp(marcus()), []);
  assert.deepEqual(validateIcp(alex()), []);
  // Nick's doc leaves "Guilts and shames" empty: the point stays, with no lines.
  assert.deepEqual(alex().points[14].lines, []);
});

test("a broken avatar says what is wrong in plain words", () => {
  const data = marcus();
  assert.match(validateIcp({ ...data, points: data.points.slice(1) })[0], /exactly 28 points/);
  assert.match(validateIcp({ ...data, pronoun: "it" })[0], /he, she or they/);
  const badLine = structuredClone(data);
  badLine.pains[0].evidence.push([3, 99]);
  assert.match(validateIcp(badLine)[0], /line that doesn't exist/);
  const both = structuredClone(data);
  both.needs[0].make[0] = { format: "long", title: "a title", idea: "and an idea" };
  assert.match(validateIcp(both)[0], /both or neither/);
  const unknown = structuredClone(data);
  unknown.needs[0].make[0].format = "podcast";
  assert.match(validateIcp(unknown)[0], /without a format/);
  assert.deepEqual(validateIcp(null), ["The ICP is missing."]);
});

test("the context reads as who, pains with their lines, feelings, wants, needs, then the points", () => {
  const text = icpContext(marcus());
  assert.ok(text.startsWith("Ideal client: Marcus, ambitious and stalled\n22-ish coach"));
  assert.match(text, /What eats at him:\n- Every operator sounds the same\./);
  assert.match(text, /In the ICP: "Burned by agencies:/);
  assert.match(text, /What he feels most: Distrust \(23\), Shame \(14\)/);
  assert.match(text, /What he wants: \$100k\+ months, every month;/);
  assert.match(text, /- Someone he can check before he pays \(because: Been burned by operators\. Now skeptical of everyone\)\. Needs to hear: "I won't promise you/);
  assert.match(text, /\n28\. Finances: /);
  // An empty point is left out instead of printed blank.
  assert.doesNotMatch(icpContext(alex()), /\n15\. Guilts and shames/);
});

test("the seed tool writes one fixed-id row and never overwrites without --replace", () => {
  const run = (...args) => execFileSync(process.execPath, ["tools/seed-icp.mjs", ...args], { cwd: new URL("..", import.meta.url), encoding: "utf8" });
  const keep = run("../../wiki/people/marcus-icp.json", "pulsify-test");
  assert.match(keep, /^INSERT OR IGNORE INTO workspace_records/);
  assert.match(run("../../wiki/people/marcus-icp.json", "pulsify-test", "--replace"), /^INSERT OR REPLACE/);
  const sql = new DatabaseSync(":memory:");
  sql.exec(readFileSync(new URL("../migrations/0021_workspace_records.sql", import.meta.url), "utf8"));
  sql.exec(readFileSync(new URL("../migrations/0085_workspace_records_icp.sql", import.meta.url), "utf8"));
  sql.exec(keep);
  sql.exec(keep);
  const rows = sql.prepare("SELECT id, kind, title, data_json FROM workspace_records").all();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, "icp-pulsify-test");
  assert.equal(JSON.parse(rows[0].data_json).points.length, 28);
  assert.throws(() => run("../../wiki/people/marcus-icp.json", "bad id; drop"), /Usage/);
});
