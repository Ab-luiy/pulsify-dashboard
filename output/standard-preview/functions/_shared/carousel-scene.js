/*
 * The carousel editor's scene (pulsify-saas src/features/carousel-editor/scene.ts, founder 2026-10-13:
 * "something like Canva where you can edit it freely"). Saved on studio_carousels.output_json as
 * `scene`. The browser renders it as DOM, so every value is checked here with the same rules as the
 * client: colours by pattern, fonts by allowlist, images by URL rule, numbers clamped, sizes capped.
 * Anything else is dropped, never stored.
 */

const MAX_BYTES = 400_000;
const FONTS = new Set(["inter-tight", "geist", "manrope", "space-grotesk", "sora", "montserrat", "poppins", "archivo", "bricolage", "archivo-black", "anton", "bebas-neue", "oswald", "doto", "instrument-serif", "dm-serif", "playfair", "cormorant", "caveat", "marker", "mono"]);
const COLOR = /^(#[0-9a-f]{3,4}|#[0-9a-f]{6}|#[0-9a-f]{8}|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*(0|1|0?\.\d+)\s*)?\)|transparent)$/i;
const W = 1080;
const H = 1350;

const isColor = (value) => typeof value === "string" && COLOR.test(value.trim());
const color = (value, fallback) => (isColor(value) ? value.trim() : fallback);
const clamp = (value, min, max, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
const id = (value, fallback) => (typeof value === "string" && /^[\w-]{1,40}$/.test(value) ? value : fallback);

export function safeSceneSrc(value) {
  const url = String(value ?? "").trim();
  if (url.length > 600) return "";
  if (/^\/m\/[\w./%-]+$/.test(url) && !url.includes("..")) return url;
  if (/^\/app\/[\w./%-]+$/.test(url) && !url.includes("..")) return url;
  if (/^https:\/\/[\w.-]+\/[\w./%?=&,:+-]*$/.test(url)) return url;
  return "";
}

function run(value) {
  if (!value || typeof value.t !== "string") return null;
  const out = { t: value.t.slice(0, 2000) };
  if (value.b) out.b = true;
  if (value.i) out.i = true;
  if (value.u) out.u = true;
  if (isColor(value.color)) out.color = value.color.trim();
  if (isColor(value.hl)) out.hl = value.hl.trim();
  return out;
}

function fill(value) {
  if (!value || typeof value !== "object") return null;
  if (value.type === "solid") return isColor(value.color) ? { type: "solid", color: value.color.trim() } : null;
  if (value.type === "linear" && Array.isArray(value.stops)) {
    const stops = value.stops.slice(0, 6).filter((stop) => isColor(stop?.color)).map((stop) => ({ color: stop.color.trim(), at: clamp(stop.at, 0, 100, 0) }));
    return stops.length >= 2 ? { type: "linear", angle: clamp(value.angle, -360, 360, 180), stops } : null;
  }
  return null;
}

function layer(value, index) {
  if (!value || typeof value !== "object") return null;
  const base = {
    id: id(value.id, `l${index}`),
    ...(typeof value.name === "string" ? { name: value.name.slice(0, 60) } : {}),
    x: clamp(value.x, -W * 2, W * 3, 0),
    y: clamp(value.y, -H * 2, H * 3, 0),
    w: clamp(value.w, 4, W * 4, 200),
    h: clamp(value.h, 4, H * 4, 200),
    rotation: clamp(value.rotation, -360, 360, 0),
    opacity: clamp(value.opacity, 0, 1, 1),
    ...(value.locked ? { locked: true } : {}),
    ...(value.hidden ? { hidden: true } : {}),
  };
  if (value.kind === "text") {
    const runs = (Array.isArray(value.runs) ? value.runs : []).slice(0, 200).map(run).filter(Boolean);
    const box = value.box;
    return {
      ...base,
      kind: "text",
      runs: runs.length ? runs : [{ t: "" }],
      font: FONTS.has(value.font) ? value.font : "inter-tight",
      size: clamp(value.size, 8, 600, 64),
      weight: clamp(value.weight, 100, 900, 700),
      ...(value.italic ? { italic: true } : {}),
      lineHeight: clamp(value.lineHeight, 0.6, 3, 1.1),
      tracking: clamp(value.tracking, -0.2, 0.6, 0),
      align: value.align === "center" || value.align === "right" ? value.align : "left",
      color: color(value.color, "#ffffff"),
      ...(value.uppercase ? { uppercase: true } : {}),
      ...(value.shadow ? { shadow: true } : {}),
      ...(box && isColor(box.color) ? { box: { color: box.color.trim(), padX: clamp(box.padX, 0, 200, 24), padY: clamp(box.padY, 0, 200, 12), radius: clamp(box.radius, 0, 400, 12) } } : {}),
    };
  }
  if (value.kind === "image") {
    const src = safeSceneSrc(value.src);
    if (!src) return null;
    const border = value.border;
    return {
      ...base,
      kind: "image",
      src,
      fx: clamp(value.fx, 0, 1, 0.5),
      fy: clamp(value.fy, 0, 1, 0.5),
      zoom: clamp(value.zoom, 1, 6, 1),
      radius: clamp(value.radius, 0, 2000, 0),
      brightness: clamp(value.brightness, 0, 2, 1),
      contrast: clamp(value.contrast, 0, 2, 1),
      saturate: clamp(value.saturate, 0, 2, 1),
      ...(value.flip ? { flip: true } : {}),
      ...(border && isColor(border.color) ? { border: { color: border.color.trim(), width: clamp(border.width, 0, 60, 4) } } : {}),
      ...(value.shadow ? { shadow: true } : {}),
    };
  }
  if (value.kind === "shape") {
    return {
      ...base,
      kind: "shape",
      shape: ["rect", "ellipse", "line", "arrow", "curve"].includes(value.shape) ? value.shape : "rect",
      fill: fill(value.fill),
      stroke: isColor(value.stroke) ? value.stroke.trim() : null,
      strokeWidth: clamp(value.strokeWidth, 0, 80, 2),
      radius: clamp(value.radius, 0, 2000, 0),
      ...(value.dashed ? { dashed: true } : {}),
      ...(value.shadow ? { shadow: true } : {}),
    };
  }
  if (value.kind === "icon" && typeof value.icon === "string" && /^(brand|ph):[\w-]{1,40}$/.test(value.icon)) {
    return { ...base, kind: "icon", icon: value.icon, color: color(value.color, "#ffffff") };
  }
  return null;
}

/** A clean scene, or null when there is nothing valid (the caller then keeps no scene). */
export function sanitizeScene(value) {
  if (!value || typeof value !== "object" || !Array.isArray(value.slides) || !value.slides.length) return null;
  let size = 0;
  try {
    size = JSON.stringify(value).length;
  } catch {
    return null;
  }
  if (size > MAX_BYTES) throw new Error("The design is too large to save. Remove some slides or layers.");
  const theme = value.theme && typeof value.theme === "object" ? value.theme : {};
  return {
    version: 1,
    theme: {
      heading: FONTS.has(theme.heading) ? theme.heading : "inter-tight",
      body: FONTS.has(theme.body) ? theme.body : "inter-tight",
      colors: (Array.isArray(theme.colors) ? theme.colors : []).filter(isColor).slice(0, 12).map((c) => c.trim()),
    },
    slides: value.slides.slice(0, 20).map((slide, s) => ({
      id: id(slide?.id, `s${s}`),
      bg: color(slide?.bg, "#0b0b0d"),
      layers: (Array.isArray(slide?.layers) ? slide.layers : []).slice(0, 80).map(layer).filter(Boolean),
    })),
  };
}
