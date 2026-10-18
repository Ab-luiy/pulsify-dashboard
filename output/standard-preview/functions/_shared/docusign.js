// DocuSign eSignature REST client for sending contracts (ticket #80).
// JWT grant (service integration, no browser consent per send). Sandbox by
// default: DOCUSIGN_BASE_URL=https://demo.docusign.net. Going live means a
// production integration key, the production base URL and, if Docusign gave
// the account a different base host, that host in DOCUSIGN_BASE_URL.
//
// Secrets (Pages): DOCUSIGN_ACCOUNT_ID, DOCUSIGN_INTEGRATION_KEY, DOCUSIGN_USER_ID
// (the sending user's GUID), DOCUSIGN_PRIVATE_KEY (RSA key, PKCS#8 or PKCS#1 PEM).
// Optional: DOCUSIGN_AUTH_SERVER, DOCUSIGN_CLIENT_ROLE, DOCUSIGN_OPERATOR_EMAIL and
// DOCUSIGN_OPERATOR_NAME (adds a counter-signer after the client).
// Every network call takes an injectable fetcher so tests never leave the process.
import { CLIENT_ANCHOR, OPERATOR_ANCHOR, buildContractHtml, contractTitle } from "./contract-text.js";

export const REQUIRED_ENV = ["DOCUSIGN_ACCOUNT_ID", "DOCUSIGN_INTEGRATION_KEY", "DOCUSIGN_USER_ID", "DOCUSIGN_PRIVATE_KEY"];

export function missingConfig(env) {
  return REQUIRED_ENV.filter((name) => !env?.[name]);
}

export function authServer(env) {
  const set = String(env?.DOCUSIGN_AUTH_SERVER || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (set) return set;
  return /demo\./.test(docusignBase(env)) ? "account-d.docusign.com" : "account.docusign.com";
}

// Same rule as api/docusign-connect.js: sandbox unless DOCUSIGN_BASE_URL says otherwise.
export const docusignBase = (env) => String(env?.DOCUSIGN_BASE_URL || "https://demo.docusign.net").replace(/\/$/, "");

const encoder = new TextEncoder();
const b64url = (bytes) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

function derLength(length) {
  if (length < 128) return [length];
  const bytes = [];
  for (let n = length; n > 0; n >>= 8) bytes.unshift(n & 255);
  return [0x80 | bytes.length, ...bytes];
}
const der = (tag, content) => Uint8Array.from([tag, ...derLength(content.length), ...content]);

/** DocuSign hands out PKCS#1 keys ("BEGIN RSA PRIVATE KEY"); WebCrypto wants PKCS#8. Wrap when needed. */
export function pemToPkcs8(pem) {
  const text = String(pem || "").replace(/\\n/g, "\n");
  const pkcs1 = /BEGIN RSA PRIVATE KEY/.test(text);
  const body = text.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  if (!body) throw new Error("DocuSign private key is empty.");
  const raw = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
  if (!pkcs1) return raw;
  const algorithm = der(0x30, [...der(0x06, [0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01]), 0x05, 0x00]);
  return der(0x30, [...der(0x02, [0]), ...algorithm, ...der(0x04, raw)]);
}

export async function signJwt(env, now = Math.floor(Date.now() / 1000)) {
  const header = b64url(encoder.encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const claims = b64url(
    encoder.encode(
      JSON.stringify({
        iss: env.DOCUSIGN_INTEGRATION_KEY,
        sub: env.DOCUSIGN_USER_ID,
        aud: authServer(env),
        iat: now,
        exp: now + 3600,
        scope: "signature impersonation",
      }),
    ),
  );
  const key = await crypto.subtle.importKey("pkcs8", pemToPkcs8(env.DOCUSIGN_PRIVATE_KEY), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, encoder.encode(`${header}.${claims}`));
  return `${header}.${claims}.${b64url(signature)}`;
}

const tokens = new Map();
export function clearTokenCache() {
  tokens.clear();
}

export async function accessToken(env, fetcher = fetch) {
  const cacheKey = `${env.DOCUSIGN_ACCOUNT_ID}:${env.DOCUSIGN_INTEGRATION_KEY}`;
  const cached = tokens.get(cacheKey);
  if (cached && cached.until > Date.now()) return cached.token;
  const response = await fetcher(`https://${authServer(env)}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: await signJwt(env) }).toString(),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.access_token) {
    const reason = body.error === "consent_required" ? "DocuSign needs the one-time consent for this integration key." : "DocuSign refused the sign-in.";
    throw new Error(reason);
  }
  tokens.set(cacheKey, { token: body.access_token, until: Date.now() + Math.max(60, Number(body.expires_in || 3600) - 120) * 1000 });
  return body.access_token;
}

async function call(env, fetcher, path, init = {}) {
  const token = await accessToken(env, fetcher);
  const response = await fetcher(`${docusignBase(env)}/restapi/v2.1/accounts/${encodeURIComponent(env.DOCUSIGN_ACCOUNT_ID)}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...init.headers },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(String(body.message || body.errorCode || `DocuSign answered ${response.status}`).slice(0, 200));
  return body;
}

export function envelopeDefinition(env, contract) {
  const countersign = Boolean(env.DOCUSIGN_OPERATOR_EMAIL);
  const html = buildContractHtml(contract, { operatorName: env.DOCUSIGN_OPERATOR_NAME || "Pulsify", countersign });
  const tab = (anchorString) => ({ signHereTabs: [{ anchorString, anchorUnits: "pixels", anchorXOffset: "0", anchorYOffset: "0", anchorIgnoreIfNotPresent: "false" }] });
  const signers = [
    {
      email: contract.email,
      name: `${contract.first_name} ${contract.last_name}`.trim(),
      recipientId: "1",
      routingOrder: "1",
      roleName: env.DOCUSIGN_CLIENT_ROLE || "Client",
      tabs: tab(CLIENT_ANCHOR),
    },
  ];
  if (countersign) {
    signers.push({
      email: env.DOCUSIGN_OPERATOR_EMAIL,
      name: env.DOCUSIGN_OPERATOR_NAME || "Pulsify",
      recipientId: "2",
      routingOrder: "2",
      roleName: "Operator",
      tabs: tab(OPERATOR_ANCHOR),
    });
  }
  return {
    emailSubject: `${contractTitle(contract)} to sign`,
    emailBlurb: `Hi ${contract.first_name}, here is your Pulsify agreement from our call. Read it, sign it, and your workspace is set up straight after.`,
    status: "sent",
    documents: [{ documentId: "1", name: "Pulsify service agreement.html", fileExtension: "html", documentBase64: btoa(unescape(encodeURIComponent(html))) }],
    recipients: { signers },
    // The existing Connect listener (docusign-connect.js) only opens a workspace for envelopes marked pulsify_portal.
    customFields: { textCustomFields: [{ name: "pulsify_portal", value: "true", show: "false" }, { name: "pulsify_contract", value: contract.id, show: "false" }] },
  };
}

export async function createEnvelope(env, contract, fetcher = fetch) {
  const body = await call(env, fetcher, "/envelopes", { method: "POST", body: JSON.stringify(envelopeDefinition(env, contract)) });
  if (!body.envelopeId) throw new Error("DocuSign did not return an envelope.");
  return { envelopeId: String(body.envelopeId) };
}

export async function envelopeStatus(env, envelopeId, fetcher = fetch) {
  const body = await call(env, fetcher, `/envelopes/${encodeURIComponent(envelopeId)}`);
  return { status: String(body.status || ""), completedAt: body.completedDateTime || null };
}

export async function voidEnvelope(env, envelopeId, reason, fetcher = fetch) {
  await call(env, fetcher, `/envelopes/${encodeURIComponent(envelopeId)}`, {
    method: "PUT",
    body: JSON.stringify({ status: "voided", voidedReason: String(reason || "Cancelled by Pulsify").slice(0, 200) }),
  });
}
