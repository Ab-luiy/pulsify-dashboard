// Lead score refit (InfoOS build): one client per run, oldest model first; the pooled
// model once a day. See functions/_shared/lead-models.js.
import { refreshLeadModels } from "../../../../functions/_shared/lead-models.js";

export function refreshLeadModelsJob(env) {
  return refreshLeadModels(env);
}
