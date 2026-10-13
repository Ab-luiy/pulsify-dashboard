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
import { buildGeneratorBrainContext, loadClientBrainData } from "../_shared/client-brain-context.js";

export const THUMBNAIL_MODEL = "@cf/black-forest-labs/flux-2-klein-4b";
export const SCENE_MODEL = "@cf/meta/llama-3.2-3b-instruct";
const THUMBNAILS_PER_DAY = 15;
const OPTIONS = 2;

const clean = (value, max) => String(value ?? "").replace(/[\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

const SCENE_SYSTEM = [
  "You describe the background photo for a YouTube thumbnail. Show the world of the video literally: the real objects and place a viewer links to its topic and niche (for trading: chart screens, a desk, candles on a monitor; for fitness: a gym, weights). No metaphors, no nature, no boats, no forests unless the video is about them.",
  "Reply with one sentence of at most 35 words: the place, one or two objects, dramatic light and bold contrasting colours. Never mention people, faces, hands, words, letters, numbers, signs or logos. No quotes.",
  "",
  "Examples:",
  "Niche: trading. Video: My biggest losing trade -> A dark trading desk with a monitor full of red falling candles, a cold coffee beside the keyboard, harsh red light against deep blue shadows.",
  "Niche: fitness coaching. Video: Why you are not losing fat -> An empty gym at night, a single barbell on the floor under one hard white spotlight, teal and orange contrast.",
].join("\n");

/** One picture-only sentence for the idea, from a small fast model. Falls back to a plain dark studio scene. */
export async function describeScene(env, idea, niche = "") {
  try {
    const result = await env.AI.run(SCENE_MODEL, {
      messages: [
        { role: "system", content: SCENE_SYSTEM },
        { role: "user", content: `Niche: ${niche || "online education"}. Video: ${idea}` },
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

/** A short line on what the client does, from their brain, so the scene shows their world. */
async function nicheOf(env, client) {
  if (!env.DB) return "";
  const brain = await loadClientBrainData(env, client).catch(() => null);
  return clean(buildGeneratorBrainContext(brain).prompt_text, 300);
}

async function drawOne(env, prompt) {
  const form = new FormData();
  form.append("prompt", prompt);
  form.append("width", "1280");
  form.append("height", "720");
  // The form goes as a stream with its own content type, which carries the multipart boundary.
  const encoded = new Response(form);
  const result = await env.AI.run(THUMBNAIL_MODEL, { multipart: { body: encoded.body, contentType: encoded.headers.get("content-type") } });
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

  if (!scene) scene = await describeScene(env, idea, await nicheOf(env, client));
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
