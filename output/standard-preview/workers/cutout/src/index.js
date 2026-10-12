// POST image bytes, get back a PNG of the foreground (the person, or the main object) with a transparent
// background. Cloudflare Images `segment: "foreground"` through the Images binding; each call is one
// unique transformation (free plan: 5,000 a month). Callers cache the result, so a photo is cut once.
const MAX_BYTES = 15 * 1024 * 1024;

export default {
  async fetch(request, env) {
    if (request.method !== "POST") return new Response("Not found", { status: 404 });
    const size = Number(request.headers.get("content-length") || 0);
    if (size > MAX_BYTES) return new Response("Image too large", { status: 413 });
    try {
      const result = await env.IMAGES.input(request.body).transform({ segment: "foreground" }).output({ format: "image/png" });
      return result.response();
    } catch (error) {
      return new Response(`Cutout failed: ${String(error?.message || error).slice(0, 200)}`, { status: 502 });
    }
  },
};
