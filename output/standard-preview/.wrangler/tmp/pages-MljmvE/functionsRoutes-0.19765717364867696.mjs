import { onRequestGet as __api_clients_js_onRequestGet } from "C:\\Users\\Abdullah\\Desktop\\Pulsify-Brain\\output\\standard-preview\\functions\\api\\clients.js"
import { onRequestGet as __api_funnel_config_js_onRequestGet } from "C:\\Users\\Abdullah\\Desktop\\Pulsify-Brain\\output\\standard-preview\\functions\\api\\funnel-config.js"
import { onRequestGet as __api_settings_js_onRequestGet } from "C:\\Users\\Abdullah\\Desktop\\Pulsify-Brain\\output\\standard-preview\\functions\\api\\settings.js"
import { onRequestOptions as __api_settings_js_onRequestOptions } from "C:\\Users\\Abdullah\\Desktop\\Pulsify-Brain\\output\\standard-preview\\functions\\api\\settings.js"
import { onRequestPost as __api_settings_js_onRequestPost } from "C:\\Users\\Abdullah\\Desktop\\Pulsify-Brain\\output\\standard-preview\\functions\\api\\settings.js"
import { onRequestOptions as __event_js_onRequestOptions } from "C:\\Users\\Abdullah\\Desktop\\Pulsify-Brain\\output\\standard-preview\\functions\\event.js"
import { onRequestPost as __event_js_onRequestPost } from "C:\\Users\\Abdullah\\Desktop\\Pulsify-Brain\\output\\standard-preview\\functions\\event.js"
import { onRequestGet as __leads_js_onRequestGet } from "C:\\Users\\Abdullah\\Desktop\\Pulsify-Brain\\output\\standard-preview\\functions\\leads.js"
import { onRequestOptions as __leads_js_onRequestOptions } from "C:\\Users\\Abdullah\\Desktop\\Pulsify-Brain\\output\\standard-preview\\functions\\leads.js"

export const routes = [
    {
      routePath: "/api/clients",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_clients_js_onRequestGet],
    },
  {
      routePath: "/api/funnel-config",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_funnel_config_js_onRequestGet],
    },
  {
      routePath: "/api/settings",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_settings_js_onRequestGet],
    },
  {
      routePath: "/api/settings",
      mountPath: "/api",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_settings_js_onRequestOptions],
    },
  {
      routePath: "/api/settings",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_settings_js_onRequestPost],
    },
  {
      routePath: "/event",
      mountPath: "/",
      method: "OPTIONS",
      middlewares: [],
      modules: [__event_js_onRequestOptions],
    },
  {
      routePath: "/event",
      mountPath: "/",
      method: "POST",
      middlewares: [],
      modules: [__event_js_onRequestPost],
    },
  {
      routePath: "/leads",
      mountPath: "/",
      method: "GET",
      middlewares: [],
      modules: [__leads_js_onRequestGet],
    },
  {
      routePath: "/leads",
      mountPath: "/",
      method: "OPTIONS",
      middlewares: [],
      modules: [__leads_js_onRequestOptions],
    },
  ]