// Search indexer: one bounded pass per minute. Embeds new DMs and changed
// brain fields into Vectorize. Backfill drains at BATCH per minute, then it
// is only ever a handful of new messages.
import { indexPending } from "../../../../functions/_shared/search.js";

export async function syncSearchIndex(env) {
  const result = await indexPending(env);
  return result.indexed || 0;
}
