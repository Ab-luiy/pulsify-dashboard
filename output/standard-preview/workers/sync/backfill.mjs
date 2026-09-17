import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import process from "node:process";
import { leadId } from "./src/jobs/leads.js";

const args = new Set(process.argv.slice(2));
const dashboardArg = valueAfter("--dashboard");
const dashboard = path.resolve(dashboardArg || path.join(process.cwd(), ".codex-tmp", "phase1-dashboard"));
const data = JSON.parse(readFileSync(path.join(dashboard, "dashboard-data-v2.json"), "utf8"));
const leads = JSON.parse(readFileSync(path.join(dashboard, "yt_leads.json"), "utf8"));
const leadMeta = JSON.parse(readFileSync(path.join(dashboard, "yt_leads_meta.json"), "utf8"));
const capturedAt = data.lastUpdated || data.instagram?.updatedAt || data.youtube?.updatedAt || new Date().toISOString();
const statements = ["BEGIN TRANSACTION;"];

for (const [kind, payload] of Object.entries(data.youtube || {})) {
  if (kind === "updatedAt") continue;
  snapshot("youtube", kebab(kind), data.youtube.updatedAt || capturedAt, payload);
}
for (const [kind, payload] of Object.entries(data.instagram || {})) {
  if (kind === "updatedAt") continue;
  snapshot("instagram", kebab(kind), data.instagram.updatedAt || capturedAt, payload);
}
for (const [metric, value] of Object.entries({
  youtube_subscribers: data.youtube?.channel?.subscribers,
  youtube_channel_views: data.youtube?.channel?.views,
  youtube_video_count: data.youtube?.channel?.videos,
  instagram_followers: data.instagram?.profile?.followers,
  instagram_media_count: data.instagram?.profile?.mediaCount,
  instagram_reach_30d: data.instagram?.account?.reach30d,
  instagram_views_30d: data.instagram?.account?.views30d,
})) {
  if (!Number.isFinite(Number(value))) continue;
  const [source, ...rest] = metric.split("_");
  metricPoint(source, rest.join("_"), capturedAt, Number(value));
}
for (const story of data.instagram?.stories || []) {
  if (!story?.id) continue;
  const storedStory = stripHeavy(story);
  statements.push(
    `INSERT INTO stories(scope,client_id,media_id,captured_at,payload_json) VALUES('operator','',${sql(story.id)},${sql(story.capturedAt || story.timestamp || capturedAt)},${sql(JSON.stringify(storedStory))}) ON CONFLICT(media_id) DO UPDATE SET captured_at=excluded.captured_at,payload_json=excluded.payload_json;`,
  );
}
for (const lead of leads) {
  const id = await leadId(lead);
  statements.push(
    `INSERT INTO yt_leads(id,payload_json,score,tier,niche,updated_at) VALUES(${sql(id)},${sql(JSON.stringify(lead))},${num(lead.s ?? lead.score)},${sql(lead.tier || null)},${sql(lead.niche || lead._niche || null)},${sql(capturedAt)}) ON CONFLICT(id) DO UPDATE SET payload_json=excluded.payload_json,score=excluded.score,tier=excluded.tier,niche=excluded.niche,updated_at=excluded.updated_at;`,
  );
}
statements.push(
  `INSERT INTO yt_leads_meta(key,value_json) VALUES('latest',${sql(JSON.stringify(leadMeta))}) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json;`,
  "COMMIT;",
);

const counts = {
  snapshots: Object.keys(data.youtube || {}).filter((key) => key !== "updatedAt").length + Object.keys(data.instagram || {}).filter((key) => key !== "updatedAt").length,
  stories: (data.instagram?.stories || []).length,
  leads: leads.length,
  commandBatches: commandChunks(statements.slice(1, -1)).length,
};
console.log(JSON.stringify({ dashboard, capturedAt, counts }, null, 2));

if (args.has("--apply-command")) {
  const chunks = commandChunks(statements.slice(1, -1));
  console.log(`Applying ${chunks.length} idempotent D1 command batches...`);
  const wrangler = process.platform === "win32" ? findWrangler() : null;
  for (let index = 0; index < chunks.length; index += 1) {
    const command = process.platform === "win32" ? process.execPath : "npx";
    const commandArgs = process.platform === "win32"
      ? [wrangler]
      : [];
    try {
      execFileSync(command, [...commandArgs,
        "wrangler",
        "d1",
        "execute",
        "pulsify-portal",
        "--remote",
        `--command=${chunks[index]}`,
        "--json",
      ], {
        cwd: path.dirname(fileURLToPath(import.meta.url)),
        stdio: "pipe",
      });
    } catch (error) {
      const stderr = String(error?.stderr || "").slice(-2000);
      throw new Error(`D1 batch ${index + 1} failed: ${stderr || error.message}`);
    }
    if ((index + 1) % 10 === 0 || index + 1 === chunks.length) {
      console.log(`Applied ${index + 1}/${chunks.length}`);
    }
  }
}

function snapshot(source, kind, at, payload) {
  const serialized = JSON.stringify(stripHeavy(payload));
  const prefix = `INSERT INTO snapshots(scope,client_id,source,kind,captured_at,payload_json) VALUES('operator','',${sql(source)},${sql(kind)},${sql(at)},`;
  const suffix = `) ON CONFLICT(scope,client_id,source,kind) DO UPDATE SET captured_at=excluded.captured_at,payload_json=excluded.payload_json;`;
  if (prefix.length + serialized.length + suffix.length < 14000) {
    statements.push(`${prefix}${sql(serialized)}${suffix}`);
    return;
  }
  statements.push(`${prefix}''${suffix}`);
  for (let offset = 0; offset < serialized.length; offset += 8000) {
    const part = serialized.slice(offset, offset + 8000);
    statements.push(`UPDATE snapshots SET payload_json=payload_json||${sql(part)} WHERE scope='operator' AND client_id='' AND source=${sql(source)} AND kind=${sql(kind)};`);
  }
}

function metricPoint(source, metric, at, value) {
  statements.push(
    `INSERT OR IGNORE INTO metric_points(scope,client_id,source,metric,ts,value,value_text,dims_json) VALUES('operator','',${sql(source)},${sql(metric)},${sql(at)},${num(value)},NULL,'{}');`,
  );
}

function sql(value) {
  if (value == null) return "NULL";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function num(value) {
  const number = Number(value);
  return Number.isFinite(number) ? String(number) : "NULL";
}

function kebab(value) {
  return String(value).replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

function valueAfter(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : null;
}

function stripHeavy(value) {
  if (Array.isArray(value)) return value.map(stripHeavy);
  if (!value || typeof value !== "object") {
    return typeof value === "string" && value.startsWith("data:image/") ? null : value;
  }
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key,
    key === "thumbnailDataUri" ? null : stripHeavy(item),
  ]));
}

function commandChunks(items, maxLength = 22000) {
  const chunks = [];
  let current = "";
  for (const raw of items) {
    const statement = raw.endsWith(";") ? raw : `${raw};`;
    if (statement.length > maxLength) throw new Error(`Backfill statement exceeds ${maxLength} characters`);
    if (current && current.length + statement.length > maxLength) {
      chunks.push(current);
      current = "";
    }
    current += statement;
  }
  if (current) chunks.push(current);
  return chunks;
}

function findWrangler() {
  const root = path.join(process.env.LOCALAPPDATA || "", "npm-cache", "_npx");
  const candidates = existsSync(root) ? readdirSync(root).map((name) => path.join(root, name, "node_modules", "wrangler", "bin", "wrangler.js")) : [];
  const found = candidates.find(existsSync);
  if (!found) throw new Error("Wrangler CLI cache not found");
  return found;
}
