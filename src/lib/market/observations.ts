/**
 * Reading and writing MarketObservation rows, and resolving the city figures
 * the screens and the forecast use.
 *
 * City figures start from the checked constants in anchors.ts; an APPROVED
 * news figure replaces a constant once it was published later than the
 * constant's source. So a reviewer approving "H2 2026: prices up 6%" moves
 * the base-case forecast and the homepage stats, with the new link.
 */
import type { Prisma } from "@prisma/client";
import prisma from "../prisma";
import { CITY, type SourcedFigure } from "./anchors";
import { CITY_METRIC_LABEL, type CityMetric } from "./feeds/news";

export type ObservationInput = Omit<Prisma.MarketObservationUncheckedCreateInput, "id" | "observedAt"> & { key: string };

/** Insert or refresh by key. A reviewed (non-PENDING) row keeps its review. */
export async function upsertObservation(o: ObservationInput) {
  const existing = await prisma.marketObservation.findUnique({ where: { key: o.key }, select: { id: true, status: true } });
  if (!existing) return prisma.marketObservation.create({ data: o });
  const rest: Partial<ObservationInput> = { ...o };
  delete rest.status;
  return prisma.marketObservation.update({ where: { id: existing.id }, data: { ...rest, observedAt: new Date() } });
}

/** Which anchors.ts figure each reviewable city metric replaces. */
export const CITY_METRIC_ANCHOR: Record<CityMetric, keyof typeof CITY> = {
  city_registrations: "registrationsYtd",
  city_registrations_value_cr: "registrationsValueCr",
  city_avg_price_sqft: "avgPriceSqFt",
  city_price_growth_yoy: "priceGrowthYoY",
  city_sales_units: "salesUnits",
  city_launch_units: "launchUnits",
};

export type CityFigures = typeof CITY;

/** anchors.ts, with newer approved news figures swapped in. */
export async function resolveCityFigures(): Promise<CityFigures> {
  const out: Record<string, SourcedFigure> = { ...CITY };
  const approved = await prisma.marketObservation
    .findMany({ where: { source: "NEWS", status: "APPROVED", visibility: "PUBLIC", scope: "CITY" }, orderBy: { observedAt: "desc" } })
    .catch(() => []); // table not pushed yet → constants only
  for (const o of approved) {
    const anchorKey = CITY_METRIC_ANCHOR[o.metric as CityMetric];
    if (!anchorKey) continue;
    const meta = (o.meta ?? {}) as { publishedAt?: string; firm?: string };
    const published = meta.publishedAt?.slice(0, 10) ?? o.observedAt.toISOString().slice(0, 10);
    const current = out[anchorKey];
    if (current && current.published >= published) continue;
    out[anchorKey] = {
      value: o.value,
      unit: CITY_METRIC_LABEL[o.metric as CityMetric]?.unit ?? o.unit,
      period: o.period,
      source: meta.firm ? `${meta.firm}${o.sourceName ? ` via ${o.sourceName}` : ""}` : o.sourceName,
      url: o.sourceUrl ?? "",
      published,
    };
  }
  return out as CityFigures;
}

// ── Guidance values per corridor ────────────────────────────────────────────

export interface VillageGuidance {
  village: string;
  villageName: string;
  mandalName: string;
  general: number;
  max: number;
  effective: string | null;
}

export interface CorridorGuidance {
  land: { median: number; min: number; max: number; villages: VillageGuidance[] } | null;
  apartment: { median: number; min: number; max: number; villages: VillageGuidance[] } | null;
  effective: string | null;
  checkedAt: string;
  source: { name: string; url: string };
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Latest official guidance value per village, rolled up per corridor. */
export async function loadCorridorGuidance(): Promise<Map<string, CorridorGuidance>> {
  const rows = await prisma.marketObservation
    .findMany({ where: { source: "TG_REGISTRATION", status: "APPROVED", scope: "VILLAGE" }, orderBy: { observedAt: "desc" } })
    .catch(() => []);
  // Newest row per (village, metric) — a newer effective date supersedes.
  const latest = new Map<string, (typeof rows)[number]>();
  for (const r of rows) {
    const k = `${r.scopeKey}|${r.metric}`;
    const prev = latest.get(k);
    const eff = (r.meta as { effective?: string } | null)?.effective ?? "";
    const prevEff = (prev?.meta as { effective?: string } | null)?.effective ?? "";
    if (!prev || eff > prevEff) latest.set(k, r);
  }
  const byCorridor = new Map<string, { land: VillageGuidance[]; apartment: VillageGuidance[]; checked: Date; url: string; name: string }>();
  for (const r of latest.values()) {
    if (!r.corridorSlug) continue;
    const meta = (r.meta ?? {}) as { max?: number; effective?: string; villageName?: string; mandalName?: string };
    const g = byCorridor.get(r.corridorSlug) ?? { land: [], apartment: [], checked: r.observedAt, url: r.sourceUrl ?? "", name: r.sourceName };
    const v: VillageGuidance = { village: r.scopeKey, villageName: meta.villageName ?? r.scopeKey, mandalName: meta.mandalName ?? "", general: r.value, max: meta.max ?? r.value, effective: meta.effective ?? null };
    (r.metric === "guidance_land_sqyd" ? g.land : g.apartment).push(v);
    if (r.observedAt > g.checked) g.checked = r.observedAt;
    byCorridor.set(r.corridorSlug, g);
  }
  const roll = (vs: VillageGuidance[]) =>
    vs.length ? { median: median(vs.map((v) => v.general)), min: Math.min(...vs.map((v) => v.general)), max: Math.max(...vs.map((v) => v.max)), villages: vs.sort((a, b) => a.villageName.localeCompare(b.villageName)) } : null;
  const out = new Map<string, CorridorGuidance>();
  for (const [slug, g] of byCorridor) {
    const dates = [...g.land, ...g.apartment].map((v) => v.effective).filter((d): d is string => !!d).sort();
    out.set(slug, { land: roll(g.land), apartment: roll(g.apartment), effective: dates.at(-1) ?? null, checkedAt: g.checked.toISOString(), source: { name: g.name, url: g.url } });
  }
  return out;
}
