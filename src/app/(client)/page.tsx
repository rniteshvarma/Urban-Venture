"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { ArrowRight, Search, Bot, Building2, CheckCircle2, Calculator, Ruler, FileText, Repeat } from "lucide-react";
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

interface Pulse {
  totalRegistrations?: number | null;
  totalValueCr?: number | null;
  yoyGrowthPct?: number | null;
  avgAskingPriceSqFt?: number | null;
  gccTotalPct?: number | null;
  source?: string | null;
  reportDate?: string | null;
}

// Homepage positioning copy — swappable (spec Part 1).
const HERO = {
  badge: "Trusted by Hyderabad investors",
  h1: "Know where Hyderabad grows next.",
  sub: "AI-powered investment research for Hyderabad land and property — built on verified government infrastructure data, corridor by corridor.",
  micro: "Not a listing site. A research platform.",
};

const HERO_IMG =
  "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1920&q=80";

const CYCLE_FILTERS: (InvCycle | "ALL")[] = ["ALL", "ACT_NOW", "MID_CYCLE", "WATCH_AND_BUY", "PATIENT_CAPITAL"];

export default function HomePage() {
  const [corridors, setCorridors] = useState<CorridorCardData[] | null>(null);
  const [projects, setProjects] = useState<ProjectCardData[] | null>(null);
  const [pulse, setPulse] = useState<Pulse | null>(null);
  const [infraCount, setInfraCount] = useState<number | null>(null);
  const [cycleFilter, setCycleFilter] = useState<InvCycle | "ALL">("ALL");

  useEffect(() => {
    const j = (r: Response) => (r.ok ? r.json() : Promise.reject(r.status));
    fetch("/api/market/corridors").then(j).then(setCorridors).catch(() => setCorridors([]));
    fetch("/api/projects").then(j).then(setProjects).catch(() => setProjects([]));
    fetch("/api/market/pulse").then(j).then((d) => setPulse(d?.pulse ?? null)).catch(() => setPulse(null));
    fetch("/api/market/infrastructure")
      .then(j)
      .then((d) => setInfraCount(Array.isArray(d) ? d.length : Array.isArray(d?.projects) ? d.projects.length : null))
      .catch(() => setInfraCount(null));
  }, []);

  const corridorOptions = (corridors ?? []).map((c) => ({ slug: c.corridor, name: c.name }));
  const quickChips = (corridors ?? []).slice(0, 5).map((c) => ({
    label: c.shortName || c.name,
    href: `/market/${c.corridor}`,
  }));

  const filteredCorridors = (corridors ?? []).filter(
    (c) => cycleFilter === "ALL" || (c as any).investmentCycle === cycleFilter
  );

  const lastUpdated = pulse?.reportDate
    ? formatDate(pulse.reportDate)
    : corridors?.[0]?.["lastComputedAt" as keyof CorridorCardData]
    ? formatDate(corridors[0]["lastComputedAt" as keyof CorridorCardData] as any)
    : formatDate(new Date());

  return (
    <div className="flex flex-col">
      {/* ═══ 5.1 HERO ═══ */}
      <section style={{ position: "relative", background: "var(--color-ink)", overflow: "hidden" }}>
        <video
          autoPlay
          loop
          muted
          playsInline
          poster={HERO_IMG}
          aria-hidden
          onCanPlay={(e) => { e.currentTarget.muted = true; e.currentTarget.play().catch(() => {}); }}
          onLoadedData={(e) => { e.currentTarget.muted = true; e.currentTarget.play().catch(() => {}); }}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.5 }}
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260405_170732_8a9ccda6-5cff-4628-b164-059c500a2b41.mp4"
        />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg, var(--color-ink) 8%, rgba(13,13,18,0.55) 60%, rgba(13,13,18,0.75) 100%)" }} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" style={{ position: "relative", zIndex: 2, paddingTop: "clamp(4rem, 9vw, 8rem)", paddingBottom: "5.5rem" }}>
          <div style={{ maxWidth: 720 }}>
            <span className="animate-fade-in-up" style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.08)", border: "1px solid var(--color-ink-line)", color: "#fff", padding: "6px 14px", borderRadius: 999, fontSize: "0.75rem", fontWeight: 600 }}>
              ⭐ {HERO.badge}
            </span>
            <h1 className="animate-fade-in-up stagger-1" style={{ fontFamily: "var(--font-jakarta)", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.02, color: "#fff", fontSize: "clamp(2.75rem, 6vw, 4.5rem)", marginTop: 20 }}>
              {HERO.h1}
            </h1>
            <p className="animate-fade-in-up stagger-2" style={{ color: "var(--color-text-invert-mid)", fontSize: "clamp(1rem, 1.6vw, 1.25rem)", lineHeight: 1.6, marginTop: 18, maxWidth: 620 }}>
              {HERO.sub}
            </p>
            <p className="animate-fade-in-up stagger-3" style={{ fontFamily: "var(--font-instrument)", fontStyle: "italic", color: "var(--color-saffron)", fontSize: "1.25rem", marginTop: 14 }}>
              {HERO.micro}
            </p>
          </div>
        </div>
      </section>

      {/* ═══ 5.2 SEARCH COMMAND BAR (overlaps hero) ═══ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full" style={{ position: "relative", zIndex: 5, marginTop: -48 }}>
        <SearchCommandBar corridors={corridorOptions} quickChips={quickChips} />
      </div>

      {/* ═══ 5.3 TRUST BAR ═══ */}
      <div className="max-w-7xl mx-auto px-4 w-full" style={{ marginTop: 20 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 22px", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--color-text-mid)" }}>
          <span>✅ {corridors ? corridors.length : "…"} Corridors Tracked</span>
          <span style={{ color: "var(--color-line)" }}>·</span>
          <span>✅ {infraCount ?? "12"} Govt Projects Monitored</span>
          <span style={{ color: "var(--color-line)" }}>·</span>
          <span>✅ HMDA / RERA Verified</span>
          <span style={{ color: "var(--color-line)" }}>·</span>
          <span>✅ Data updated {lastUpdated}</span>
        </div>
      </div>

      {/* ═══ 5.4 HOW IT WORKS ═══ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full" style={{ paddingTop: "4.5rem", paddingBottom: "1rem" }}>
        <SectionHeader eyebrow="Not a listing site." title="How it works" subtitle="Three inputs. A research report backed by real government data." />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 18 }}>
          {[
            { n: "01", icon: <Search size={22} />, label: "Tell us your budget", body: "Budget, horizon, city. Three inputs." },
            { n: "02", icon: <Bot size={22} />, label: "AI researches the market", body: "Corridors, risk scores, exit timing." },
            { n: "03", icon: <Building2 size={22} />, label: "Backed by real govt data", body: "RRR, Metro Phase 2, Pharma City, HMDA." },
          ].map((s) => (
            <div key={s.n} className="uv-card" style={{ position: "relative", padding: "1.75rem 1.5rem" }}>
              <span style={{ position: "absolute", top: 14, right: 18, fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "1.75rem", color: "var(--color-saffron)" }}>{s.n}</span>
              <div style={{ color: "var(--color-saffron-deep)", marginBottom: 14 }}>{s.icon}</div>
              <h3 style={{ fontFamily: "var(--font-jakarta)", fontWeight: 700, fontSize: "1.125rem", color: "var(--color-text-hi)" }}>{s.label}</h3>
              <p style={{ marginTop: 6, color: "var(--color-text-mid)", fontSize: "0.9375rem" }}>{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ 5.6 CORRIDOR HEAT GRID ═══ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full" style={{ paddingTop: "4rem" }}>
        <SectionHeader
          title="Where Hyderabad is moving"
          action={<Link href="/market" className="uv-btn uv-btn-ghost" style={{ padding: "9px 16px", fontSize: "0.8125rem" }}>View all corridors <ArrowRight size={15} /></Link>}
        />
        {/* Filter chips */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 22 }}>
          {CYCLE_FILTERS.map((f) => {
            const active = f === cycleFilter;
            const label = f === "ALL" ? "All" : CYCLE[f].label;
            return (
              <button key={f} type="button" onClick={() => setCycleFilter(f)} className="uv-chip"
                style={{ cursor: "pointer", border: "1px solid var(--color-line)", background: active ? "var(--color-saffron)" : "var(--color-surface)", color: active ? "var(--color-ink)" : "var(--color-text-mid)" }}>
                {f !== "ALL" && CYCLE[f].emoji ? `${CYCLE[f].emoji} ` : ""}{label}
              </button>
            );
          })}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
          {corridors === null
            ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} variant="corridor" />)
            : filteredCorridors.slice(0, 9).map((c) => <CorridorCard key={c.corridor} corridor={c} />)}
        </div>
      </section>

      {/* ═══ 5.7 LIVE MARKET PULSE (dark band) ═══ */}
      <section style={{ background: "var(--color-ink)", marginTop: "4.5rem", padding: "3.25rem 0" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 28 }}>
            <MetricStat value={pulse?.totalRegistrations ?? 51089} label="Registrations" sub="FY 2025-26" />
            <MetricStat value={pulse?.totalValueCr ?? 34420} prefix="₹" suffix=" Cr" label="Transaction Value" />
            <MetricStat value={pulse?.yoyGrowthPct ?? 40} prefix="+" suffix="%" label="YoY Growth" sub="Mar 2026" />
            <MetricStat value={pulse?.avgAskingPriceSqFt ?? 9430} prefix="₹" label="Avg / sq.ft" />
            <MetricStat value={pulse?.gccTotalPct ?? 20} suffix="%" label="of India's GCCs" />
          </div>
          <div style={{ marginTop: 22, textAlign: "right" }}>
            <SourceTag align="right">{pulse?.source || "Knight Frank · SquareYards · TG-RERA"}</SourceTag>
          </div>
        </div>
      </section>

      {/* ═══ 5.8 FEATURED PROJECTS (carousel) ═══ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full" style={{ paddingTop: "4.5rem" }}>
        <SectionHeader
          title="Featured projects"
          action={<Link href="/projects" className="uv-btn uv-btn-ghost" style={{ padding: "9px 16px", fontSize: "0.8125rem" }}>All projects <ArrowRight size={15} /></Link>}
        />
        <div style={{ display: "flex", gap: 18, overflowX: "auto", scrollSnapType: "x mandatory", paddingBottom: 12, alignItems: "stretch" }} className="hide-scrollbar">
          {projects === null
            ? Array.from({ length: 4 }).map((_, i) => <div key={i} style={{ minWidth: 288, display: "flex" }}><SkeletonCard variant="project" /></div>)
            : projects.slice(0, 8).map((p) => <ProjectCard key={p.id} project={p} variant="carousel" />)}
        </div>
      </section>

      {/* ═══ 5.10 TOOLS STRIP ═══ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full" style={{ paddingTop: "4.5rem" }}>
        <SectionHeader title="Tools for the numbers" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          {[
            { icon: <Calculator size={20} />, name: "ROI Calculator", desc: "Project appreciation vs Nifty, gold, FD." },
            { icon: <FileText size={20} />, name: "EMI Calculator", desc: "Monthly outgo at current home-loan rates." },
            { icon: <Ruler size={20} />, name: "Stamp Duty", desc: "Registration + stamp duty for Telangana." },
            { icon: <Repeat size={20} />, name: "Unit Converter", desc: "sq.yd ↔ sq.ft ↔ acre ↔ guntha ↔ cent." },
          ].map((t) => (
            <Link key={t.name} href="/calculator" className="uv-card uv-card-hover" style={{ padding: "1.4rem 1.35rem", display: "flex", flexDirection: "column", gap: 8, textDecoration: "none" }}>
              <div style={{ color: "var(--color-saffron-deep)" }}>{t.icon}</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h3 style={{ fontFamily: "var(--font-jakarta)", fontWeight: 700, fontSize: "1rem", color: "var(--color-text-hi)" }}>{t.name}</h3>
                <ArrowRight size={16} color="var(--color-text-lo)" />
              </div>
              <p style={{ color: "var(--color-text-mid)", fontSize: "0.8125rem" }}>{t.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ═══ 5.11 WHY US ═══ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full" style={{ paddingTop: "4.5rem", paddingBottom: "5rem" }}>
        <SectionHeader eyebrow="Direct, and confident." title="Why us" />
        <div className="uv-card" style={{ overflow: "hidden", padding: 0 }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520, tableLayout: "fixed" }}>
              <colgroup>
                <col style={{ width: "50%" }} />
                <col style={{ width: "25%" }} />
                <col style={{ width: "25%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "16px 20px", fontSize: "0.8125rem", color: "var(--color-text-mid)", fontWeight: 600 }}></th>
                  <th style={{ textAlign: "center", padding: "16px 20px", fontSize: "0.8125rem", color: "var(--color-text-mid)", fontWeight: 600 }}>Listing Portals</th>
                  <th style={{ textAlign: "center", padding: "16px 20px", fontSize: "0.8125rem", color: "var(--color-saffron-deep)", fontWeight: 700, background: "var(--color-saffron-wash)" }}>This Platform</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Property listings", true, true],
                  ["Government infrastructure data", false, true],
                  ["Corridor appreciation history", false, true],
                  ["AI investment recommendations", false, true],
                  ["Legal due-diligence guidance", false, true],
                  ["Post-purchase value tracking", false, true],
                ].map(([label, them, us], i) => (
                  <tr key={i} style={{ borderTop: "1px solid var(--color-line)" }}>
                    <td style={{ padding: "14px 20px", fontSize: "0.9375rem", color: "var(--color-text-hi)" }}>{label as string}</td>
                    <td style={{ padding: "14px 20px", textAlign: "center", color: them ? "var(--color-text-mid)" : "var(--color-text-lo)", verticalAlign: "middle" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, margin: "0 auto" }}>
                        {them ? <CheckCircle2 size={18} /> : "—"}
                      </span>
                    </td>
                    <td style={{ padding: "14px 20px", textAlign: "center", background: "var(--color-saffron-wash)", color: "var(--color-growth)", verticalAlign: "middle" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, margin: "0 auto" }}>
                        {us ? <CheckCircle2 size={18} /> : "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
