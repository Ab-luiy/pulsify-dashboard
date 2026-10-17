// Reading the link_domains table (migration 0071). Kept apart from link-domains.js so the YouTube sync
// Worker can ask for a client's domain without loading the redirect code.

export async function domainForClient(env, client) {
  try {
    return await env.DB.prepare(
      "SELECT host, client, status, created_at, checked_at, activated_at, check_json FROM link_domains WHERE client=?",
    ).bind(client).first();
  } catch {
    return null; // before migration 0071
  }
}

export async function domainForHost(env, host) {
  try {
    return await env.DB.prepare(
      "SELECT host, client, status FROM link_domains WHERE host=?",
    ).bind(host).first();
  } catch {
    return null;
  }
}

