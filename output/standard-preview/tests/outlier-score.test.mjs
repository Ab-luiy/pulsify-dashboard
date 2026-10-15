// The outlier score for a client's own videos: views / the median of the channel's last 30 long-form uploads.
import test from "node:test";
import assert from "node:assert/strict";
import { median, scoreOwnVideos } from "../functions/_shared/outlier-score.js";

const NOW = Date.parse("2026-10-15T12:00:00Z");
const DAY = 86_400_000;
const video = (n, views, extra = {}) => ({ video_id: `v${n}`, views, published_at: new Date(NOW - (n + 5) * DAY).toISOString(), duration_seconds: 900, ...extra });
const channel = (hit) => [...Array.from({ length: 20 }, (_, n) => video(n + 1, 8_000 + n * 100)), video(30, hit)];

test("the median is the channel's normal, not skewed by one hit", () => {
  assert.equal(median([8000, 8100, 8200, 9_000_000]), 8150);
  assert.equal(median([]), 0);
});

test("a video is graded against its own channel and badged at 100x", () => {
  const scores = scoreOwnVideos(channel(1_200_000), NOW);
  const hit = scores.get("v30");
  assert.equal(hit.outlier, true);
  assert.equal(hit.badge, true);
  assert.ok(hit.multiplier > 100);
  assert.equal(scores.get("v1").outlier, false);
  const mid = scoreOwnVideos(channel(120_000), NOW).get("v30");
  assert.equal(mid.outlier, true);
  assert.equal(mid.badge, false);
});

test("no score when the channel is too small to know normal, and none for fresh uploads or shorts as the bar", () => {
  assert.equal(scoreOwnVideos(channel(1_200_000).slice(0, 8), NOW).size, 0);
  const fresh = scoreOwnVideos([...channel(1_200_000), video(0, 50_000, { published_at: new Date(NOW - DAY).toISOString() })], NOW);
  assert.equal(fresh.has("v0"), false);
  const withShorts = scoreOwnVideos([...channel(1_200_000), ...Array.from({ length: 40 }, (_, n) => video(n + 40, 1, { duration_seconds: 30 }))], NOW);
  assert.equal(withShorts.get("v30").outlier, true);
});
