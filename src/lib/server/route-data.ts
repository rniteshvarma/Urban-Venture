/**
 * Server-side page loads run the same route handlers the browser would call,
 * directly as functions (no HTTP hop), so the HTML a search engine receives
 * holds exactly the data the page would otherwise fetch after loading.
 *
 * Returns the parsed JSON body, or null on a non-2xx status or any error —
 * the page then falls back to fetching in the browser as before.
 */

type Handler<P> = (req: Request, ctx: { params: Promise<P> }) => Promise<Response> | Response;

export async function routeJson<T = unknown, P extends Record<string, string> = Record<string, string>>(
  handler: Handler<P>,
  path: string,
  params?: P,
): Promise<T | null> {
  try {
    const res = await handler(new Request(`http://internal${path}`), { params: Promise.resolve((params ?? {}) as P) });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (err) {
    console.error(`[route-data] ${path} failed:`, err);
    return null;
  }
}
