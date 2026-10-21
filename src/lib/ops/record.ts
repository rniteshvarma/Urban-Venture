/**
 * Recording job runs and server errors (models JobRun and AppError).
 * Recording never throws: monitoring must not take a job or a page down.
 */
import { NextResponse } from "next/server";
import prisma from "../prisma";
import { assertCron } from "../cron-auth";

const clip = (s: string | undefined | null, n: number) => (s ? (s.length > n ? `${s.slice(0, n)}…` : s) : null);

/** Store a server error; safe to call from any catch block. */
export async function reportError(scope: string, err: unknown, req?: { method?: string; path?: string; digest?: string }) {
  try {
    const e = err instanceof Error ? err : new Error(String(err));
    await prisma.appError.create({
      data: { scope: clip(scope, 200)!, message: clip(e.message, 1000) ?? "Unknown error", stack: clip(e.stack, 4000), method: req?.method ?? null, path: clip(req?.path, 500), digest: req?.digest ?? null },
    });
  } catch (inner) {
    console.error("[ops] could not record error", inner);
  }
}

type Handler<R extends Request> = (req: R) => Promise<Response>;

/**
 * Wraps a cron route: checks CRON_SECRET, records a JobRun before the job
 * starts (so a run killed by the time limit still shows up, unfinished), then
 * stores the response status and a short summary of its JSON body. A 4xx/5xx
 * response or a thrown error marks the run failed.
 */
export function withJobRun<R extends Request>(job: string, handler: Handler<R>): Handler<R> {
  return async (req: R) => {
    const denied = assertCron(req);
    if (denied) return denied;
    const started = Date.now();
    let runId: string | null = null;
    try {
      runId = (await prisma.jobRun.create({ data: { job } })).id;
    } catch (e) {
      console.error("[ops] could not record job run", e);
    }
    const finish = async (data: { ok: boolean; status: number; summary?: unknown; error?: string }) => {
      if (!runId) return;
      try {
        await prisma.jobRun.update({
          where: { id: runId },
          data: { finishedAt: new Date(), ok: data.ok, status: data.status, summary: (data.summary ?? undefined) as object | undefined, error: clip(data.error, 2000) },
        });
      } catch (e) {
        console.error("[ops] could not record job result", e);
      }
    };
    try {
      const res = await handler(req);
      let body: unknown = null;
      try {
        const text = await res.clone().text();
        body = text.length > 4000 ? { truncated: text.slice(0, 4000) } : JSON.parse(text);
      } catch {
        body = null;
      }
      const ok = res.status < 400;
      const bodyError = (body as { error?: unknown } | null)?.error;
      await finish({
        ok, status: res.status,
        summary: { ms: Date.now() - started, ...(body && typeof body === "object" ? body : { body }) },
        error: ok ? undefined : typeof bodyError === "string" ? bodyError : `HTTP ${res.status}`,
      });
      return res;
    } catch (err) {
      await finish({ ok: false, status: 500, error: err instanceof Error ? err.message : String(err) });
      await reportError(`cron:${job}`, err);
      return NextResponse.json({ error: `${job} failed` }, { status: 500 });
    }
  };
}
