/**
 * Spend reporting from our own WhatsAppLog — by category, by feature, the
 * service-conversation allowance, and WhatsApp cost per converted lead.
 * Dry-run and failed sends cost nothing and are excluded.
 */
import prisma from "../prisma";
import { monthStartIST, ratesPaise, serviceFreeTier } from "./cost";
import { serviceConversationsThisMonth } from "./send";

export interface SpendSummary {
  since: string;
  byCategory: Array<{ category: string; messages: number; paise: number }>;
  byFeature: Array<{ feature: string; messages: number; paise: number }>;
  service: { conversations: number; freeTier: number; beyondFreeTier: number; paise: number };
  totalPaise: number;
  perConvertedLead: { convertedLeads: number; paise: number; perLeadPaise: number | null };
  rates: Record<string, number>;
}

const CATEGORY_ORDER = ["MARKETING", "UTILITY", "AUTHENTICATION", "SERVICE"];

export async function spendThisMonth(): Promise<SpendSummary> {
  const since = monthStartIST();
  const billable = { sentAt: { gte: since }, dryRun: false, status: { not: "FAILED" as const } };

  const [byCat, byFeat, conversations, converted] = await Promise.all([
    prisma.whatsAppLog.groupBy({ by: ["category"], where: billable, _count: { _all: true }, _sum: { estimatedCostPaise: true } }),
    prisma.whatsAppLog.groupBy({ by: ["feature"], where: billable, _count: { _all: true }, _sum: { estimatedCostPaise: true } }),
    serviceConversationsThisMonth(),
    prisma.whatsAppLog.aggregate({
      where: { dryRun: false, status: { not: "FAILED" }, lead: { status: "CONVERTED" } },
      _sum: { estimatedCostPaise: true },
    }),
  ]);
  const convertedLeads = await prisma.lead.count({ where: { status: "CONVERTED", whatsAppLogs: { some: { dryRun: false } } } });

  const byCategory = CATEGORY_ORDER.map((category) => {
    const row = byCat.find((r) => r.category === category);
    return { category, messages: row?._count._all ?? 0, paise: row?._sum.estimatedCostPaise ?? 0 };
  });
  const byFeature = byFeat
    .map((r) => ({ feature: r.feature ?? "other", messages: r._count._all, paise: r._sum.estimatedCostPaise ?? 0 }))
    .sort((a, b) => b.paise - a.paise || b.messages - a.messages);

  const freeTier = serviceFreeTier();
  const beyond = Math.max(0, conversations - freeTier);
  const servicePaise = beyond * ratesPaise().SERVICE;
  // Service is priced per conversation, not per message: replace the per-message sum.
  const serviceRow = byCategory.find((c) => c.category === "SERVICE")!;
  serviceRow.paise = servicePaise;

  const convertedPaise = converted._sum.estimatedCostPaise ?? 0;
  return {
    since: since.toISOString(),
    byCategory,
    byFeature,
    service: { conversations, freeTier, beyondFreeTier: beyond, paise: servicePaise },
    totalPaise: byCategory.reduce((s, c) => s + c.paise, 0),
    perConvertedLead: { convertedLeads, paise: convertedPaise, perLeadPaise: convertedLeads ? Math.round(convertedPaise / convertedLeads) : null },
    rates: ratesPaise(),
  };
}
