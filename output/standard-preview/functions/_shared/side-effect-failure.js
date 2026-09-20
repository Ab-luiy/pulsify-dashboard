import { recordFailure } from "./integrations.js";
// Diagnostics contain the operation, never raw provider errors, payloads or credentials.
export async function sideEffectFailure(env, operation) {
  await recordFailure(env, "operator", operation, "Operation failed; retry or inspect the related integration.");
  return null;
}
