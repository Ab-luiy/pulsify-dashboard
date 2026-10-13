// AI thumbnail backgrounds (founder 2026-10-13: "the thumbnail designer has to be an AI generator ... nobody does
// thumbnails anymore, everybody does it with AI"). The model draws the scene only: no person and no words.
// The client's real photo goes on top as a cutout (media-cutout.js) and the words are set by the editor,
// because the image model changes faces and misspells text (tested 2026-10-13 on flux-2-klein-4b).
//   POST {idea, scene?, side?: "left"|"right"} -> {ok, scene, images: ["/m/<client>/<uuid>.jpg", ...]}
// Without a scene, a small text model first turns the video idea into a picture-only description: given the
// title itself, the image model paints the title as misspelled words. The scene comes back so the client can
// change it and draw again. Two options per request, drawn at once; each image is about 100 Workers AI neurons
// (free plan: 10,000 a day for the whole account), so a client gets THUMBNAILS_PER_DAY requests a day.
import { json } from "../_shared/common.js";
import { resolveClientAccess } from "../_shared/client-auth.js";
import { takeAllowance } from "../_shared/usage.js";

export const THUMBNAIL_MODEL = "@cf/black-forest-labs/flux-2-klein-4b";
export const SCENE_MODEL = "@cf/meta/llama-3.2-3b-instruct";
const THUMBNAILS_PER_DAY = 15;
const OPTIONS = 2;

const clean = (value, max) => String(value ?? "").replace(/[\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

const SCENE_SYSTEM =
  "You describe the background photo for a YouTube thumbnail. Reply with one sentence of at most 35 words: the setting, " +
  "one or two physical objects, dramatic light and bold contrasting colours. Never mention people, faces, hands, words, " +
  "letters, numbers, signs, logos or the video title. No quotes.";

/** One picture-only sentence for the idea, from a small fast model. Falls back to a plain dark studio scene. */
export async function describeScene(env, idea) {
  try {
    const result = await env.AI.run(SCENE_MODEL, {
      messages: [
        { role: "system", content: SCENE_SYSTEM },
        { role: "user", content: `Video: ${idea}` },
      ],
      max_tokens: 90,
    });
    const text = clean(result?.response, 400).replace(/^["']|["']$/g, "");
    if (text) return text;
  } catch {
    // fall through to the plain scene
  }
  return "A dark studio with one bold coloured rim light and a soft glow behind, deep shadows, cinematic contrast";
}

/** The image prompt: the scene, with room for the person and the words. */
export function scenePrompt({ scene, side }) {
  const person = side === "left" ? "left" : "right";
  const words = person === "left" ? "right" : "left";
  return [
    "YouTube thumbnail background, 16:9, photographic, sharp and high contrast.",
    `${scene.replace(/\.$/, "")}.`,
    `Keep the ${person} third of the frame simple and slightly darker.`,
    `Keep the ${words} half calm and uncluttered.`,
    "No people, no faces, no hands. No text, no letters, no numbers, no logos, no watermark.",
    "Bold lighting, one clear focal object, rich colour.",
  ].join(" ");
}

async function drawOne(env, prompt) {
  const form = new FormData();
  form.append("prompt", prompt);
  form.append("width", "1280");
  form.append("height", "720");
  const result = await env.AI.run(THUMBNAIL_MODEL, { multipart: { body: form, contentType: "multipart/form-data" } });
  const base64 = result?.image;
  if (!base64) throw new Error("no image");
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

export async function onRequestPost({ request, env }) {
  const access = await resolveClientAccess(request, env, { allowHeaderToken: true, allowQueryToken: false });
  if (access.error) return access.error;
  if (access.impersonated) return json({ ok: false, error: "Operator preview is read-only." }, 403);
  if (!env.AI || !env.MEDIA) return json({ ok: false, error: "Thumbnails are not set up on this server." }, 503);

  const body = await request.json().catch(() => ({}));
  const idea = clean(body.idea, 300);
  let scene = clean(body.scene, 400);
  if (!idea && !scene) return json({ ok: false, error: "Say what the video is about first." }, 422);
  const client = String(access.client).toLowerCase();
  if (env.DB && !(await takeAllowance(env, client, "thumbnail", THUMBNAILS_PER_DAY))) {
    return json({ ok: false, error: `That is today's ${THUMBNAILS_PER_DAY} thumbnail runs. More tomorrow.` }, 429);
  }

  if (!scene) scene = await describeScene(env, idea);
  const prompt = scenePrompt({ scene, side: body.side });
  const drawn = await Promise.allSettled(Array.from({ length: OPTIONS }, () => drawOne(env, prompt)));
  const images = [];
  for (const result of drawn) {
    if (result.status !== "fulfilled") continue;
    const key = `${client}/${crypto.randomUUID()}.jpg`;
    await env.MEDIA.put(key, result.value, { httpMetadata: { contentType: "image/jpeg", cacheControl: "public, max-age=31536000, immutable" } });
    images.push(`/m/${key}`);
  }
  if (!images.length) {
    const flagged = drawn.some((result) => /flagged/i.test(String(result.reason?.message || "")));
    return json({ ok: false, error: flagged ? "The image model refused that background. Describe it differently." : "The background did not come out. Try again." }, 502);
  }
  return json({ ok: true, scene, images });
}
