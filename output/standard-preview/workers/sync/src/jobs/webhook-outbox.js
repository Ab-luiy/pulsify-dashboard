// Every minute: fan out new outbox events into per-endpoint deliveries, then
// deliver everything that is due. Retries are scheduled by deliverDue itself.
import { deliverDue, fanOut } from "../../../../functions/_shared/outbound-webhooks.js";

export async function sweepWebhooks(env) {
  // Housekeeping: rate-limit buckets are only meaningful for one minute.
  const cutoff = new Date(Date.now() - 2 * 3600 * 1000).toISOString().slice(0, 16);
  await env.DB.prepare("DELETE FROM api_key_usage WHERE bucket < ?").bind(cutoff).run().catch(() => null);
  const created = await fanOut(env);
  const result = await deliverDue(env);
  return created + result.delivered;
}
