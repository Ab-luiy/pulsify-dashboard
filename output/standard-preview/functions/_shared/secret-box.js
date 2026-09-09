// Server-only encryption for integration credentials and pending invitation links.
const encoder = new TextEncoder();
function bytes(value) { return Uint8Array.from(atob(value), c => c.charCodeAt(0)); }
function base64(value) { return btoa(String.fromCharCode(...new Uint8Array(value))); }
async function key(env) {
  const raw = bytes(env.INTEGRATION_ENCRYPTION_KEY || '');
  if (raw.length !== 32) throw new Error('Integration encryption key must contain 32 random bytes in base64.');
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}
export async function seal(env, value, context) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: encoder.encode(context) }, await key(env), encoder.encode(value));
  return base64(iv) + '.' + base64(encrypted);
}
export async function unseal(env, value, context) {
  const [iv, encrypted] = value.split('.');
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes(iv), additionalData: encoder.encode(context) }, await key(env), bytes(encrypted));
  return new TextDecoder().decode(plain);
}
