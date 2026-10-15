import { strict as assert } from "node:assert";
import * as needs from "../functions/api/onboarding-needs.js";

async function testClientsAreRefused() {
  const env = { DB: { prepare() { throw new Error("no query expected"); } } };
  const response = await needs.onRequestGet({ request: new Request("https://funnels.test/api/onboarding-needs?client=alpha", { headers: { "x-portal-token": "t" } }), env });
  assert.equal(response.status, 403);
}

async function testValidation() {
  assert.equal(needs.validNeed("mechanism", "done"), true);
  assert.equal(needs.validNeed("mechanism", "open"), true);
  assert.equal(needs.validNeed("../x", "done"), false);
  assert.equal(needs.validNeed("mechanism", "maybe"), false);
}

try {
  await testClientsAreRefused();
  await testValidation();
  console.log("PASS onboarding needs: operators only, key and state validated");
} catch (error) {
  console.error(`FAIL onboarding needs: ${error?.stack || error}`);
  process.exitCode = 1;
}
