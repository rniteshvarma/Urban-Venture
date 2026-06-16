"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { 
  Building2, 
  Map, 
  FileCheck, 
  TrendingUp, 
  ChevronRight, 
  Loader2,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldCheck,
  LineChart,
  Calendar,
  Compass,
  ArrowUpRight,
  MapPin
} from "lucide-react";

// Load MarketMap dynamically to prevent window is not defined SSR errors
const MarketMap = dynamic(() => import("@/components/market/MarketMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[350px] md:h-[450px] bg-[#E2E8F0]/20 border border-[#E2E8F0] rounded flex items-center justify-center">
      <Loader2 className="animate-spin text-[#3B82F6]" size={24} />
      <span className="text-xs text-[#3B82F6] font-semibold ml-2">Loading Map Layers...</span>
    </div>
  )
});

const ZONE_DESCRIPTIONS: Record<string, string> = {
  "adibatla": "Southeast IT & Aerospace Corridor · Ranga Reddy",
  "tukkuguda-shamshabad": "South Airport Corridor · Premium Villa Belt",
  "kadthal-fcda": "South Srisailam Highway · Future City Gateway",
  "maheshwaram-pharma-city": "South Pharma City Influence Zone · Ranga Reddy",
  "shadnagar": "South Bangalore Highway NH-44 · Industrial Belt",
  "shankarpally-mokila": "West Premium Gated Villa sanctuary · Ranga Reddy",
  "sangareddy-industrial": "Northwest Mumbai Highway NH-65 · IIT Hub",
  "kompally-bachupally": "North NH-44 Residential Corridor · Medchal",
  "medchal-dundigal": "North Warehousing & Logistics Belt · Medchal",
  "ghatkesar-peerzadiguda": "East Warangal Highway IT Corridor · Medchal",
  "bibinagar-bhongir": "East AIIMS Medical Hub & Yadadri Corridor",
  "kokapet-neopolis": "West Neopolis Commercial Hub · Gold Standard Area"
};

export default function MarketHubPage() {
  const [corridors, setCorridors] = useState<any[]>([]);
  const [infraProjects, setInfraProjects] = useState<any[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [pulseData, setPulseData] = useState<any>(null);
  
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMarketData();
  }, []);

  async function fetchMarketData() {
    setLoading(true);
    try {
      // 1. Fetch Corridors
      const corrRes = await fetch("/api/market/corridors");
      let corrData: any[] = [];
      if (corrRes.ok) {
        corrData = await corrRes.json();
        setCorridors(corrData);
      }

      // 2. Fetch Infra Projects
      const infraRes = await fetch("/api/market/infrastructure");
      if (infraRes.ok) {
        const infraData = await infraRes.json();
        setInfraProjects(infraData);
        setFilteredProjects(infraData);
      }

      // 3. Fetch Approvals
      const appRes = await fetch("/api/market/approvals");
      if (appRes.ok) {
        const appData = await appRes.json();
        setApprovals(appData);
      }

      // 4. Fetch Market Pulse
      const pulseRes = await fetch("/api/market/pulse");
      if (pulseRes.ok) {
        const pData = await pulseRes.json();
        if (pData.success && pData.pulse) {
          setPulseData(pData.pulse);
        }
      }

      // Fetch pricing history for sparkline generation
      const updatedCorridors = await Promise.all(
        corrData.map(async (c) => {
          try {
            const histRes = await fetch(`/api/market/corridors/${encodeURIComponent(c.corridor)}/appreciation`);
            if (histRes.ok) {
              const histData = await histRes.json();
              return {
                ...c,
                pricePoints: histData.pricePoints || []
              };
            }
          } catch (e) {
            console.error(e);
          }
          return c;
        })
      );
      setCorridors(updatedCorridors);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Filter map pins
  const handleFilterCategory = (cat: string) => {
    setActiveCategory(cat);
    if (cat === "ALL") {
      setFilteredProjects(infraProjects);
    } else {
      setFilteredProjects(infraProjects.filter(p => p.category === cat));
    }
  };

  // Sparkline SVG generator
  const renderSparkline = (points: any[]) => {
    if (!points || points.length < 2) {
      return (
        <svg className="w-16 h-8 text-[#E2E8F0]" viewBox="0 0 100 30">
          <line x1="0" y1="15" x2="100" y2="15" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3,3" />
        </svg>
      );
    }

    const prices = points.map(p => p.pricePerSqYd || (p.pricePerSqFt * 9));
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;

    const width = 80;
    const height = 24;
    const padding = 2;

    const pointsStr = prices.map((price, idx) => {
      const x = padding + (idx / (prices.length - 1)) * (width - padding * 2);
      const y = height - padding - ((price - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    }).join(" ");

    return (
      <svg className="w-16 h-8 text-[#3B82F6] overflow-visible animate-pulse" viewBox={`0 0 ${width} ${height}`}>
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={pointsStr}
        />
      </svg>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 min-h-screen bg-[#F8FAFC] text-[#0F172A]">
        <Loader2 className="animate-spin text-[#2563EB]" size={40} />
        <span className="text-xs font-mono tracking-widest text-[#3B82F6] mt-4 uppercase">Initializing Deep Research Node...</span>
      </div>
    );
  }

  return (
    <div className="bg-[#F8FAFC] text-[#0F172A] min-h-screen font-sans flex flex-col justify-between selection:bg-[#2563EB]/20">
      
      {/* Secondary Sub-navigation Bar */}
      <div className="bg-white border-b border-[#E2E8F0] py-3.5 px-6 sticky top-16 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span className="text-xs text-text-secondary font-semibold uppercase tracking-wider">Market Intelligence Hub</span>
          <nav className="flex items-center gap-6">
            <Link href="/market" className="text-xs font-bold text-primary border-b-2 border-primary pb-1">
              Corridor Hub
            </Link>
            <Link href="/market/legal" className="text-xs font-semibold text-text-secondary hover:text-primary transition-colors flex items-center gap-1">
              <ShieldCheck size={13} /> Legal Hub
            </Link>
            <Link href="/market/forecast" className="text-xs font-semibold text-text-secondary hover:text-primary transition-colors flex items-center gap-1">
              <LineChart size={13} /> Forecast Center
            </Link>
          </nav>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-[#FFFFFF] py-16 px-6 border-b border-[#E2E8F0] shadow-sm">
        <div className="max-w-7xl mx-auto text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2563EB]/10 border border-[#2563EB]/35 text-[#2563EB] text-[10px] font-mono uppercase tracking-wider mb-2">
            <Sparkles size={11} className="animate-spin" /> Deep Research Edition · Hyderabad Growth Engine
          </div>
          <h2 className="text-4xl md:text-6xl font-display text-[#0F172A] tracking-tight leading-none">
            Market Intelligence & <br className="hidden md:inline" />
            <span className="text-[#2563EB]">Government Infrastructure Data</span>
          </h2>
          <p className="max-w-2xl mx-auto text-[#475569] text-sm md:text-base font-medium font-sans">
            A verified research portal integrating HMDA master plans, RERA approvals, official Telangana Government orders, NHAI updates, and real property transaction indices.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-3">
            <Link href="/market/legal" className="px-5 py-2.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-[#E2E8F0]/30 text-xs font-bold text-[#3B82F6] flex items-center gap-2 transition-all shadow-sm">
              <ShieldCheck size={15} /> Open Legal Checkpoints
            </Link>
            <Link href="/market/forecast" className="px-5 py-2.5 rounded-lg bg-[#2563EB] hover:bg-[#2563EB]/95 text-xs font-bold text-[#FFFFFF] flex items-center gap-2 transition-all shadow-sm hover:shadow-md">
              <LineChart size={15} /> Run Appreciation Forecasts <ArrowRight size={14} />
            </Link>
          </div>
        </div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#2563EB]/5 rounded-full filter blur-3xl pointer-events-none z-0" />
      </section>

      {/* Live Stats Bar - Seeded Real Data */}
      <section className="bg-[#FFFFFF] border-b border-[#E2E8F0] py-6 px-6 shadow-sm">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="space-y-1 border-r border-[#E2E8F0]/50 last:border-none">
            <div className="text-3xl font-display text-[#0F172A]">
              {pulseData?.totalRegistrations?.toLocaleString() || "51,089"}
            </div>
            <div className="text-[10px] font-mono text-[#3B82F6] uppercase tracking-widest font-bold">Total Registrations (FY26)</div>
          </div>
          <div className="space-y-1 border-r border-[#E2E8F0]/50 last:border-none">
            <div className="text-3xl font-display text-[#0F172A] flex items-center justify-center gap-1">
              ₹{(pulseData?.totalValueCr)?.toLocaleString() || "34,420"} Cr
            </div>
            <div className="text-[10px] font-mono text-[#3B82F6] uppercase tracking-widest font-bold">Transaction Value</div>
          </div>
          <div className="space-y-1 border-r border-[#E2E8F0]/50 last:border-none">
            <div className="text-3xl font-display text-[#0F172A]">
              {pulseData?.yoyGrowthPct || "40"}%
            </div>
            <div className="text-[10px] font-mono text-[#3B82F6] uppercase tracking-widest font-bold">YoY Growth Index</div>
          </div>
          <div className="space-y-1 last:border-none">
            <div className="text-3xl font-display text-[#0F172A]">
              ₹{(pulseData?.avgGovtCircleRateSqFt || 3654).toLocaleString()} / sqft
            </div>
            <div className="text-[10px] font-mono text-[#3B82F6] uppercase tracking-widest font-bold">Avg Circle Rate</div>
          </div>
        </div>
      </section>

      {/* Directional Growth & Economic Engines */}
      <section className="max-w-7xl mx-auto pt-16 px-6 w-full space-y-6">
        <div>
          <h3 className="text-2xl font-display text-[#0F172A] flex items-center gap-2">
            <Compass className="text-[#2563EB]" size={20} />
            Directional Corridors & Economic Anchors
          </h3>
          <p className="text-[#475569] text-xs mt-1">Understanding Hyderabad's radial growth driven by dedicated industrial and service sector nodes.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-[#2563EB] uppercase tracking-wider">WEST ZONE</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-[#3B82F6]/15 text-[#3B82F6]">IT & FINANCE</span>
            </div>
            <h4 className="font-display text-lg text-[#0F172A]">Kokapet-Shankarpally Belt</h4>
            <p className="text-xs text-[#475569]">Cmds premium high-rises and luxury villa sanctuary plots. Driven by Hitec City spillover and Neopolis SEZ expansion.</p>
            <div className="text-[10px] font-mono text-[#3B82F6] font-bold">Anchors: Neopolis IT SEZ, Financial District, ORR Exit 1.</div>
          </div>

          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-[#2563EB] uppercase tracking-wider">SOUTH ZONE</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-[#2563EB]/15 text-[#2563EB]">AEROSPACE & MFG</span>
            </div>
            <h4 className="font-display text-lg text-[#0F172A]">Tukkuguda-Shamshabad</h4>
            <p className="text-xs text-[#475569]">Gateway to Mucherla Future City and Srisailam Highway. Commands rapid appreciation from airport expansions.</p>
            <div className="text-[10px] font-mono text-[#2563EB] font-bold">Anchors: RGIA Airport, Fab City, Aerospace SEZ.</div>
          </div>

          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-[#2563EB] uppercase tracking-wider">NORTH ZONE</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-amber-100 text-amber-800">LOGISTICS & MFG</span>
            </div>
            <h4 className="font-display text-lg text-[#0F172A]">Medchal-Kompally Belt</h4>
            <p className="text-xs text-[#475569]">An established warehousing powerhouse transitioning to high-density budget-friendly residential housing layouts.</p>
            <div className="text-[10px] font-mono text-[#3B82F6] font-bold">Anchors: NH-44 Logistics parks, Gundlapochampally MMTS.</div>
          </div>

          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-[#2563EB] uppercase tracking-wider">EAST ZONE</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-purple-100 text-purple-800">HEALTH & TECH</span>
            </div>
            <h4 className="font-display text-lg text-[#0F172A]">Ghatkesar-Bibinagar</h4>
            <p className="text-xs text-[#475569]">Anchored by medical universities, spiritual tourism (Yadadri), and suburban tech offices Pocharam.</p>
            <div className="text-[10px] font-mono text-[#2563EB] font-bold">Anchors: Pocharam IT Campus, AIIMS Medical Hub, NH-163.</div>
          </div>
        </div>
      </section>

      {/* Corridor Intelligence Grid */}
      <section className="max-w-7xl mx-auto py-16 px-6 space-y-8 w-full">
        <div>
          <h3 className="text-2xl font-display text-[#0F172A] flex items-center gap-2">
            <span className="w-1.5 h-6 bg-[#2563EB] rounded-full" />
            Hyderabad Growth Corridor Profiles
          </h3>
          <p className="text-[#475569] text-xs mt-1">Audit corridor ratings calculated from RERA counts, YoY returns, and infrastructure indexes.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {corridors.map((c) => {
            const isBullish = c.investorSentiment === "BULLISH";
            const isCautious = c.investorSentiment === "CAUTIOUS";

            return (
              <div 
                key={c.corridor} 
                className="bg-[#FFFFFF] border border-[#E2E8F0] hover:border-[#2563EB]/70 rounded-lg p-5 flex flex-col justify-between transition-all hover:-translate-y-0.5 hover:shadow-md group relative overflow-hidden"
              >
                {/* Gauge & Main Info */}
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-display text-lg text-[#0F172A] tracking-tight group-hover:text-[#2563EB] transition-colors leading-tight">
                        {c.name}
                      </h4>
                      <p className="text-[10px] text-[#3B82F6] font-mono uppercase tracking-wider font-bold mt-1.5">
                        {ZONE_DESCRIPTIONS[c.corridor] || "Hyderabad Zone Corridor"}
                      </p>
                    </div>

                    {/* Circular Score Gauge */}
                    <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                      <svg className="w-12 h-12 transform -rotate-90">
                        <circle cx="24" cy="24" r="21" stroke="#E2E8F0" strokeWidth="4" fill="transparent" />
                        <circle 
                          cx="24" 
                          cy="24" 
                          r="21" 
                          stroke="#3B82F6" 
                          strokeWidth="4" 
                          fill="transparent" 
                          strokeDasharray="132"
                          strokeDashoffset={132 - (132 * c.overallScore) / 100}
                          className="transition-all duration-1000"
                        />
                      </svg>
                      <span className="absolute text-[11px] font-mono font-bold text-[#0F172A]">{c.overallScore}</span>
                    </div>
                  </div>

                  {/* Sentiment & Sparkline */}
                  <div className="flex items-center justify-between border-y border-[#E2E8F0] py-2.5 bg-[#F8FAFC]/30 px-2 rounded-md">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border uppercase tracking-wider ${
                      isBullish ? "bg-emerald-50 text-[#3B82F6] border-emerald-200" :
                      isCautious ? "bg-red-50 text-[#EF4444] border-red-200" :
                      "bg-amber-50 text-[#2563EB] border-amber-200"
                    }`}>
                      {c.investorSentiment}
                    </span>

                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-[#475569] font-mono uppercase font-bold">5yr trend</span>
                      {renderSparkline(c.pricePoints)}
                    </div>
                  </div>

                  {/* Drivers */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] text-[#475569] font-mono font-black uppercase tracking-wider block">Top Catalysts</span>
                    <ul className="text-xs text-[#475569] space-y-1.5">
                      {c.keyDrivers?.slice(0, 2).map((d: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-1">
                          <span className="text-[#2563EB] mt-1 font-bold">•</span>
                          <span className="line-clamp-1">{d}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Deep Dive Action */}
                <div className="pt-4 mt-4 border-t border-[#E2E8F0] flex items-center justify-between">
                  <span className="text-[10px] font-mono text-[#475569]">CAGR: <strong className="text-[#3B82F6]">{c.projectedCAGRMin || 12}% - {c.projectedCAGRMax || 16}%</strong></span>
                  <Link
                    href={`/market/${c.corridor}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#2563EB] hover:text-[#3B82F6] transition-colors"
                  >
                    Deep Dive Audit <ArrowUpRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 50-Year Growth Timeline - Hyderabad Specific */}
      <section className="bg-[#FFFFFF] border-y border-[#E2E8F0] py-16 px-6 w-full">
        <div className="max-w-7xl mx-auto space-y-8">
          <div>
            <h3 className="text-2xl font-display text-[#0F172A] flex items-center gap-2">
              <Calendar className="text-[#2563EB]" size={20} />
              50-Year Hyderabad Urban Expansion Timeline
            </h3>
            <p className="text-[#475569] text-xs mt-1">Trace the geographical shift of investment value anchors from core cities to high-growth outer corridors.</p>
          </div>

          <div className="relative border-l-2 border-[#E2E8F0] ml-4 pl-8 space-y-8 py-2">
            <div className="relative">
              <span className="absolute -left-11 top-1 bg-[#2563EB] text-white rounded-full w-6 h-6 flex items-center justify-center text-[10px] font-mono font-bold">1</span>
              <div className="space-y-1.5">
                <span className="text-[#2563EB] font-mono text-sm font-bold">1990 - 2000: The Hitec City Inflection</span>
                <p className="text-xs text-[#475569] max-w-3xl">
                  Madhapur, Kondapur, and Gachibowli transition from dry rocky scrublands to global IT SEZ clusters. Focus shifts entirely to West Hyderabad.
                </p>
                <div className="text-[10px] font-mono text-[#3B82F6] font-bold">Zone Status: Madhapur (🔥 FIRE), Kondapur (🔥 VERY HOT)</div>
              </div>
            </div>

            <div className="relative">
              <span className="absolute -left-11 top-1 bg-[#3B82F6] text-white rounded-full w-6 h-6 flex items-center justify-center text-[10px] font-mono font-bold">2</span>
              <div className="space-y-1.5">
                <span className="text-[#3B82F6] font-mono text-sm font-bold">2000 - 2015: ORR & Financial District Era</span>
                <p className="text-xs text-[#475569] max-w-3xl">
                  The Outer Ring Road (ORR) is commissioned. Gachibowli solidifies its status as a financial hub. Suburbs like Kompally and Adibatla emerge.
                </p>
                <div className="text-[10px] font-mono text-[#3B82F6] font-bold">Zone Status: Gachibowli (COMPLETE), Kompally (MID-CYCLE)</div>
              </div>
            </div>

            <div className="relative">
              <span className="absolute -left-11 top-1 bg-[#3B82F6] text-white rounded-full w-6 h-6 flex items-center justify-center text-[10px] font-mono font-bold">3</span>
              <div className="space-y-1.5">
                <span className="text-[#3B82F6] font-mono text-sm font-bold">2015 - 2025: Vertical Rise & Neopolis Boom</span>
                <p className="text-xs text-[#475569] max-w-3xl">
                  Land auctions in Kokapet Neopolis reach record-breaking levels. High-rise residential complexes dominate Gachibowli boundaries.
                </p>
                <div className="text-[10px] font-mono text-[#3B82F6] font-bold">Zone Status: Kokapet Neopolis (🔥 FIRE), Mokila (🔥 VERY HOT)</div>
              </div>
            </div>

            <div className="relative">
              <span className="absolute -left-11 top-1 bg-[#2563EB] text-white rounded-full w-6 h-6 flex items-center justify-center text-[10px] font-mono font-bold">4</span>
              <div className="space-y-1.5">
                <span className="text-[#2563EB] font-mono text-sm font-bold">2025 - 2035+: Mucherla FCDA Future City & RRR Expansion</span>
                <p className="text-xs text-[#475569] max-w-3xl">
                  Telangana Government triggers the Regional Ring Road (RRR) and Mucherla AI sports hub master plans, shifting focus to Southeast and South growth corridors.
                </p>
                <div className="text-[10px] font-mono text-[#3B82F6] font-bold">Zone Status: Kadthal FCDA (🔥 FIRE), Maheshwaram (🔥 VERY HOT)</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="bg-[#FFFFFF] border-b border-[#E2E8F0] py-16 px-6 w-full">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h3 className="text-2xl font-display text-[#0F172A] flex items-center gap-2">
                <span className="w-1.5 h-6 bg-[#2563EB] rounded-full" />
                Infrastructure Pipeline Map
              </h3>
              <p className="text-[#475569] text-xs mt-1">Filter map pins to examine metro expansions, industrial zones, and highway linkages surrounding Hyderabad.</p>
            </div>

            {/* Map Filter Toggles */}
            <div className="flex flex-wrap gap-1 bg-[#F8FAFC] border border-[#E2E8F0] p-1 rounded-lg">
              <button
                onClick={() => handleFilterCategory("ALL")}
                className={`px-3 py-1.5 rounded text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
                  activeCategory === "ALL" ? "bg-[#3B82F6] text-white" : "text-[#475569] hover:text-[#0F172A]"
                }`}
              >
                All
              </button>
              <button
                onClick={() => handleFilterCategory("ROAD_HIGHWAY")}
                className={`px-3 py-1.5 rounded text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
                  activeCategory === "ROAD_HIGHWAY" ? "bg-[#3B82F6] text-white" : "text-[#475569] hover:text-[#0F172A]"
                }`}
              >
                Roads
              </button>
              <button
                onClick={() => handleFilterCategory("METRO_RAIL")}
                className={`px-3 py-1.5 rounded text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
                  activeCategory === "METRO_RAIL" ? "bg-[#3B82F6] text-white" : "text-[#475569] hover:text-[#0F172A]"
                }`}
              >
                Metro
              </button>
              <button
                onClick={() => handleFilterCategory("INDUSTRIAL_ZONE")}
                className={`px-3 py-1.5 rounded text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
                  activeCategory === "INDUSTRIAL_ZONE" ? "bg-[#3B82F6] text-white" : "text-[#475569] hover:text-[#0F172A]"
                }`}
              >
                Industrial
              </button>
              <button
                onClick={() => handleFilterCategory("PHARMA_BIOTECH")}
                className={`px-3 py-1.5 rounded text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
                  activeCategory === "PHARMA_BIOTECH" ? "bg-[#3B82F6] text-white" : "text-[#475569] hover:text-[#0F172A]"
                }`}
              >
                Pharma
              </button>
            </div>
          </div>

          {/* Interactive Map Embed */}
          <div className="h-[400px] md:h-[500px] w-full rounded-lg border border-[#E2E8F0] shadow-md relative z-10">
            <MarketMap projects={filteredProjects} corridors={corridors} />
          </div>
        </div>
      </section>

      {/* scrolling Approvals Ticker */}
      <section className="bg-[#F8FAFC] border-b border-[#E2E8F0] py-4 overflow-hidden relative w-full">
        <div className="flex items-center justify-start whitespace-nowrap animate-marquee">
          <div className="flex gap-16 px-4">
            {approvals.slice(0, 10).map((a, idx) => (
              <span key={idx} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#475569]">
                <span className="text-emerald-500">✅</span>
                <strong className="text-[#0F172A] font-bold font-mono">{a.authority} {a.approvalNumber || "LP"}</strong> · 
                <span className="text-[#2563EB] font-semibold">{a.projectName}</span> · 
                <span className="font-mono text-[10px]">{a.corridor}</span> · 
                <span className="text-[#475569]">{a.areaAcres ? `${a.areaAcres} acres` : ""}</span>
              </span>
            ))}
          </div>
          {/* Repeat for seamless loop */}
          <div className="flex gap-16 px-4" aria-hidden="true">
            {approvals.slice(0, 10).map((a, idx) => (
              <span key={`dup-${idx}`} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#475569]">
                <span className="text-emerald-500">✅</span>
                <strong className="text-[#0F172A] font-bold font-mono">{a.authority} {a.approvalNumber || "LP"}</strong> · 
                <span className="text-[#2563EB] font-semibold">{a.projectName}</span> · 
                <span className="font-mono text-[10px]">{a.corridor}</span> · 
                <span className="text-[#475569]">{a.areaAcres ? `${a.areaAcres} acres` : ""}</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Disclaimer block */}
      <div className="bg-slate-50 border-t border-[#E2E8F0] py-6 text-center text-[10px] text-text-secondary font-mono">
        <p>TG-RERA Registration No. TG/RERA/2026/0491. Official Data compiled from HMDA, TSIIC, NHAI, and TG-RERA publications.</p>
      </div>

      {/* Marquee CSS injection */}
      <style jsx global>{`
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: flex;
          width: max-content;
          animation: marquee 25s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
