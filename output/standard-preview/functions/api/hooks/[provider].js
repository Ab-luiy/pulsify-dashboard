import { optionsResponse } from "../../_shared/integrations.js";
import { handleHookRequest } from "../../_shared/hooks.js";
import { json } from "../../_shared/common.js";

export async function onRequestPost(context) {
  return handleHookRequest(context);
}

export async function onRequestOptions() {
  return optionsResponse("POST, OPTIONS", "content-type, stripe-signature");
}
