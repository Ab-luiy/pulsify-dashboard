// Every minute: fan out new outbox events into per-endpoint deliveries, then
// deliver everything that is due. Retries are scheduled by deliverDue itself.
import { deliverDue, fanOut } from "../../../../functions/_shared/outbound-webhooks.js";

export async function sweepWebhooks(env) {
  const created = await fanOut(env);
  const result = await deliverDue(env);
  return created + result.delivered;
}
