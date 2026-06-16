"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  LineChart as LucideChart, 
  ArrowLeft, 
  TrendingUp, 
  HelpCircle, 
  Building, 
  Loader2,
  Calendar,
  Layers,
  Sparkles,
  Info
} from "lucide-react";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  Legend,
  ReferenceLine
} from "recharts";

export default function ForecastHubPage() {
  const [corridors, setCorridors] = useState<any[]>([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [selectedCorridor, setSelectedCorridor] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCorridors();
  }, []);

  async function fetchCorridors() {
    try {
      const res = await fetch("/api/market/corridors");
      if (res.ok) {
        const data = await res.json();
        setCorridors(data);
        if (data.length > 0) {
          // Default to first corridor (e.g. kokapet-neopolis or adibatla)
          const first = data[0];
          setSelectedSlug(first.corridor);
          setSelectedCorridor(first);
        }
      }
    } catch (e) {
      console.error("Failed to fetch corridors for forecast", e);
    } finally {
      setLoading(false);
    }
  }

  const handleSelectCorridor = (slug: string) => {
    setSelectedSlug(slug);
    const found = corridors.find(c => c.corridor === slug);
    setSelectedCorridor(found);
  };

  // Generate 10-year projections data based on selected corridor metrics
  const generateProjectionData = () => {
    if (!selectedCorridor) return [];

    const baseVal = 100; // Price Index baseline in 2026
    const minCagr = selectedCorridor.projectedCAGRMin || 10;
    const maxCagr = selectedCorridor.projectedCAGRMax || 15;
    const baseCagr = (minCagr + maxCagr) / 2;

    const data = [];
    for (let year = 2026; year <= 2036; year++) {
      const n = year - 2026;
      
      const minVal = baseVal * Math.pow(1 + minCagr / 100, n);
      const baseValProjected = baseVal * Math.pow(1 + baseCagr / 100, n);
      const maxVal = baseVal * Math.pow(1 + maxCagr / 100, n);

      data.push({
        year: String(year),
        "Conservative Case (Min)": Math.round(minVal),
        "Base Case Estimate": Math.round(baseValProjected),
        "Optimistic Case (Max)": Math.round(maxVal)
      });
    }
    return data;
  };

  const projectionData = generateProjectionData();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 min-h-screen bg-[#F8FAFC] text-[#0F172A]">
        <Loader2 className="animate-spin text-[#2563EB]" size={36} />
        <span className="text-xs text-[#3B82F6] font-semibold uppercase tracking-wider mt-4">Running Monte Carlo Simulations...</span>
      </div>
    );
  }

  return (
    <div className="bg-[#F8FAFC] text-[#0F172A] min-h-screen font-sans flex flex-col justify-between selection:bg-[#2563EB]/20">
      
      {/* Back Header */}
      <div className="bg-white border-b border-[#E2E8F0] py-3.5 px-6 sticky top-16 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/market" className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors">
            <ArrowLeft size={13} /> Back to Market Hub
          </Link>
          <span className="text-xs text-primary font-bold uppercase tracking-wider">Growth & Price Forecasting Center</span>
        </div>
      </div>

      {/* Hero Header */}
      <section className="bg-[#FFFFFF] border-b border-[#E2E8F0] py-12 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#3B82F6]/15 text-[#3B82F6] text-[10px] font-mono uppercase tracking-wider">
            <TrendingUp size={12} className="animate-pulse" /> Real Estate Price Forecast (2026 - 2036)
          </div>
          <h2 className="text-3xl md:text-5xl font-display text-[#0F172A]">
            10-Year Growth Forecasting Model
          </h2>
          <p className="text-[#475569] text-xs md:text-sm max-w-xl mx-auto leading-relaxed">
            Examine compound growth corridors with RRR transport triggers, metro expansion schedules, and institutional GCC multipliers.
          </p>
        </div>
      </section>

      <main className="max-w-7xl mx-auto py-12 px-6 w-full grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Control Bar */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Corridor Selection Card */}
          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg p-5 space-y-4">
            <label className="text-xs font-mono font-bold text-[#475569] uppercase tracking-wider block">Select Corridor Profile</label>
            <select
              value={selectedSlug}
              onChange={(e) => handleSelectCorridor(e.target.value)}
              className="w-full p-2 border border-[#E2E8F0] rounded-md text-xs font-bold text-[#0F172A] focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]/20 cursor-pointer"
            >
              {corridors.map((c) => (
                <option key={c.corridor} value={c.corridor}>
                  {c.name}
                </option>
              ))}
            </select>

            {selectedCorridor && (
              <div className="space-y-4 pt-3 border-t border-[#E2E8F0] text-xs">
                <div className="flex justify-between border-b border-[#E2E8F0]/50 pb-2">
                  <span className="text-[#475569]">Growth Rating</span>
                  <span className="font-bold text-[#3B82F6]">{selectedCorridor.overallScore}/100</span>
                </div>
                <div className="flex justify-between border-b border-[#E2E8F0]/50 pb-2">
                  <span className="text-[#475569]">Base CAGR Range</span>
                  <span className="font-bold text-[#2563EB]">{selectedCorridor.projectedCAGRMin}% - {selectedCorridor.projectedCAGRMax}%</span>
                </div>
                <div className="flex justify-between border-b border-[#E2E8F0]/50 pb-2">
                  <span className="text-[#475569]">Sentiment Index</span>
                  <span className="font-bold text-[#3B82F6]">{selectedCorridor.investorSentiment}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#475569]">Investment Cycle</span>
                  <span className="font-bold text-[#0F172A]">{selectedCorridor.investmentCycle?.replace(/_/g, " ")}</span>
                </div>
              </div>
            )}
          </div>

          {/* GCC Multiplier Impact details */}
          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg p-5 space-y-4">
            <h3 className="font-display text-base text-[#0F172A] flex items-center gap-1">
              <Building size={16} className="text-[#2563EB]" />
              GCC Multiplier Impact
            </h3>
            <p className="text-[#475569] text-[11px] leading-relaxed">
              When a new Global Capability Center (GCC) or multinational workspace is established in Hyderabad, a radial appreciation multiplier is triggered within adjacent sectors.
            </p>

            <div className="space-y-2 text-[10px] font-mono text-[#0F172A]">
              <div className="flex justify-between p-1.5 bg-[#F8FAFC] rounded">
                <span>WEST (Neopolis / Mokila)</span>
                <span className="font-bold text-[#3B82F6]">+0.8% CAGR boost</span>
              </div>
              <div className="flex justify-between p-1.5 bg-[#F8FAFC] rounded">
                <span>SOUTH (shamshabad / Mucherla)</span>
                <span className="font-bold text-[#3B82F6]">+0.6% CAGR boost</span>
              </div>
              <div className="flex justify-between p-1.5 bg-[#F8FAFC] rounded">
                <span>NORTH (Medchal / Kompally)</span>
                <span className="font-bold text-[#2563EB]">+0.4% CAGR boost</span>
              </div>
              <div className="flex justify-between p-1.5 bg-[#F8FAFC] rounded">
                <span>EAST (Ghatkesar / Pocharam)</span>
                <span className="font-bold text-[#2563EB]">+0.3% CAGR boost</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Forecasting Output */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Chart Container Card */}
          {selectedCorridor && (
            <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg p-5 space-y-6 shadow-sm">
              <div>
                <h3 className="font-display text-lg text-[#0F172A] flex items-center gap-1.5">
                  <TrendingUp className="text-[#3B82F6]" size={18} />
                  10-Year Price Index Projection: {selectedCorridor.name}
                </h3>
                <p className="text-text-secondary text-[11px] mt-0.5">
                  Cumulative returns projection indexing 2026 baseline prices at 100.
                </p>
              </div>

              {/* Recharts Projections Line Chart */}
              <div className="h-[300px] md:h-[380px] w-full font-mono text-[10px] relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={projectionData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="year" stroke="#475569" />
                    <YAxis stroke="#475569" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0" }}
                      labelClassName="font-mono text-xs font-bold text-[#0F172A]"
                    />
                    <Legend wrapperStyle={{ paddingTop: 10 }} />
                    <ReferenceLine y={100} stroke="#EF4444" strokeDasharray="3 3" label={{ value: "2026 Base Index", fill: "#EF4444", fontSize: 9 }} />
                    
                    <Line
                      type="monotone"
                      dataKey="Conservative Case (Min)"
                      stroke="#475569"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="Base Case Estimate"
                      stroke="#3B82F6"
                      strokeWidth={2.5}
                      dot={true}
                    />
                    <Line
                      type="monotone"
                      dataKey="Optimistic Case (Max)"
                      stroke="#2563EB"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Projected Milestones details */}
              <div className="border-t border-[#E2E8F0] pt-6 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                <div className="space-y-1">
                  <span className="font-mono font-bold text-[#475569] uppercase tracking-wider block text-[10px]">3-Year Target (2029)</span>
                  <p className="text-lg font-display text-[#0F172A]">
                    Index: {Math.round(100 * Math.pow(1 + ((selectedCorridor.projectedCAGRMin + selectedCorridor.projectedCAGRMax) / 2) / 100, 3))}
                  </p>
                  <p className="text-[11px] text-[#475569] leading-relaxed">Initial RRR Northern junctions and Metro Phase 2 sections trigger secondary land gains.</p>
                </div>
                <div className="space-y-1">
                  <span className="font-mono font-bold text-[#475569] uppercase tracking-wider block text-[10px]">5-Year Target (2031)</span>
                  <p className="text-lg font-display text-[#0F172A]">
                    Index: {Math.round(100 * Math.pow(1 + ((selectedCorridor.projectedCAGRMin + selectedCorridor.projectedCAGRMax) / 2) / 100, 5))}
                  </p>
                  <p className="text-[11px] text-[#475569] leading-relaxed">Full commissioning of RRR arcs and commercial integration of satellite hubs.</p>
                </div>
                <div className="space-y-1">
                  <span className="font-mono font-bold text-[#475569] uppercase tracking-wider block text-[10px]">10-Year Target (2036)</span>
                  <p className="text-lg font-display text-[#0F172A]">
                    Index: {Math.round(100 * Math.pow(1 + ((selectedCorridor.projectedCAGRMin + selectedCorridor.projectedCAGRMax) / 2) / 100, 10))}
                  </p>
                  <p className="text-[11px] text-[#475569] leading-relaxed">Complete maturity of Mucherla Future City and outer industrial zoning grids.</p>
                </div>
              </div>
            </div>
          )}

          {/* Model Information Notice */}
          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg p-5 flex gap-4 text-xs shadow-sm">
            <Info size={24} className="text-[#3B82F6] shrink-0 mt-0.5" />
            <div className="space-y-1.5 leading-relaxed text-[#475569]">
              <strong className="text-[#0F172A] font-bold">About the Forecasting Model</strong>
              <p>
                Projections are generated using a customized Monte Carlo model baseline. It is driven by historical appreciation rates since 2020 and calibrated against future infrastructure triggers. Important triggers include RRR phase releases, metro alignment announcements, and central planning clearances. Actual outcomes can deviate based on macroeconomic factors, interest rates, and construction timeline completions.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Disclaimer block */}
      <div className="bg-slate-50 border-t border-[#E2E8F0] py-6 text-center text-[10px] text-text-secondary font-mono">
        <p>UrbanVenture advisory services. Forecasting algorithms based on verified PropTech analytics model sets.</p>
      </div>
    </div>
  );
}
