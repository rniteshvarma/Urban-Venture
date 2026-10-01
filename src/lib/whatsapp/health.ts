/**
 * Provider health, account quality and messaging-tier usage.
 * Health checks are recorded (WhatsAppProviderHealth); quality YELLOW/RED and
 * 80% tier usage raise admin alerts.
 */
import prisma from "../prisma";
import { getWhatsAppProvider, isDryRun } from "./index";
import type { AccountInfo } from "./types";
import { raiseAlert } from "./alerts";

let accountCache: { at: number; info: AccountInfo | null } | null = null;
const ACCOUNT_TTL_MS = 60 * 60_000;

export async function getAccountInfo(force = false): Promise<AccountInfo | null> {
  if (!force && accountCache && Date.now() - accountCache.at < ACCOUNT_TTL_MS) return accountCache.info;
  const provider = getWhatsAppProvider();
  const info = provider.getAccountInfo && !isDryRun(provider) ? await provider.getAccountInfo().catch(() => null) : null;
  accountCache = { at: Date.now(), info };
  return info;
}

export async function onQualityChange(quality: AccountInfo["qualityRating"], limitLabel?: string): Promise<void> {
  if (quality === "YELLOW" || quality === "RED") {
    await raiseAlert(
      "QUALITY",
      quality === "RED" ? "CRITICAL" : "WARN",
      `WhatsApp number quality is ${quality}${limitLabel ? ` (tier ${limitLabel})` : ""}. Marketing sends risk a tier downgrade — pause broadcasts and review recent blocks/reports.`,
      `quality:${quality}`,
    );
  }
}

export async function runHealthCheck(): Promise<{ ok: boolean; detail?: string; latencyMs?: number; provider: string; account: AccountInfo | null }> {
  const provider = getWhatsAppProvider();
  const result = await provider.healthCheck().catch((e) => ({ ok: false, detail: e instanceof Error ? e.message : String(e), latencyMs: undefined }));
  await prisma.whatsAppProviderHealth.create({
    data: { provider: provider.name, ok: result.ok, latencyMs: result.latencyMs ?? null, detail: result.detail?.slice(0, 500) ?? null },
  });
  if (!result.ok && !isDryRun(provider)) {
    await raiseAlert("HEALTH", "CRITICAL", `${provider.name} health check failed: ${result.detail ?? "no detail"}`, `health:${provider.name}`);
  }
  const account = await getAccountInfo(true);
  if (account) await onQualityChange(account.qualityRating, account.messagingLimitLabel);
  return { ...result, provider: provider.name, account };
}

/** Unique recipients of business-initiated (template) messages in the last 24h. */
export async function uniqueRecipients24h(): Promise<number> {
  const rows = await prisma.whatsAppLog.findMany({
    where: { sentAt: { gte: new Date(Date.now() - 24 * 3600_000) }, templateName: { not: null }, dryRun: false, status: { not: "FAILED" } },
    distinct: ["toPhone"],
    select: { toPhone: true },
  });
  return rows.length;
}

export function tierLimitFallback(): number {
  const v = Number(process.env.WA_MESSAGING_TIER_LIMIT ?? 1000);
  return Number.isFinite(v) && v > 0 ? v : 1000;
}

let lastTierCheck = 0;

/** Alert at 80% of the messaging tier. Throttled to once per 5 minutes per instance. */
export async function checkTierUsage(force = false): Promise<{ used: number; limit: number }> {
  const account = await getAccountInfo();
  const limit = account?.messagingLimit ?? tierLimitFallback();
  if (!force && Date.now() - lastTierCheck < 5 * 60_000) return { used: -1, limit };
  lastTierCheck = Date.now();
  const used = await uniqueRecipients24h();
  if (used >= limit * 0.8) {
    await raiseAlert(
      "TIER_USAGE",
      used >= limit ? "CRITICAL" : "WARN",
      `${used.toLocaleString("en-IN")} of ${limit.toLocaleString("en-IN")} unique recipients used in the last 24h (${Math.round((used / limit) * 100)}% of the messaging tier). Further template sends will be refused once the tier is exhausted.`,
      `tier:${used >= limit ? "100" : "80"}`,
    );
  }
  return { used, limit };
}
