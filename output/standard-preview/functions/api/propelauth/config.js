import { propelConfig } from '../../_shared/propelauth.js';

export function onRequestGet({env}) {
  return new Response(JSON.stringify({enabled:Boolean(propelConfig(env))}),{
    headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'},
  });
}
