/**
 * Never serve local tooling state, even if a deploy directory is prepared badly.
 */
export async function onRequest({ request, next }) {
  const path = new URL(request.url).pathname.toLowerCase();
  const blocked =
    path.startsWith("/.wrangler") ||
    path.startsWith("/.git") ||
    path.startsWith("/.dev.vars") ||
    path.startsWith("/migrations/");

  if (blocked) {
    return new Response("Not found", {
      status: 404,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }
  return next();
}
