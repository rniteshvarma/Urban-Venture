/**
 * Server errors Next.js catches (uncaught errors in pages, route handlers and
 * server actions) are stored in AppError for /admin/system. Node runtime only:
 * the import sits inside the NEXT_RUNTIME check so the edge build drops it
 * (the database driver can't load there).
 */
import type { Instrumentation } from "next";

export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { reportError } = await import("./lib/ops/record");
    const e = err as Error & { digest?: string };
    await reportError(context.routePath || request.path, e, { method: request.method, path: request.path, digest: e.digest });
  }
};
