// A scout account sends an Instagram profile to the operator's inbox.
// Only explicitly allowlisted senders can create a prospect from that DM.
import { addToQueue, normalizeHandle } from "./outreach-queue.js";

const PROFILE_URL = /(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-z0-9._]{2,30})(?=[/?#\s,)]|$)/ig;
const NON_PROFILES = new Set(["p", "reel", "reels", "stories", "direct", "explore", "accounts", "share", "tv"]);

export function scoutHandles(env) {
  return new Set(String(env.OUTREACH_SCOUT_HANDLES || "").split(",").map(normalizeHandle).filter(Boolean));
}

export function sharedProfileHandles(message) {
  const values = [];
  const walk = (value, depth = 0) => {
    if (depth > 5 || value == null) return;
    if (typeof value === "string") { values.push(value); return; }
    if (Array.isArray(value)) { value.forEach((item) => walk(item, depth + 1)); return; }
    if (typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      if (/^(text|message|url|link|permalink|share|shared|attachments|metadata|payload|media)$/i.test(key)) walk(child, depth + 1);
    }
  };
  walk(message);
  const found = new Set();
  for (const value of values) {
    for (const match of value.matchAll(PROFILE_URL)) {
      const handle = normalizeHandle(match[1]);
      if (handle && !NON_PROFILES.has(handle)) found.add(handle);
    }
  }
  return [...found];
}

export async function captureScoutShare(env, { senderHandle, message } = {}) {
  const sender = normalizeHandle(senderHandle);
  if (!sender || !scoutHandles(env).has(sender)) return { captured: 0, ignored: "sender not allowlisted" };
  const handles = sharedProfileHandles(message).filter((handle) => handle !== sender && handle !== normalizeHandle(env.OUTREACH_MAIN_HANDLE || "ab.luiy"));
  let captured = 0;
  const duplicates = [];
  for (const handle of handles) {
    const existingThread = await env.DB.prepare("SELECT id FROM ig_conversations WHERE LOWER(participant_username)=? LIMIT 1").bind(handle).first();
    if (existingThread) { duplicates.push(handle); continue; }
    const result = await addToQueue(env, { handle, source: "manual" });
    if (result.existed) { duplicates.push(handle); continue; }
    if (result.item?.id) {
      // A profile share has no research or built asset. The default drafted
      // opener claims both, so leave this blank until the operator supplies them.
      await env.DB.prepare("UPDATE outreach_queue SET draft=NULL, updated_at=? WHERE id=?")
        .bind(new Date().toISOString(), result.item.id).run();
      captured += 1;
    }
  }
  return { captured, duplicates, handles };
}
