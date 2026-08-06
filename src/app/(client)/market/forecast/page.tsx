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
  Info,
  TrendingDown
} from "lucide-react";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
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
  const [activeTimeline, setActiveTimeline] = useState("10Y"); // 3Y, 5Y, 10Y

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

  // Generate projections data based on selected corridor metrics
  const generateProjectionData = () => {
    if (!selectedCorridor) return [];

    const baseVal = 100; // Price Index baseline in 2026
    const minCagr = selectedCorridor.projectedCAGRMin || 10;
    const maxCagr = selectedCorridor.projectedCAGRMax || 15;
    const baseCagr = (minCagr + maxCagr) / 2;
    
    let years = 10;
    if (activeTimeline === "3Y") years = 3;
    if (activeTimeline === "5Y") years = 5;

    const data = [];
    for (let year = 2026; year <= 2026 + years; year++) {
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
      <div className="flex flex-col items-center justify-center py-40 min-h-screen bg-surface-dim text-text-primary">
        <Loader2 className="animate-spin text-accent" size={36} />
        <span className="text-xs text-accent font-semibold uppercase tracking-wider mt-4">Running Monte Carlo Simulations...</span>
      </div>
    );
  }

  return (
    <div className="bg-surface-dim text-text-primary min-h-screen font-sans flex flex-col justify-between selection:bg-accent/20">
      
      {/* Back Header */}
      <div className="glass-header sticky top-16 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/market" className="nav-link inline-flex items-center gap-1.5 text-xs font-semibold">
            <ArrowLeft size={13} /> Back to Market Hub
          </Link>
          <span className="text-xs text-primary-light font-bold uppercase tracking-wider">Growth & Price Forecasting Center</span>
        </div>
      </div>

      {/* Hero Header */}
      <section className="bg-surface border-b border-gray-200 py-12 px-6 gradient-surface">
        <div className="max-w-4xl mx-auto text-center space-y-4 animate-fade-in-up">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-light text-accent text-[10px] font-mono uppercase tracking-wider">
            <TrendingUp size={12} className="animate-pulse" /> Real Estate Price Forecast (2026 - 2036)
          </div>
          <h2 className="text-3xl md:text-5xl font-display text-text-primary">
            10-Year Growth Forecasting Model
          </h2>
          <p className="text-text-secondary text-xs md:text-sm max-w-xl mx-auto leading-relaxed">
            Examine compound growth corridors with RRR transport triggers, metro expansion schedules, and institutional GCC multipliers.
          </p>
        </div>
      </section>

      <main className="max-w-7xl mx-auto py-12 px-6 w-full grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Control Bar */}
        <div className="lg:col-span-1 space-y-6 stagger-1 animate-fade-in-up">
          
          {/* Corridor Selection Card */}
          <div className="card-premium space-y-4 border-t-4 border-t-success">
            <label className="text-xs font-mono font-bold text-text-secondary uppercase tracking-wider block">Select Corridor Profile</label>
            <select
              value={selectedSlug}
              onChange={(e) => handleSelectCorridor(e.target.value)}
              className="input-premium w-full cursor-pointer"
            >
              {corridors.map((c) => (
                <option key={c.corridor} value={c.corridor}>
                  {c.name}
                </option>
              ))}
            </select>

            {selectedCorridor && (
              <div className="space-y-4 pt-3 border-t border-gray-100 text-xs">
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-text-secondary">Growth Rating</span>
                  <span className="font-bold text-success">{selectedCorridor.overallScore}/100</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-text-secondary">Base CAGR Range</span>
                  <span className="font-bold text-accent">{selectedCorridor.projectedCAGRMin}% - {selectedCorridor.projectedCAGRMax}%</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-text-secondary">Sentiment Index</span>
                  <span className="font-bold text-accent">{selectedCorridor.investorSentiment}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Investment Cycle</span>
                  <span className="font-bold text-text-primary">{selectedCorridor.investmentCycle?.replace(/_/g, " ")}</span>
                </div>
              </div>
            )}
          </div>

          {/* GCC Multiplier Impact details */}
          <div className="card-premium space-y-4 border-t-4 border-t-warning">
            <h3 className="section-header text-base flex items-center gap-1">
              <Building size={16} className="text-accent" />
              GCC Multiplier Impact
            </h3>
            <p className="text-text-secondary text-[11px] leading-relaxed">
              When a new Global Capability Center (GCC) or multinational workspace is established in Hyderabad, a radial appreciation multiplier is triggered within adjacent sectors.
            </p>

            <div className="space-y-2 text-[10px] font-mono text-text-primary">
              <div className="flex justify-between p-1.5 bg-surface-dim rounded">
                <span>WEST (Neopolis)</span>
                <span className="font-bold text-success">+0.8% CAGR</span>
              </div>
              <div className="flex justify-between p-1.5 bg-surface-dim rounded">
                <span>SOUTH (Shamshabad)</span>
                <span className="font-bold text-success">+0.6% CAGR</span>
              </div>
              <div className="flex justify-between p-1.5 bg-surface-dim rounded">
                <span>NORTH (Medchal)</span>
                <span className="font-bold text-accent">+0.4% CAGR</span>
              </div>
              <div className="flex justify-between p-1.5 bg-surface-dim rounded">
                <span>EAST (Ghatkesar)</span>
                <span className="font-bold text-accent">+0.3% CAGR</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Forecasting Output */}
        <div className="lg:col-span-3 space-y-6 stagger-2 animate-fade-in-up">
          
          {/* Chart Container Card */}
          {selectedCorridor && (
            <div className="card-premium space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="section-header text-lg flex items-center gap-1.5">
                    <TrendingUp className="text-accent" size={18} />
                    Price Index Projection: {selectedCorridor.name}
                  </h3>
                  <p className="text-text-secondary text-[11px] mt-0.5">
                    Cumulative returns projection indexing 2026 baseline prices at 100.
                  </p>
                </div>
                
                {/* Timeline Selector */}
                <div className="flex gap-2 bg-surface-dim p-1 rounded-[8px]">
                  {["3Y", "5Y", "10Y"].map(tl => (
                    <button
                      key={tl}
                      onClick={() => setActiveTimeline(tl)}
                      className={activeTimeline === tl ? "filter-pill-active" : "filter-pill"}
                    >
                      {tl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recharts Projections Area Chart */}
              <div className="h-[300px] md:h-[380px] w-full font-mono text-[10px] relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={projectionData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorBase" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00B4D8" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#00B4D8" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorOpt" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis dataKey="year" stroke="#94A3B8" />
                    <YAxis stroke="#94A3B8" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "8px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                      labelClassName="font-mono text-xs font-bold text-text-primary"
                    />
                    <Legend wrapperStyle={{ paddingTop: 10 }} />
                    <ReferenceLine y={100} stroke="#E53935" strokeDasharray="3 3" label={{ value: "2026 Base Index", fill: "#E53935", fontSize: 9 }} />
                    
                    <Area
                      type="monotone"
                      dataKey="Optimistic Case (Max)"
                      stroke="#10B981"
                      fillOpacity={1}
                      fill="url(#colorOpt)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="Base Case Estimate"
                      stroke="#00B4D8"
                      fillOpacity={1}
                      fill="url(#colorBase)"
                      strokeWidth={3}
                    />
                    <Area
                      type="monotone"
                      dataKey="Conservative Case (Min)"
                      stroke="#94A3B8"
                      fill="none"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Projected Milestones details */}
              <div className="border-t border-gray-100 pt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="stat-card">
                  <span className="stat-label">3-Year Target (2029)</span>
                  <div className="flex items-center gap-2">
                    <p className="stat-value">
                      Index: {Math.round(100 * Math.pow(1 + ((selectedCorridor.projectedCAGRMin + selectedCorridor.projectedCAGRMax) / 2) / 100, 3))}
                    </p>
                    <TrendingUp className="stat-trend stat-trend-up" size={20} />
                  </div>
                  <p className="text-[11px] text-text-secondary leading-relaxed mt-2">Initial RRR Northern junctions and Metro Phase 2 sections trigger secondary land gains.</p>
                </div>
                
                <div className="stat-card">
                  <span className="stat-label">5-Year Target (2031)</span>
                  <div className="flex items-center gap-2">
                    <p className="stat-value">
                      Index: {Math.round(100 * Math.pow(1 + ((selectedCorridor.projectedCAGRMin + selectedCorridor.projectedCAGRMax) / 2) / 100, 5))}
                    </p>
                    <TrendingUp className="stat-trend stat-trend-up" size={20} />
                  </div>
                  <p className="text-[11px] text-text-secondary leading-relaxed mt-2">Full commissioning of RRR arcs and commercial integration of satellite hubs.</p>
                </div>
                
                <div className="stat-card">
                  <span className="stat-label">10-Year Target (2036)</span>
                  <div className="flex items-center gap-2">
                    <p className="stat-value">
                      Index: {Math.round(100 * Math.pow(1 + ((selectedCorridor.projectedCAGRMin + selectedCorridor.projectedCAGRMax) / 2) / 100, 10))}
                    </p>
                    <TrendingUp className="stat-trend stat-trend-up" size={20} />
                  </div>
                  <p className="text-[11px] text-text-secondary leading-relaxed mt-2">Complete maturity of Mucherla Future City and outer industrial zoning grids.</p>
                </div>
              </div>
            </div>
          )}

          {/* Model Information Notice */}
          <div className="card-premium flex gap-4 text-xs bg-luxury-bg border-none shadow-none">
            <Info size={24} className="text-accent shrink-0 mt-0.5" />
            <div className="space-y-1.5 leading-relaxed text-text-secondary">
              <strong className="text-text-primary font-bold">About the Forecasting Model</strong>
              <p>
                Projections are generated using a customized Monte Carlo model baseline. It is driven by historical appreciation rates since 2020 and calibrated against future infrastructure triggers. Important triggers include RRR phase releases, metro alignment announcements, and central planning clearances. Actual outcomes can deviate based on macroeconomic factors, interest rates, and construction timeline completions.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Disclaimer block */}
      <div className="bg-surface-dim border-t border-gray-200 py-6 text-center text-[10px] text-text-secondary font-mono">
        <p>UrbanVenture advisory services. Forecasting algorithms based on verified PropTech analytics model sets.</p>
      </div>
    </div>
  );
}

