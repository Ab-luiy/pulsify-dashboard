// Plain-English notes for the client's Integrations page (InfoOS build, 2026-09-30):
// what went wrong with a connection lately, in words a client can act on, and proof a
// connection works (the first real payment or booking that came through it).
// Reads delivery_failures (written by recordFailure) for the last 14 days.

const DAY = 86400000;

// Failure kind -> provider and the sentence the client reads.
const PROBLEMS = {
  stripe_signature: ["stripe", "Stripe sent a payment we couldn't verify. The signing secret saved here doesn't match the one in Stripe. Paste it again from Stripe's webhook page."],
  hook_stripe: ["stripe", "Stripe sent an event we don't read. Card payments and paid invoices still come through."],
  whop_signature: ["whop", "Whop sent a payment we couldn't verify. The webhook secret saved here doesn't match Whop's. Paste it again."],
  hook_whop: ["whop", "Whop sent an event we don't read. Successful payments still come through."],
  hook_calendly: ["calendly", "Calendly sent something that wasn't a booking. Bookings still come through."],
  hook_calcom: ["calcom", "Cal.com sent something that wasn't a booking. Bookings still come through."],
  kit: ["kit", "Kit turned down a new subscriber. Check the API key and that the tag still exists in Kit."],
  kit_onboarding: ["kit", "Kit turned down a new subscriber. Check the API key and that the tag still exists in Kit."],
  typeform_signature: ["typeform", "An application arrived with the wrong signature. Check the webhook secret in Typeform matches the one saved here."],
  typeform_parse: ["typeform", "An application arrived with no email answer. Add an email question to the form so each applicant can be followed up."],
};

export async function integrationNotes(env, client, now = Date.now()) {
  const since = new Date(now - 14 * DAY).toISOString();
  const [failures, payments, bookings] = await Promise.all([
    env.DB.prepare(
      "SELECT kind, COUNT(*) AS n, MAX(at) AS last FROM delivery_failures WHERE client=? AND at >= ? GROUP BY kind",
    ).bind(client, since).all().catch(() => ({ results: [] })),
    env.DB.prepare(
      "SELECT lower(rail) AS rail, MIN(occurred_at) AS first FROM payments WHERE client=? AND kind='charge' GROUP BY lower(rail)",
    ).bind(client).all().catch(() => ({ results: [] })),
    env.DB.prepare(
      "SELECT lower(source) AS source, MIN(COALESCE(json_extract(payload_json,'$.booked_at'), ts)) AS first FROM pipeline_touches WHERE client_id=? AND kind='booking' GROUP BY lower(source)",
    ).bind(client).all().catch(() => ({ results: [] })),
  ]);
  const notes = {};
  const note = (provider) => (notes[provider] ||= { problem: null, first_payment_at: null, first_booking_at: null });
  for (const row of failures.results || []) {
    const known = PROBLEMS[row.kind];
    if (!known) continue;
    const [provider, text] = known;
    const current = note(provider).problem;
    if (!current || String(row.last) > String(current.at)) note(provider).problem = { text, at: row.last, count: Number(row.n || 0) };
  }
  for (const row of payments.results || []) if (row.rail) note(row.rail).first_payment_at = row.first;
  for (const row of bookings.results || []) if (row.source) note(row.source).first_booking_at = row.first;
  return notes;
}
