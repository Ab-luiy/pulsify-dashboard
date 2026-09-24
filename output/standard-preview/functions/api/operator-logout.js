import { clearOperatorCookie, revokeOperatorSession } from '../_shared/operator-session.js';

// Ends the operator session (revoked server-side, cookie cleared) and returns
// to the branded operator sign-in. Also expires any leftover Cloudflare Access
// cookie so the old screen never reappears. GET is allowed so the console's
// sign-out can be a plain link; signing someone out is not a privileged action.
async function signOut({ request, env }) {
  await revokeOperatorSession(request, env);
  const headers = new Headers({ location: new URL('/login/operator?signed_out=1', request.url).toString(), 'cache-control': 'no-store' });
  headers.append('set-cookie', clearOperatorCookie());
  headers.append('set-cookie', 'CF_Authorization=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax');
  return new Response(null, { status: 302, headers });
}

export const onRequestGet = signOut;
export const onRequestPost = signOut;
