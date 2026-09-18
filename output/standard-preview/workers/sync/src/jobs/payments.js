// Every 30 minutes: any charge without a confirmed or suggested match gets a
// fresh ranking pass. Covers payments that arrived before their lead did.
import { matchPayment } from "../../../../functions/_shared/payment-matching.js";

export async function rematchPayments(env) {
  const rows = await env.DB.prepare(
    `SELECT p.id, p.client, p.customer_email, p.customer_name, p.occurred_at
       FROM payments p
      WHERE p.kind='charge' AND p.occurred_at >= datetime('now','-90 days')
        AND NOT EXISTS (SELECT 1 FROM payment_matches m WHERE m.payment_id=p.id AND m.status IN ('confirmed','suggested'))
      ORDER BY p.occurred_at DESC LIMIT 200`,
  ).all();
  let touched = 0;
  for (const payment of rows.results || []) {
    const result = await matchPayment(env, payment).catch(() => null);
    if (result && (result.confirmed || result.suggested)) touched += 1;
  }
  return touched;
}
