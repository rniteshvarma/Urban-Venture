// Turns an assembled report into stored rows: the WeeklyReport (frozen
// snapshot), the ReportItem ledger (what prevents repeats), and PENDING
// ReportDelivery rows the delivery pass will pick up.
//
// `previewReport` does the same assembly WITHOUT writing anything — for admin
// preview and the user's own "see my next report", so a preview never pollutes
// the dedup ledger.

import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { assembleReport } from "./assemble";
import { generateHeadline, type HeadlineOutput } from "./headline";
import type { AssembledReport, PrefSnapshot } from "./types";
import { isPlaceholderEmail } from "../placeholder-email";

const EXPIRY_DAYS = 60;
const MIN_ITEMS = 3; // Constraint 2 — below this, skip and alert admin

export interface PreviewResult {
  assembled: AssembledReport;
  headline: HeadlineOutput;
  pref: PrefSnapshot;
}

async function prefSnapshot(userId: string): Promise<PrefSnapshot> {
  const p = await prisma.reportPreference.findUnique({ where: { userId } });
  return {
    city: p?.city ?? "Hyderabad",
    budgetMinLakh: p?.budgetMinLakh ?? null,
    budgetMaxLakh: p?.budgetMaxLakh ?? null,
    areaSlugs: p?.areaSlugs ?? [],
    propertyTypes: (p?.propertyTypes ?? []) as string[],
    horizonYears: p?.horizonYears ?? null,
  };
}

/** Assemble + headline with NO writes. Used by admin preview and self-preview. */
export async function previewReport(userId: string, periodStart: Date, periodEnd: Date, now = new Date()): Promise<PreviewResult> {
  const assembled = await assembleReport(userId, periodStart, periodEnd, now);
  const headline = await generateHeadline(assembled.topThree, await prefSnapshot(userId));
  return { assembled, headline, pref: await prefSnapshot(userId) };
}

export interface GenerateResult {
  reportId: string | null;
  status: "GENERATED" | "SKIPPED";
  issueNumber: number;
  itemCount: number;
  fallbackLevel: number;
}

/**
 * Generate and persist a user's report for a period. Idempotent per period:
 * if one already exists it is returned untouched. Below MIN_ITEMS the report is
 * recorded SKIPPED and nothing is sent (a pipeline problem, not a user problem).
 */
export async function generateAndStore(
  userId: string,
  periodStart: Date,
  periodEnd: Date,
  now = new Date(),
  opts: { minItems?: number } = {},
): Promise<GenerateResult> {
  const minItems = opts.minItems ?? MIN_ITEMS;
  // Skip if a report already exists for this period (Part 6.1 step 2).
  const existing = await prisma.weeklyReport.findFirst({
    where: { userId, periodStart: { lte: periodEnd }, periodEnd: { gte: periodStart } },
    select: { id: true, issueNumber: true, status: true, itemCount: true, fallbackLevel: true },
  });
  if (existing) {
    return { reportId: existing.id, status: existing.status === "SKIPPED" ? "SKIPPED" : "GENERATED", issueNumber: existing.issueNumber, itemCount: existing.itemCount, fallbackLevel: existing.fallbackLevel ?? 1 };
  }

  const startedAt = Date.now();
  const assembled = await assembleReport(userId, periodStart, periodEnd, now);

  const last = await prisma.weeklyReport.findFirst({ where: { userId }, orderBy: { issueNumber: "desc" }, select: { issueNumber: true } });
  const issueNumber = (last?.issueNumber ?? 0) + 1;

  // Below the floor → record SKIPPED, send nothing, surface for admin review.
  if (assembled.itemCount < minItems) {
    const skipped = await prisma.weeklyReport.create({
      data: {
        userId, issueNumber, periodStart, periodEnd,
        expiresAt: new Date(now.getTime() + EXPIRY_DAYS * 86_400_000),
        content: assembled.content as unknown as Prisma.InputJsonValue,
        topThree: assembled.topThree as unknown as Prisma.InputJsonValue,
        headline: "", itemCount: assembled.itemCount, usedFallback: assembled.usedFallback,
        fallbackLevel: assembled.fallbackLevel, status: "SKIPPED", generatedAt: new Date(),
      },
      select: { id: true },
    });
    console.error(`[reports] SKIPPED user ${userId} issue ${issueNumber}: only ${assembled.itemCount} items — check the data pipeline`);
    return { reportId: skipped.id, status: "SKIPPED", issueNumber, itemCount: assembled.itemCount, fallbackLevel: assembled.fallbackLevel };
  }

  const pref = await prefSnapshot(userId);
  const headline = await generateHeadline(assembled.topThree, pref);
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, phone: true } });
  const prefRow = await prisma.reportPreference.findUnique({ where: { userId } });

  // The full headline set (subject/preheader/headline/whatsappOpener) travels
  // inside content under `_headline`, so every renderer reads one frozen blob.
  const contentWithHeadline = { ...assembled.content, _headline: headline };

  const report = await prisma.weeklyReport.create({
    data: {
      userId, issueNumber, periodStart, periodEnd,
      expiresAt: new Date(now.getTime() + EXPIRY_DAYS * 86_400_000),
      content: contentWithHeadline as unknown as Prisma.InputJsonValue,
      topThree: assembled.topThree as unknown as Prisma.InputJsonValue,
      headline: headline.headline, // the web-report opening line
      itemCount: assembled.itemCount, usedFallback: assembled.usedFallback, fallbackLevel: assembled.fallbackLevel,
      status: "GENERATED", generatedAt: new Date(), generationMs: Date.now() - startedAt,
      items: {
        create: assembled.items.map((it) => ({
          userId, itemType: it.itemType, entityId: it.entityId, entityHash: it.entityHash, section: it.section, position: it.position,
        })),
      },
    },
    select: { id: true },
  });

  // PENDING deliveries for enabled channels with a usable destination.
  const deliveries: Prisma.ReportDeliveryCreateManyInput[] = [];
  if ((prefRow?.channelEmail ?? true) && user?.email && !isPlaceholderEmail(user.email)) deliveries.push({ reportId: report.id, channel: "EMAIL", destination: user.email });
  if ((prefRow?.channelWhatsApp ?? true) && user?.phone) deliveries.push({ reportId: report.id, channel: "WHATSAPP", destination: user.phone });
  if (deliveries.length) await prisma.reportDelivery.createMany({ data: deliveries });

  return { reportId: report.id, status: "GENERATED", issueNumber, itemCount: assembled.itemCount, fallbackLevel: assembled.fallbackLevel };
}
