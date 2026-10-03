// Planned-piece reminders (founder 2026-10-03): the client plans pieces on the portal
// Content calendar (workspace preference `content-plan`, written by pulsify-saas
// src/features/content/planner-screen.tsx). Once each morning the sync worker sends one
// notification per client listing what is due today; notify() routes it to the bell and
// to email, Discord or Slack when the client switched those on.
import { notify } from "./notifications.js";

const DAY = 86_400_000;
const FORMATS = {
  "long-form": "Long-form video",
  short: "Short",
  reel: "Reel",
  story: "Story sequence",
  carousel: "Carousel",
};

const isoTime = (iso) => Date.parse(`${iso}T00:00:00Z`);

/** Slots from a stored plan that show on `day` and want a reminder (same rules as plan-model.ts). */
export function dueOn(plan, day) {
  const slots = Array.isArray(plan?.slots) ? plan.slots : [];
  return slots
    .filter((slot) => slot && slot.remind !== false && /^\d{4}-\d{2}-\d{2}$/.test(String(slot.date)) && slot.date <= day)
    .filter((slot) => {
      if (slot.repeat === "weekly" || slot.repeat === "biweekly") {
        const step = slot.repeat === "weekly" ? 7 : 14;
        return Math.round((isoTime(day) - isoTime(slot.date)) / DAY) % step === 0;
      }
      return slot.date === day;
    })
    .sort((a, b) => String(a.time).localeCompare(String(b.time)));
}

export function reminderText(slots) {
  const parts = slots.map((slot) => `${FORMATS[slot.format] || "Piece"} at ${/^\d{2}:\d{2}$/.test(String(slot.time)) ? slot.time : "any time"}`);
  const titles = slots.map((slot) => String(slot.title || "").trim()).filter(Boolean);
  const lines = [];
  if (slots.length > 1) lines.push(`${parts.join(", ")}.`);
  if (titles.length) lines.push(`Working title${titles.length === 1 ? "" : "s"}: ${titles.join("; ")}.`);
  lines.push("Open it on your calendar and press Get started.");
  return { title: slots.length === 1 ? `Due today: ${parts[0]}` : `${slots.length} pieces due today`, body: lines.join(" ") };
}

export async function contentReminders(env, now = Date.now()) {
  if (!env?.DB) return { sent: 0 };
  const day = new Date(now).toISOString().slice(0, 10);
  const rows = await env.DB.prepare(
    `SELECT p.client_id, p.value_json FROM workspace_preferences p
       JOIN client_config c ON c.client = p.client_id
      WHERE p.key = 'content-plan' AND COALESCE(c.status, '') NOT IN ('archived', 'demo')`,
  ).all().catch(() => ({ results: [] }));
  let sent = 0;
  for (const row of rows.results || []) {
    let plan = null;
    try { plan = JSON.parse(row.value_json); } catch { continue; }
    const due = dueOn(plan, day);
    if (!due.length) continue;
    const text = reminderText(due);
    const id = await notify(env, {
      scope: "client",
      clientId: row.client_id,
      kind: "content",
      severity: "info",
      title: text.title,
      body: text.body,
      link: "content",
      dedupeKey: `content-due:${row.client_id}:${day}`,
    }).catch(() => null);
    if (id) sent += 1;
  }
  return { sent };
}
