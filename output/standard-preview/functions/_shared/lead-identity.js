// Who is the same person? (pulsify-saas #74, founder 2026-10-17)
//
// A person is matched on an email, a phone number or an Instagram handle. A name alone is
// weak (two people share a name all the time), so it never merges anyone: it only produces
// a suggestion the operator confirms or rejects. All the matching rules live here as plain
// functions so they can be tested without a database.

// ---------- phone ----------

// Calling codes for the countries our clients' audiences come from, so a number typed the
// local way ("07911 123456") can still be matched when we know the visitor's country.
const CALLING_CODE = {
  US: "1", CA: "1", GB: "44", IE: "353", DE: "49", FR: "33", ES: "34", IT: "39", NL: "31", BE: "32",
  LU: "352", PT: "351", AT: "43", CH: "41", SE: "46", NO: "47", DK: "45", FI: "358", PL: "48", CZ: "420",
  GR: "30", RO: "40", HU: "36", AU: "61", NZ: "64",
};
// Countries that keep the leading 0 as part of the number once the code is added.
const KEEPS_ZERO = new Set(["IT"]);

const REPEATING = /^(\d)\1+$/;

/**
 * A phone number in one shape ("+14155550123"), or null when it is not a usable number.
 * `country` (a two-letter code) is only used for numbers with no "+" or "00" in front.
 * Placeholders, repeated digits and sequences return null so they can never join two people.
 */
export function normalizePhone(raw, country = null) {
  let text = String(raw ?? "").trim();
  if (!text) return null;
  // "ext", "x" and "#" start an extension: it is not part of the number.
  text = text.replace(/\s*(?:ext\.?|extension|x|#)\s*\d{1,6}\s*$/i, "");
  const plus = text.startsWith("+") || text.startsWith("00");
  let digits = text.replace(/\D/g, "");
  if (text.startsWith("00")) digits = digits.slice(2);
  if (!digits) return null;

  let full;
  if (plus) {
    full = digits;
  } else {
    const code = CALLING_CODE[String(country || "").toUpperCase()] || null;
    if (code === "1" || (!code && (digits.length === 10 || (digits.length === 11 && digits.startsWith("1"))))) {
      // North America: 10 digits, or 11 with the leading 1.
      const national = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
      if (national.length !== 10) return null;
      full = `1${national}`;
    } else if (code) {
      const national = digits.startsWith(code) && digits.length > 9 ? digits.slice(code.length) : digits;
      full = code + (KEEPS_ZERO.has(String(country).toUpperCase()) ? national : national.replace(/^0+/, ""));
    } else {
      // No "+", no known country, not a 10-digit North American number: too ambiguous to match on.
      return null;
    }
  }

  if (full.length < 8 || full.length > 15) return null;
  if (full.startsWith("0")) return null;
  // Country code 1 is North America, where every number is exactly 11 digits.
  if (full.startsWith("1") && full.length !== 11) return null;
  const subscriber = full.startsWith("1") && full.length === 11 ? full.slice(1) : full;
  if (REPEATING.test(subscriber)) return null;
  if (/^(?:0123456789|1234567890|2345678901|9876543210|0987654321)/.test(subscriber)) return null;
  if (full.startsWith("1") && full.length === 11) {
    // North American numbers: area code and exchange never start with 0 or 1, and 555-01xx is reserved for films.
    if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(subscriber)) return null;
    if (/^\d{3}555(?:01\d{2})$/.test(subscriber)) return null;
  }
  return `+${full}`;
}

// ---------- Instagram handle ----------

const NOT_A_HANDLE = new Set([
  "p", "reel", "reels", "stories", "explore", "accounts", "direct", "www", "instagram", "insta", "ig",
  "na", "n.a", "none", "no", "nil", "null", "undefined", "unknown", "test", "handle", "username", "yes", "dm", "me",
]);

/** An Instagram username without the "@" or the link around it, or null when it is not one. */
export function normalizeHandle(raw) {
  let text = String(raw ?? "").trim().toLowerCase();
  if (!text) return null;
  const link = /instagram\.com\/(?:_u\/)?([a-z0-9._]+)/.exec(text);
  // A link gives the handle after the slash; anything else with a slash ("n/a") is not a handle.
  text = (link ? link[1] : text).replace(/^@+/, "");
  if (!/^[a-z0-9._]{2,30}$/.test(text)) return null;
  if (NOT_A_HANDLE.has(text) || text.startsWith(".") || text.endsWith(".") || text.includes("..")) return null;
  return text;
}

// ---------- name (a hint, never a key) ----------

const STOCK_NAMES = new Set(["john doe", "jane doe", "test user", "first last", "your name", "no name", "n a", "my name"]);

/** "first last" in plain lowercase letters, or null for a single name or a placeholder. */
export function normalizeName(raw) {
  const text = String(raw ?? "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z\s'-]/g, " ").replace(/\s+/g, " ").trim();
  const tokens = text.split(" ").filter((t) => t.length >= 2);
  if (tokens.length < 2) return null;
  const name = `${tokens[0]} ${tokens[tokens.length - 1]}`;
  return STOCK_NAMES.has(name) || STOCK_NAMES.has(text) ? null : name;
}

// ---------- reading contact details out of free text ----------

const EMAIL_IN_TEXT = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_IN_TEXT = /(?:\+|00)?\d[\d\s().-]{8,18}\d/g;

/** An email or phone someone typed into a message, so a DM can be linked to their lead. */
export function contactDetailsIn(text, country = null) {
  const source = String(text ?? "");
  const email = EMAIL_IN_TEXT.exec(source)?.[0]?.toLowerCase() || null;
  let phone = null;
  for (const match of source.match(PHONE_IN_TEXT) || []) {
    phone = normalizePhone(match, country);
    if (phone) break;
  }
  return { email, phone };
}

// ---------- matching ----------

/**
 * Join groups that share a phone number or an Instagram handle.
 *
 * `groups` is a list of `{ id, phones:Set, handles:Set }` (already joined by email or browser).
 * Returns `{ merges, blocked }`: `merges` is a list of `[idA, idB]` pairs to join and
 * `blocked` is a list of `{ a, b, kind }` pairs that share a detail but disagree on another,
 * which look like two different people (a couple sharing a phone, a handle typed wrongly).
 * Blocked pairs are not merged; they surface as suggestions for the operator to settle.
 * `different(a, b)` returns true when the operator already said these are two people.
 */
export function weakMerges(groups, { different = () => false } = {}) {
  const parent = new Map(groups.map((g) => [g.id, g.id]));
  const info = new Map(groups.map((g) => [g.id, { phones: new Set(g.phones), handles: new Set(g.handles) }]));
  const find = (x) => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x); } return x; };
  const merges = [];
  const blocked = [];
  const disjoint = (a, b) => a.size > 0 && b.size > 0 && ![...a].some((v) => b.has(v));
  // Everyone in a merged group counts for the "different" check.
  const members = new Map(groups.map((g) => [g.id, [g.id]]));
  const apart = (ra, rb) => members.get(ra).some((a) => members.get(rb).some((b) => different(a, b) || different(b, a)));

  for (const kind of ["phone", "handle"]) {
    const index = new Map();
    for (const g of groups) for (const v of kind === "phone" ? g.phones : g.handles) {
      if (!index.has(v)) index.set(v, []);
      index.get(v).push(g.id);
    }
    for (const value of [...index.keys()].sort()) {
      const ids = index.get(value);
      for (let i = 1; i < ids.length; i += 1) {
        const ra = find(ids[0]);
        const rb = find(ids[i]);
        if (ra === rb) continue;
        const a = info.get(ra);
        const b = info.get(rb);
        // A shared phone with two different handles (or a shared handle with two different
        // phones) is two people, not one.
        const clash = kind === "phone" ? disjoint(a.handles, b.handles) : disjoint(a.phones, b.phones);
        if (clash || apart(ra, rb)) {
          if (!apart(ra, rb)) blocked.push({ a: ids[0], b: ids[i], kind });
          continue;
        }
        parent.set(rb, ra);
        for (const p of b.phones) a.phones.add(p);
        for (const h of b.handles) a.handles.add(h);
        members.set(ra, [...members.get(ra), ...members.get(rb)]);
        merges.push([ids[0], ids[i]]);
      }
    }
  }
  return { merges, blocked };
}

/**
 * Possible matches for one person from a name alone, for the operator to confirm. Nobody
 * who already shares an email, phone or handle appears here (they are the same person), and
 * nobody the operator has already said is different.
 */
export function nameSuggestions(person, others, { different = () => false } = {}) {
  // Every name this person has used, since a later form may only carry an initial.
  const namesOf = (p) => new Set([p.name, ...(p.names || [])].map(normalizeName).filter(Boolean));
  const mine = namesOf(person);
  if (!mine.size) return [];
  const out = [];
  for (const other of others) {
    if (other === person) continue;
    if (![...namesOf(other)].some((n) => mine.has(n))) continue;
    if (different(person.key, other.key) || different(other.key, person.key)) continue;
    out.push({ key: other.key, name: other.name, email: other.email || null, handle: other.handle || null, phone: other.phone || null, why: "same_name" });
  }
  return out.slice(0, 5);
}
