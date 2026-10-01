/**
 * Load the researched Hyderabad developer inventory (prisma/data/hyderabad-inventory.json)
 * into Project / ProjectUnitType / ProjectMedia, rated with inventory-v1.
 *
 *   npx tsx --env-file=.env.local scripts/inventory/seed-inventory.ts [--dry-run] [--keep-dummies]
 *
 * Safe to re-run: projects are upserted by specifications.inventoryKey and their
 * unit types / media are rebuilt. It also removes the 8 placeholder projects the
 * original prisma/seed.ts created — matched by exact name + developer, admin-owned
 * and MANUAL-sourced, so a project anyone added by hand is never touched.
 */
import fs from "node:fs";
import path from "node:path";
import type { Prisma } from "@prisma/client";
import prisma from "../../src/lib/prisma";
import { rateProject, horizonFor, median, haversineKm, type InventoryType } from "../../src/lib/inventory/rating";
import { zoneFor } from "../../src/lib/inventory/zones";

const DRY = process.argv.includes("--dry-run");
const KEEP_DUMMIES = process.argv.includes("--keep-dummies");
const DATA = path.join(process.cwd(), "prisma/data/hyderabad-inventory.json");

// The placeholder projects shipped in the original prisma/seed.ts.
const DUMMIES: [string, string][] = [
  ["Elite Green Meadows", "Aura Developers"],
  ["Pharma City Valley", "Vertex Group"],
  ["Sangareddy Heights", "True Space Projects"],
  ["Aura One Kokapet", "Prestige Group"],
  ["Aerotropolis Enclave", "GMR Infra Projects"],
  ["Temple Town Vista", "Sri Lakshmi Developers"],
  ["Kompally Elite Villas", "Modi Properties"],
  ["Adibatla Tech Valley", "TCS Builders"],
];

interface Unit {
  label: string;
  category: "APARTMENT" | "VILLA" | "PLOT";
  bedrooms: number | null;
  carpetSqFt: number | null;
  builtUpSqFt: number | null;
  plotSqYd: number | null;
  priceLakh: number | null;
  ratePerSqFt?: number | null;
  ratePerSqYd?: number | null;
  priceNote?: string | null;
}

export interface InventoryRecord {
  key: string;
  name: string;
  developer: string;
  developerEstablished: number | null;
  propertyType: InventoryType;
  locality: string;
  subLocality: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  coordPrecision: "exact" | "approximate" | null;
  reraNumbers: string[];
  reraUrl: string | null;
  landAcres: number | null;
  towers: number | null;
  floors: string | null;
  plots: number | null;
  totalUnits: number | null;
  possessionRera: string | null;
  possessionTarget: string | null;
  status: "READY" | "UNDER_CONSTRUCTION";
  priceMinLakh: number;
  priceMaxLakh: number;
  units: Unit[];
  amenities: string[];
  images: string[];
  masterPlans: string[];
  floorPlans: string[];
  paymentPlans: string[];
  landmarks: { name: string; km: number }[];
  litigation: string | null;
  approvals: string[];
  sources: { name: string; url: string; accessed: string }[];
  flags: string[];
  description: string;
}

const LISTING_TYPE = { Apartment: "APARTMENT", Villa: "VILLA", Plots: "OPEN_PLOT" } as const;
const PERSONAS: Record<InventoryType, Prisma.ProjectCreateInput["targetPersonas"]> = {
  Apartment: ["PROFESSIONAL_FIRST_HOME", "FIRST_TIME_BUYER", "RENTAL_INCOME_SEEKER", "NRI_INVESTOR"],
  Villa: ["FAMILY_UPGRADER", "HNI_PORTFOLIO_BUILDER", "NRI_INVESTOR"],
  Plots: ["SELF_BUILD_HOMEOWNER", "LAND_BANKER", "LAND_SPECULATOR"],
};

/** Per-project rate metric used for the price-vs-locality comparison. */
function projectRate(r: InventoryRecord): number | null {
  const rates = r.units.map((u) => (r.propertyType === "Plots" ? u.ratePerSqYd : u.ratePerSqFt)).filter((x): x is number => !!x);
  return median(rates);
}

function sourceHost(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return "source"; }
}

function possessionText(r: InventoryRecord): string | null {
  if (r.status === "READY") return "Ready to move";
  const d = r.possessionRera ?? r.possessionTarget;
  if (!d) return null;
  const label = new Date(d).toLocaleString("en-IN", { month: "short", year: "numeric" });
  return `${r.possessionRera ? "RERA possession" : "Target possession"} ${label}`;
}

async function main() {
  const records: InventoryRecord[] = JSON.parse(fs.readFileSync(DATA, "utf8"));
  const now = new Date();
  console.log(`${records.length} inventory records${DRY ? " (dry run)" : ""}`);

  // ── peer medians: same type, same zone (≥3 projects) ──
  const zoneOf = new Map(records.map((r) => [r.key, zoneFor(r.locality, r.lat, r.lng) ?? r.locality]));
  const peers = new Map<string, number[]>();
  for (const r of records) {
    const rate = projectRate(r);
    if (!rate) continue;
    const k = `${zoneOf.get(r.key)}|${r.propertyType}`;
    peers.set(k, [...(peers.get(k) ?? []), rate]);
  }

  // ── nearest comparables (same type, with coordinates) ──
  function comparables(r: InventoryRecord): string[] {
    if (r.lat == null || r.lng == null) return [];
    return records
      .filter((o) => o.key !== r.key && o.propertyType === r.propertyType && o.lat != null && o.lng != null)
      .map((o) => ({ o, d: haversineKm({ lat: r.lat!, lng: r.lng! }, { lat: o.lat!, lng: o.lng! }) }))
      .filter((x) => x.d <= 6)
      .sort((a, b) => a.d - b.d)
      .slice(0, 4)
      .map(({ o, d }) => `${o.name} (${o.developer}) — ${d.toFixed(1)} km`);
  }

  // ── 1. remove the placeholder projects ──
  if (!KEEP_DUMMIES) {
    const dummies = await prisma.project.findMany({
      where: { OR: DUMMIES.map(([name, developer]) => ({ name, developer })), ownerId: null, sourceType: "MANUAL" },
      select: { id: true, name: true, _count: { select: { purchases: true } } },
    });
    const deletable = dummies.filter((d) => d._count.purchases === 0);
    for (const d of dummies.filter((x) => x._count.purchases > 0)) console.warn(`  ! keeping "${d.name}" — it has purchase records`);
    const ids = deletable.map((d) => d.id);
    console.log(`Removing ${ids.length} placeholder project(s): ${deletable.map((d) => d.name).join(", ") || "none"}`);
    if (!DRY && ids.length) {
      await prisma.$transaction([
        prisma.savedProject.deleteMany({ where: { projectId: { in: ids } } }),
        prisma.projectLeadMatch.deleteMany({ where: { projectId: { in: ids } } }),
        prisma.lead.updateMany({ where: { projectId: { in: ids } }, data: { projectId: null } }),
        prisma.project.deleteMany({ where: { id: { in: ids } } }),
      ]);
    }
  }

  // ── 2. upsert inventory ──
  const existing = await prisma.project.findMany({
    where: { sourceType: "CSV_IMPORT", listingSource: "ADMIN" },
    select: { id: true, specifications: true },
  });
  const idByKey = new Map<string, string>();
  for (const e of existing) {
    const k = (e.specifications as { inventoryKey?: string } | null)?.inventoryKey;
    if (k) idByKey.set(k, e.id);
  }

  const grades: Record<string, number> = {};
  let created = 0, updated = 0;
  for (const r of records) {
    const zone = zoneOf.get(r.key)!;
    const possession = r.possessionRera ?? r.possessionTarget;
    const rating = rateProject({
      propertyType: r.propertyType,
      reraRegistered: r.reraNumbers.length > 0,
      litigation: r.litigation === "Yes" ? "Yes" : r.litigation === "No" ? "No" : null,
      developerEstablished: r.developerEstablished,
      lat: r.lat, lng: r.lng,
      corridorScore: null,
      possession: r.status === "READY" ? now.toISOString() : possession,
      landAcres: r.landAcres, towers: r.towers,
      medianRate: projectRate(r),
      peerMedianRate: (() => { const p = peers.get(`${zone}|${r.propertyType}`) ?? []; return p.length >= 3 ? median(p) : null; })(),
      now,
    });
    grades[rating.grade] = (grades[rating.grade] ?? 0) + 1;
    const [minH, maxH] = horizonFor(r.propertyType, r.status === "READY" ? null : possession, now);

    const data = {
      name: r.name,
      developer: r.developer,
      corridor: zone,
      city: "Hyderabad",
      minBudgetLakhs: r.priceMinLakh,
      maxBudgetLakhs: r.priceMaxLakh,
      minHorizonYears: minH,
      maxHorizonYears: maxH,
      riskLevel: rating.riskLevel,
      propertyType: r.propertyType,
      infraHighlights: r.landmarks.slice(0, 8).map((l) => `${l.name} — ${l.km} km`),
      exitOpportunities: [] as string[],
      comparables: comparables(r),
      description: r.description,
      imageUrls: r.images.slice(0, 12),
      status: "ACTIVE" as const,
      reviewState: "PUBLISHED" as const,
      sourceType: "CSV_IMPORT" as const,
      reraNumber: r.reraNumbers.join(", ") || null,
      reraUrl: r.reraUrl,
      possessionDate: possession ? new Date(possession) : null,
      possessionText: possessionText(r),
      totalLandAcres: r.landAcres,
      totalUnits: r.totalUnits,
      towerCount: r.propertyType === "Apartment" ? r.towers : null,
      floorsPerTower: r.floors,
      amenities: r.amenities,
      approvals: r.approvals,
      addressLine: r.address,
      landmark: r.landmarks[0] ? `${r.landmarks[0].name} — ${r.landmarks[0].km} km` : null,
      latitude: r.lat,
      longitude: r.lng,
      paymentPlan: r.paymentPlans.length ? r.paymentPlans : undefined,
      specifications: {
        inventoryKey: r.key,
        locality: r.locality,
        subLocality: r.subLocality,
        developerEstablished: r.developerEstablished,
        constructionStatus: r.status,
        coordPrecision: r.coordPrecision,
        masterPlans: r.masterPlans,
        floorPlans: r.floorPlans,
        landmarks: r.landmarks,
        litigation: r.litigation,
        sources: r.sources,
        dataFlags: r.flags,
      },
      listingSource: "ADMIN" as const,
      listingStatus: "APPROVED" as const,
      approvedAt: now,
      listingTypes: [LISTING_TYPE[r.propertyType]],
      purposes: ["BOTH" as const],
      targetPersonas: PERSONAS[r.propertyType],
      totalPlots: r.propertyType === "Plots" ? r.plots ?? r.totalUnits : null,
      plotSizesSqYd: r.propertyType === "Plots" ? [...new Set(r.units.map((u) => u.plotSqYd).filter((x): x is number => !!x))].sort((a, b) => a - b) : [],
      reraVerified: false,
      listingScore: rating.total,
      scoreBreakdown: rating as unknown as Prisma.InputJsonValue,
      scoredAt: now,
    };

    const units = r.units.map((u, i) => ({
      label: u.label,
      unitCategory: u.category,
      bedrooms: u.bedrooms != null ? Math.round(u.bedrooms) : null,
      areaValue: u.plotSqYd ?? u.builtUpSqFt ?? u.carpetSqFt,
      areaUnit: u.plotSqYd ? ("SQYD" as const) : ("SQFT" as const),
      areaSqFt: u.plotSqYd ? u.plotSqYd * 9 : u.builtUpSqFt ?? u.carpetSqFt,
      areaSqYd: u.plotSqYd,
      carpetAreaSqFt: u.carpetSqFt,
      builtUpSqFt: u.builtUpSqFt,
      priceLakh: u.priceLakh,
      priceValue: u.priceLakh != null ? Math.round(u.priceLakh * 1e5) : null,
      ratePerSqFt: u.ratePerSqFt ?? null,
      ratePerSqYd: u.ratePerSqYd ?? null,
      priceNote: u.priceNote ?? null,
      displayOrder: i,
    }));

    const note = (url: string) => `Marketing image hotlinked from ${sourceHost(url)}; usage rights not cleared with the developer.`;
    const media = [
      ...r.images.map((u, i) => ({ fileUrl: u, mediaType: "ELEVATION" as const, isPrimary: i === 0, displayOrder: i })),
      ...r.masterPlans.map((u, i) => ({ fileUrl: u, mediaType: "MASTER_PLAN" as const, isPrimary: false, displayOrder: 100 + i })),
      ...r.floorPlans.map((u, i) => ({ fileUrl: u, mediaType: "FLOOR_PLAN" as const, isPrimary: false, displayOrder: 200 + i })),
    ].map((m) => ({
      ...m,
      mimeType: /\.png($|\?)/i.test(m.fileUrl) ? "image/png" : /\.webp($|\?)/i.test(m.fileUrl) ? "image/webp" : "image/jpeg",
      extractMethod: "DIRECT_UPLOAD" as const,
      rightsStatus: "UNVERIFIED" as const,
      rightsNote: note(m.fileUrl),
      isPublic: true,
      altText: `${r.name} — ${m.mediaType.replace("_", " ").toLowerCase()}`,
    }));

    if (DRY) continue;
    const id = idByKey.get(r.key);
    if (id) {
      await prisma.$transaction([
        prisma.projectUnitType.deleteMany({ where: { projectId: id } }),
        prisma.projectMedia.deleteMany({ where: { projectId: id } }),
        prisma.project.update({
          where: { id },
          data: { ...data, unitTypes: { create: units }, media: { create: media } },
        }),
      ]);
      updated++;
    } else {
      await prisma.project.create({ data: { ...data, unitTypes: { create: units }, media: { create: media } } });
      created++;
    }
  }

  // ── 3. retire inventory rows that dropped out of the dataset ──
  // Untouched rows are deleted; any a user saved, enquired on or bought are
  // archived and paused instead, so their history survives but they leave the
  // public feed and the Explore map.
  const keys = new Set(records.map((r) => r.key));
  const stale = [...idByKey.entries()].filter(([k]) => !keys.has(k)).map(([, id]) => id);
  let removed = 0, archived = 0;
  if (stale.length && !DRY) {
    const rows = await prisma.project.findMany({
      where: { id: { in: stale } },
      select: { id: true, _count: { select: { savedBy: true, leads: true, matches: true, purchases: true, enquiries: true } } },
    });
    const untouched = rows.filter((r) => Object.values(r._count).every((n) => n === 0)).map((r) => r.id);
    const keep = rows.map((r) => r.id).filter((id) => !untouched.includes(id));
    if (untouched.length) removed = (await prisma.project.deleteMany({ where: { id: { in: untouched } } })).count;
    if (keep.length) archived = (await prisma.project.updateMany({ where: { id: { in: keep } }, data: { status: "ARCHIVED", listingStatus: "PAUSED" } })).count;
  }

  console.log(`created ${created}, updated ${updated}, removed ${removed}, archived ${archived}`);
  console.log("grades:", grades);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
