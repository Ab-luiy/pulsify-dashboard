// Reading a YouTube address (pulsify-saas #72). A pasted address is a video, a channel or a playlist.
// Nothing here calls YouTube; titles are looked up in tracked-links.js.

const HOSTS = new Set([
  "youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com",
  "youtu.be", "www.youtu.be", "youtube-nocookie.com", "www.youtube-nocookie.com",
]);
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const CHANNEL_ID = /^UC[A-Za-z0-9_-]{22}$/;

export function isYouTubeHost(hostname) {
  return HOSTS.has(String(hostname || "").toLowerCase());
}

function withScheme(raw) {
  const text = String(raw ?? "").trim();
  return /^https?:\/\//i.test(text) ? text : `https://${text}`;
}

export function isYouTubeAddress(raw) {
  try {
    return isYouTubeHost(new URL(withScheme(raw)).hostname);
  } catch {
    return false;
  }
}

/**
 * -> null when it is not a YouTube address, otherwise
 *    { kind: "video", id, url } | { kind: "channel", handle?, channelId?, name?, url } |
 *    { kind: "playlist", id, url } | { kind: "other", url }
 * `url` is the clean address (tracking bits such as ?si= are dropped; a start time is kept).
 */
export function parseYouTubeUrl(raw) {
  let url;
  try {
    url = new URL(withScheme(raw));
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  if (!isYouTubeHost(host)) return null;
  const parts = url.pathname.split("/").filter(Boolean);

  let id = "";
  if (host === "youtu.be" || host === "www.youtu.be") id = parts[0] || "";
  else if (parts[0] === "watch") id = url.searchParams.get("v") || "";
  else if (["shorts", "live", "embed", "v"].includes(parts[0])) id = parts[1] || "";
  if (id) {
    if (!VIDEO_ID.test(id)) return { kind: "other", url: url.toString() };
    const start = /^(\d{1,6})s?$/.exec(url.searchParams.get("t") || url.searchParams.get("start") || "");
    return { kind: "video", id, url: `https://www.youtube.com/watch?v=${id}${start ? `&t=${start[1]}s` : ""}` };
  }

  if (/^@[\w.-]{3,100}$/.test(parts[0] || "")) {
    return { kind: "channel", handle: parts[0].slice(1), url: `https://www.youtube.com/${parts[0]}` };
  }
  if (parts[0] === "channel" && CHANNEL_ID.test(parts[1] || "")) {
    return { kind: "channel", channelId: parts[1], url: `https://www.youtube.com/channel/${parts[1]}` };
  }
  if ((parts[0] === "c" || parts[0] === "user") && /^[\w.-]{2,100}$/.test(parts[1] || "")) {
    return { kind: "channel", name: parts[1], url: `https://www.youtube.com/${parts[0]}/${parts[1]}` };
  }
  const list = url.searchParams.get("list") || "";
  if (parts[0] === "playlist" && /^[\w-]{10,64}$/.test(list)) {
    return { kind: "playlist", id: list, url: `https://www.youtube.com/playlist?list=${list}` };
  }
  return { kind: "other", url: url.toString() };
}

// A name for the link when YouTube can't tell us the title.
export function fallbackLabel(parsed) {
  if (parsed.kind === "video") return `YouTube video ${parsed.id}`;
  if (parsed.kind === "channel") return `YouTube channel ${parsed.handle ? `@${parsed.handle}` : parsed.name || parsed.channelId}`;
  if (parsed.kind === "playlist") return "YouTube playlist";
  return "YouTube link";
}
