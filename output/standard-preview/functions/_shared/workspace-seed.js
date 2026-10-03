// What a new client sees on Plans, To-dos and Team before anyone has typed anything.
// Written once when the workspace is provisioned (INSERT OR IGNORE, so a section the
// operator already wrote is never touched). Plans follow the week-by-week table in
// wiki/playbooks/pulsify-offer-v1.md; to-dos are only what the launch checklist does
// not already cover, so the two never repeat each other.
import { nowIso } from "./common.js";

const DAY = 86400000;

const PHASES = [
  { weeks: [1, 1], title: "Week 1: Game plan and setup", detail: "Game-plan call, account audits, shared workspace, and your brand intake. Your brand brain starts here." },
  { weeks: [2, 2], title: "Week 2: Brand brain and profile", detail: "Your brand brain is filled in, your profile is audited and renovated, and your unique mechanism is named with you." },
  { weeks: [3, 3], title: "Week 3: Content engine", detail: "Research running, your first three video angles approved, and scripts drafted from them." },
  { weeks: [4, 4], title: "Week 4: First two videos", detail: "You shoot. We edit, set the thumbnail pattern and schedule both." },
  { weeks: [5, 5], title: "Week 5: Funnel stack", detail: "Video sales page, application form, booking and your profile link sequence wired together." },
  { weeks: [6, 8], title: "Weeks 6 to 8: Sales support", detail: "Pre-call briefs, proposal templates and CRM updates. Your first sales calls run." },
  { weeks: [9, 11], title: "Weeks 9 to 11: Daily operations", detail: "Comment and DM triage, a dashboard that refreshes daily, and weekly metric reports." },
  { weeks: [12, 12], title: "Week 12: Day-90 review", detail: "Attributable revenue is measured and the next step is agreed. Case-study assets are collected." },
];

const TODOS = [
  { label: "Book your game-plan call", detail: "Week 1 starts with this call. Pick a time that gives us 45 minutes.", owner: "You" },
  { label: "Join the shared workspace", detail: "Accept the invite we send so questions get answered in one place.", owner: "You" },
  { label: "Give us access to your accounts", detail: "Channel and profile access, so we can audit before the game-plan call.", owner: "You" },
  { label: "Choose your two shoot dates", detail: "Week 4 is your first two long-form videos. Block the days now.", owner: "You" },
];

const TEAM = [
  { name: "Pulsify team", role: "Owns your build", current_task: "Setting up your workspace and your first three video angles.", email: "hello@pulsify-ai.com" },
  { name: "Pulsify AI assistant", role: "Drafts for review", current_task: "Writes ideas, titles and openings from your brand brain. Nothing ships until the team has read it." },
];

function dayOffset(start, days) {
  return new Date(start + days * DAY).toISOString().slice(0, 10);
}

export function seedSections(startIso = nowIso()) {
  const start = Date.parse(startIso) || Date.now();
  return {
    plans: PHASES.map((phase, index) => ({
      title: phase.title,
      detail: phase.detail,
      status: index === 0 ? "In progress" : "Queued",
      progress: 0,
      start_date: dayOffset(start, (phase.weeks[0] - 1) * 7),
      end_date: dayOffset(start, phase.weeks[1] * 7 - 1),
    })),
    todos: TODOS.map((item) => ({ ...item, done: false })),
    team: TEAM,
  };
}

export async function seedDashboard(env, clientId, startIso = nowIso()) {
  const now = nowIso();
  const sections = seedSections(startIso);
  for (const [section, value] of Object.entries(sections)) {
    await env.DB.prepare(
      "INSERT OR IGNORE INTO client_dashboard_content (client_id, section, json, updated_at) VALUES (?,?,?,?)",
    ).bind(clientId, section, JSON.stringify(value), now).run();
  }
}
