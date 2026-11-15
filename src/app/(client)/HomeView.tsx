"use client";

import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import { CITY, type SourcedFigure } from "@/lib/market/anchors";

export type PulseFigures = Record<"registrations" | "registrationsValue" | "avgPrice" | "priceGrowth" | "gccShare", SourcedFigure>;
const CITY_DEFAULTS: PulseFigures = {
  registrations: CITY.registrationsYtd,
  registrationsValue: CITY.registrationsValueCr,
  avgPrice: CITY.avgPriceSqFt,
  priceGrowth: CITY.priceGrowthYoY,
  gccShare: CITY.gccShareOfLeasing,
};
import { ArrowLeft, ArrowRight } from "lucide-react";
import HeroScene, { HeroTimeToggle } from "@/components/home/HeroScene";
import {
  SearchCommandBar,
  SectionHeader,
  CorridorCard,
  ProjectCard,
  MetricStat,
  SkeletonCard,
  SourceTag,
  type CorridorCardData,
  type ProjectCardData,
  CYCLE,
  type InvCycle,
} from "@/components/ui";
import { formatDate, formatCount } from "@/lib/format";


// Homepage positioning copy — swappable (spec Part 1).
const HERO = {
  badge: "Independent Hyderabad property research",
  h1: "Know where Hyderabad grows next.",
  sub: "Prices measured from real listings, developers' TG-RERA records and tracked government infrastructure — for Hyderabad land and homes, corridor by corridor.",
  micro: "Not a listing site. A research platform.",
};

const CYCLE_FILTERS: (InvCycle | "ALL")[] = ["ALL", "ACT_NOW", "MID_CYCLE", "WATCH_AND_BUY", "PATIENT_CAPITAL"];

/** What the server loaded — the same JSON the browser fetches below. */
export interface HomeInitial {
  corridors: CorridorCardData[];
  projects: ProjectCardData[];
  infraCount: number | null;
  city: PulseFigures | null;
}

/** Sections rendered on the server and slotted into the page in reading order. */
export interface HomeSlots {
  budget?: React.ReactNode;
  more?: React.ReactNode;
}

export default function HomeView({ initial, slots }: { initial: HomeInitial | null; slots?: HomeSlots }) {
  const [corridors, setCorridors] = useState<CorridorCardData[] | null>(initial?.corridors ?? null);
  const [projects, setProjects] = useState<ProjectCardData[] | null>(initial?.projects ?? null);
  const [infraCount, setInfraCount] = useState<number | null>(initial?.infraCount ?? null);
  // City figures — sourced constants, or newer ones an admin approved (/api/market/pulse).
  const [city, setCity] = useState<PulseFigures>(initial?.city ?? CITY_DEFAULTS);
  const [cycleFilter, setCycleFilter] = useState<InvCycle | "ALL">("ALL");
  const corridorRail = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Loaded on the server; the browser fetch is only the fallback.
    if (initial) return;
    const j = (r: Response) => (r.ok ? r.json() : Promise.reject(r.status));
    fetch("/api/market/corridors").then(j).then(setCorridors).catch(() => setCorridors([]));
    fetch("/api/projects?limit=8").then(j).then(setProjects).catch(() => setProjects([]));
    fetch("/api/market/pulse").then(j).then((d) => d?.figures && setCity(d.figures)).catch(() => {});
    fetch("/api/market/infrastructure")
      .then(j)
      .then((d) => setInfraCount(Array.isArray(d) ? d.length : Array.isArray(d?.projects) ? d.projects.length : null))
      .catch(() => setInfraCount(null));
  }, [initial]);

  const corridorOptions = (corridors ?? []).map((c) => ({ slug: c.corridor, name: c.name }));
  const quickChips = (corridors ?? []).slice(0, 5).map((c) => ({
    label: c.shortName || c.name,
    href: `/market/${c.corridor}`,
  }));

  const filteredCorridors = (corridors ?? []).filter(
    (c) => cycleFilter === "ALL" || (c as any).investmentCycle === cycleFilter
  );

  // Only shown when the corridor figures carry a real computed-at date — never today's date as a stand-in.
  const lastUpdated = corridors?.[0]?.["lastComputedAt" as keyof CorridorCardData]
    ? formatDate(corridors[0]["lastComputedAt" as keyof CorridorCardData] as any)
    : null;

  return (
    <div className="flex flex-col">
      {/* ═══ 5.1 HERO ═══ */}
      <HeroScene>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" style={{ position: "relative", zIndex: 2, paddingTop: "clamp(4rem, 9vw, 7rem)", paddingBottom: "5.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 48, flexWrap: "wrap" }}>
            <div style={{ maxWidth: 600, flex: "1 1 380px", minWidth: 320 }}>
              <span className="animate-fade-in-up" style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.08)", border: "1px solid var(--color-ink-line)", color: "#fff", padding: "6px 14px", borderRadius: 999, fontSize: "0.75rem", fontWeight: 600 }}>
                ⭐ {HERO.badge}
              </span>
              <h1 className="animate-fade-in-up stagger-1" style={{ fontFamily: "var(--font-jakarta)", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.02, color: "#fff", fontSize: "clamp(2.5rem, 5vw, 4rem)", marginTop: 20 }}>
                {HERO.h1}
              </h1>
              <p className="animate-fade-in-up stagger-2" style={{ color: "var(--color-text-invert-mid)", fontSize: "clamp(1rem, 1.6vw, 1.25rem)", lineHeight: 1.6, marginTop: 18, maxWidth: 560 }}>
                {HERO.sub}
              </p>
              <p className="animate-fade-in-up stagger-3" style={{ fontFamily: "var(--font-instrument)", fontStyle: "italic", color: "var(--color-saffron)", fontSize: "1.25rem", marginTop: 14 }}>
                {HERO.micro}
              </p>
              <HeroTimeToggle />
            </div>
            {/* Phone mock-up (HeroAppShowcase) hidden at the owner's request, 2026-11-15 — keep the component; restore here when asked. */}
          </div>
        </div>
      </HeroScene>

      {/* ═══ 5.2 SEARCH COMMAND BAR (overlaps hero) ═══ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full" style={{ position: "relative", zIndex: 5, marginTop: -48 }}>
        <SearchCommandBar corridors={corridorOptions} quickChips={quickChips} />
      </div>

      {/* ═══ 5.3 TRUST BAR ═══ */}
      <div className="max-w-7xl mx-auto px-4 w-full" style={{ marginTop: 20 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 22px", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--color-text-mid)" }}>
          <span>✅ {corridors ? corridors.length : "…"} Corridors Tracked</span>
          {infraCount != null && infraCount > 0 && (
            <>
              <span style={{ color: "var(--color-line)" }}>·</span>
              <span>✅ {infraCount} Govt Projects Tracked</span>
            </>
          )}
          <span style={{ color: "var(--color-line)" }}>·</span>
          <span>✅ TG-RERA numbers shown, with a link to verify</span>
          {lastUpdated && (
            <>
              <span style={{ color: "var(--color-line)" }}>·</span>
              <span>✅ Area figures computed {lastUpdated}</span>
            </>
          )}
        </div>
      </div>

      {/* ═══ BUDGET TILES (server-rendered) ═══ */}
      {slots?.budget}

      {/* ═══ 5.6 CORRIDOR HEAT GRID ═══ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full" style={{ paddingTop: "4.5rem" }}>
        <SectionHeader
          title="Where Hyderabad is moving"
          subtitle="Growth corridors with their price ranges, the infrastructure around them and who each one suits."
          action={<Link href="/market" className="uv-btn uv-btn-ghost" style={{ padding: "9px 16px", fontSize: "0.8125rem" }}>View all corridors <ArrowRight size={15} /></Link>}
        />
        {/* Filter chips + carousel arrows */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 22, flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {CYCLE_FILTERS.map((f) => {
              const active = f === cycleFilter;
              const label = f === "ALL" ? "All" : CYCLE[f].label;
              return (
                <button key={f} type="button" onClick={() => { setCycleFilter(f); corridorRail.current?.scrollTo({ left: 0 }); }} className="uv-chip" title={f === "ALL" ? undefined : CYCLE[f].explain}
                  style={{ cursor: "pointer", border: "1px solid var(--color-line)", background: active ? "var(--color-saffron)" : "var(--color-surface)", color: active ? "var(--color-ink)" : "var(--color-text-mid)" }}>
                  {f !== "ALL" && CYCLE[f].emoji ? `${CYCLE[f].emoji} ` : ""}{label}
                </button>
              );
            })}
          </div>
          <div className="hidden md:flex" style={{ gap: 8 }}>
            {([-1, 1] as const).map((dir) => (
              <button key={dir} type="button" aria-label={dir < 0 ? "Previous corridors" : "Next corridors"}
                onClick={() => { const el = corridorRail.current; if (el) el.scrollBy({ left: dir * el.clientWidth, behavior: "smooth" }); }}
                className="uv-btn uv-btn-ghost" style={{ width: 40, height: 40, padding: 0 }}>
                {dir < 0 ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
              </button>
            ))}
          </div>
        </div>
        {/* One row: three corridors at a time on desktop, swipe for the rest. */}
        <div ref={corridorRail} className="uv-rail-row hide-scrollbar">
          {corridors === null
            ? Array.from({ length: 3 }).map((_, i) => <div key={i}><SkeletonCard variant="corridor" /></div>)
            : filteredCorridors.map((c) => <div key={c.corridor} style={{ display: "flex" }}><CorridorCard corridor={c} /></div>)}
        </div>
      </section>

      {/* ═══ 5.7 LIVE MARKET PULSE (dark band) ═══ */}
      <section style={{ background: "var(--color-ink)", marginTop: "4.5rem", padding: "3.25rem 0" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 28 }}>
            <MetricStat value={city.registrations.value} label="Homes registered" sub={city.registrations.period} />
            <MetricStat value={city.registrationsValue.value} prefix="₹" suffix=" Cr" label="Registered value" sub={city.registrationsValue.period} />
            <MetricStat value={city.priceGrowth.value} prefix="+" suffix="%" label="Price growth, YoY" sub={city.priceGrowth.period} />
            <MetricStat value={city.avgPrice.value} prefix="₹" label="Avg / sq.ft" sub={city.avgPrice.period} />
            <MetricStat value={city.gccShare.value} suffix="%" label="Office leasing by GCCs" sub={city.gccShare.period} />
          </div>
          <div style={{ marginTop: 22, textAlign: "right" }}>
            <SourceTag align="right">{[...new Set([city.registrations.source, city.avgPrice.source, city.gccShare.source])].join(" · ")}</SourceTag>
          </div>
        </div>
      </section>

      {/* ═══ 5.8 FEATURED PROJECTS (carousel) ═══ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full" style={{ paddingTop: "4.5rem" }}>
        <SectionHeader
          title="Featured projects"
          subtitle="Listings with the highest Property Tiger Score first."
          action={<Link href="/projects" className="uv-btn uv-btn-ghost" style={{ padding: "9px 16px", fontSize: "0.8125rem" }}>All projects <ArrowRight size={15} /></Link>}
        />
        <div style={{ display: "flex", gap: 18, overflowX: "auto", scrollSnapType: "x mandatory", paddingBottom: 12, alignItems: "stretch" }} className="hide-scrollbar">
          {projects === null
            ? Array.from({ length: 4 }).map((_, i) => <div key={i} style={{ minWidth: 288, display: "flex" }}><SkeletonCard variant="project" /></div>)
            : projects.slice(0, 8).map((p) => <ProjectCard key={p.id} project={p} variant="carousel" />)}
        </div>
      </section>

      {/* ═══ TIGER SCORE, LOCALITIES, PRICES, SERVICES, BUILDERS, INFRA, NEWS, FAQ (server-rendered) ═══ */}
      {slots?.more}
    </div>
  );
}
