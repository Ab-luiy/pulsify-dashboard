// The niches a client picks at onboarding (founder 2026-10-15: trading, ecommerce, TikTok Shop, Amazon FBA,
// high-ticket sales; ticket #62). Stored on the brain as identity.niche: one of these ids, or the client's own
// words when none fits. Generators read it through the brain context ("Niche: ..."); the packaging library
// filters by it. Mirrored in pulsify-saas src/lib/niches.ts.
export const NICHES = [
  { id: "trading", label: "Trading", queries: ["day trading strategy", "prop firm funded account", "trading psychology", "forex trading"] },
  { id: "ecommerce", label: "Ecommerce", queries: ["shopify dropshipping", "ecommerce store", "winning products", "facebook ads ecommerce"] },
  { id: "tiktok-shop", label: "TikTok Shop", queries: ["tiktok shop", "tiktok shop affiliate", "tiktok shop seller"] },
  { id: "amazon-fba", label: "Amazon FBA", queries: ["amazon fba", "amazon private label", "amazon product research"] },
  { id: "ht-sales", label: "High-ticket sales", queries: ["high ticket sales", "closing calls", "sales closer", "high ticket closer"] },
];

const byId = new Map(NICHES.map((niche) => [niche.id, niche]));

/** {id, label} for a saved niche value: a known id, the client's own words, or null when nothing is saved. */
export function readNiche(value) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
  if (!text) return null;
  const known = byId.get(text.toLowerCase());
  return known ? { id: known.id, label: known.label } : { id: "other", label: text };
}

/** What a generator is told about the client's world, or "" when the niche is not set. */
export function nicheLine(value) {
  const niche = readNiche(value);
  return niche ? `The client works in ${niche.label}.` : "";
}
