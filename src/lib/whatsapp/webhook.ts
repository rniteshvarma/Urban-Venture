/**
 * Webhook intake: verify → normalise → persist → ACK. Processing happens
 * after the response (next/server `after`), so providers get their 200 in
 * milliseconds — Meta retries aggressively and disables slow webhooks. Rows
 * left PENDING (a crashed instance) are swept by the WhatsApp cron.
 */
import { createHash } from "node:crypto";
import { after } from "next/server";
import type { Prisma } from "@prisma/client";
import prisma from "../prisma";
import { getWhatsAppProvider } from "./index";
import type { NormalisedInboundEvent, WhatsAppProvider } from "./types";
import { handleEvent } from "./events";

const MAX_ATTEMPTS = 5;
const STUCK_MS = 5 * 60_000;

const toJson = (v: unknown) => JSON.parse(JSON.stringify(v ?? null)) as Prisma.InputJsonValue;

export function eventDedupeKey(provider: string, ev: NormalisedInboundEvent): string {
  const identity = ev.providerMessageId
    ? [ev.providerMessageId, ev.deliveryStatus ?? ""]
    : [ev.templateName ?? "", ev.templateLanguage ?? "", ev.templateStatus ?? "", ev.qualityRating ?? "", JSON.stringify(ev.rawPayload ?? null)];
  return createHash("sha256").update([provider, ev.eventType, ...identity].join("|")).digest("hex");
}

/** Persist events; returns ids of the ones not seen before (redeliveries are skipped). */
export async function enqueueEvents(provider: string, events: NormalisedInboundEvent[]): Promise<string[]> {
  if (!events.length) return [];
  const created = await prisma.whatsAppWebhookEvent.createManyAndReturn({
    data: events.map((ev) => {
      const { rawPayload, ...event } = ev;
      return {
        provider,
        dedupeKey: eventDedupeKey(provider, ev),
        eventType: ev.eventType,
        providerMessageId: ev.providerMessageId ?? null,
        fromPhone: ev.from ?? null,
        event: toJson(event),
        rawPayload: toJson(rawPayload),
        receivedAt: new Date(),
      };
    }),
    skipDuplicates: true,
    select: { id: true },
  });
  return created.map((c) => c.id);
}

function rehydrate(json: Prisma.JsonValue, raw: Prisma.JsonValue): NormalisedInboundEvent {
  const ev = json as unknown as NormalisedInboundEvent & { timestamp: string };
  return { ...ev, timestamp: new Date(ev.timestamp), rawPayload: raw };
}

/** Process one queued event, claiming it first so after() and the cron never double-handle it. */
export async function processEvent(id: string): Promise<string | null> {
  const claim = await prisma.whatsAppWebhookEvent.updateMany({
    where: {
      id,
      OR: [
        { status: "PENDING" },
        { status: "FAILED", attempts: { lt: MAX_ATTEMPTS } },
        { status: "PROCESSING", processedAt: { lt: new Date(Date.now() - STUCK_MS) } },
      ],
    },
    data: { status: "PROCESSING", attempts: { increment: 1 }, processedAt: new Date() },
  });
  if (!claim.count) return null;

  const row = await prisma.whatsAppWebhookEvent.findUniqueOrThrow({ where: { id } });
  try {
    const { handled } = await handleEvent(rehydrate(row.event, row.rawPayload), row.id);
    await prisma.whatsAppWebhookEvent.update({ where: { id }, data: { status: "DONE", error: handled.slice(0, 500), processedAt: new Date() } });
    return handled;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[whatsapp:webhook] event ${id} failed:`, err);
    await prisma.whatsAppWebhookEvent.update({ where: { id }, data: { status: "FAILED", error: message.slice(0, 500), processedAt: new Date() } });
    return null;
  }
}

/** Process the given ids, or sweep anything pending/failed/stuck. */
export async function processPending(ids?: string[], limit = 100): Promise<{ processed: number }> {
  const targets =
    ids ??
    (
      await prisma.whatsAppWebhookEvent.findMany({
        where: {
          OR: [
            { status: "PENDING" },
            { status: "FAILED", attempts: { lt: MAX_ATTEMPTS } },
            { status: "PROCESSING", processedAt: { lt: new Date(Date.now() - STUCK_MS) } },
          ],
        },
        orderBy: { receivedAt: "asc" },
        take: limit,
        select: { id: true },
      })
    ).map((r) => r.id);
  let processed = 0;
  for (const id of targets) if ((await processEvent(id)) !== null) processed++;
  return { processed };
}

const inflight = new Set<Promise<unknown>>();

/** Scripts/tests: wait for background processing started outside a request scope. */
export async function drainWebhookProcessing(): Promise<void> {
  while (inflight.size) await Promise.all([...inflight]);
}

/** The whole webhook: used by /api/webhooks/whatsapp and the legacy routes. */
export async function handleWhatsAppWebhook(req: Request, provider: WhatsAppProvider = getWhatsAppProvider()): Promise<Response> {
  const rawBody = await req.text(); // RAW, for signature checks

  if (!(await provider.verifyWebhook(req, rawBody))) {
    return new Response("Invalid signature", { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const events = provider.parseWebhook(payload);
  // Persisting is the queue: if this throws we return 500 and the provider redelivers.
  const ids = await enqueueEvents(provider.name, events);
  if (ids.length) {
    try {
      after(() => processPending(ids));
    } catch {
      // Outside a Next request scope (scripts, tests): process in the background.
      const job = processPending(ids)
        .catch((e) => console.error("[whatsapp:webhook] processing failed", e))
        .finally(() => inflight.delete(job));
      inflight.add(job);
    }
  }

  return new Response("OK", { status: 200 });
}

export function handleWhatsAppChallenge(req: Request, provider: WhatsAppProvider = getWhatsAppProvider()): Response {
  return provider.handleWebhookChallenge?.(req) ?? new Response("Not found", { status: 404 });
}
