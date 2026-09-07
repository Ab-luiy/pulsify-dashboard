import { resolveClientAccess } from '../_shared/client-auth.js';
import { buildMarkdownContextPackage, loadClientBrainData } from '../_shared/client-brain-context.js';
import { groupBrainRows } from './client-brain.js';

export async function onRequestGet({ request, env }) {
  const access = await resolveClientAccess(request, env, { allowHeaderToken: true, allowImpersonated: true });
  if (access.error) return access.error;
  const brain = await loadClientBrainData(env, access.client);
  const markdown = buildMarkdownContextPackage({
    client: access.client,
    clientName: access.client_name || access.client,
    sections: groupBrainRows(brain.rows).sections,
    proofItems: brain.proof_items,
    exportedAt: new Date().toISOString(),
  });
  return new Response(markdown, { headers: {
    'content-type': 'text/markdown; charset=utf-8',
    'content-disposition': `attachment; filename="${access.client}-pulsify-context.md"`,
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  }});
}
