// Request-local trusted identity. No inbound header can forge this map.
const identities = new WeakMap();
let cache = { until: 0, keys: [] };
export const ISSUER = 'https://pulsify-ai.cloudflareaccess.com';
export const operatorIdentity = request => identities.get(request) || null;
export function rememberOperator(request, identity) { identities.set(request, identity); }
// Pages clones Request for every handler but preserves trusted context.data.
// Bind the identity again at the route boundary; never read an identity header.
export function withOperator(handler) {
  return context => {
    if (context.data?.operator) rememberOperator(context.request, context.data.operator);
    return handler(context);
  };
}
export function accessToken(request) {
  const header = request.headers.get('Cf-Access-Jwt-Assertion');
  if (header) return header;
  const cookie = (request.headers.get('cookie') || '').split(';').find(x => x.trim().startsWith('CF_Authorization='));
  return cookie ? cookie.trim().slice(17) : '';
}
function bytes(value) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Invalid encoding');
  return Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
}
export async function validateAccess(token, audience, {fetcher = fetch, now = Date.now()} = {}) {
  try {
    if (!token || !audience || token.length > 16384) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const header = JSON.parse(new TextDecoder().decode(bytes(parts[0])));
    const payload = JSON.parse(new TextDecoder().decode(bytes(parts[1])));
    const expected = Array.isArray(audience) ? audience : [audience];
    if (header.alg !== 'RS256' || typeof header.kid !== 'string' || !header.kid) return null;
    if (payload.iss !== ISSUER || !Number.isFinite(payload.exp) || payload.exp <= now / 1000) return null;
    if (payload.nbf != null && (!Number.isFinite(payload.nbf) || payload.nbf > now / 1000)) return null;
    const claims = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!expected.some(a => a && claims.includes(a)) || typeof payload.email !== 'string' || !payload.email) return null;
    if (cache.until <= now) {
      const response = await fetcher(ISSUER + '/cdn-cgi/access/certs');
      if (!response.ok) return null;
      const document = await response.json();
      // JWK and public_certs use the same rotating kid. Import JWK in WebCrypto.
      cache = {until:now + 600000, keys:(document.keys || []).filter(k => k.kty === 'RSA' && (!k.alg || k.alg === 'RS256'))};
    }
    const jwk = cache.keys.find(k => k.kid === header.kid);
    if (!jwk) return null;
    const key = await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
    if (!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,bytes(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1]))) return null;
    return {email:payload.email,via:'access'};
  } catch { return null; }
}
export function hasOperator(request, env) {
  if (operatorIdentity(request)) return true;
  if (!new URL(request.url).pathname.startsWith('/api/')) return false;
  const supplied = request.headers.get('x-admin-key') || '', expected = env.ADMIN_KEY || '';
  if (!supplied || supplied.length !== expected.length) return false;
  let diff = 0;
  for (let i=0;i<expected.length;i++) diff |= supplied.charCodeAt(i)^expected.charCodeAt(i);
  return diff === 0;
}
