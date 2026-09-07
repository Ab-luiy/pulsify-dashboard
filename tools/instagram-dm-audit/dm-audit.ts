// dm-audit.ts — READ-ONLY. Pulls the IG DM inbox via Composio, classifies every
// thread by who spoke last, writes dm-audit.json. Sends nothing, marks nothing seen.
//
// Usage: npx tsx dm-audit.ts [maxThreads]

import "dotenv/config";
import { Composio } from "@composio/core";
import { writeFileSync } from "node:fs";

const USER_ID = process.env.COMPOSIO_USER_ID ?? "owner";
const SELF_USERNAME = "ab.luiy";
const MAX_THREADS = Number(process.argv[2] ?? 60);

type Session = Awaited<ReturnType<Composio["create"]>>;
const log = (...a: unknown[]) => console.log(...a);

async function exec(session: Session, slug: string, args: Record<string, unknown>) {
  const res = (await session.execute(slug, args)) as { error?: unknown; data?: any };
  if (res.error) throw new Error(`${slug}: ${JSON.stringify(res.error)}`);
  return res.data;
}

function unwrap(d: any): any[] {
  if (!d) return [];
  if (Array.isArray(d)) return d;
  if (Array.isArray(d.data)) return d.data;
  if (d.data && Array.isArray(d.data.data)) return d.data.data;
  return [];
}

async function main() {
  const composio = new Composio({ apiKey: process.env.COMPOSIO_API_KEY!.trim() });
  const session: Session = await composio.create(USER_ID, {
    toolkits: ["instagram"],
    manageConnections: true,
  });
  log(`session ${session.sessionId}`);

  // Paginate with the cursor from this same response chain only (known pitfall:
  // reusing a cursor across endpoints throws 500 OAuthException).
  const convos: any[] = [];
  let after: string | undefined;
  while (convos.length < MAX_THREADS) {
    const args: Record<string, unknown> = { limit: 25, fields: "id,participants,updated_time" };
    if (after) args.after = after;
    const page: any = await exec(session, "INSTAGRAM_LIST_ALL_CONVERSATIONS", args);
    const items = unwrap(page);
    if (!items.length) break;
    convos.push(...items);
    after = page?.data?.paging?.cursors?.after ?? page?.paging?.cursors?.after;
    if (!after) break;
  }
  log(`threads: ${convos.length}`);

  let selfId = "";
  const out: any[] = [];

  for (const conv of convos.slice(0, MAX_THREADS)) {
    const cid = conv.id ?? conv.conversation_id;
    if (!cid) continue;

    let raw: any[] = [];
    try {
      raw = unwrap(
        await exec(session, "INSTAGRAM_LIST_ALL_MESSAGES", {
          conversation_id: cid,
          limit: 30,
          fields: "id,created_time,from,to,message",
        })
      );
    } catch (e) {
      out.push({ conversation_id: cid, error: String(e) });
      continue;
    }

    // Self id is whichever participant carries our username. Learn it once.
    if (!selfId) {
      for (const m of raw) {
        if (m.from?.username === SELF_USERNAME) { selfId = String(m.from.id); break; }
        const t = (m.to?.data ?? []).find((x: any) => x.username === SELF_USERNAME);
        if (t) { selfId = String(t.id); break; }
      }
      if (selfId) log(`self id resolved: ${selfId} (${SELF_USERNAME})`);
    }

    const msgs = raw
      .map((m: any) => ({
        from_id: String(m.from?.id ?? ""),
        from_username: m.from?.username ?? "",
        text: (m.message ?? "").trim(),
        at: m.created_time ?? "",
      }))
      .sort((a, b) => String(b.at).localeCompare(String(a.at)));

    // The other party: any username in this thread that is not ours.
    let handle = "";
    for (const m of raw) {
      if (m.from?.username && m.from.username !== SELF_USERNAME) { handle = m.from.username; break; }
      const t = (m.to?.data ?? []).find((x: any) => x.username && x.username !== SELF_USERNAME);
      if (t) { handle = t.username; break; }
    }

    const lastOut = msgs.find((m) => m.from_id === selfId) ?? null;
    const lastIn = msgs.find((m) => m.from_id && m.from_id !== selfId) ?? null;
    const last = msgs[0] ?? null;

    let state = "unknown";
    if (last) {
      if (!lastOut) state = "inbound-only";                    // they wrote first, we never replied
      else if (!lastIn) state = "delivered-no-reply";          // we wrote, they never once replied
      else if (last.from_id === selfId) state = "we-spoke-last"; // they replied, then we spoke, then silence
      else state = "awaiting-us";                              // ball is in our court
    }

    const daysSince = last?.at
      ? Math.floor((Date.now() - Date.parse(last.at)) / 86400000)
      : null;

    out.push({
      conversation_id: cid,
      handle,
      state,
      days_since_last: daysSince,
      message_count: msgs.length,
      last_message_at: last?.at ?? "",
      last_message_from: last?.from_username ?? "",
      last_outbound_at: lastOut?.at ?? "",
      last_outbound_text: lastOut?.text ?? "",
      last_inbound_at: lastIn?.at ?? "",
      last_inbound_text: lastIn?.text ?? "",
      messages: msgs,
    });
    log(`  ${(handle || cid).padEnd(24)} ${state.padEnd(18)} ${msgs.length} msgs  ${daysSince}d`);
  }

  writeFileSync(
    "dm-audit.json",
    JSON.stringify({ self: { id: selfId, username: SELF_USERNAME }, pulled_at: new Date().toISOString(), threads: out }, null, 2)
  );
  log(`\nwrote dm-audit.json (${out.length} threads)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
