// Zernio comment-to-DM automations (ticket #79). Docs: https://docs.zernio.com/comment-automations
//   POST   /v1/comment-automations              create (profileId, accountId, name, keywords, dmMessage, buttons, linkTracking ...)
//   PATCH  /v1/comment-automations/{id}         change, isActive turns it on or off
//   DELETE /v1/comment-automations/{id}
// Zernio sends the DM itself when someone comments the keyword; we hand it the keyword, the message and the link.
// NOT YET RUN AGAINST ZERNIO: the founder has not added a payment method, so no client Instagram can connect and
// nothing here is ever called live. Tests use a mocked fetcher. Unconfirmed with Zernio (ticket #79): asking for an
// email inside the DM, and a link personalised per person (the one capture page link is the same for everyone).
import { str } from "./common.js";
import { zernioConfigured, zernioFetch } from "./zernio.js";

export function automationBody({ profileId, accountId, name, keyword, dmMessage, linkUrl, postId }) {
  return {
    profileId,
    accountId,
    name: str(name).slice(0, 80),
    trigger: "comment",
    keywords: [str(keyword)],
    matchMode: "contains",
    typoTolerance: true,
    ...(postId ? { platformPostId: str(postId) } : {}),
    dmMessage: str(dmMessage),
    // The button carries the capture page link; Zernio tracks the click.
    buttons: [{ type: "url", title: "Get the guide", url: linkUrl }],
    linkTracking: true,
    repeatPolicy: { mode: "once", cooldownHours: 24 },
    isActive: true,
  };
}

export async function createAutomation(env, input, fetcher = fetch) {
  if (!zernioConfigured(env)) throw new Error("Zernio is not set up yet.");
  const body = await zernioFetch(env, "/v1/comment-automations", { method: "POST", body: JSON.stringify(automationBody(input)) }, fetcher);
  const id = str(body.automation?.id || body.automation?._id || body.id);
  if (!id) throw new Error("Zernio did not return the automation.");
  return { id };
}

/** Change what an existing automation says (keyword, message, link, post) and switch it on. */
export async function updateAutomation(env, id, input, fetcher = fetch) {
  if (!zernioConfigured(env)) throw new Error("Zernio is not set up yet.");
  const { profileId: _p, accountId: _a, ...body } = automationBody(input);
  await zernioFetch(env, `/v1/comment-automations/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(body) }, fetcher);
}

export async function setAutomationActive(env, id, active, fetcher = fetch) {
  if (!zernioConfigured(env)) throw new Error("Zernio is not set up yet.");
  await zernioFetch(env, `/v1/comment-automations/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ isActive: Boolean(active) }) }, fetcher);
}

export async function deleteAutomation(env, id, fetcher = fetch) {
  if (!zernioConfigured(env)) throw new Error("Zernio is not set up yet.");
  await zernioFetch(env, `/v1/comment-automations/${encodeURIComponent(id)}`, { method: "DELETE" }, fetcher);
}
