// Daily per-client allowances for metered features (migrations/0059_usage_counters.sql).
// takeAllowance counts one use and returns false once the day's limit is reached; the check and the count
// are one statement, so two requests at once cannot both slip past the limit.
const today = (now = Date.now()) => new Date(now).toISOString().slice(0, 10);

export async function takeAllowance(env, client, kind, limit, now = Date.now()) {
  const day = today(now);
  const result = await env.DB.prepare(
    `INSERT INTO usage_counters (client, kind, day, count) VALUES (?, ?, ?, 1)
     ON CONFLICT(client, kind, day) DO UPDATE SET count = count + 1 WHERE count < ?`,
  ).bind(client, kind, day, limit).run();
  return Number(result.meta?.changes || 0) > 0;
}
