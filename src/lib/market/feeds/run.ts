/**
 * Runs the market data feeds and stores what they find as MarketObservation
 * rows. Incremental and polite: each item is re-fetched only when due
 * (registration villages monthly, MagicBricks localities quarterly), one
 * request at a time, and the run stops at `budgetMs` — the next run carries on.
 *
 *   registration  official guidance values, PUBLIC, approved as published
 *   magicbricks   internal cross-check, INTERNAL, never shown publicly
 *   news          figures read from research-firm news → PENDING review
 */
import { createHash } from "node:crypto";
import prisma from "../../prisma";
import sourcesJson from "../../../../prisma/data/market-sources.json";
import { upsertObservation } from "../observations";
import { fetchVillageRates, openRegistrationSession, REGISTRATION_SOURCE_NAME, REGISTRATION_SOURCE_URL, type RegistrationVillage } from "./registration";
import { fetchLocality, magicbricksUrl, MAGICBRICKS_SOURCE_NAME, type PortalAsset } from "./magicbricks";
import { extractCandidates } from "./news";
import { parseNoBrokerRentPage } from "../../rentals/rentals";

const rentPageUrl = (locality: string, page: number) =>
  `https://www.nobroker.in/flats-for-rent-in-${locality}_hyderabad${page > 1 ? `?pageNo=${page}` : ""}`;

async function fetchRentPage(locality: string, page: number) {
  const res = await fetch(rentPageUrl(locality, page), {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; PropertyTigerResearch/1.0; monthly rent statistics)" },
    signal: AbortSignal.timeout(40_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return parseNoBrokerRentPage(await res.text());
}

type Log = (line: string) => void;
const DAY = 86_400_000;
export const DUE_DAYS = { registration: 25, magicbricks: 80, rentals: 25 } as const;
const RENT_PAGES = 3;
const NEWS_LOOKBACK_DAYS = 120;

interface SourcesFile {
  corridors: Record<string, { registrationVillages: RegistrationVillage[]; magicbricksLocalities: string[]; nobrokerRentLocalities?: string[] }>;
}
export const MARKET_SOURCES = (sourcesJson as SourcesFile).corridors;

/** Locality → the corridors that list it (Kandukur sits in two). */
export function corridorsForLocality(locality: string) {
  return Object.entries(MARKET_SOURCES).filter(([, s]) => s.magicbricksLocalities.includes(locality)).map(([slug]) => slug);
}

async function lastObserved(source: string, scope: string): Promise<Map<string, Date>> {
  const rows = await prisma.marketObservation.groupBy({ by: ["scopeKey"], where: { source, scope }, _max: { observedAt: true } });
  return new Map(rows.map((r) => [r.scopeKey, r._max.observedAt!]));
}

type FeedName = "registration" | "magicbricks" | "news" | "rentals";

export async function runMarketFeeds(opts: { budgetMs?: number; force?: boolean; only?: FeedName[]; log?: Log } = {}) {
  const log = opts.log ?? (() => {});
  const started = Date.now();
  const overBudget = () => opts.budgetMs != null && Date.now() - started > opts.budgetMs;
  const run = (name: FeedName) => !opts.only || opts.only.includes(name);
  const summary = { registration: { done: 0, failed: 0, deferred: 0 }, magicbricks: { done: 0, failed: 0, deferred: 0 }, rentals: { done: 0, failed: 0, deferred: 0, listings: 0 }, news: { candidates: 0 }, errors: [] as string[] };

  // ── Official guidance values ──
  if (run("registration")) {
    const seen = await lastObserved("TG_REGISTRATION", "VILLAGE");
    const due = Object.entries(MARKET_SOURCES).flatMap(([slug, s]) => s.registrationVillages.map((v) => ({ slug, v })))
      .filter(({ v }) => opts.force || !seen.has(v.village) || Date.now() - seen.get(v.village)!.getTime() > DUE_DAYS.registration * DAY);
    let cookie: string | undefined;
    for (const { slug, v } of due) {
      if (overBudget()) { summary.registration.deferred++; continue; }
      try {
        cookie ??= await openRegistrationSession(30_000);
        const { rates } = await fetchVillageRates(v, { cookie });
        const base = { source: "TG_REGISTRATION", scope: "VILLAGE", scopeKey: v.village, corridorSlug: slug, visibility: "PUBLIC", status: "APPROVED", sourceName: REGISTRATION_SOURCE_NAME, sourceUrl: REGISTRATION_SOURCE_URL };
        const meta = { villageName: v.villageName, mandalName: v.mandalName, districtName: v.districtName, effective: rates.effective };
        const eff = rates.effective ?? "unknown";
        if (rates.land) await upsertObservation({ ...base, key: `TG_REGISTRATION|guidance_land_sqyd|${v.village}|${eff}`, metric: "guidance_land_sqyd", value: rates.land.general, unit: "₹/sq.yd", period: `effective ${eff}`, periodEnd: rates.effective ? new Date(rates.effective) : null, meta: { ...meta, max: rates.land.max, rows: rates.land.rows } });
        if (rates.apartment) await upsertObservation({ ...base, key: `TG_REGISTRATION|guidance_apartment_sqft|${v.village}|${eff}`, metric: "guidance_apartment_sqft", value: rates.apartment.general, unit: "₹/sq.ft", period: `effective ${eff}`, periodEnd: rates.effective ? new Date(rates.effective) : null, meta: { ...meta, max: rates.apartment.max, rows: rates.apartment.rows } });
        if (!rates.land && !rates.apartment) throw new Error("no rates on the page");
        summary.registration.done++;
        log(`[market] guidance ${slug} / ${v.villageName}: land ${rates.land?.general ?? "—"} ₹/sq.yd, flats ${rates.apartment?.general ?? "—"} ₹/sq.ft (eff. ${eff})`);
      } catch (e) {
        summary.registration.failed++;
        cookie = undefined; // a stale session is the usual cause — reopen next time
        summary.errors.push(`registration ${v.villageName}: ${e instanceof Error ? e.message : String(e)}`);
      }
      await new Promise((r) => setTimeout(r, 800));
    }
  }

  // ── MagicBricks cross-check (internal) ──
  if (run("magicbricks")) {
    const seen = await lastObserved("MAGICBRICKS", "LOCALITY");
    const localities = [...new Set(Object.values(MARKET_SOURCES).flatMap((s) => s.magicbricksLocalities))];
    const due = localities.filter((l) => opts.force || !seen.has(l) || Date.now() - seen.get(l)!.getTime() > DUE_DAYS.magicbricks * DAY);
    for (const loc of due) {
      if (overBudget()) { summary.magicbricks.deferred++; continue; }
      try {
        let found = 0;
        for (const asset of ["apartment", "plot"] as PortalAsset[]) {
          const s = await fetchLocality(loc, asset);
          await new Promise((r) => setTimeout(r, 700));
          if (!s) continue;
          found++;
          const metric = asset === "plot" ? "portal_plot_sqyd" : "portal_apartment_sqft";
          await upsertObservation({
            key: `MAGICBRICKS|${metric}|${loc}|${s.latestQuarter}`, source: "MAGICBRICKS", metric, scope: "LOCALITY", scopeKey: loc,
            corridorSlug: corridorsForLocality(loc)[0] ?? null, value: s.latest, unit: s.unit, period: s.latestQuarter,
            visibility: "INTERNAL", status: "APPROVED", sourceName: MAGICBRICKS_SOURCE_NAME, sourceUrl: magicbricksUrl(loc, asset),
            meta: { history: s.history, yoyPct: s.yoyPct, corridors: corridorsForLocality(loc) },
          });
        }
        summary.magicbricks.done++;
        log(`[market] cross-check ${loc}: ${found} series`);
      } catch (e) {
        summary.magicbricks.failed++;
        summary.errors.push(`magicbricks ${loc}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  // ── Rental listings (internal; only our derived rent and yield are shown) ──
  if (run("rentals")) {
    const seen = new Map((await prisma.rentalListing.groupBy({ by: ["sourcePage"], _max: { lastSeenAt: true } })).map((r) => [r.sourcePage, r._max.lastSeenAt!]));
    const pages = [...new Set(Object.values(MARKET_SOURCES).flatMap((s) => s.nobrokerRentLocalities ?? []))];
    const due = pages.filter((p) => opts.force || !seen.has(p) || Date.now() - seen.get(p)!.getTime() > DUE_DAYS.rentals * DAY);
    for (const page of due) {
      if (overBudget()) { summary.rentals.deferred++; continue; }
      try {
        const ids = new Set<string>();
        for (let n = 1; n <= RENT_PAGES; n++) {
          const listings = await fetchRentPage(page, n);
          await new Promise((r) => setTimeout(r, 1500));
          const fresh = listings.filter((l) => !ids.has(l.id));
          if (!fresh.length) break;
          for (const l of fresh) {
            ids.add(l.id);
            const data = {
              source: "NOBROKER", sourcePage: page, rent: Math.round(l.rent), sizeSqft: Math.round(l.sizeSqft), bhk: l.bhk,
              latitude: l.lat, longitude: l.lng, furnishing: l.furnishing, letOut: l.letOut,
              sourceUpdatedAt: l.updatedAt ? new Date(l.updatedAt) : null, lastSeenAt: new Date(),
            };
            await prisma.rentalListing.upsert({ where: { id: l.id }, create: { id: l.id, ...data }, update: data });
          }
        }
        summary.rentals.done++;
        summary.rentals.listings += ids.size;
        log(`[market] rents ${page}: ${ids.size} listings`);
      } catch (e) {
        summary.rentals.failed++;
        summary.errors.push(`rentals ${page}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  // ── Research-firm figures from news (for review) ──
  if (run("news")) {
    const articles = await prisma.newsArticle.findMany({
      where: { publishedAt: { gte: new Date(Date.now() - NEWS_LOOKBACK_DAYS * DAY) }, suppressedAt: null },
      select: { headline: true, providerBlurb: true, canonicalUrl: true, publishedAt: true, sourceName: true },
    });
    for (const a of articles) {
      for (const c of extractCandidates({ headline: a.headline, blurb: a.providerBlurb, url: a.canonicalUrl, publishedAt: a.publishedAt, sourceName: a.sourceName })) {
        const key = `NEWS|${c.metric}|hyderabad|${c.period}|${createHash("sha1").update(a.canonicalUrl).digest("hex").slice(0, 12)}`;
        const exists = await prisma.marketObservation.findUnique({ where: { key }, select: { id: true } });
        if (exists) continue;
        await prisma.marketObservation.create({
          data: {
            key, source: "NEWS", metric: c.metric, scope: "CITY", scopeKey: "hyderabad", value: c.value, unit: c.unit, period: c.period,
            visibility: "PUBLIC", status: "PENDING", sourceName: a.sourceName, sourceUrl: a.canonicalUrl,
            meta: { firm: c.firm, snippet: c.snippet, headline: a.headline, publishedAt: a.publishedAt.toISOString() },
          },
        });
        summary.news.candidates++;
      }
    }
    if (summary.news.candidates) log(`[market] ${summary.news.candidates} new figure(s) from news waiting for review`);
  }

  return summary;
}
