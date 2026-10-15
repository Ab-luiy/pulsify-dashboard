// The outlier score for a client's OWN videos (founder 2026-10-15: keep the formula, drop the outside library).
// Score = the video's views divided by the median views of the channel's last 30 long-form uploads, the idea vidIQ
// popularised (it does not publish its exact formula). The median, not the average, so one viral video cannot set the bar.
// Nothing here fetches anything from outside: it grades the videos the client's own channel already synced.
export const OUTLIER_FROM = 10;
export const OUTLIER_BADGE = 100;
const SAMPLE = 30;
const MIN_SAMPLE = 12;
const MIN_AGE_DAYS = 3;
const DAY = 86_400_000;

export function median(numbers) {
  const sorted = numbers.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/**
 * Grades every video against the channel's normal. `videos`: [{video_id, views, published_at, duration_seconds}].
 * Returns Map(video_id -> {normal, multiplier, outlier, badge}). Empty when the channel has too few settled
 * long-form uploads to say what normal is; videos under three days old are not graded (their views are still moving).
 */
export function scoreOwnVideos(videos, now = Date.now()) {
  const settled = videos
    .filter((v) => Number(v.duration_seconds) > 75 && now - Date.parse(v.published_at) >= MIN_AGE_DAYS * DAY)
    .sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at))
    .slice(0, SAMPLE);
  const scores = new Map();
  if (settled.length < MIN_SAMPLE) return scores;
  const normal = median(settled.map((v) => Number(v.views) || 0));
  if (normal <= 0) return scores;
  for (const v of videos) {
    if (now - Date.parse(v.published_at) < MIN_AGE_DAYS * DAY) continue;
    const multiplier = Math.round(((Number(v.views) || 0) / normal) * 10) / 10;
    scores.set(v.video_id, { normal: Math.round(normal), multiplier, outlier: multiplier >= OUTLIER_FROM, badge: multiplier >= OUTLIER_BADGE });
  }
  return scores;
}
