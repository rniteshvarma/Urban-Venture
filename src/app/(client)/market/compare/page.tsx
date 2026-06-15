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

const CORRIDORS_LIST = ["Shadnagar", "Pharma City", "Sangareddy", "Kokapet", "Shamshabad", "Yadadri", "Kompally", "Adibatla"];

export function ComparePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Selected Corridors state
  const [corridorA, setCorridorA] = useState(searchParams.get("a") || "Shadnagar");
  const [corridorB, setCorridorB] = useState(searchParams.get("b") || "Pharma City");
  const [corridorC, setCorridorC] = useState(searchParams.get("c") || "");

  const [comparisons, setComparisons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
    <div className="bg-slate-900 text-slate-100 min-h-screen font-sans">
      {/* Back Header */}
      <div className="bg-slate-950 border-b border-slate-800/60 py-3 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/market" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={13} /> Back to Market Hub
          </Link>
          <span className="text-xs text-amber-500 font-bold uppercase tracking-wider">Corridor Comparison Tool</span>
        </div>
      </div>

      <main className="max-w-7xl mx-auto py-10 px-6 space-y-10">
        {/* Selector Panel */}
        <div className="bg-slate-950 border border-slate-800 p-5 rounded-lg space-y-4">
          <h1 className="text-lg font-bold text-white flex items-center gap-1.5">
            <Sparkles size={18} className="text-amber-500" /> Compare Hyderabad Corridors
          </h1>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Corridor A *</label>
              <select
                value={corridorA}
                onChange={(e) => handleUpdateQuery("a", e.target.value)}
                className="border border-slate-800 bg-slate-900 text-white rounded px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
              >
                {CORRIDORS_LIST.map(c => (
                  <option key={c} value={c} disabled={c === corridorB || c === corridorC}>{c}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Corridor B *</label>
              <select
                value={corridorB}
                onChange={(e) => handleUpdateQuery("b", e.target.value)}
                className="border border-slate-800 bg-slate-900 text-white rounded px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
              >
                {CORRIDORS_LIST.map(c => (
                  <option key={c} value={c} disabled={c === corridorA || c === corridorC}>{c}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Corridor C (Optional)</label>
              <div className="flex gap-2">
                <select
                  value={corridorC}
                  onChange={(e) => handleUpdateQuery("c", e.target.value)}
                  className="w-full border border-slate-800 bg-slate-900 text-white rounded px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="">-- Add Third Corridor --</option>
                  {CORRIDORS_LIST.map(c => (
                    <option key={c} value={c} disabled={c === corridorA || c === corridorB}>{c}</option>
                  ))}
                </select>
                {corridorC && (
                  <button
                    onClick={() => handleUpdateQuery("c", "")}
                    className="p-2 bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white rounded border border-slate-800 cursor-pointer"
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
            <Loader2 className="animate-spin text-amber-500" size={36} />
          </div>
        ) : comparisons.length === 0 ? (
          <div className="bg-slate-950 border border-slate-800 rounded p-12 text-center text-slate-500 text-xs italic">
            Select corridors to evaluate side-by-side.
          </div>
        ) : (
          <div className="space-y-10">
            {/* Row 1: circular score gauges */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {comparisons.map((c, idx) => (
                <div key={c.corridor} className="bg-slate-950 border border-slate-800 p-6 rounded-lg text-center flex flex-col items-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{c.city} Zone</span>
                  <h3 className="text-base font-bold text-white mb-4">{c.corridor}</h3>

                  <div className="relative w-20 h-20 flex items-center justify-center">
                    <svg className="w-20 h-20 transform -rotate-90">
                      <circle cx="40" cy="40" r="34" stroke="#1e293b" strokeWidth="4" fill="transparent" />
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
                    <span className="absolute text-base font-black text-white">{c.overallScore}</span>
                  </div>

                  <span className={`mt-3 px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${
                    c.investorSentiment === "BULLISH" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                    c.investorSentiment === "CAUTIOUS" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                    "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  }`}>
                    {c.investorSentiment}
                  </span>
                </div>
              ))}
              {/* If only 2 corridors, render a placeholder card */}
              {comparisons.length === 2 && (
                <div className="bg-slate-950/20 border border-dashed border-slate-800/80 p-6 rounded-lg text-center flex flex-col justify-center items-center gap-2">
                  <Plus size={20} className="text-slate-650" />
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Add Third Corridor</span>
                  <p className="text-[10px] text-slate-600 max-w-[180px]">Select a third option in the dropdown selectors above.</p>
                </div>
              )}
            </div>

            {/* Row 2: Overlaid Appreciation Line Chart */}
            <div className="bg-slate-950 border border-slate-800 p-5 rounded-lg">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <TrendingUp size={14} className="text-amber-500" /> Overlaid 5-Year price Appreciation (₹/sqft)
              </h2>
              <div className="h-[250px] w-full text-[10px] text-slate-450">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={overlaidData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                    <XAxis dataKey="year" stroke="#475569" />
                    <YAxis stroke="#475569" />
                    <Tooltip contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b", fontSize: "11px", color: "#f8fafc" }} />
                    <Legend wrapperStyle={{ fontSize: "10px" }} />
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
            <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 text-xs font-bold text-white">
                Key Return Metrics Side-by-Side
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <tbody>
                    <tr className="border-b border-slate-850">
                      <td className="px-4 py-3 font-semibold text-slate-400 bg-slate-900/30 w-44">Historical CAGR</td>
                      {comparisons.map((c, idx) => (
                        <td key={idx} className="px-4 py-3 font-bold text-white">{c.historicalCAGR}%</td>
                      ))}
                      {comparisons.length === 2 && <td className="px-4 py-3 text-slate-600">—</td>}
                    </tr>
                    <tr className="border-b border-slate-850">
                      <td className="px-4 py-3 font-semibold text-slate-400 bg-slate-900/30 w-44">Projected CAGR Min</td>
                      {comparisons.map((c, idx) => (
                        <td key={idx} className="px-4 py-3 text-slate-350">{c.projectedCAGRMin}%</td>
                      ))}
                      {comparisons.length === 2 && <td className="px-4 py-3 text-slate-600">—</td>}
                    </tr>
                    <tr className="border-b border-slate-850">
                      <td className="px-4 py-3 font-semibold text-slate-400 bg-slate-900/30 w-44">Projected CAGR Max</td>
                      {comparisons.map((c, idx) => (
                        <td key={idx} className="px-4 py-3 font-bold text-emerald-400">{c.projectedCAGRMax}%</td>
                      ))}
                      {comparisons.length === 2 && <td className="px-4 py-3 text-slate-600">—</td>}
                    </tr>
                    <tr className="border-b border-slate-850">
                      <td className="px-4 py-3 font-semibold text-slate-400 bg-slate-900/30 w-44">Rental Yield Range</td>
                      {comparisons.map((c, idx) => (
                        <td key={idx} className="px-4 py-3 text-white">{c.rentalYieldMin}% - {c.rentalYieldMax}%</td>
                      ))}
                      {comparisons.length === 2 && <td className="px-4 py-3 text-slate-600">—</td>}
                    </tr>
                    <tr className="border-b border-slate-850">
                      <td className="px-4 py-3 font-semibold text-slate-400 bg-slate-900/30 w-44">Risk Profile Grade</td>
                      {comparisons.map((c, idx) => (
                        <td key={idx} className={`px-4 py-3 font-bold ${
                          c.riskLevel === 'LOW' ? 'text-blue-400' :
                          c.riskLevel === 'MEDIUM' ? 'text-amber-500' : 'text-red-400'
                        }`}>{c.riskLevel}</td>
                      ))}
                      {comparisons.length === 2 && <td className="px-4 py-3 text-slate-600">—</td>}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Row 4: Infrastructure projects list */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {comparisons.map((c) => (
                <div key={c.corridor} className="bg-slate-950 border border-slate-800 rounded-lg p-5 space-y-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-850 pb-2">
                    <Hammer size={14} className="text-blue-500" /> Infra tailwinds: {c.corridor}
                  </h3>
                  {c.infraProjects?.length === 0 ? (
                    <p className="text-slate-500 text-[11px] italic">No public projects mapped.</p>
                  ) : (
                    <div className="space-y-3">
                      {c.infraProjects.map((proj: any, idx: number) => (
                        <div key={idx} className="space-y-0.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-white truncate max-w-[130px]" title={proj.name}>{proj.shortName || proj.name}</span>
                            <span className="text-[10px] text-amber-500 font-mono font-bold">Impact: {proj.reImpactScore}/10</span>
                          </div>
                          <p className="text-[10px] text-slate-400 uppercase tracking-widest">{proj.category.replace("_", " ")} · {proj.status.replace("_", " ")}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {/* If only 2 corridors, render a placeholder card */}
              {comparisons.length === 2 && (
                <div className="bg-slate-950/20 border border-dashed border-slate-800/85 p-5 rounded-lg flex items-center justify-center text-slate-600 text-xs italic">
                  Select a third corridor above.
                </div>
              )}
            </div>

            {/* Row 5 & 6: Risks and Persona Suited For */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {comparisons.map((c) => (
                <div key={c.corridor} className="bg-slate-950 border border-slate-800 rounded-lg p-5 space-y-5">
                  {/* Risks */}
                  <div className="space-y-2">
                    <h3 className="text-[10px] font-bold text-red-400 uppercase tracking-wider border-b border-slate-850 pb-1.5">
                      ⚠️ Core Market Risks
                    </h3>
                    <ul className="text-slate-400 text-xs space-y-1 list-disc list-inside">
                      {c.keyRisks?.map((r: string, idx: number) => (
                        <li key={idx} className="leading-relaxed truncate max-w-full" title={r}>{r}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Best For */}
                  <div className="space-y-2 pt-2">
                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      👤 Suited Investor Profiles
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {c.bestFor?.map((p: string) => (
                        <span key={p} className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-[9px] font-bold text-slate-350 uppercase">
                          {p.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              {/* If only 2 corridors, render placeholder */}
              {comparisons.length === 2 && (
                <div className="bg-slate-950/20 border border-dashed border-slate-800/85 p-5 rounded-lg flex items-center justify-center text-slate-600 text-xs italic">
                  Select a third corridor above.
                </div>
              )}
            </div>

            {/* Bottom Add to Research Report CTA */}
            <div className="border border-slate-800 bg-slate-950 p-6 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-6 max-w-4xl mx-auto">
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Brain className="text-amber-500" size={16} /> AI Research Report Builder
                </h3>
                <p className="text-slate-400 text-xs leading-relaxed max-w-xl">
                  Ready to draft a detailed investor proposal? Transfer these compared corridors directly into our AI Research compiler to generate a customized PDF proposal document.
                </p>
              </div>
              <button
                onClick={() => {
                  let pathStr = `/research?corridors=${encodeURIComponent([corridorA, corridorB, corridorC].filter(Boolean).join(","))}`;
                  router.push(pathStr);
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded text-xs transition-colors flex items-center gap-1 cursor-pointer self-start md:self-center"
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
      <div className="bg-slate-900 text-slate-100 min-h-screen flex items-center justify-center font-sans">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Loading Comparison Engine...</p>
        </div>
      </div>
    }>
      <ComparePageContent />
    </Suspense>
  );
}
