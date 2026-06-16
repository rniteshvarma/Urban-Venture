"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Brain, 
  TrendingUp, 
  Hammer, 
  FileCheck,
  ChevronRight,
  ArrowLeft,
  X,
  Plus,
  Loader2,
  Sparkles
} from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

export function ComparePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [corridors, setCorridors] = useState<any[]>([]);
  // Selected Corridors state
  const [corridorA, setCorridorA] = useState("");
  const [corridorB, setCorridorB] = useState("");
  const [corridorC, setCorridorC] = useState("");

  const [comparisons, setComparisons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Load corridors once on mount
  useEffect(() => {
    async function loadCorridors() {
      try {
        const res = await fetch("/api/market/corridors");
        if (res.ok) {
          const data = await res.json();
          setCorridors(data);
        }
      } catch (err) {
        console.error("Failed to load corridors", err);
      }
    }
    loadCorridors();
  }, []);

  // Update selected corridors when corridors or searchParams change
  useEffect(() => {
    if (corridors.length === 0) return;

    const resolveToSlug = (param: string | null) => {
      if (!param) return "";
      const match = corridors.find(c => 
        c.corridor.toLowerCase() === param.toLowerCase() ||
        c.shortName.toLowerCase() === param.toLowerCase() ||
        c.name.toLowerCase() === param.toLowerCase() ||
        (param.toLowerCase() === "pharma city" && c.corridor.includes("pharma-city")) ||
        (param.toLowerCase() === "shamshabad" && c.corridor.includes("shamshabad"))
      );
      return match ? match.corridor : "";
    };

    const paramA = searchParams.get("a");
    const paramB = searchParams.get("b");
    const paramC = searchParams.get("c");

    let resolvedA = resolveToSlug(paramA);
    let resolvedB = resolveToSlug(paramB);
    let resolvedC = resolveToSlug(paramC);

    if (!resolvedA) {
      const shad = corridors.find(c => c.corridor.includes("shadnagar"));
      resolvedA = shad ? shad.corridor : corridors[0].corridor;
    }
    if (!resolvedB) {
      const pharma = corridors.find(c => c.corridor.includes("pharma-city") || c.corridor.includes("maheshwaram"));
      resolvedB = pharma ? pharma.corridor : (corridors[1] ? corridors[1].corridor : corridors[0].corridor);
    }

    if (resolvedA === resolvedB && corridors.length > 1) {
      if (resolvedA === corridors[0].corridor) {
        resolvedB = corridors[1].corridor;
      } else {
        resolvedA = corridors[0].corridor;
      }
    }

    setCorridorA(resolvedA);
    setCorridorB(resolvedB);
    setCorridorC(resolvedC);
  }, [corridors, searchParams]);

  useEffect(() => {
    fetchComparisons();
  }, [corridorA, corridorB, corridorC]);

  async function fetchComparisons() {
    if (!corridorA || !corridorB) return;
    setLoading(true);
    try {
      let url = `/api/market/compare?a=${encodeURIComponent(corridorA)}&b=${encodeURIComponent(corridorB)}`;
      if (corridorC) {
        url += `&c=${encodeURIComponent(corridorC)}`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setComparisons(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Pre-process pricing charts for comparison (aligning years)
  const getOverlaidChartData = () => {
    if (comparisons.length === 0) return [];
    
    // Find all unique years across all price histories
    const yearsSet = new Set<number>();
    comparisons.forEach(c => {
      c.priceHistory?.forEach((h: any) => yearsSet.add(h.year));
    });

    const years = Array.from(yearsSet).sort();
    return years.map(yr => {
      const row: any = { year: yr };
      comparisons.forEach(c => {
        const match = c.priceHistory?.find((h: any) => h.year === yr);
        row[c.corridor] = match ? match.pricePerSqFt : null;
      });
      return row;
    });
  };

  const handleUpdateQuery = (key: "a" | "b" | "c", val: string) => {
    if (key === "a") setCorridorA(val);
    if (key === "b") setCorridorB(val);
    if (key === "c") setCorridorC(val);

    const params = new URLSearchParams(searchParams.toString());
    if (val) {
      params.set(key, val);
    } else {
      params.delete(key);
    }
    router.push(`/market/compare?${params.toString()}`);
  };

  const lineColors = ["#f59e0b", "#3b82f6", "#8b5cf6"];
  const overlaidData = getOverlaidChartData();

  return (
    <div className="bg-luxury-bg text-text-primary min-h-screen font-sans">
      {/* Back Header */}
      <div className="bg-white border-b border-luxury py-3 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/market" className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors">
            <ArrowLeft size={13} /> Back to Market Hub
          </Link>
          <span className="text-xs text-primary font-bold uppercase tracking-wider">Corridor Comparison Tool</span>
        </div>
      </div>

      <main className="max-w-7xl mx-auto py-10 px-6 space-y-10">
        {/* Selector Panel */}
        <div className="bg-white border border-luxury p-5 rounded-lg space-y-4 shadow-sm">
          <h1 className="text-lg font-bold text-text-primary flex items-center gap-1.5">
            <Sparkles size={18} className="text-primary" /> Compare Hyderabad Corridors
          </h1>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Corridor A *</label>
              <select
                value={corridorA}
                onChange={(e) => handleUpdateQuery("a", e.target.value)}
                className="border border-slate-200 bg-white text-text-primary rounded px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
              >
                {corridors.map(c => (
                  <option key={c.corridor} value={c.corridor} disabled={c.corridor === corridorB || c.corridor === corridorC}>
                    {c.shortName || c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Corridor B *</label>
              <select
                value={corridorB}
                onChange={(e) => handleUpdateQuery("b", e.target.value)}
                className="border border-slate-200 bg-white text-text-primary rounded px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
              >
                {corridors.map(c => (
                  <option key={c.corridor} value={c.corridor} disabled={c.corridor === corridorA || c.corridor === corridorC}>
                    {c.shortName || c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Corridor C (Optional)</label>
              <div className="flex gap-2">
                <select
                  value={corridorC}
                  onChange={(e) => handleUpdateQuery("c", e.target.value)}
                  className="w-full border border-slate-200 bg-white text-text-primary rounded px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                >
                  <option value="">-- Add Third Corridor --</option>
                  {corridors.map(c => (
                    <option key={c.corridor} value={c.corridor} disabled={c.corridor === corridorA || c.corridor === corridorB}>
                      {c.shortName || c.name}
                    </option>
                  ))}
                </select>
                {corridorC && (
                  <button
                    onClick={() => handleUpdateQuery("c", "")}
                    className="p-2 bg-slate-50 hover:bg-slate-100 text-text-secondary hover:text-text-primary rounded border border-slate-200 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="animate-spin text-primary" size={36} />
          </div>
        ) : comparisons.length === 0 ? (
          <div className="bg-white border border-luxury rounded p-12 text-center text-text-secondary text-xs italic shadow-sm">
            Select corridors to evaluate side-by-side.
          </div>
        ) : (
          <div className="space-y-10">
            {/* Row 1: circular score gauges */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {comparisons.map((c, idx) => (
                <div key={c.corridor} className="bg-white border border-luxury p-6 rounded-lg text-center flex flex-col items-center shadow-sm">
                  <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1">{c.zone || c.city || "Growth"} Zone</span>
                  <h3 className="text-base font-bold text-text-primary mb-4">{c.shortName || c.name}</h3>

                  <div className="relative w-20 h-20 flex items-center justify-center">
                    <svg className="w-20 h-20 transform -rotate-90">
                      <circle cx="40" cy="40" r="34" stroke="#F1F5F9" strokeWidth="4" fill="transparent" />
                      <circle 
                        cx="40" 
                        cy="40" 
                        r="34" 
                        stroke={lineColors[idx]} 
                        strokeWidth="5" 
                        fill="transparent" 
                        strokeDasharray="213"
                        strokeDashoffset={213 - (213 * c.overallScore) / 100}
                        className="transition-all duration-1000"
                      />
                    </svg>
                    <span className="absolute text-base font-black text-text-primary">{c.overallScore}</span>
                  </div>

                  <span className={`mt-3 px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${
                    c.investorSentiment === "BULLISH" ? "bg-emerald-50 text-emerald-700 border-emerald-250" :
                    c.investorSentiment === "CAUTIOUS" ? "bg-red-50 text-red-700 border-red-200" :
                    "bg-amber-50 text-amber-700 border-amber-250"
                  }`}>
                    {c.investorSentiment}
                  </span>
                </div>
              ))}
              {/* If only 2 corridors, render a placeholder card */}
              {comparisons.length === 2 && (
                <div className="bg-white/50 border border-dashed border-slate-200 p-6 rounded-lg text-center flex flex-col justify-center items-center gap-2 shadow-sm">
                  <Plus size={20} className="text-text-secondary" />
                  <span className="text-[10px] text-text-secondary font-bold uppercase">Add Third Corridor</span>
                  <p className="text-[10px] text-text-secondary max-w-[180px]">Select a third option in the dropdown selectors above.</p>
                </div>
              )}
            </div>

            {/* Row 2: Overlaid Appreciation Line Chart */}
            <div className="bg-white border border-luxury p-5 rounded-lg shadow-sm">
              <h2 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <TrendingUp size={14} className="text-primary" /> Overlaid 5-Year price Appreciation (₹/sqft)
              </h2>
              <div className="h-[250px] w-full text-[10px] text-text-secondary">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={overlaidData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="year" stroke="#94A3B8" />
                    <YAxis stroke="#94A3B8" />
                    <Tooltip contentStyle={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8F0", fontSize: "11px", color: "#0F172A" }} />
                    <Legend 
                      wrapperStyle={{ fontSize: "10px" }} 
                      formatter={(value) => {
                        const match = comparisons.find(comp => comp.corridor === value);
                        return match ? (match.shortName || match.name) : value;
                      }}
                    />
                    {comparisons.map((c, idx) => (
                      <Line 
                        key={c.corridor} 
                        type="monotone" 
                        dataKey={c.corridor} 
                        stroke={lineColors[idx]} 
                        strokeWidth={2.5} 
                        dot={{ r: 4 }} 
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Row 3: Key metrics comparison grid table */}
            <div className="bg-white border border-luxury rounded-lg overflow-hidden shadow-sm">
              <div className="px-4 py-3 bg-slate-50 border-b border-luxury text-xs font-bold text-text-primary">
                Key Return Metrics Side-by-Side
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <td className="px-4 py-3 font-semibold text-text-secondary bg-slate-50/50 w-44">Historical CAGR</td>
                      {comparisons.map((c, idx) => (
                        <td key={idx} className="px-4 py-3 font-bold text-text-primary">{c.historicalCAGR}%</td>
                      ))}
                      {comparisons.length === 2 && <td className="px-4 py-3 text-text-secondary">—</td>}
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="px-4 py-3 font-semibold text-text-secondary bg-slate-50/50 w-44">Projected CAGR Min</td>
                      {comparisons.map((c, idx) => (
                        <td key={idx} className="px-4 py-3 text-text-secondary">{c.projectedCAGRMin}%</td>
                      ))}
                      {comparisons.length === 2 && <td className="px-4 py-3 text-text-secondary">—</td>}
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="px-4 py-3 font-semibold text-text-secondary bg-slate-50/50 w-44">Projected CAGR Max</td>
                      {comparisons.map((c, idx) => (
                        <td key={idx} className="px-4 py-3 font-bold text-emerald-650">{c.projectedCAGRMax}%</td>
                      ))}
                      {comparisons.length === 2 && <td className="px-4 py-3 text-text-secondary">—</td>}
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="px-4 py-3 font-semibold text-text-secondary bg-slate-50/50 w-44">Rental Yield Range</td>
                      {comparisons.map((c, idx) => (
                        <td key={idx} className="px-4 py-3 text-text-primary">{c.rentalYieldMin}% - {c.rentalYieldMax}%</td>
                      ))}
                      {comparisons.length === 2 && <td className="px-4 py-3 text-text-secondary">—</td>}
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="px-4 py-3 font-semibold text-text-secondary bg-slate-50/50 w-44">Risk Profile Grade</td>
                      {comparisons.map((c, idx) => (
                        <td key={idx} className={`px-4 py-3 font-bold ${
                          c.riskLevel === 'LOW' ? 'text-blue-600' :
                          c.riskLevel === 'MEDIUM' ? 'text-amber-600' : 'text-red-650'
                        }`}>{c.riskLevel}</td>
                      ))}
                      {comparisons.length === 2 && <td className="px-4 py-3 text-text-secondary">—</td>}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Row 4: Infrastructure projects list */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {comparisons.map((c) => (
                <div key={c.corridor} className="bg-white border border-luxury rounded-lg p-5 space-y-4 shadow-sm">
                  <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5 border-b border-luxury pb-2">
                    <Hammer size={14} className="text-primary" /> Infra tailwinds: {c.shortName || c.name}
                  </h3>
                  {c.infraProjects?.length === 0 ? (
                    <p className="text-text-secondary text-[11px] italic">No public projects mapped.</p>
                  ) : (
                    <div className="space-y-3">
                      {c.infraProjects.map((proj: any, idx: number) => (
                        <div key={idx} className="space-y-0.5">
                           <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-text-primary truncate max-w-[130px]" title={proj.name}>{proj.shortName || proj.name}</span>
                            <span className="text-[10px] text-amber-700 font-mono font-bold">Impact: {proj.reImpactScore}/10</span>
                          </div>
                          <p className="text-[10px] text-text-secondary uppercase tracking-widest">{proj.category.replace(/_/g, " ")} · {proj.status.replace(/_/g, " ")}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {/* If only 2 corridors, render a placeholder card */}
              {comparisons.length === 2 && (
                <div className="bg-white/50 border border-dashed border-slate-200 p-5 rounded-lg flex items-center justify-center text-text-secondary text-xs italic shadow-sm">
                  Select a third corridor above.
                </div>
              )}
            </div>

            {/* Row 5 & 6: Risks and Persona Suited For */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {comparisons.map((c) => (
                <div key={c.corridor} className="bg-white border border-luxury rounded-lg p-5 space-y-5 shadow-sm">
                  {/* Risks */}
                  <div className="space-y-2">
                    <h3 className="text-[10px] font-bold text-red-600 uppercase tracking-wider border-b border-luxury pb-1.5">
                      ⚠️ Core Market Risks
                    </h3>
                    <ul className="text-text-secondary text-xs space-y-1 list-disc list-inside">
                      {c.keyRisks?.map((r: string, idx: number) => (
                        <li key={idx} className="leading-relaxed truncate max-w-full" title={r}>{r}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Best For */}
                  <div className="space-y-2 pt-2">
                    <h3 className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                      👤 Suited Investor Profiles
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {c.bestFor?.map((p: string) => (
                        <span key={p} className="px-2 py-0.5 bg-slate-55 border border-slate-200 rounded text-[9px] font-bold text-text-secondary uppercase">
                          {p.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              {/* If only 2 corridors, render placeholder */}
              {comparisons.length === 2 && (
                <div className="bg-white/50 border border-dashed border-slate-200 p-5 rounded-lg flex items-center justify-center text-text-secondary text-xs italic shadow-sm">
                  Select a third corridor above.
                </div>
              )}
            </div>

            {/* Bottom Add to Research Report CTA */}
            <div className="border border-luxury bg-white p-6 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-6 max-w-4xl mx-auto shadow-sm">
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
                  <Brain className="text-primary" size={16} /> AI Research Report Builder
                </h3>
                <p className="text-text-secondary text-xs leading-relaxed max-w-xl">
                  Ready to draft a detailed investor proposal? Transfer these compared corridors directly into our AI Research compiler to generate a customized PDF proposal document.
                </p>
              </div>
              <button
                onClick={() => {
                  let pathStr = `/research?corridors=${encodeURIComponent([corridorA, corridorB, corridorC].filter(Boolean).join(","))}`;
                  router.push(pathStr);
                }}
                className="px-4 py-2 bg-primary hover:bg-blue-700 text-white font-bold rounded text-xs transition-colors flex items-center gap-1 cursor-pointer self-start md:self-center shadow-md"
              >
                Assemble AI Report <ChevronRight size={14} />
              </button>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={
      <div className="bg-luxury-bg text-text-primary min-h-screen flex items-center justify-center font-sans">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-text-secondary font-semibold tracking-wider uppercase">Loading Comparison Engine...</p>
        </div>
      </div>
    }>
      <ComparePageContent />
    </Suspense>
  );
}
