// Zernio connection for the operator console.
//   GET  /api/zernio?action=connect     -> 302 to Zernio's hosted Instagram login
//   GET  /api/zernio?action=callback    <- Zernio redirects here with accountId&username; registers the webhook
//   GET  /api/zernio                    status: configured, connected account, webhook, accounts on Zernio
//   POST /api/zernio {action:"disconnect"}   forget the connection locally (Zernio keeps the account until removed there)
import { withOperator } from "../_shared/access.js";
import { json, str } from "../_shared/common.js";
import { resolveOperator } from "../_shared/spine-auth.js";
import { deleteIntegration } from "../_shared/integrations.js";
import { connectUrl, ensureProfile, ensureWebhook, listAccounts, recordConnection, zernioConfigured, zernioConnection } from "../_shared/zernio.js";

const CONSOLE = "/admin?view=integrations";

async function handleGet({ request, env }) {
  const denied = resolveOperator(request, env);
  if (denied.error) return denied.error;
  const url = new URL(request.url);
  const action = str(url.searchParams.get("action"));
  if (!zernioConfigured(env)) {
    if (action) return Response.redirect(`${url.origin}${CONSOLE}&zernio=missing-key`, 302);
    return json({ ok: true, configured: false, connected: false, hint: "Add ZERNIO_API_KEY to the Pages project and the pulsify-sync Worker." });
  }

  if (action === "connect") {
    try {
      const profileId = await ensureProfile(env);
      const { authUrl } = await connectUrl(env, { profileId, redirectUrl: `${url.origin}/api/zernio?action=callback&profileId=${encodeURIComponent(profileId)}` });
      return Response.redirect(authUrl, 302);
    } catch (error) {
      return Response.redirect(`${url.origin}${CONSOLE}&zernio=error&detail=${encodeURIComponent(String(error?.message || error).slice(0, 120))}`, 302);
    }
  }

  if (action === "callback") {
    const accountId = str(url.searchParams.get("accountId"));
    const username = str(url.searchParams.get("username"));
    const profileId = str(url.searchParams.get("profileId"));
    if (!accountId) return Response.redirect(`${url.origin}${CONSOLE}&zernio=error&detail=no-account`, 302);
    let webhookId = "";
    try {
      const secret = env.ZERNIO_WEBHOOK_SECRET || "";
      if (secret && env.SYNC_WORKER_URL) webhookId = await ensureWebhook(env, { url: `${String(env.SYNC_WORKER_URL).replace(/\/$/, "")}/hooks/zernio`, secret });
    } catch { webhookId = ""; }
    await recordConnection(env, { accountId, username, profileId, webhookId });
    return Response.redirect(`${url.origin}${CONSOLE}&zernio=connected`, 302);
  }

  const connection = await zernioConnection(env);
  let accounts = [];
  let error = null;
  try { accounts = await listAccounts(env); } catch (e) { error = String(e?.message || e); }
  return json({
    ok: true,
    configured: true,
    connected: connection.connected,
    account: connection.connected ? { id: connection.account_id, username: connection.username, connected_at: connection.connected_at } : null,
    webhook: { registered: Boolean(connection.webhook_id), id: connection.webhook_id || null, secret_set: Boolean(env.ZERNIO_WEBHOOK_SECRET), worker_url: env.SYNC_WORKER_URL || null },
    accounts,
    error,
  });
}

async function handlePost({ request, env }) {
  const denied = resolveOperator(request, env);
  if (denied.error) return denied.error;
  let body = {};
  try { body = await request.json(); } catch { return json({ ok: false, error: "invalid JSON" }, 400); }
  if (str(body.action) === "disconnect") {
    await deleteIntegration(env, "operator", "", "zernio");
    return json({ ok: true });
  }
  if (str(body.action) === "register-webhook") {
    if (!zernioConfigured(env) || !env.ZERNIO_WEBHOOK_SECRET || !env.SYNC_WORKER_URL) return json({ ok: false, error: "ZERNIO_API_KEY, ZERNIO_WEBHOOK_SECRET and SYNC_WORKER_URL are all required" }, 422);
    const webhookId = await ensureWebhook(env, { url: `${String(env.SYNC_WORKER_URL).replace(/\/$/, "")}/hooks/zernio`, secret: env.ZERNIO_WEBHOOK_SECRET });
    const current = await zernioConnection(env);
    await recordConnection(env, { accountId: current.account_id || "", username: current.username || "", profileId: current.profile_id || "", webhookId });
    return json({ ok: true, webhook_id: webhookId });
  }
  return json({ ok: false, error: "unknown action" }, 422);
}

export const onRequestGet = withOperator(handleGet);
export const onRequestPost = withOperator(handlePost);
