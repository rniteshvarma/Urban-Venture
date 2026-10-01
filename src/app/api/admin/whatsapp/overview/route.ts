// GET /api/admin/whatsapp/overview — everything the WhatsApp settings page shows.
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { activeProviderName, getProviderByName, getTemplateSource, isDryRun, PROVIDER_LABELS, PROVIDER_NAMES } from "@/lib/whatsapp";
import { getAccountInfo, tierLimitFallback, uniqueRecipients24h } from "@/lib/whatsapp/health";
import { spendThisMonth } from "@/lib/whatsapp/spend";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;

  try {
    const name = activeProviderName();
    const provider = getProviderByName(name);
    const [account, lastHealth, templates, alerts, spend, used24h, queue, suppressed, crmTemplates] = await Promise.all([
      getAccountInfo(),
      prisma.whatsAppProviderHealth.findFirst({ where: { provider: name }, orderBy: { checkedAt: "desc" } }),
      prisma.whatsAppTemplateRegistry.findMany({ orderBy: [{ status: "asc" }, { name: "asc" }] }),
      prisma.whatsAppAlert.findMany({ where: { acknowledgedAt: null }, orderBy: { createdAt: "desc" }, take: 20 }),
      spendThisMonth(),
      uniqueRecipients24h(),
      prisma.whatsAppWebhookEvent.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.whatsAppSuppression.count(),
      prisma.whatsAppTemplate.findMany({ where: { wabaTemplateName: { not: null } }, select: { name: true, wabaTemplateName: true, wabaLanguage: true } }),
    ]);

    const templateSource = getTemplateSource();
    const inUse = new Set(crmTemplates.map((t) => `${t.wabaTemplateName}|${t.wabaLanguage}`));
    inUse.add(`${process.env.WA_OTP_TEMPLATE || "signup_otp_v1"}|${process.env.WA_OTP_LANGUAGE || "en"}`);

    return NextResponse.json({
      provider: {
        name,
        label: PROVIDER_LABELS[name],
        dryRun: isDryRun(provider),
        supportsTemplateManagement: provider.supportsTemplateManagement,
        supportsSessionMessages: provider.supportsSessionMessages,
        config: provider.configStatus(),
        templateSource: templateSource?.name ?? null,
        webhookUrl: "/api/webhooks/whatsapp",
      },
      providers: PROVIDER_NAMES.map((n) => ({ name: n, label: PROVIDER_LABELS[n], configured: getProviderByName(n).isConfigured() })),
      account,
      lastHealth,
      tier: { used24h, limit: account?.messagingLimit ?? tierLimitFallback(), fromAccount: !!account?.messagingLimit },
      templates: templates.map((t) => ({ ...t, inUse: inUse.has(`${t.name}|${t.language}`) })),
      alerts,
      spend,
      queue: Object.fromEntries(queue.map((q) => [q.status, q._count._all])),
      suppressed,
    });
  } catch (error) {
    console.error("GET /api/admin/whatsapp/overview", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
  }
}
