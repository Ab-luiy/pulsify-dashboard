// Internal tool: load an ICP avatar (pulsify-saas #105) into one client's workspace.
// node tools/seed-icp.mjs <avatar.json> <client_id> [--replace] > icp.sql
// then: npx wrangler d1 execute pulsify-portal --remote --file icp.sql  (production: only with the founder's yes)
// The record id is fixed per client, so running it twice never makes two avatars. Without --replace an existing
// avatar is left alone, so the client's own edits (reworded titles) are never overwritten by a re-run.
import fs from "node:fs";
import { validateIcp } from "../functions/_shared/icp-context.js";

const [file, client, flag] = process.argv.slice(2);
if (!file || !client || !/^[a-z0-9][a-z0-9_-]{0,62}$/i.test(client)) {
  console.error("Usage: node tools/seed-icp.mjs <avatar.json> <client_id> [--replace]");
  process.exit(2);
}
const data = JSON.parse(fs.readFileSync(file, "utf8"));
const problems = validateIcp(data);
if (problems.length) {
  console.error(`Not loaded, the avatar has problems:\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
const text = (value) => `'${String(value).replace(/'/g, "''")}'`;
const now = new Date().toISOString();
const row = [`icp-${client}`, client, "icp", data.name, JSON.stringify(data), now, now].map(text).join(", ");
const verb = flag === "--replace" ? "INSERT OR REPLACE" : "INSERT OR IGNORE";
process.stdout.write(`${verb} INTO workspace_records (id, client_id, kind, title, data_json, created_at, updated_at) VALUES (${row});\n`);
