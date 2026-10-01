import { googleConfig } from '../../_shared/google-auth.js';

export function onRequestGet({ env }) {
  return new Response(JSON.stringify({ enabled: Boolean(googleConfig(env)) }), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}
