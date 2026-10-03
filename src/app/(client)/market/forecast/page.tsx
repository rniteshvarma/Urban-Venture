"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, TrendingUp, Loader2, Info, Ruler, ExternalLink } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ReferenceLine } from "recharts";
import type { CorridorMarketStats } from "@/lib/market/compute";
import type { Asset } from "@/lib/market/rates";
import { ANCHOR_SOURCES } from "@/lib/market/anchors";

interface CorridorRow {
  corridor: string;
  name: string;
  shortName: string;
  overallScore: number | null;
  investorSentiment: string | null;
  market: CorridorMarketStats | null;
}

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const SCENARIO_KEYS = { conservative: "Conservative", base: "Base case", optimistic: "Optimistic" } as const;
const CONFIDENCE_NOTE = { HIGH: "10+ projects", MEDIUM: "4–9 projects", LOW: "2–3 projects — treat as indicative" } as const;

export default function ForecastHubPage() {
  const [corridors, setCorridors] = useState<CorridorRow[]>([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [asset, setAsset] = useState<Asset>("plot");
  const [loading, setLoading] = useState(true);
  const [activeTimeline, setActiveTimeline] = useState<"3Y" | "5Y" | "10Y">("10Y");

  useEffect(() => {
    fetch("/api/market/corridors")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: CorridorRow[]) => {
        setCorridors(data);
        if (data.length) {
          setSelectedSlug(data[0].corridor);
          setAsset(data[0].market?.primaryAsset ?? "plot");
        }
      })
      .catch((e) => console.error("Failed to fetch corridors for forecast", e))
      .finally(() => setLoading(false));
  }, []);

  const selected = corridors.find((c) => c.corridor === selectedSlug) ?? null;
  const m = selected?.market ?? null;
  const forecast = m?.forecast[asset] ?? null;
  const rates = m?.rates[asset] ?? null;

  const handleSelectCorridor = (slug: string) => {
    setSelectedSlug(slug);
    const next = corridors.find((c) => c.corridor === slug);
    setAsset(next?.market?.primaryAsset ?? "plot");
  };

  const years = activeTimeline === "3Y" ? 3 : activeTimeline === "5Y" ? 5 : 10;
  const projectionData = forecast
    ? Array.from({ length: years + 1 }, (_, n) => ({
        year: String(forecast.baseYear + n),
        [SCENARIO_KEYS.conservative]: forecast.scenarios.conservative.index[n],
        [SCENARIO_KEYS.base]: forecast.scenarios.base.index[n],
        [SCENARIO_KEYS.optimistic]: forecast.scenarios.optimistic.index[n],
      }))
    : [];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 min-h-screen bg-surface-dim text-text-primary">
        <Loader2 className="animate-spin text-navy-ink" size={36} />
        <span className="text-xs text-navy-ink font-semibold uppercase tracking-wider mt-4">Loading corridor data…</span>
      </div>
    );
  }

  const unitLabel = asset === "plot" ? "/sq.yd" : "/sq.ft";
  const assetWord = asset === "plot" ? "plot" : "apartment";

  return (
    <div className="bg-surface-dim text-text-primary min-h-screen font-sans flex flex-col justify-between selection:bg-accent/20">

      {/* Back Header */}
      <div className="sticky z-30 px-6 py-2.5" style={{ background: "var(--color-ink-soft)", borderBottom: "1px solid var(--color-ink-line)", top: 68 }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/market" className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--color-text-invert-mid)" }}>
            <ArrowLeft size={13} /> Back to Market Hub
          </Link>
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-text-invert-mid)" }}>Growth & Price Forecasting Center</span>
        </div>
      </div>

      {/* Hero Header */}
      <section className="px-6 py-12" style={{ background: "var(--color-ink)" }}>
        <div className="max-w-4xl mx-auto text-center space-y-4 animate-fade-in-up">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-wider" style={{ background: "var(--color-ink-soft)", border: "1px solid var(--color-ink-line)", color: "var(--color-saffron)" }}>
            <TrendingUp size={12} /> Price scenarios (2026 – 2036)
          </div>
          <h2 className="text-3xl md:text-5xl tracking-tight" style={{ fontFamily: "var(--font-jakarta)", fontWeight: 800, letterSpacing: "-0.02em", color: "#fff" }}>
            10-Year Price Scenarios
          </h2>
          <p className="text-sm max-w-xl mx-auto leading-relaxed" style={{ color: "var(--color-text-invert-mid)" }}>
            Today&apos;s prices measured from real listings, and three growth scenarios built from Hyderabad&apos;s published price data and each corridor&apos;s infrastructure pipeline.
          </p>
        </div>
      </section>

      <main className="max-w-7xl mx-auto py-12 px-6 w-full grid grid-cols-1 lg:grid-cols-4 gap-8">

        {/* Left Control Bar */}
        <div className="lg:col-span-1 space-y-6 stagger-1 animate-fade-in-up">

          {/* Corridor Selection Card */}
          <div className="card-premium space-y-4 border-t-4 border-t-success">
            <label className="text-xs font-mono font-bold text-text-secondary uppercase tracking-wider block">Select Corridor Profile</label>
            <select value={selectedSlug} onChange={(e) => handleSelectCorridor(e.target.value)} className="input-premium w-full cursor-pointer">
              {corridors.map((c) => (
                <option key={c.corridor} value={c.corridor}>{c.name}</option>
              ))}
            </select>

            <div className="flex gap-2 bg-surface-dim p-1 rounded-[8px]" role="group" aria-label="Property type">
              {(["plot", "apartment"] as Asset[]).map((a) => (
                <button key={a} type="button" onClick={() => setAsset(a)} className={asset === a ? "filter-pill-active" : "filter-pill"} style={{ flex: 1 }}>
                  {a === "plot" ? "Plots" : "Apartments"}
                </button>
              ))}
            </div>

            {selected && (
              <div className="space-y-4 pt-3 border-t border-gray-100 text-xs">
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-text-secondary">Corridor score</span>
                  <span className="font-bold text-success">{selected.overallScore != null ? `${selected.overallScore}/100` : "—"}</span>
                </div>
                {forecast && (
                  <div className="flex justify-between border-b border-gray-100 pb-2">
                    <span className="text-text-secondary">Growth a year (10 yrs)</span>
                    <span className="font-bold text-navy-ink">{forecast.scenarios.conservative.cagr10}% – {forecast.scenarios.optimistic.cagr10}%</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-text-secondary">Sentiment</span>
                  <span className="font-bold text-navy-ink">{selected.investorSentiment ?? "—"}</span>
                </div>
              </div>
            )}
          </div>

          {/* Measured price today */}
          <div className="card-premium space-y-3 border-t-4 border-t-warning">
            <h3 className="section-header text-base flex items-center gap-1">
              <Ruler size={16} className="text-navy-ink" />
              {asset === "plot" ? "Plot" : "Apartment"} price today
            </h3>
            {rates ? (
              <>
                <p className="text-2xl font-black text-text-primary font-mono">{inr(rates.median)}<span className="text-xs font-semibold text-text-secondary">{unitLabel}</span></p>
                <p className="text-[11px] text-text-secondary leading-relaxed">
                  Middle half of projects: {inr(rates.p25)} – {inr(rates.p75)}{unitLabel}. Median of {rates.projects} project{rates.projects === 1 ? "" : "s"} within {rates.radiusKm} km
                  {" "}({CONFIDENCE_NOTE[rates.confidence]}), from developer price lists in our listings.
                </p>
              </>
            ) : (
              <p className="text-[11px] text-text-secondary leading-relaxed">
                Not enough {assetWord} listings near {selected?.shortName ?? "this corridor"} to measure a price yet — we&apos;d rather show nothing than a guess.
              </p>
            )}
            {asset === "plot" && m?.landEvidence.map((e) => (
              <p key={e.url} className="text-[11px] text-text-secondary leading-relaxed border-t border-gray-100 pt-2">
                <strong className="text-text-primary">{e.source}:</strong> ₹{e.value} {e.unit} ({e.period}). {e.note}{" "}
                <a href={e.url} target="_blank" rel="noreferrer" className="underline">Source</a>
              </p>
            ))}
          </div>
        </div>

        {/* Right Forecasting Output */}
        <div className="lg:col-span-3 space-y-6 stagger-2 animate-fade-in-up">

          {selected && forecast && (
            <div className="card-premium space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="section-header text-lg flex items-center gap-1.5">
                    <TrendingUp className="text-navy-ink" size={18} />
                    {asset === "plot" ? "Plot" : "Apartment"} price scenarios: {selected.name}
                  </h3>
                  <p className="text-text-secondary text-[11px] mt-0.5">2026 prices = 100. An index of 150 means prices 50% higher than today.</p>
                </div>
                <div className="flex gap-2 bg-surface-dim p-1 rounded-[8px]">
                  {(["3Y", "5Y", "10Y"] as const).map((tl) => (
                    <button key={tl} onClick={() => setActiveTimeline(tl)} className={activeTimeline === tl ? "filter-pill-active" : "filter-pill"}>{tl}</button>
                  ))}
                </div>
              </div>

              <div className="h-[300px] md:h-[380px] w-full font-mono text-[10px] relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={projectionData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorBase" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FFB400" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#FFB400" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorOpt" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis dataKey="year" stroke="#94A3B8" />
                    <YAxis stroke="#94A3B8" domain={[80, "auto"]} />
                    <Tooltip contentStyle={{ backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "8px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} labelClassName="font-mono text-xs font-bold text-text-primary" />
                    <Legend wrapperStyle={{ paddingTop: 10 }} />
                    <ReferenceLine y={100} stroke="#E53935" strokeDasharray="3 3" label={{ value: "2026 prices", fill: "#E53935", fontSize: 9 }} />
                    <Area type="monotone" dataKey={SCENARIO_KEYS.optimistic} stroke="#10B981" fillOpacity={1} fill="url(#colorOpt)" strokeWidth={2} />
                    <Area type="monotone" dataKey={SCENARIO_KEYS.base} stroke="#FFB400" fillOpacity={1} fill="url(#colorBase)" strokeWidth={3} />
                    <Area type="monotone" dataKey={SCENARIO_KEYS.conservative} stroke="#94A3B8" fill="none" strokeWidth={1.5} strokeDasharray="4 4" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Horizon read-outs */}
              <div className="border-t border-gray-100 pt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                {([3, 5, 10] as const).map((n) => {
                  const s = forecast.scenarios;
                  const base = s.base.index[n];
                  return (
                    <div key={n} className="stat-card">
                      <span className="stat-label">{n}-year base case ({forecast.baseYear + n})</span>
                      <div className="flex items-center gap-2">
                        <p className="stat-value">Index: {base}</p>
                        <TrendingUp className="stat-trend stat-trend-up" size={20} />
                      </div>
                      <p className="text-[11px] text-text-secondary leading-relaxed mt-2">
                        Range {s.conservative.index[n]}–{s.optimistic.index[n]} · about {s.base[`cagr${n}` as "cagr3" | "cagr5" | "cagr10"]}% a year.
                        {rates && <> Today&apos;s {inr(rates.median)}{unitLabel} would be about {inr((rates.median * base) / 100)}{unitLabel}.</>}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* How it's built */}
          {forecast && (
            <div className="card-premium flex gap-4 text-xs bg-luxury-bg border-none shadow-none">
              <Info size={24} className="text-navy-ink shrink-0 mt-0.5" />
              <div className="space-y-2 leading-relaxed text-text-secondary">
                <strong className="text-text-primary font-bold">How these scenarios are built</strong>
                <ul className="list-disc pl-4 space-y-1">
                  <li><strong className="text-text-primary">Conservative, {forecast.inputs.anchors.conservative}% a year</strong> — the RBI all-India house price index&apos;s latest yearly growth (roughly inflation).</li>
                  <li><strong className="text-text-primary">Base, {forecast.inputs.anchors.base}% a year</strong> — Hyderabad&apos;s current pace (Knight Frank, H1 2026).</li>
                  <li><strong className="text-text-primary">Optimistic, {forecast.inputs.anchors.optimistic}% a year</strong> — a repeat of Hyderabad&apos;s 2019–2026 run (ANAROCK: ₹4,195 → ₹8,090/sq.ft).</li>
                  {asset === "plot" && (
                    <li>Plots add {forecast.inputs.landPremium.base} pts (base) and {forecast.inputs.landPremium.optimistic} pts (optimistic): land tends to move faster and less evenly than flats. This is a modelling assumption, not a measured figure.</li>
                  )}
                  <li>
                    {forecast.inputs.infraPremium === 0
                      ? "This corridor's infrastructure score is average, so no infrastructure adjustment is applied."
                      : `Infrastructure: ${forecast.inputs.infraPremium > 0 ? "+" : ""}${forecast.inputs.infraPremium} pts a year from this corridor's infrastructure score, halving every 4 years as the projects get priced in.`}
                  </li>
                  {forecast.inputs.widened && <li>The range is widened by 1.5 pts each way because of {forecast.inputs.widenedBecause}.</li>}
                </ul>
                <p>These are scenarios, not predictions. Interest rates, project delays and the wider economy can move prices outside this range. We don&apos;t yet have a measured price history per corridor — we&apos;re recording one every quarter from now on.</p>
                <p className="flex flex-wrap gap-x-3 gap-y-1">
                  {ANCHOR_SOURCES.map((s) => (
                    <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline">{s.label} <ExternalLink size={10} /></a>
                  ))}
                </p>
              </div>
            </div>
          )}

          {selected && !m && (
            <div className="card-premium text-xs text-text-secondary">Market figures for this corridor haven&apos;t been computed yet.</div>
          )}
        </div>
      </main>

      <div className="bg-surface-dim border-t border-gray-200 py-6 text-center text-[10px] text-text-secondary font-mono">
        <p>Scenarios for research only — not investment advice. Prices last computed {m ? new Date(m.computedAt).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "—"}.</p>
      </div>
    </div>
  );
}
