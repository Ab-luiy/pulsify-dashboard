// Hybrid retrieval over the approved shared collection. Vector metadata never becomes context.
// Every match is rehydrated from the CURRENT compiled collection, so stale/private vectors fail closed.
import { COPY_KNOWLEDGE } from './copy-knowledge-data.js';
import { retrieveCopyKnowledge } from './copy-knowledge.js';
export const JANE_EMBED_MODEL = '@cf/baai/bge-base-en-v1.5';
export const janeNamespace = `jane-${COPY_KNOWLEDGE.version}`;
type Env = { AI?: { run(model: string, input: any): Promise<any> }; VECTORIZE?: { query(vector: number[], options: any): Promise<any> } };
const known = new Set(COPY_KNOWLEDGE.passages.map(part => part.id));
export async function retrieveJaneKnowledge(env: Env, options: { query?: string; format?: string; maxChars?: number } = {}) {
  const fallback = retrieveCopyKnowledge(options);
  if (!env.AI || !env.VECTORIZE || !options.query?.trim()) return { ...fallback, retrieval: 'keyword', semantic_status: 'not_configured' };
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const semanticIds = await Promise.race([(async () => {
      const out = await env.AI!.run(JANE_EMBED_MODEL, { text: [options.query!.slice(0, 1500)] });
      const vector = out?.data?.[0];
      if (!Array.isArray(vector) || vector.length !== 768 || vector.some((n: unknown) => typeof n !== 'number' || !Number.isFinite(n))) throw Error('Invalid embedding');
      const result = await env.VECTORIZE!.query(vector, { namespace: janeNamespace, topK: 16, returnMetadata: 'all' });
      return (result.matches || []).filter((hit: any) => hit.namespace === janeNamespace && hit.metadata?.version === COPY_KNOWLEDGE.version
        && known.has(hit.metadata?.passage_id) && hit.id === `${janeNamespace}:${hit.metadata.passage_id}` && hit.score >= 0.45)
        .map((hit: any) => hit.metadata.passage_id);
    })(), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(Error('Search timeout')), 3500); })]);
    return { ...retrieveCopyKnowledge({ ...options, semanticIds }), retrieval: semanticIds.length ? 'hybrid' : 'keyword', semantic_status: semanticIds.length ? 'ready' : 'no_current_matches' };
  } catch { return { ...fallback, retrieval: 'keyword', semantic_status: 'unavailable' }; }
  finally { clearTimeout(timer); }
}
