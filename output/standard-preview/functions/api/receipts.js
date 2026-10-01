// GET /api/receipts -> every receipt and the total received. POST -> record a crypto payment and issue its
// receipt in one step (a receipt means a payment was received). Operator only.
import { withOperator } from "../_shared/access.js";
import { checkAdmin, json } from "../_shared/common.js";
import { issueReceipt, listReceipts } from "../_shared/receipts.js";

async function handleGet({ request, env }) {
  const auth = checkAdmin(request, env);
  if (auth) return auth;
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  return json({ ok: true, ...(await listReceipts(env, new URL(request.url).origin)) });
}

async function handlePost({ request, env, data }) {
  const auth = checkAdmin(request, env);
  if (auth) return auth;
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const body = await request.json().catch(() => ({}));
  const result = await issueReceipt(env, { ...body, issuedBy: data?.operator?.email || "operator" }, new URL(request.url).origin);
  return json(result, result.ok ? 200 : 422);
}

export const onRequestGet = withOperator(handleGet);
export const onRequestPost = withOperator(handlePost);
