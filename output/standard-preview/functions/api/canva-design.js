// Send a carousel to the client's Canva and bring it back (founder 2026-10-13). See _shared/canva.js.
//   POST /api/canva-design?action=import&carousel=ID   body: the .pptx bytes from the editor
//        -> {ok, edit_url, design_id}   (the design is remembered on the carousel's params)
//   POST /api/canva-design?action=export&carousel=ID   -> {ok, urls: ["/m/<client>/<uuid>.png", ...]}
//        the Canva design exported as 1080x1350 PNGs and stored in the client's media
import { json, nowIso, parseJson } from "../_shared/common.js";
import { resolveClientAccess } from "../_shared/client-auth.js";
import { canvaFetch, canvaToken, waitForJob } from "../_shared/canva.js";

const PPTX = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
const MAX_BYTES = 40 * 1024 * 1024;

async function ownedCarousel(env, id, client) {
  const row = await env.DB.prepare("SELECT id, client_id, topic, status, params_json FROM studio_carousels WHERE id=?").bind(id).first();
  return row && String(row.client_id).toLowerCase() === String(client).toLowerCase() ? row : null;
}

export async function onRequestPost({ request, env }) {
  const access = await resolveClientAccess(request, env, { allowHeaderToken: true, allowQueryToken: false });
  if (access.error) return access.error;
  if (access.impersonated) return json({ ok: false, error: "Operator preview is read-only." }, 403);
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const url = new URL(request.url);
  const action = url.searchParams.get("action");
  const row = await ownedCarousel(env, Number(url.searchParams.get("carousel") || 0), access.client);
  if (!row) return json({ ok: false, error: "That carousel is not in your account." }, 404);

  let token;
  try {
    token = await canvaToken(env, access.client);
  } catch {
    token = null;
  }
  if (!token) return json({ ok: false, error: "Connect Canva first.", connect: true }, 409);
  const params = parseJson(row.params_json, {});

  try {
    if (action === "import") {
      const size = Number(request.headers.get("content-length") || 0);
      if (size > MAX_BYTES) return json({ ok: false, error: "This carousel is too large to send to Canva." }, 413);
      const title = String(row.topic || "Pulsify carousel").slice(0, 50);
      const started = await canvaFetch(token, "/imports", {
        method: "POST",
        headers: {
          "content-type": "application/octet-stream",
          "import-metadata": JSON.stringify({ title_base64: btoa(unescape(encodeURIComponent(title))), mime_type: PPTX }),
        },
        body: request.body,
      });
      const job = started?.job?.status === "success" ? started.job : await waitForJob(token, `/imports/${started?.job?.id}`);
      const design = job?.result?.designs?.[0];
      if (!design?.urls?.edit_url) return json({ ok: false, error: "Canva did not return a design." }, 502);
      params.canva = { design_id: design.id, edit_url: design.urls.edit_url, sent_at: nowIso() };
      await env.DB.prepare("UPDATE studio_carousels SET params_json=?, updated_at=? WHERE id=?").bind(JSON.stringify(params), nowIso(), row.id).run();
      // correlation_state brings the client back to this carousel when they press Return in Canva.
      const edit = new URL(design.urls.edit_url);
      edit.searchParams.set("correlation_state", `c${row.id}`);
      return json({ ok: true, edit_url: edit.toString(), design_id: design.id });
    }

    if (action === "export") {
      const designId = params?.canva?.design_id;
      if (!designId) return json({ ok: false, error: "Send this carousel to Canva first." }, 409);
      if (!env.MEDIA) return json({ ok: false, error: "no media bucket bound" }, 500);
      const started = await canvaFetch(token, "/exports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ design_id: designId, format: { type: "png", width: 1080, height: 1350 } }),
      });
      const job = started?.job?.status === "success" ? started.job : await waitForJob(token, `/exports/${started?.job?.id}`);
      const urls = [];
      for (const link of (job?.urls || []).slice(0, 20)) {
        const image = await fetch(link);
        if (!image.ok) continue;
        const key = `${access.client}/${crypto.randomUUID()}.png`;
        await env.MEDIA.put(key, image.body, { httpMetadata: { contentType: "image/png", cacheControl: "public, max-age=31536000, immutable" } });
        urls.push(`/m/${key}`);
      }
      if (!urls.length) return json({ ok: false, error: "Canva did not return any slides." }, 502);
      params.canva = { ...params.canva, returned_at: nowIso(), pages: urls.length };
      await env.DB.prepare("UPDATE studio_carousels SET params_json=?, updated_at=? WHERE id=?").bind(JSON.stringify(params), nowIso(), row.id).run();
      return json({ ok: true, urls });
    }
  } catch (error) {
    if (error?.status === 401) return json({ ok: false, error: "Canva needs you to sign in again.", connect: true }, 409);
    return json({ ok: false, error: String(error?.message || "Canva could not finish this.").slice(0, 300) }, 502);
  }
  return json({ ok: false, error: "unknown action" }, 422);
}
