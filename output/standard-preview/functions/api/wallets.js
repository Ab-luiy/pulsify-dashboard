// The wallets clients pay Pulsify to. GET lists them, POST adds one, DELETE ?id= retires one. Operator only.
// Addresses are public; this never stores a private key or seed phrase.
import { withOperator } from "../_shared/access.js";
import { checkAdmin, json } from "../_shared/common.js";
import { listWallets, retireWallet, saveWallet } from "../_shared/receipts.js";

function guard(request, env) {
  const auth = checkAdmin(request, env);
  if (auth) return auth;
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  return null;
}

async function handleGet({ request, env }) {
  const denied = guard(request, env);
  if (denied) return denied;
  return json({ ok: true, wallets: await listWallets(env) });
}

async function handlePost({ request, env }) {
  const denied = guard(request, env);
  if (denied) return denied;
  const result = await saveWallet(env, await request.json().catch(() => ({})));
  return json(result, result.ok ? 200 : 422);
}

async function handleDelete({ request, env }) {
  const denied = guard(request, env);
  if (denied) return denied;
  return json(await retireWallet(env, new URL(request.url).searchParams.get("id")));
}

export const onRequestGet = withOperator(handleGet);
export const onRequestPost = withOperator(handlePost);
export const onRequestDelete = withOperator(handleDelete);
