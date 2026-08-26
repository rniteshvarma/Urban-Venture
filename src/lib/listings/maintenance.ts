// Scheduled maintenance for seller listings (Part 9). Called by the cron routes.
// Keeps side effects here so the routes stay thin and this stays unit-testable.

import prisma from "@/lib/prisma";
import { scoreAndPersist, scorePreview } from "./score-io";
import { logListingActivity } from "./seller";

/** Recompute listingScore for every approved seller listing. */
export async function rescoreApprovedListings(): Promise<{ rescored: number }> {
  const ids = await prisma.project.findMany({
    where: { listingSource: "SELLER", listingStatus: "APPROVED" },
    select: { id: true },
  });
  let rescored = 0;
  for (const { id } of ids) {
    try { await scoreAndPersist(id); rescored++; } catch (e) { console.error("rescore failed", id, e); }
  }
  return { rescored };
}

/** Approved listings whose 90-day validity lapsed without a refresh → EXPIRED. */
export async function expireStaleListings(now = new Date()): Promise<{ expired: number }> {
  const stale = await prisma.project.findMany({
    where: { listingSource: "SELLER", listingStatus: "APPROVED", expiresAt: { lt: now } },
    select: { id: true },
  });
  for (const { id } of stale) {
    await prisma.project.update({ where: { id }, data: { listingStatus: "EXPIRED", status: "UPCOMING" } });
    await logListingActivity(id, "EDITED", { role: "SYSTEM" }, "Listing expired (90 days without refresh)");
  }
  return { expired: stale.length };
}

/**
 * Listings approaching expiry (7 and 1 day out) and drafts idle 7+ days.
 * There is no seller-notification channel wired yet, so we record the nudge as
 * an activity event (admin-visible) rather than silently pretending to notify.
 */
export async function nudgeExpiryAndDrafts(now = new Date()): Promise<{ expiryWarnings: number; draftNudges: number }> {
  const day = 86_400_000;
  const soon = await prisma.project.findMany({
    where: { listingSource: "SELLER", listingStatus: "APPROVED", expiresAt: { gte: now, lte: new Date(now.getTime() + 7 * day) } },
    select: { id: true, expiresAt: true },
  });
  for (const l of soon) {
    const daysLeft = Math.ceil((l.expiresAt!.getTime() - now.getTime()) / day);
    if (daysLeft === 7 || daysLeft === 1) await logListingActivity(l.id, "EDITED", { role: "SYSTEM" }, `Expiry reminder: ${daysLeft} day(s) left — refresh to keep it live`);
  }

  const staleDrafts = await prisma.project.findMany({
    where: { listingSource: "SELLER", listingStatus: "DRAFT", updatedAt: { lt: new Date(now.getTime() - 7 * day) } },
    select: { id: true },
  });
  for (const d of staleDrafts) await logListingActivity(d.id, "EDITED", { role: "SYSTEM" }, "Draft idle 7+ days — a nudge to finish and submit");

  return { expiryWarnings: soon.length, draftNudges: staleDrafts.length };
}

/** Enquiries unviewed for 48h → nudge (affects the freshness component). */
export async function enquirySlaSweep(now = new Date()): Promise<{ overdue: number }> {
  const overdue = await prisma.listingEnquiry.findMany({
    where: { sellerViewedAt: null, status: "NEW", createdAt: { lt: new Date(now.getTime() - 48 * 3_600_000) }, project: { listingSource: "SELLER" } },
    select: { id: true, projectId: true },
  });
  for (const e of overdue) await logListingActivity(e.projectId, "EDITED", { role: "SYSTEM" }, `Enquiry ${e.id} unviewed for 48h`);
  return { overdue: overdue.length };
}

/**
 * Weekly score snapshots + locality benchmarks (avg views / enquiries per
 * village) for the seller performance chart.
 */
export async function writeScoreSnapshots(): Promise<{ snapshots: number }> {
  const listings = await prisma.project.findMany({
    where: { listingSource: "SELLER", listingStatus: "APPROVED" },
    select: { id: true, villageId: true, viewCount: true, enquiryCount: true },
  });

  // locality benchmarks per village
  const byVillage = new Map<string, { views: number[]; enquiries: number[] }>();
  for (const l of listings) {
    if (!l.villageId) continue;
    const b = byVillage.get(l.villageId) ?? { views: [], enquiries: [] };
    b.views.push(l.viewCount); b.enquiries.push(l.enquiryCount);
    byVillage.set(l.villageId, b);
  }
  const avg = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);

  let count = 0;
  for (const l of listings) {
    const result = await scorePreview(l.id);
    if (!result) continue;
    const b = result.breakdown;
    const loc = l.villageId ? byVillage.get(l.villageId) : undefined;
    await prisma.listingScoreSnapshot.create({
      data: {
        projectId: l.id,
        listingScore: b.total,
        locationScore: b.location.points,
        priceScore: b.price.points,
        qualityScore: b.quality.points,
        trustScore: b.trust.points,
        freshnessScore: b.freshness.points,
        viewCount: l.viewCount,
        enquiryCount: l.enquiryCount,
        localityAvgViews: loc ? avg(loc.views) : null,
        localityAvgEnquiries: loc ? avg(loc.enquiries) : null,
      },
    });
    count++;
  }
  return { snapshots: count };
}
