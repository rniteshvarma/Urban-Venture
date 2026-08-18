import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import { resolveUserState } from "@/lib/user-state";

function greetingFor(date = new Date()): string {
  const istMin = (date.getUTCHours() * 60 + date.getUTCMinutes() + 330) % (24 * 60);
  const h = istMin / 60;
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function currentPrice(cp: { plotPriceMidSqYd: number | null; plotPriceMinSqYd: number | null } | null): number | null {
  return cp?.plotPriceMidSqYd ?? cp?.plotPriceMinSqYd ?? null;
}

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true, email: true, phone: true, phoneVerified: true, budget: true, horizon: true,
      preferredCity: true, profileScore: true, lastDashboardVisitAt: true, lastLoginAt: true,
      leads: {
        orderBy: { createdAt: "desc" },
        select: { id: true, assignedTo: true, roadmap: { select: { stages: { select: { order: true, status: true, stageKey: true, scheduledAt: true } } } } },
      },
    },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [purchasesCount, savedProjectsRaw, watches, reportsRaw, lastSearch] = await Promise.all([
    prisma.propertyPurchase.count({ where: { userId } }),
    prisma.savedProject.findMany({ where: { userId }, orderBy: { savedAt: "desc" }, include: { project: true } }),
    prisma.corridorWatch.findMany({ where: { userId }, orderBy: { watchedAt: "desc" } }),
    prisma.savedReport.findMany({ where: { userId }, orderBy: [{ isPinned: "desc" }, { savedAt: "desc" }], include: { search: { select: { budget: true, horizon: true, city: true, createdAt: true } } } }),
    prisma.search.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } }),
  ]);

  const lead = user.leads[0];
  const state = resolveUserState(purchasesCount, lead?.roadmap?.stages ?? []);

  // ── Watchlist growth ("since you watched") ──
  const corridors = await Promise.all(
    watches.map(async (w) => {
      const cp = await prisma.corridorProfile.findUnique({
        where: { slug: w.corridorSlug },
        select: { name: true, plotPriceMidSqYd: true, plotPriceMinSqYd: true, overallScore: true },
      });
      const priceNow = currentPrice(cp);
      const scoreNow = cp?.overallScore ?? null;
      return {
        slug: w.corridorSlug,
        name: cp?.name ?? w.corridorSlug,
        watchedAt: w.watchedAt,
        priceNow,
        scoreNow,
        priceDeltaPct: w.priceAtWatchSqYd && priceNow ? ((priceNow - w.priceAtWatchSqYd) / w.priceAtWatchSqYd) * 100 : null,
        scoreDelta: w.scoreAtWatch != null && scoreNow != null ? scoreNow - w.scoreAtWatch : null,
      };
    })
  );

  const savedProjects = savedProjectsRaw.map((s) => ({
    id: s.id,
    projectId: s.projectId,
    note: s.note,
    name: s.project.name,
    developer: s.project.developer,
    corridor: s.project.corridor,
    city: s.project.city,
    minBudgetLakhs: s.project.minBudgetLakhs,
    maxBudgetLakhs: s.project.maxBudgetLakhs,
    riskLevel: s.project.riskLevel,
    propertyType: s.project.propertyType,
    imageUrls: s.project.imageUrls,
  }));

  const reports = reportsRaw.map((r) => ({
    id: r.id, title: r.title, isPinned: r.isPinned, savedAt: r.savedAt,
    budget: r.search.budget, horizon: r.search.horizon, city: r.search.city,
  }));

  // ── Next Best Action (priority ladder; owner-only items are inert for explorers) ──
  const movedCorridor = corridors.find((c) => c.priceDeltaPct != null && Math.abs(c.priceDeltaPct) >= 5);
  let nextAction;
  if (!user.phoneVerified && user.phone) {
    nextAction = { key: "verify", icon: "phone", title: "Verify your mobile number", sub: "Get AI reports and updates on WhatsApp.", cta: "Verify", href: "/dashboard/profile" };
  } else if (user.budget == null || user.horizon == null) {
    nextAction = { key: "profile", icon: "sliders", title: "Set your investment profile", sub: "Budget and horizon unlock matched projects.", cta: "Set up", href: "/dashboard/profile" };
  } else if (reports.length === 0) {
    nextAction = { key: "report", icon: "sparkles", title: "Get your first AI report", sub: "Corridors, risk scores, and exit timing in seconds.", cta: "Start", href: "/research" };
  } else if (savedProjects.length >= 3) {
    nextAction = { key: "visit", icon: "map", title: "Book a site visit", sub: `You've shortlisted ${savedProjects.length} projects.`, cta: "Book", href: "/dashboard/saved" };
  } else if (movedCorridor) {
    const dir = (movedCorridor.priceDeltaPct as number) >= 0 ? "up" : "down";
    nextAction = { key: "watch", icon: "trend", title: `${movedCorridor.name.split("—")[0].trim()} is ${dir} ${Math.abs(movedCorridor.priceDeltaPct as number).toFixed(1)}%`, sub: "A corridor you watch moved — review it.", cta: "Review", href: `/market/${movedCorridor.slug}` };
  } else {
    nextAction = { key: "explore", icon: "compass", title: "Explore corridors on the map", sub: "See where Hyderabad is moving next.", cta: "Explore", href: "/market" };
  }

  // ── Resume ──
  const lastReport = reports[0] ?? null;
  const continueSearch = lastSearch ? { budget: lastSearch.budget, horizon: lastSearch.horizon, city: lastSearch.city } : null;

  // ── Advisor (generic until AGENT users exist) ──
  const advisor = { generic: true as const, name: "Urban Ventures Advisory", role: "Talk to an investment advisor", whatsapp: "+919876543210" };

  return NextResponse.json({
    state,
    greeting: greetingFor(),
    user: {
      firstName: (user.name || "there").split(" ")[0],
      name: user.name,
      email: user.email,
      profileScore: user.profileScore,
      phoneVerified: user.phoneVerified,
      lastDashboardVisitAt: user.lastDashboardVisitAt,
    },
    resume: { lastReport, continueSearch },
    nextAction,
    advisor,
    saved: { projects: savedProjects, corridors, reports },
    counts: { projects: savedProjects.length, corridors: corridors.length, reports: reports.length },
  });
}
