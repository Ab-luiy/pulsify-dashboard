import { getMedia } from "../_shared/media-storage.js";

export async function onRequestGet({ env, params }) {
  if (!env.DB) return text("database unavailable", 500);

  const id = String(params.id || "");
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) return text("media not found", 404);

  const media = await getMedia(env, id);
  if (!media) return text("media not found", 404);

  return new Response(media.bytes, {
    status: 200,
    headers: {
      "content-type": media.content_type,
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}

function text(message, status) {
  return new Response(message, {
    status,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
