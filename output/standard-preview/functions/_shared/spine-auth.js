import { hasOperator, operatorIdentity } from "./access.js";
import { resolveClientAccess } from "./client-auth.js";
import { cleanId, json } from "./common.js";

export async function resolveSpineRead(request, env, requestedScope, requestedClient = "") {
  const identity = operatorIdentity(request);
  if (identity || hasOperator(request, env)) {
    return {
      role: "operator",
      operatorEmail: identity?.email || "automation",
      scope: requestedScope === "client" ? "client" : "operator",
      client: requestedScope === "client" ? cleanId(requestedClient, "") : "",
    };
  }

  if (requestedScope !== "client") {
    return { error: json({ ok: false, error: "unauthorized" }, 401) };
  }
  const access = await resolveClientAccess(request, env, {
    clientHint: requestedClient,
    allowImpersonated: true,
    allowHeaderToken: true,
  });
  if (access.error) return access;
  return {
    role: "client",
    scope: "client",
    client: access.client,
    impersonated: Boolean(access.impersonated),
  };
}

export function resolveOperator(request, env) {
  const identity = operatorIdentity(request);
  if (!identity && !hasOperator(request, env)) {
    return { error: json({ ok: false, error: "unauthorized" }, 401) };
  }
  return {
    role: "operator",
    operatorEmail: identity?.email || "automation",
  };
}
