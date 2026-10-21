"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  Hammer, 
  FileCheck, 
  ArrowLeft,
  ExternalLink,
  ChevronRight,
  Loader2,
  Info,
  Layers,
  Award,
  AlertTriangle,
  UserCheck,
  ShieldCheck,
  Compass,
  ArrowUpRight
} from "lucide-react";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  BarChart,
  Bar,
  Legend
} from "recharts";
import { formatDate } from "@/lib/format";
import type { CorridorMarketStats } from "@/lib/market/compute";
import { SCORE_LABELS } from "@/lib/market/scores";
import { CYCLE, HEAT, type HeatRating, type InvCycle } from "@/components/ui/enums";

/** One contributor to a corridor's infra score (see /api/market/corridors/[slug]/infra). */
interface InfraDriver {
  projectId: string;
  name: string;
  status: string;
  distanceKm: number | null;
  distanceAssumed?: boolean;
  contribution: number;
  momentum: number;
  stale: boolean;
}

export default function CorridorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawCorridor = params?.corridor ? String(params.corridor) : "";

  const [activeTab, setActiveTab] = useState("pricing");
  const [loading, setLoading] = useState(true);

  // Data States
  const [profile, setProfile] = useState<any>(null);
  const [pricing, setPricing] = useState<any>(null);
  const [demand, setDemand] = useState<any>(null);
  const [infra, setInfra] = useState<any>(null);
  const [approvals, setApprovals] = useState<any>(null);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [corridorLegalRisks, setCorridorLegalRisks] = useState<any[]>([]);

  useEffect(() => {
    if (rawCorridor) {
      fetchCorridorDetails();
    }
  }, [rawCorridor]);

  async function fetchCorridorDetails() {
    setLoading(true);
    try {
      const slugEncoded = encodeURIComponent(rawCorridor);

      // 1. Fetch Profile
      const profRes = await fetch(`/api/market/corridors/${slugEncoded}`);
      if (!profRes.ok) {
        throw new Error("Failed to fetch corridor profile");
      }
      const profData = await profRes.json();
      setProfile(profData);

      // 2. Fetch Pricing
      const priceRes = await fetch(`/api/market/corridors/${slugEncoded}/appreciation`);
      if (priceRes.ok) {
        const priceData = await priceRes.json();
        setPricing(priceData);
      }

      // 3. Fetch Demand
      const demandRes = await fetch(`/api/market/corridors/${slugEncoded}/demand`);
      if (demandRes.ok) {
        const demandData = await demandRes.json();
        setDemand(demandData);
      }

      // 4. Fetch Infra
      const infraRes = await fetch(`/api/market/corridors/${slugEncoded}/infra`);
      if (infraRes.ok) {
        const infraData = await infraRes.json();
        setInfra(infraData);
      }

      // 5. Fetch Approvals
      const appRes = await fetch(`/api/market/corridors/${slugEncoded}/approvals`);
      if (appRes.ok) {
        const appData = await appRes.json();
        setApprovals(appData);
      }

      // 6. Fetch AI Analysis
      const aiRes = await fetch(`/api/market/corridors/${slugEncoded}/analysis`);
      if (aiRes.ok) {
        const aiData = await aiRes.json();
        setAiAnalysis(aiData);
      }

      // 7. Fetch Legal Risks
      const legalRes = await fetch(`/api/market/legal`);
      if (legalRes.ok) {
        const legalData = await legalRes.json();
        // These checks apply to any purchase; they aren't specific to one corridor.
        if (legalData.success && legalData.risks) setCorridorLegalRisks(legalData.risks);
      }

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 min-h-screen bg-[#F8FAFC] text-[#0F172A]">
        <Loader2 className="animate-spin text-[#10233F]" size={36} />
        <span className="text-xs text-[#10233F] font-semibold uppercase tracking-wider mt-4">Analyzing Corridor Layers...</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="bg-[#F8FAFC] text-[#0F172A] min-h-screen p-12 text-center flex flex-col justify-center items-center gap-4">
        <AlertTriangle size={32} className="text-[#EF4444]" />
        <h1 className="text-xl font-bold font-display">Corridor Not Found</h1>
        <p className="text-[#475569] text-xs max-w-sm">We could not retrieve details for &quot;{rawCorridor}&quot;. Please verify the URL or select a different corridor.</p>
        <Link href="/market" className="text-xs text-[#10233F] font-bold hover:underline flex items-center gap-1">
          <ArrowLeft size={12} /> Back to Market Hub
        </Link>
      </div>
    );
  }

  // Measured market figures (src/lib/market) and the quarterly observations recorded from them.
  const market: CorridorMarketStats | null = profile.market ?? null;
  const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
  const observations = (pricing?.pricePoints ?? []) as { id: string; year: number; quarter: number | null; pricePerSqFt: number; pricePerSqYd: number | null; yoyChange: number | null; sampleSize: number | null; source: string | null; notes: string | null }[];
  const obsSeries = (plot: boolean) => observations
    .filter((o) => (o.pricePerSqYd != null) === plot)
    .map((o) => ({ period: `Q${o.quarter ?? 4} ${o.year}`, price: plot ? o.pricePerSqYd! : o.pricePerSqFt }));
  const plotSeries = obsSeries(true);
  const aptSeries = obsSeries(false);
  const outlook = market ? market.forecast[market.primaryAsset].scenarios : null;
  // Recorded monthly demand rows (admin-entered); empty unless real data exists.
  const demandChartData = (demand?.trends ?? []).map((t: any) => ({ name: `${t.year}-${t.month}`, listings: t.newListings ?? 0, sold: t.soldUnits ?? 0 }));

  return (
    <div className="bg-luxury-bg text-text-primary min-h-screen font-sans">
      {/* Back Button */}
      <div className="bg-white border-b border-luxury py-3 px-6">
        <div className="max-w-7xl mx-auto">
          <Link href="/market" className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors">
            <ArrowLeft size={13} /> Back to Market Hub
          </Link>
        </div>
      </div>

      {/* SECTION 1: Intelligence Score Header Banner */}
      <section className="py-16 px-6" style={{ background: "var(--color-ink)" }}>
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
          {/* Corridor Info */}
          <div className="space-y-4 lg:col-span-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest block mb-1" style={{ color: "var(--color-saffron)", fontFamily: "var(--font-mono)" }}>Corridor Profile Deep Dive</span>
              <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight font-display">
                {profile.name || profile.shortName || profile.corridor}
              </h1>
              <p className="text-xs text-slate-200 mt-1.5 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                {[profile.zone, profile.district && `${profile.district} district`].filter(Boolean).join(" · ") || "Hyderabad growth corridor"}
              </p>
            </div>

            {/* Sub-scores Row */}
            <div className="grid grid-cols-4 gap-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-4">
              <div className="text-center">
                <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Infra</div>
                <div className="text-base font-black text-white mt-1">{profile.infraScore ?? "—"}/25</div>
              </div>
              <div className="text-center border-l border-white/20">
                <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider" title={SCORE_LABELS.approvalScore}>RERA projects</div>
                <div className="text-base font-black text-white mt-1">{profile.approvalScore ?? "—"}/25</div>
              </div>
              <div className="text-center border-l border-white/20">
                <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider" title={SCORE_LABELS.demandScore}>Activity</div>
                <div className="text-base font-black text-white mt-1">{profile.demandScore ?? "—"}/25</div>
              </div>
              <div className="text-center border-l border-white/20">
                <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider" title={SCORE_LABELS.appreciationScore}>Outlook</div>
                <div className="text-base font-black text-white mt-1">{profile.appreciationScore ?? "—"}/25</div>
              </div>
            </div>

            {/* Gold-bordered Quote block (Admin/AI commentary) */}
            {profile.adminNote && (
              <div className="border-l-4 bg-black/20 backdrop-blur-sm px-4 py-3 rounded-r text-xs text-slate-200 italic max-w-2xl leading-relaxed" style={{ borderColor: "var(--color-saffron)" }}>
                &quot;{profile.adminNote}&quot;
              </div>
            )}
          </div>

          {/* Overall Score Circle Gauge */}
          <div className="flex flex-col items-center justify-center bg-white border border-luxury p-6 rounded-xl max-w-[280px] mx-auto w-full shadow-luxury">
            <span className="text-[9px] font-bold text-text-secondary uppercase tracking-widest mb-3">Overall Rating</span>
            
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg className="w-28 h-28 transform -rotate-90">
                <circle cx="56" cy="56" r="48" stroke="#E2E8F0" strokeWidth="6" fill="transparent" />
                <circle 
                  cx="56" 
                  cy="56" 
                  r="48" 
                  stroke="#FFB400" 
                  strokeWidth="8" 
                  fill="transparent" 
                  strokeDasharray="301"
                  strokeDashoffset={301 - (301 * (profile.overallScore ?? 0)) / 100}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-3xl font-black text-text-primary block leading-none font-mono">{profile.overallScore ?? "—"}</span>
                <span className="text-[8px] text-accent uppercase font-black tracking-widest mt-1 inline-block font-mono">Score</span>
              </div>
            </div>

            <span className={`mt-4 px-3 py-0.5 rounded text-[10px] font-mono font-bold border uppercase tracking-wider ${
              profile.investorSentiment === "BULLISH" ? "bg-emerald-50 text-[#0F9D58] border-emerald-200" :
              profile.investorSentiment === "CAUTIOUS" ? "bg-red-50 text-[#D93B30] border-red-200" :
              "bg-amber-50 text-[#9A6A1E] border-amber-200"
            }`}>
              {profile.investorSentiment ? `${profile.investorSentiment.toLowerCase()} on our score` : "Not scored"}
            </span>
          </div>
        </div>
      </section>

      {/* Tabs Menu Navigation */}
      <section className="bg-white border-b border-[#E2E8F0] px-6 sticky z-30 backdrop-blur-md shadow-sm" style={{ top: 68 }}>
        <div className="max-w-7xl mx-auto flex overflow-x-auto whitespace-nowrap gap-6">
          {[
            { id: "pricing", label: "Prices", icon: <TrendingUp size={14} /> },
            { id: "demand", label: "Developer Activity", icon: <TrendingDown size={14} /> },
            { id: "infra", label: "Infrastructure Timeline", icon: <Hammer size={14} /> },
            { id: "approvals", label: "RERA Projects", icon: <FileCheck size={14} /> },
            { id: "ai", label: "Analyst Report", icon: <Brain size={14} /> },
            { id: "legal", label: "Buyer Checks", icon: <ShieldCheck size={14} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 py-4 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                activeTab === tab.id
                  ? "border-[#FFB400] text-text-primary"
                  : "border-transparent text-text-secondary hover:text-text-primary"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </section>

      {/* Tabs Contents */}
      <main className="max-w-7xl mx-auto py-12 px-6">
        
        {/* Tab 1: Prices — measured today, plus the quarterly record */}
        {activeTab === "pricing" && (
          <div className="space-y-10 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {(["plot", "apartment"] as const).map((a) => {
                const r = market?.rates[a];
                const unit = a === "plot" ? "/sq.yd" : "/sq.ft";
                return (
                  <div key={a} className="stat-card">
                    <div className="stat-label">{a === "plot" ? "Plot price today" : "Apartment price today"}</div>
                    {r ? (
                      <>
                        <div className="stat-value mt-1">{inr(r.median)} <span className="text-xs font-normal text-text-secondary">{unit}</span></div>
                        <p className="text-[10px] text-text-secondary mt-1 leading-relaxed">
                          Middle half {inr(r.p25)}–{inr(r.p75)} · {r.projects} project{r.projects === 1 ? "" : "s"} within {r.radiusKm} km · {r.confidence.toLowerCase()} confidence
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-text-secondary mt-2 leading-relaxed">Not enough {a === "plot" ? "plot" : "apartment"} listings nearby to measure.</p>
                    )}
                  </div>
                );
              })}
              <div className="stat-card">
                <div className="stat-label">5-year outlook (base case)</div>
                {outlook ? (
                  <>
                    <div className="stat-value mt-1">{outlook.base.cagr5}% <span className="text-xs font-normal text-text-secondary">a year</span></div>
                    <p className="text-[10px] text-text-secondary mt-1 leading-relaxed">
                      Range {outlook.conservative.cagr5}–{outlook.optimistic.cagr5}% · <Link href="/market/forecast" className="underline">how it&apos;s built</Link>
                    </p>
                  </>
                ) : <p className="text-xs text-text-secondary mt-2">Not computed yet.</p>}
              </div>
              <div className="stat-card">
                <div className="stat-label">Hyderabad average</div>
                {market ? (
                  <>
                    <div className="stat-value mt-1">{inr(market.city.aptAvgSqFt.value)} <span className="text-xs font-normal text-text-secondary">/sq.ft</span></div>
                    <p className="text-[10px] text-text-secondary mt-1 leading-relaxed">
                      Apartments, {market.city.aptAvgSqFt.period} ({market.city.aptAvgSqFt.note?.toLowerCase()}) ·{" "}
                      <a href={market.city.aptAvgSqFt.url} target="_blank" rel="noreferrer" className="underline">{market.city.aptAvgSqFt.source}</a>
                    </p>
                  </>
                ) : <p className="text-xs text-text-secondary mt-2">—</p>}
              </div>
            </div>

            {market && (
              <div className="bg-white border border-luxury rounded p-5 space-y-3">
                <div>
                  <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">Rental yield</h3>
                  <p className="text-[11px] text-text-secondary mt-1 max-w-2xl leading-relaxed">
                    Measured from public rental listings of apartments around {profile.shortName || profile.name}{" "}(fully furnished flats left out, since their
                    rent pays for furniture), against this corridor&apos;s apartment price. Gross — before maintenance, vacancy and tax.
                  </p>
                </div>
                {market.rental ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="stat-card">
                      <div className="stat-label">Gross rental yield</div>
                      <div className="stat-value mt-1">
                        {market.rental.grossYield != null ? `${market.rental.grossYield}%` : "—"} <span className="text-xs font-normal text-text-secondary">a year</span>
                      </div>
                      <p className="text-[10px] text-text-secondary mt-1 leading-relaxed">
                        {market.rental.grossYieldRange ? `Middle half ${market.rental.grossYieldRange[0]}–${market.rental.grossYieldRange[1]}% · ` : ""}
                        Hyderabad average {market.city.rentalYield.value}% (<a href={market.city.rentalYield.url} target="_blank" rel="noreferrer" className="underline">{market.city.rentalYield.source}</a>)
                      </p>
                    </div>
                    <div className="stat-card">
                      <div className="stat-label">Typical rent</div>
                      <div className="stat-value mt-1">₹{market.rental.rentSqftMedian} <span className="text-xs font-normal text-text-secondary">/sq.ft a month</span></div>
                      <p className="text-[10px] text-text-secondary mt-1 leading-relaxed">
                        {market.rental.byBhk.map((b) => `${b.bhk} BHK ${inr(b.medianRent)}`).join(" · ") || `Middle half ₹${market.rental.rentSqftP25}–₹${market.rental.rentSqftP75}/sq.ft`}
                      </p>
                    </div>
                    <div className="stat-card">
                      <div className="stat-label">Based on</div>
                      <div className="stat-value mt-1">{market.rental.listings} <span className="text-xs font-normal text-text-secondary">rental listings</span></div>
                      <p className="text-[10px] text-text-secondary mt-1 leading-relaxed">
                        Within {market.rental.radiusKm} km · {market.rental.letOut} marked as let out · {market.rental.confidence.toLowerCase()} confidence. New-launch prices sit above older resale flats, so yields on resale can be a little higher.
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-text-secondary">
                    Not enough apartment rental listings around here to measure rent{market.primaryAsset === "plot" ? " — this is mainly a plotted-land area, and plots earn no rent" : ""}.
                    Hyderabad&apos;s average gross yield is {market.city.rentalYield.value}% ({market.city.rentalYield.source}, {market.city.rentalYield.period}).
                  </p>
                )}
              </div>
            )}

            {market?.guidance && (
              <div className="bg-white border border-luxury rounded p-5 space-y-3">
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">Government guidance value</h3>
                    <p className="text-[11px] text-text-secondary mt-1 max-w-2xl leading-relaxed">
                      The official minimum value the Registration Department uses for stamp duty
                      {market.guidance.effective ? `, effective ${new Date(market.guidance.effective).toLocaleDateString("en-IN", { dateStyle: "medium" })}` : ""}.
                      Market prices are usually well above it; a big gap is normal, especially on the city&apos;s edges.
                    </p>
                  </div>
                  <a href={market.guidance.source.url} target="_blank" rel="noreferrer" className="text-[11px] underline inline-flex items-center gap-1 text-text-secondary">{market.guidance.source.name} <ExternalLink size={10} /></a>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {([["land", "Land", "/sq.yd", market.rates.plot?.median], ["apartment", "Apartments", "/sq.ft", market.rates.apartment?.median]] as const).map(([k, label, unit, ours]) => {
                    const g = market.guidance![k];
                    if (!g) return null;
                    return (
                      <div key={k} className="stat-card">
                        <div className="stat-label">{label} — guidance value</div>
                        <div className="stat-value mt-1">{inr(g.median)} <span className="text-xs font-normal text-text-secondary">{unit}</span></div>
                        <p className="text-[10px] text-text-secondary mt-1 leading-relaxed">
                          Middle of {g.villages.length} village{g.villages.length === 1 ? "" : "s"} · up to {inr(g.max)}{unit} on main roads
                          {ours ? ` · our listings are ${(ours / g.median).toFixed(1)}× this` : ""}
                        </p>
                      </div>
                    );
                  })}
                </div>
                <details className="text-[11px] text-text-secondary">
                  <summary className="cursor-pointer">Village-wise values</summary>
                  <table className="w-full mt-2 text-left">
                    <thead><tr className="text-[10px] uppercase"><th className="py-1">Village (mandal)</th><th className="py-1 text-right">Land ₹/sq.yd</th><th className="py-1 text-right">Flats ₹/sq.ft</th></tr></thead>
                    <tbody>
                      {[...new Set([...(market.guidance.land?.villages ?? []), ...(market.guidance.apartment?.villages ?? [])].map((v) => v.village))].map((code) => {
                        const l = market.guidance!.land?.villages.find((v) => v.village === code);
                        const a = market.guidance!.apartment?.villages.find((v) => v.village === code);
                        const v = l ?? a!;
                        return (
                          <tr key={code} className="border-t border-slate-100">
                            <td className="py-1">{v.villageName} <span className="text-text-secondary">({v.mandalName})</span></td>
                            <td className="py-1 text-right font-mono">{l ? `${inr(l.general)}${l.max > l.general ? ` – ${inr(l.max)}` : ""}` : "—"}</td>
                            <td className="py-1 text-right font-mono">{a ? `${inr(a.general)}${a.max > a.general ? ` – ${inr(a.max)}` : ""}` : "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </details>
              </div>
            )}

            {market?.landEvidence.map((e) => (
              <div key={e.url} className="bg-white border border-luxury rounded p-4 text-xs text-text-secondary leading-relaxed">
                <strong className="text-text-primary">{e.source}:</strong> ₹{e.value} {e.unit} ({e.period}). {e.note}{" "}
                <a href={e.url} target="_blank" rel="noreferrer" className="underline inline-flex items-center gap-0.5">Source <ExternalLink size={10} /></a>
              </div>
            ))}

            {/* Recorded history */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {([["plot", plotSeries, "/sq.yd"], ["apartment", aptSeries, "/sq.ft"]] as const).map(([a, series, unit]) => (
                <div key={a} className="card-premium p-5 flex flex-col">
                  <div className="section-header border-l-4 border-saffron pl-3 mb-4">
                    <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                      <TrendingUp size={14} className="text-accent" /> {a === "plot" ? "Plot" : "Apartment"} price record (₹{unit})
                    </h3>
                  </div>
                  {series.length < 2 ? (
                    <div className="h-[200px] flex flex-col items-center justify-center text-center gap-2 text-text-secondary text-xs px-6">
                      <Info size={16} />
                      {series.length === 1
                        ? <span>First recorded {series[0].period}: {inr(series[0].price)}{unit}. We record the measured price every quarter — the trend line appears from the next one.</span>
                        : <span>No recorded prices yet for this property type here.</span>}
                    </div>
                  ) : (
                    <div className="h-[220px] w-full text-[10px] text-text-secondary">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={series} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                          <XAxis dataKey="period" stroke="#94A3B8" />
                          <YAxis stroke="#94A3B8" />
                          <Tooltip contentStyle={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8F0", fontSize: "11px", color: "#0F172A" }} />
                          <Line type="monotone" dataKey="price" stroke="#FFB400" strokeWidth={2.5} name={`₹${unit}`} dot={{ r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {observations.length > 0 && (
              <div className="bg-white border border-luxury rounded overflow-x-auto shadow-sm">
                <div className="px-4 py-3 border-b border-luxury bg-white flex items-center justify-between">
                  <span className="text-xs font-bold text-text-primary">Recorded observations</span>
                </div>
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-luxury text-[10px] font-bold uppercase text-text-secondary">
                      <th className="px-4 py-3">Quarter</th>
                      <th className="px-4 py-3 text-right">Price</th>
                      <th className="px-4 py-3 text-center">Year on year</th>
                      <th className="px-4 py-3">Basis</th>
                      <th className="px-4 py-3">Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-text-primary">
                    {observations.slice().reverse().map((pt) => (
                      <tr key={pt.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold">Q{pt.quarter ?? "—"} {pt.year}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold">{pt.pricePerSqYd != null ? `${inr(pt.pricePerSqYd)}/sq.yd` : `${inr(pt.pricePerSqFt)}/sq.ft`}</td>
                        <td className="px-4 py-3 text-center">{pt.yoyChange == null ? "—" : `${pt.yoyChange >= 0 ? "+" : ""}${pt.yoyChange}%`}</td>
                        <td className="px-4 py-3 text-text-secondary text-[11px]">{pt.notes || "—"}</td>
                        <td className="px-4 py-3 text-text-secondary text-[11px]">{pt.source || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {pricing?.cityBenchmarks?.length > 0 && (
              <p className="text-[11px] text-text-secondary leading-relaxed">
                City context: Hyderabad apartments averaged{" "}
                {pricing.cityBenchmarks.map((b: { period: string; pricePerSqFt: number; source: string; url: string }, i: number) => (
                  <span key={b.period}>{i > 0 ? ", " : ""}{inr(b.pricePerSqFt)}/sq.ft in {b.period} (<a href={b.url} target="_blank" rel="noreferrer" className="underline">{b.source}</a>)</span>
                ))}.
              </p>
            )}
          </div>
        )}

        {/* Tab 2: Demand Trends */}
        {activeTab === "demand" && (
          <div className="space-y-10 animate-fade-in">
            {demand?.activity ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  ["Projects tracked", demand.activity.totalProjects, `Within ${demand.activity.radiusKm} km`],
                  ["Under construction", demand.activity.activeProjects, "Building or newly launched"],
                  ["Ready to move", demand.activity.readyProjects, "Completed projects still selling"],
                  ["TG-RERA registered", demand.activity.reraProjects, "With a RERA number on record"],
                ].map(([label, value, note]) => (
                  <div key={label as string} className="stat-card text-center">
                    <span className="stat-label block">{label}</span>
                    <span className="stat-value mt-1 block">{value}</span>
                    <span className="text-[9px] text-text-secondary block mt-1">{note}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white border border-luxury rounded p-12 text-center text-text-secondary italic text-xs shadow-sm">Developer activity hasn&apos;t been computed for this corridor yet.</div>
            )}

            {demand?.contextParagraph && (
              <div className="bg-blue-50/40 border border-blue-200 rounded-lg p-5 flex items-start gap-3 shadow-sm">
                <Info className="text-primary mt-0.5 flex-shrink-0" size={16} />
                <p className="text-xs text-text-secondary leading-relaxed font-medium">{demand.contextParagraph}</p>
              </div>
            )}

            {demandChartData.length > 0 && (
              <div className="card-premium p-5 flex flex-col">
                <div className="section-header border-l-4 border-saffron pl-3 mb-4">
                  <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">Recorded monthly activity</h3>
                </div>
                <div className="h-[250px] w-full text-[10px] text-text-secondary">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={demandChartData.slice(-12)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="name" stroke="#94A3B8" />
                      <YAxis stroke="#94A3B8" />
                      <Tooltip contentStyle={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8F0", fontSize: "11px", color: "#0F172A" }} />
                      <Legend wrapperStyle={{ fontSize: "10px" }} />
                      <Bar dataKey="listings" fill="#FFB400" name="New listings" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="sold" fill="#10233F" name="Units sold" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Infrastructure timeline pipeline */}
        {activeTab === "infra" && (
          <div className="space-y-10 animate-fade-in">
            <div className="section-header border-l-4 border-saffron pl-4">
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-2">Government Infrastructure pipeline</h3>
              <p className="text-text-secondary text-xs">Timeline of public expressway, metro link, and industrial developments affecting growth in {profile.shortName || profile.name || profile.corridor}.</p>
            </div>

            {/* What drives the infra score — from the live infra pipeline */}
            {infra?.movement?.drivers?.length > 0 && (() => {
              const drivers = infra.movement.drivers.slice(0, 5);
              const top = Math.max(...drivers.map((d: InfraDriver) => d.contribution), 0.001);
              const days: number | null = infra.lastUpdatedDaysAgo ?? null;
              return (
                <div className="border border-luxury rounded bg-white shadow-sm p-6 space-y-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="text-xs font-bold text-text-primary uppercase tracking-wider">
                      What drives the {infra.movement.infraScore}/25 infra score
                      {infra.movement.delta !== null && infra.movement.delta !== 0 && (
                        <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] ${infra.movement.delta > 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                          {infra.movement.delta > 0 ? "+" : ""}{infra.movement.delta} since last update
                        </span>
                      )}
                    </div>
                    {days !== null && (
                      <div className="text-[11px] text-text-secondary">
                        Project data verified {days === 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2.5">
                    {drivers.map((d: InfraDriver) => (
                      <div key={d.projectId} className="grid grid-cols-[minmax(0,1fr)_96px] sm:grid-cols-[minmax(0,1fr)_160px] items-center gap-3 text-xs">
                        <div className="min-w-0">
                          <div className="font-semibold text-text-primary truncate">{d.name}</div>
                          <div className="text-[11px] text-text-secondary">
                            {String(d.status).replace(/_/g, " ").toLowerCase()}
                            {d.distanceKm !== null && !d.distanceAssumed ? ` · ${d.distanceKm} km away` : ""}
                            {d.momentum > 0 ? " · progressed recently" : ""}
                            {d.stale ? " · awaiting fresh confirmation" : ""}
                          </div>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full rounded-full bg-saffron" style={{ width: `${Math.max(4, (d.contribution / top) * 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-text-secondary">
                    Weighted by distance, construction stage, time to completion and recent progress. Updated automatically as projects move.
                  </p>
                </div>
              );
            })()}

            {/* Timeline View */}
            {!infra?.projects || infra.projects.length === 0 ? (
              <div className="bg-white border border-luxury rounded p-12 text-center text-text-secondary italic text-xs shadow-sm">
                No active infrastructure projects affecting this corridor currently.
              </div>
            ) : (
              <div className="border border-luxury rounded bg-white divide-y divide-slate-100 shadow-sm">
                {infra.projects.map((proj: any) => {
                  const isComplete = proj.status === "COMPLETE";
                  const isUnderConst = proj.status === "UNDER_CONSTRUCTION";

                  return (
                    <div key={proj.id} className="p-6 space-y-4">
                       {/* Project Header Row */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase border ${
                              isComplete ? "bg-green-50 text-green-700 border-green-200" :
                              isUnderConst ? "bg-orange-50 text-orange-700 border-orange-200" :
                              "bg-blue-50 text-blue-700 border-blue-200"
                            }`}>
                              {proj.status.replace("_", " ")}
                            </span>
                            <span className="text-text-secondary text-[10px] font-bold uppercase">{proj.category.replace("_", " ")}</span>
                          </div>
                          <h4 className="text-base font-bold text-text-primary tracking-tight">{proj.name}</h4>
                        </div>

                      </div>

                      {proj.description && <p className="text-xs text-text-secondary leading-relaxed max-w-3xl">{proj.description}</p>}

                      {/* Project detail grid — only facts a cited source states */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs bg-slate-50 p-4 border border-luxury rounded">
                        <div>
                          <span className="text-[10px] text-text-secondary font-bold uppercase">Completion</span>
                          <span className="text-text-primary font-bold block mt-0.5">{proj.estimatedCompletion || (isComplete ? "Done" : "No official date")}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-text-secondary font-bold uppercase">Length / cost</span>
                          <span className="text-text-primary font-bold block mt-0.5">
                            {[proj.totalLengthKm ? `${proj.totalLengthKm} km` : null, proj.totalInvestmentCr ? `₹${proj.totalInvestmentCr.toLocaleString("en-IN")} Cr` : null].filter(Boolean).join(" · ") || "—"}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-[10px] text-text-secondary font-bold uppercase">Source</span>
                          <span className="block mt-0.5">
                            {proj.sourceUrl ? (
                              <a href={proj.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-text-primary font-bold hover:underline inline-flex items-center gap-1 break-all">
                                {proj.sourceAuthority || new URL(proj.sourceUrl).hostname} <ExternalLink size={10} />
                              </a>
                            ) : <span className="text-text-secondary">—</span>}
                            {proj.lastVerifiedDate && <span className="text-[10px] text-text-secondary block">Checked {formatDate(proj.lastVerifiedDate)}{proj.lastVerifiedSource ? ` · ${proj.lastVerifiedSource}` : ""}</span>}
                          </span>
                        </div>
                      </div>

                      {/* Milestone Sub-timeline */}
                      {proj.milestones?.length > 0 && (
                        <div className="pt-2">
                          <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider block mb-2">Milestone execution timeline</span>
                          <div className="space-y-3 relative pl-4 border-l border-slate-200 ml-1">
                            {proj.milestones.map((m: any, mIdx: number) => (
                              <div key={m.id || mIdx} className="relative space-y-0.5">
                                {/* Dot indicator */}
                                <span className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2 ${
                                  m.status === "COMPLETED" ? "bg-emerald-500 border-emerald-500" :
                                  m.status === "IN_PROGRESS" ? "bg-amber-500 border-amber-500" :
                                  "bg-white border-slate-350"
                                }`} />
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-text-primary text-[11px]">{m.title}</span>
                                  {m.date && (
                                    <span className="text-[9px] text-text-secondary">({formatDate(m.date)})</span>
                                  )}
                                </div>
                                {m.description && <p className="text-[10px] text-text-secondary">{m.description}</p>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Approvals Directory list */}
        {activeTab === "approvals" && (
          <div className="space-y-10 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">TG-RERA registered projects</h3>
                <p className="text-text-secondary text-xs mt-1">Projects in our listings near this corridor, with their Telangana RERA registration. Open the RERA record to check the certificate and possession date.</p>
              </div>

              {/* Counters */}
              <div className="flex gap-4">
                <div className="bg-white border border-luxury px-4 py-2 rounded text-center">
                  <span className="text-[9px] text-text-secondary uppercase font-bold">HMDA Layouts</span>
                  <span className="text-base font-black text-text-primary block">{approvals?.totalHmda || 0}</span>
                </div>
                <div className="bg-white border border-luxury px-4 py-2 rounded text-center">
                  <span className="text-[9px] text-text-secondary uppercase font-bold">RERA Registered</span>
                  <span className="text-base font-black text-text-primary block">{approvals?.totalRera || 0}</span>
                </div>
              </div>
            </div>

            {/* Approvals Table */}
            {!approvals?.approvals || approvals.approvals.length === 0 ? (
              <div className="bg-white border border-luxury rounded p-12 text-center text-text-secondary italic text-xs shadow-sm">
                No RERA-registered projects in our listings near this corridor yet.
              </div>
            ) : (
              <div className="bg-white border border-luxury rounded overflow-x-auto shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-luxury text-[10px] font-bold uppercase text-text-secondary">
                        <th className="px-4 py-3">Project Name</th>
                        <th className="px-4 py-3">Developer</th>
                        <th className="px-4 py-3">Authority</th>
                        <th className="px-4 py-3">Approval Type</th>
                        <th className="px-4 py-3">Number</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3 text-right">Area (Acres)</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-text-primary">
                      {approvals.approvals.map((app: any) => (
                        <tr key={app.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3.5 font-bold text-text-primary">{app.projectName}</td>
                          <td className="px-4 py-3.5 text-text-secondary">{app.developerName || "—"}</td>
                          <td className="px-4 py-3.5">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                              app.authority === "HMDA" ? "bg-green-50 text-green-700 border-green-200" :
                              app.authority === "DTCP" ? "bg-teal-50 text-teal-700 border-teal-200" :
                              "bg-slate-50 text-text-secondary border-slate-200"
                            }`}>
                              {app.authority}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-text-secondary">{app.approvalType.replace(/_/g, " ")}</td>
                          <td className="px-4 py-3.5 font-mono text-[11px] text-text-secondary">
                            {app.reraUrl ? <a href={app.reraUrl} target="_blank" rel="noreferrer" className="underline inline-flex items-center gap-0.5">{app.approvalNumber} <ExternalLink size={9} /></a> : app.approvalNumber || "—"}
                          </td>
                          <td className="px-4 py-3.5 text-text-secondary">
                            {app.approvalDate ? formatDate(app.approvalDate) : "—"}
                          </td>
                          <td className="px-4 py-3.5 text-right font-semibold text-text-primary">{app.areaAcres ? `${app.areaAcres} ac` : "—"}</td>
                          <td className="px-4 py-3.5">
                            <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded text-[9px] font-bold uppercase">
                              {app.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Note box */}
            <div className="border border-luxury bg-amber-50/40 p-4 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs max-w-4xl shadow-sm">
              <div className="space-y-1">
                <span className="font-bold text-text-primary block">💡 Official Registry Verification</span>
                <p className="text-text-secondary leading-relaxed max-w-2xl">Always verify approval layout status directly on HMDA.gov.in or RERA Telangana portal before investing. Our database is updated regularly but may not reflect real-time status.</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <a
                  href="https://rera.telangana.gov.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 border border-slate-200 hover:border-slate-350 text-text-primary font-bold rounded flex items-center gap-1 transition-all bg-white shadow-sm"
                >
                  RERA Telangana <ExternalLink size={10} />
                </a>
                <a
                  href="https://hmda.gov.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 border border-slate-200 hover:border-slate-350 text-text-primary font-bold rounded flex items-center gap-1 transition-all bg-white shadow-sm"
                >
                  HMDA Portal <ExternalLink size={10} />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Analyst report — assembled from measured data, every point sourced */}
        {activeTab === "ai" && (
          <div className="space-y-8 animate-fade-in max-w-4xl text-text-primary">
            <div className="border-b border-luxury pb-4">
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
                <Brain className="text-primary" size={16} /> Analyst report
              </h3>
              <p className="text-text-secondary text-[11px] mt-1">
                Built from our listings, the infrastructure tracker, TG-RERA records and measured rents
                {aiAnalysis?.generatedAt ? ` · figures as of ${formatDate(aiAnalysis.generatedAt)}` : ""}. Nothing here is written by hand or by AI.
              </p>
            </div>

            {!aiAnalysis?.available ? (
              <div className="bg-white border border-luxury rounded p-12 text-center text-text-secondary text-xs shadow-sm">
                {aiAnalysis?.reason ?? "The report isn't available yet."}
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <h4 className="text-lg md:text-xl font-bold text-text-primary leading-snug border-l-2 border-primary pl-4 py-1">{aiAnalysis.headline}</h4>
                  <p className="text-xs leading-relaxed text-text-secondary">{aiAnalysis.summary}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { k: "Heat", v: HEAT[aiAnalysis.heat.rating as HeatRating]?.label ?? aiAnalysis.heat.rating, why: aiAnalysis.heat.basis },
                    { k: "Timing stage", v: CYCLE[aiAnalysis.cycle.stage as InvCycle]?.label ?? aiAnalysis.cycle.stage, why: aiAnalysis.cycle.basis },
                    { k: "Risk", v: aiAnalysis.risk.level === "LOW" ? "Low" : aiAnalysis.risk.level === "HIGH" ? "High" : "Medium", why: aiAnalysis.risk.basis },
                  ].map((x) => (
                    <div key={x.k} className="bg-white border border-luxury rounded p-4 space-y-1 shadow-sm">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">{x.k}</span>
                      <div className="text-sm font-bold text-text-primary">{x.v}</div>
                      <p className="text-[11px] text-text-secondary leading-relaxed">{x.why}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {[
                    { title: "What's working for it", items: aiAnalysis.drivers as { text: string; source: string; url?: string | null }[], empty: "Nothing stands out in our data yet." },
                    { title: "What to watch", items: aiAnalysis.risks as { text: string; source: string; url?: string | null }[], empty: "No delivery, regulatory or data-coverage flags in our data." },
                  ].map((col) => (
                    <div key={col.title} className="space-y-2">
                      <span className="font-bold text-text-primary text-xs uppercase tracking-wider block border-b border-luxury pb-1.5">{col.title}</span>
                      {col.items.length === 0 ? (
                        <p className="text-xs text-text-secondary italic">{col.empty}</p>
                      ) : (
                        <ul className="space-y-2.5">
                          {col.items.map((f, i) => (
                            <li key={i} className="text-xs leading-relaxed">
                              <span className="text-text-primary">{f.text}</span>
                              <span className="block text-[10px] text-text-secondary mt-0.5">
                                {f.url ? <a href={f.url} target={f.url.startsWith("/") ? undefined : "_blank"} rel="noopener noreferrer" className="hover:underline inline-flex items-center gap-0.5">{f.source} <ExternalLink size={9} /></a> : f.source}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>

                {aiAnalysis.bestFor?.length > 0 && (
                  <p className="text-xs text-text-secondary">
                    <strong className="text-text-primary">Suits:</strong> {(aiAnalysis.bestFor as string[]).map((b) => b.toLowerCase().replace(/_/g, " ")).join(", ")} — from price level, rental yield and the mix of ready and under-construction projects.
                  </p>
                )}

                <div className="space-y-2">
                  <span className="font-bold text-text-primary text-xs uppercase tracking-wider block border-b border-luxury pb-1.5">5-year price outlook (scenario model)</span>
                  <div className="bg-slate-50 border border-luxury rounded p-3 space-y-2">
                    {([["Conservative", "conservative"], ["Base", "base"], ["Optimistic", "optimistic"]] as const).map(([label, k]) => (
                      <div key={k} className="flex items-center justify-between gap-4 text-xs font-semibold border-t first:border-t-0 border-luxury pt-2 first:pt-0">
                        <span className="text-text-secondary">{label}</span>
                        <span className="text-text-primary font-mono text-right">{aiAnalysis.priceOutlook[k]}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-text-secondary">Scenarios, not predictions — see <Link href="/market/forecast" className="underline">how the forecast works</Link>.</p>
                </div>

                {aiAnalysis.gaps?.length > 0 && (
                  <div className="bg-amber-50/60 border border-amber-200 rounded p-4 space-y-1.5">
                    <span className="font-bold text-text-primary text-xs uppercase tracking-wider block">What we can&apos;t tell you yet</span>
                    <ul className="list-disc list-inside text-xs text-text-secondary space-y-1">
                      {(aiAnalysis.gaps as string[]).map((g) => <li key={g}>{g}</li>)}
                    </ul>
                  </div>
                )}

                <div className="text-[10px] text-text-secondary space-y-1">
                  <span className="font-bold uppercase tracking-wider">Sources</span>
                  <ul className="space-y-0.5">
                    {(aiAnalysis.sources as { name: string; url: string | null }[]).map((src) => (
                      <li key={src.name}>{src.url ? <a href={src.url} target={src.url.startsWith("/") ? undefined : "_blank"} rel="noopener noreferrer" className="hover:underline">{src.name}</a> : src.name}</li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>
        )}

        {/* Tab 9: Legal Due Diligence Checklist */}
        {activeTab === "legal" && (
          <div className="space-y-8 animate-fade-in max-w-4xl text-text-primary">
            <div>
              <h3 className="text-lg font-display text-[#0F172A] flex items-center gap-2">
                <ShieldCheck size={18} className="text-[#10233F]" />
                Buyer checks before you pay an advance
              </h3>
              <p className="text-[#475569] text-xs mt-1">
                Common title and approval problems in and around Hyderabad, and how to check each one yourself. They apply to any purchase here; we haven&apos;t checked a specific property for you.
              </p>
            </div>

            {corridorLegalRisks.length === 0 ? (
              <div className="bg-white border border-[#E2E8F0] rounded-lg p-12 text-center text-text-secondary text-xs italic shadow-sm">
                Checks couldn&apos;t be loaded. At minimum, verify the TG-RERA registration, the layout permission (LP) number and a 30-year Encumbrance Certificate.
              </div>
            ) : (
              <div className="space-y-6">
                {corridorLegalRisks.map((risk) => {
                  const isRed = risk.severity === "RED";
                  const isOrange = risk.severity === "ORANGE";
                  
                  return (
                    <div 
                      key={risk.id}
                      className={`bg-white border rounded-lg p-5 space-y-4 shadow-sm border-l-4 ${
                        isRed ? "border-l-[#EF4444]" :
                        isOrange ? "border-l-[#FFB400]" :
                        "border-l-[#E09600]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold border uppercase tracking-wider ${
                            isRed ? "bg-red-50 text-[#EF4444] border-red-200" :
                            isOrange ? "bg-amber-50 text-[#10233F] border-amber-200" :
                            "bg-emerald-50 text-[#10233F] border-emerald-200"
                          }`}>
                            {risk.severity === "RED" ? "Deal-breaker if found" : risk.severity === "ORANGE" ? "Serious" : "Check"}
                          </span>
                          <h4 className="font-display text-base text-[#0F172A] mt-1.5">{risk.title}</h4>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-[#10233F] bg-[#FFB400]/15 px-2 py-0.5 rounded">
                          {risk.category.replace(/_/g, " ")}
                        </span>
                      </div>

                      <p className="text-xs text-[#475569] leading-relaxed">
                        {risk.description}
                      </p>

                      <div className="bg-[#F8FAFC]/40 p-4 rounded border border-[#E2E8F0] space-y-2 text-xs">
                        <div>
                          <strong className="text-[#0F172A] font-bold">How to verify:</strong>
                          <p className="text-[#475569] mt-0.5 leading-relaxed">{risk.checkMethod}</p>
                        </div>
                        {risk.govReference && (
                          <div className="flex items-center gap-1.5 pt-1.5 border-t border-[#E2E8F0]/60">
                            <span className="text-[10px] font-mono text-[#10233F] font-bold">LAW:</span>
                            <span className="font-mono text-[11px] text-text-secondary">{risk.govReference}</span>
                          </div>
                        )}
                        {risk.checkUrl && (
                          <div className="pt-1 flex items-center justify-end">
                            <a
                              href={risk.checkUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-mono text-[10px] text-[#10233F] hover:text-[#10233F] font-bold"
                            >
                              Open the official portal <ExternalLink size={10} />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* SECTION 7: Compare Corridors CTA */}
      <section className="bg-white border-t border-luxury py-12 px-6 shadow-inner">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <h2 className="text-lg font-bold text-text-primary tracking-tight">Evaluate other growth vectors in Hyderabad?</h2>
          <p className="text-text-secondary text-xs max-w-md mx-auto">Compare returns, approvals, and upcoming pipeline projects side by side using our evaluation grid.</p>
          <div className="pt-2">
            <Link
              href={`/market/compare?a=${profile.corridor.toLowerCase().replace(/\s+/g, "-")}`}
              className="inline-flex items-center gap-1 px-4 py-2 bg-primary hover:bg-blue-700 text-white font-bold rounded text-xs transition-colors cursor-pointer shadow-md"
            >
              Compare with another corridor <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* CSS Animation */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
