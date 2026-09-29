// Cash by video (pulsify-saas #36): each client's public YouTube uploads and
// one tracked link per video. Runs with the 30-minute cron; the shared module
// only touches clients that are new or were last synced over 6 hours ago.
import { syncClientVideos } from "../../../../functions/_shared/video-cash.js";

export function syncClientVideosJob(env) {
  return syncClientVideos(env);
}
