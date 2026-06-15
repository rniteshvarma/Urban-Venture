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
  ArrowRight
} from "lucide-react";

// Load MarketMap dynamically to prevent window is not defined SSR errors
const MarketMap = dynamic(() => import("@/components/market/MarketMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[350px] md:h-[450px] bg-slate-900/5 border border-slate-200 rounded flex items-center justify-center">
      <Loader2 className="animate-spin text-blue-650" size={24} />
      <span className="text-xs text-slate-500 font-semibold ml-2">Loading Map Layers...</span>
    </div>
  )
});

const ZONE_DESCRIPTIONS: Record<string, string> = {
  "Shadnagar": "South Hyderabad · Ranga Reddy District",
  "Pharma City": "South-East Hyderabad · NIMZ Industrial Zone",
  "Kokapet": "West Hyderabad · Financial District Extension",
  "Kompally": "North Hyderabad · NH-44 Residential Belt",
  "Adibatla": "South Hyderabad · Aerospace SEZ Hub",
  "Shamshabad": "South Hyderabad · Airport Corridor",
  "Yadadri": "East Hyderabad · Temple Tourism Corridor",
  "Sangareddy": "West Hyderabad · Industrial Expressway Hub",
};

export default function MarketHubPage() {
  const [corridors, setCorridors] = useState<any[]>([]);
  const [infraProjects, setInfraProjects] = useState<any[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [loading, setLoading] = useState(true);

  // Statistics
  const [totalProjects, setTotalProjects] = useState(0);
  const [totalCorridors, setTotalCorridors] = useState(0);
  const [totalApprovals, setTotalApprovals] = useState(0);

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
        setTotalCorridors(corrData.length);
      }

      // 2. Fetch Infra Projects
      const infraRes = await fetch("/api/market/infrastructure");
      if (infraRes.ok) {
        const infraData = await infraRes.json();
        setInfraProjects(infraData);
        setFilteredProjects(infraData);
        setTotalProjects(infraData.length);
      }

      // 3. Fetch Approvals
      const appRes = await fetch("/api/market/approvals");
      if (appRes.ok) {
        const appData = await appRes.json();
        setApprovals(appData);
        setTotalApprovals(appData.length);
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
        <svg className="w-16 h-8 text-slate-350" viewBox="0 0 100 30">
          <line x1="0" y1="15" x2="100" y2="15" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3,3" />
        </svg>
      );
    }

    const prices = points.map(p => p.pricePerSqFt);
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
      <svg className="w-16 h-8 text-blue-500 overflow-visible" viewBox={`0 0 ${width} ${height}`}>
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={pointsStr}
        />
      </svg>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 min-h-screen bg-slate-900 text-white">
        <Loader2 className="animate-spin text-amber-500" size={40} />
        <span className="text-sm font-semibold tracking-wider text-slate-400 mt-4 uppercase">Loading Market Intelligence Hub...</span>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 text-slate-100 min-h-screen font-sans flex flex-col justify-between">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-radial-at-t from-slate-800 via-slate-900 to-slate-950 py-16 px-6 border-b border-slate-800">
        <div className="max-w-7xl mx-auto text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold uppercase tracking-wider mb-2">
            <Sparkles size={11} /> Hyderabad Market Intelligence Layer
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Hyderabad Real Estate <br className="hidden md:inline" />
            <span className="bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent">Research & Infrastructure Platform</span>
          </h1>
          <p className="max-w-2xl mx-auto text-slate-400 text-sm md:text-base font-medium">
            Analyze government infrastructure projects, layout approvals, price histories, and demand indexes to capture hyper-local appreciation trends before they hit the market.
          </p>
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(245,158,11,0.03),transparent_40%)] pointer-events-none" />
      </section>

      {/* Live Stats Bar */}
      <section className="bg-slate-950/70 border-b border-slate-800 py-6 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="space-y-1">
            <div className="text-2xl font-black text-white flex items-center justify-center gap-1.5">
              <Building2 className="text-amber-500" size={18} />
              {totalProjects}
            </div>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Active Projects</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-black text-white flex items-center justify-center gap-1.5">
              <Map className="text-blue-500" size={18} />
              {totalCorridors}
            </div>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Corridors Tracked</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-black text-white flex items-center justify-center gap-1.5">
              <FileCheck className="text-emerald-500" size={18} />
              {totalApprovals}
            </div>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Approval Records</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-black text-white flex items-center justify-center gap-1.5">
              <TrendingUp className="text-purple-500" size={18} />
              13.5%
            </div>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Avg appreciation (5yr)</div>
          </div>
        </div>
      </section>

      {/* Corridor Intelligence Grid */}
      <section className="max-w-7xl mx-auto py-16 px-6 space-y-8 w-full">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span className="w-1.5 h-6 bg-amber-500 rounded-full" />
            Corridor Intelligence Profiles
          </h2>
          <p className="text-slate-400 text-xs mt-1">Audit corridor ratings calculated from RERA counts, YoY returns, and infrastructure indexes.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {corridors.map((c) => {
            const isBullish = c.investorSentiment === "BULLISH";
            const isCautious = c.investorSentiment === "CAUTIOUS";

            return (
              <div 
                key={c.corridor} 
                className="bg-slate-950 border border-slate-800/80 hover:border-slate-700 rounded-lg p-5 flex flex-col justify-between transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/40 group relative overflow-hidden"
              >
                {/* Gauge & Main Info */}
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-bold text-white tracking-tight group-hover:text-amber-400 transition-colors">
                        {c.corridor}
                      </h3>
                      <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                        {ZONE_DESCRIPTIONS[c.corridor] || "Hyderabad Zone Corridor"}
                      </p>
                    </div>

                    {/* Circular Score Gauge */}
                    <div className="relative w-12 h-12 flex items-center justify-center">
                      <svg className="w-12 h-12 transform -rotate-90">
                        <circle cx="24" cy="24" r="21" stroke="#1e293b" strokeWidth="4" fill="transparent" />
                        <circle 
                          cx="24" 
                          cy="24" 
                          r="21" 
                          stroke="#d97706" 
                          strokeWidth="4" 
                          fill="transparent" 
                          strokeDasharray="132"
                          strokeDashoffset={132 - (132 * c.overallScore) / 100}
                          className="transition-all duration-1000"
                        />
                      </svg>
                      <span className="absolute text-[10px] font-black text-white">{c.overallScore}</span>
                    </div>
                  </div>

                  {/* Sentiment & Sparkline */}
                  <div className="flex items-center justify-between border-y border-slate-800/60 py-2.5">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${
                      isBullish ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                      isCautious ? "bg-red-500/10 text-red-400 border-red-500/20" :
                      "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    }`}>
                      {c.investorSentiment}
                    </span>

                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-slate-500 font-bold uppercase">5yr trend</span>
                      {renderSparkline(c.pricePoints)}
                    </div>
                  </div>

                  {/* Drivers */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">Top Catalysts</span>
                    <ul className="text-[11px] text-slate-400 space-y-1">
                      {c.keyDrivers?.slice(0, 2).map((d: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-1">
                          <span className="text-amber-500 mt-1">•</span>
                          <span className="line-clamp-1">{d}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Deep Dive Action */}
                <div className="pt-4 mt-4 border-t border-slate-800/40 flex items-center justify-end">
                  <Link
                    href={`/market/${c.corridor.toLowerCase().replace(/\s+/g, "-")}`}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-500 hover:text-amber-400 hover:underline transition-colors"
                  >
                    Deep Dive <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Map Section */}
      <section className="bg-slate-950 border-y border-slate-800 py-16 px-6 w-full">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <span className="w-1.5 h-6 bg-blue-500 rounded-full" />
                Infrastructure Pipeline Map
              </h2>
              <p className="text-slate-400 text-xs mt-1">Filter map pins to examine metro expansions, industrial zones, and highway linkages surrounding Hyderabad.</p>
            </div>

            {/* Map Filter Toggles */}
            <div className="flex flex-wrap gap-1 bg-slate-900 border border-slate-800 p-1 rounded-lg">
              <button
                onClick={() => handleFilterCategory("ALL")}
                className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${
                  activeCategory === "ALL" ? "bg-blue-650 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                All
              </button>
              <button
                onClick={() => handleFilterCategory("ROAD_HIGHWAY")}
                className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${
                  activeCategory === "ROAD_HIGHWAY" ? "bg-blue-650 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                Roads
              </button>
              <button
                onClick={() => handleFilterCategory("METRO_RAIL")}
                className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${
                  activeCategory === "METRO_RAIL" ? "bg-blue-650 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                Metro
              </button>
              <button
                onClick={() => handleFilterCategory("INDUSTRIAL_ZONE")}
                className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${
                  activeCategory === "INDUSTRIAL_ZONE" ? "bg-blue-650 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                Industrial
              </button>
              <button
                onClick={() => handleFilterCategory("PHARMA_BIOTECH")}
                className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${
                  activeCategory === "PHARMA_BIOTECH" ? "bg-blue-650 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                Pharma
              </button>
            </div>
          </div>

          {/* Interactive Map Embed */}
          <div className="h-[400px] md:h-[500px] w-full rounded-lg border border-slate-800 shadow-2xl relative z-10">
            <MarketMap projects={filteredProjects} />
          </div>
        </div>
      </section>

      {/* scrolling Approvals Ticker */}
      <section className="bg-slate-900 border-b border-slate-800 py-4 overflow-hidden relative w-full">
        <div className="flex items-center justify-start whitespace-nowrap animate-marquee">
          <div className="flex gap-16 px-4">
            {approvals.slice(0, 10).map((a, idx) => (
              <span key={idx} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-350">
                <span className="text-emerald-500">✅</span>
                <strong className="text-white font-bold">{a.authority} {a.approvalNumber || "LP"}</strong> · 
                <span className="text-amber-400 font-semibold">{a.projectName}</span> · 
                <span>{a.corridor}</span> · 
                <span className="text-slate-500">{a.areaAcres ? `${a.areaAcres} acres` : ""}</span>
              </span>
            ))}
          </div>
          {/* Repeat for seamless loop */}
          <div className="flex gap-16 px-4" aria-hidden="true">
            {approvals.slice(0, 10).map((a, idx) => (
              <span key={`dup-${idx}`} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-350">
                <span className="text-emerald-500">✅</span>
                <strong className="text-white font-bold">{a.authority} {a.approvalNumber || "LP"}</strong> · 
                <span className="text-amber-400 font-semibold">{a.projectName}</span> · 
                <span>{a.corridor}</span> · 
                <span className="text-slate-500">{a.areaAcres ? `${a.areaAcres} acres` : ""}</span>
              </span>
            ))}
          </div>
        </div>
      </section>

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
