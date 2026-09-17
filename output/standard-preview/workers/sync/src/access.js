let cache = { until: 0, keys: [] };
const ISSUER = "https://pulsify-ai.cloudflareaccess.com";

export function accessToken(request) {
  const header = request.headers.get("Cf-Access-Jwt-Assertion");
  if (header) return header;
  const cookie = (request.headers.get("cookie") || "").split(";")
    .find((value) => value.trim().startsWith("CF_Authorization="));
  return cookie ? cookie.trim().slice(17) : "";
}

export async function validateAccess(token, audience, { fetcher = fetch, now = Date.now() } = {}) {
  try {
    if (!token || !audience || token.length > 16384) return null;
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const header = JSON.parse(new TextDecoder().decode(bytes(parts[0])));
    const payload = JSON.parse(new TextDecoder().decode(bytes(parts[1])));
    if (header.alg !== "RS256" || !header.kid) return null;
    if (payload.iss !== ISSUER || !Number.isFinite(payload.exp) || payload.exp <= now / 1000) return null;
    if (payload.nbf != null && payload.nbf > now / 1000) return null;
    const expected = Array.isArray(audience) ? audience : [audience];
    const claims = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!expected.some((value) => value && claims.includes(value)) || !payload.email) return null;
    if (cache.until <= now) {
      const response = await fetcher(`${ISSUER}/cdn-cgi/access/certs`);
      if (!response.ok) return null;
      const document = await response.json();
      cache = { until: now + 600000, keys: (document.keys || []).filter((key) => key.kty === "RSA") };
    }
    const jwk = cache.keys.find((key) => key.kid === header.kid);
    if (!jwk) return null;
    const key = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const valid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      bytes(parts[2]),
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
    );
    return valid ? { email: String(payload.email), via: "access" } : null;
  } catch {
    return null;
  }
}

function bytes(value) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("invalid encoding");
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(normalized), (character) => character.charCodeAt(0));
}
