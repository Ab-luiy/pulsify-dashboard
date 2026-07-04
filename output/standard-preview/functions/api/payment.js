import { checkAdmin, json } from "../_shared/common.js";
import { optionsResponse } from "../_shared/integrations.js";
import { normalizedPaymentFromManual, processNormalizedPayment } from "../_shared/payments.js";

export async function onRequestPost({ request, env }) {
  const auth = checkAdmin(request, env);
  if (auth) return auth;
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);

  const body = await request.json().catch(() => ({}));
  const normalized = normalizedPaymentFromManual(body, new URL(request.url).origin);
  const result = await processNormalizedPayment(env, normalized);
  const status = result.ok ? 200 : 422;
  return json(result, status);
}

export async function onRequestOptions() {
  return optionsResponse("POST, OPTIONS");
}
