// Planned-piece reminders (functions/_shared/content-reminders.js), founder 2026-10-03.
import test from "node:test";
import assert from "node:assert/strict";
import { dueOn, reminderText } from "../functions/_shared/content-reminders.js";

const plan = {
  slots: [
    { id: "a", date: "2026-10-04", time: "14:00", format: "long-form", title: "Why traders blow the account", repeat: "weekly", remind: true },
    { id: "b", date: "2026-10-01", time: "09:00", format: "story", title: "", repeat: "biweekly", remind: true },
    { id: "c", date: "2026-10-18", time: "18:30", format: "reel", title: "", repeat: "none", remind: true },
    { id: "d", date: "2026-10-18", time: "08:00", format: "carousel", title: "", repeat: "none", remind: false },
  ],
};

test("weekly, every-2-weeks and one-off pieces fall on the right days; reminders off stay quiet", () => {
  assert.deepEqual(dueOn(plan, "2026-10-04").map((s) => s.id), ["a"]);
  assert.deepEqual(dueOn(plan, "2026-10-11").map((s) => s.id), ["a"]);
  assert.deepEqual(dueOn(plan, "2026-10-15").map((s) => s.id), ["b"]);
  assert.deepEqual(dueOn(plan, "2026-10-08").map((s) => s.id), []);
  assert.deepEqual(dueOn(plan, "2026-10-18").map((s) => s.id), ["a", "c"]);
  assert.deepEqual(dueOn(plan, "2026-09-27").map((s) => s.id), [], "nothing before the first date");
  assert.deepEqual(dueOn(null, "2026-10-04"), []);
});

test("the reminder reads plainly", () => {
  const one = reminderText(dueOn(plan, "2026-10-04"));
  assert.equal(one.title, "Due today: Long-form video at 14:00");
  assert.equal(one.body, "Working title: Why traders blow the account. Open it on your calendar and press Get started.");
  const two = reminderText(dueOn(plan, "2026-10-18"));
  assert.equal(two.title, "2 pieces due today");
  assert.match(two.body, /^Long-form video at 14:00, Reel at 18:30\./);
});
