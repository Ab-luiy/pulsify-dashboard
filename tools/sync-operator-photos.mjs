/** Pull operator photo originals into the shared Brain. Run before choosing story pictures.
 * Uses existing Wrangler Cloudflare login; no API key copied into the vault.
 * node tools/sync-operator-photos.mjs [--wrangler absolute/path/to/wrangler.js]
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export function localName(row) {
  if (!Number.isSafeInteger(row.id) || row.id < 1) throw new Error("Invalid photo id");
  const name = Array.from(String(row.filename || "photo").split(/[\\/]/).pop().replace(/[<>:"|?*\x00-\x1f]/g, "_").replace(/[. ]+$/g, "")).slice(0, 180).join("") || "photo";
  return `${row.id}-${name}`;
}
export function syncRows(rows, destination, download) {
  mkdirSync(destination, { recursive: true });
  const index = []; let saved = 0;
  for (const row of rows) {
    if (!/^operator-photos\/[0-9a-f-]+\.(jpg|png|webp|gif)$/.test(row.storage_key) || !/^[0-9a-f]{64}$/.test(row.sha256)) throw new Error("Invalid photo storage record");
    const filename = localName(row), target = join(destination, filename);
    const hash = bytes => createHash("sha256").update(bytes).digest("hex");
    if (!existsSync(target) || hash(readFileSync(target)) !== row.sha256) {
      // Preserve any existing local file; never overwrite an original or a user's edit.
      if (existsSync(target)) throw new Error(`Local photo differs from original: ${filename}. Preserve it elsewhere before syncing.`);
      const temp = `${target}.partial`;
      download(row.storage_key, temp);
      const bytes = readFileSync(temp);
      if (bytes.length !== row.size_bytes || hash(bytes) !== row.sha256) throw new Error(`Photo integrity check failed: ${filename}`);
      renameSync(temp, target); saved++;
    }
    index.push({ id: row.id, original_filename: row.filename, file: filename, folder: row.folder, content_type: row.content_type, size_bytes: row.size_bytes, sha256: row.sha256, created_at: row.created_at });
  }
  // The index describes the cloud library; previous downloaded originals are never deleted.
  writeFileSync(join(destination, "index.json"), JSON.stringify({ synced_at: new Date().toISOString(), photos: index }, null, 2) + "\n");
  return { downloaded: saved, total: index.length };
}
function findWrangler(root) {
  const flag = process.argv.indexOf("--wrangler");
  if (flag >= 0) return resolve(process.argv[flag + 1]);
  const local = join(root, "output", "standard-preview", "node_modules", "wrangler", "bin", "wrangler.js");
  if (existsSync(local)) return local;
  const cache = process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, "npm-cache", "_npx") : join(process.env.HOME || "", ".npm", "_npx");
  if (existsSync(cache)) {
    for (const entry of readdirSync(cache)) {
      const candidate = join(cache, entry, "node_modules", "wrangler", "bin", "wrangler.js");
      if (existsSync(candidate)) return candidate;
    }
  }
  throw new Error("Wrangler not found. Use --wrangler with its installed wrangler.js path.");
}
export function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const cwd = join(root, "output", "standard-preview");
  const wrangler = findWrangler(root);
  const run = args => {
    try { return execFileSync(process.execPath, [wrangler, ...args], { cwd, encoding: "utf8", windowsHide: true, maxBuffer: 32 * 1024 * 1024 }); }
    catch (error) { throw new Error((error.stdout || error.stderr || error.message).trim()); }
  };
  const result = JSON.parse(run(["d1", "execute", "pulsify-portal", "--remote", "--json", "--command", "SELECT id, storage_key, filename, folder, content_type, size_bytes, sha256, created_at FROM operator_photos ORDER BY id"]));
  if (!Array.isArray(result) || result.some(part => !part.success)) throw new Error("The photo list could not be read");
  const rows = result.flatMap(part => part.results || []);
  const summary = syncRows(rows, join(root, "brand", "photos", "uploaded"), (key, target) => run(["r2", "object", "get", `pulsify-media/${key}`, "--remote", "--file", target]));
  console.log(`${summary.downloaded} photos downloaded, ${summary.total} indexed in brand/photos/uploaded.`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv.includes("--help")) console.log("node tools/sync-operator-photos.mjs [--wrangler /path/to/wrangler.js]\nDownloads verified operator originals into brand/photos/uploaded using the existing Cloudflare login.");
  else { try { main(); } catch (error) { console.error(`Photo sync failed: ${error.message}`); process.exitCode = 1; } }
}
