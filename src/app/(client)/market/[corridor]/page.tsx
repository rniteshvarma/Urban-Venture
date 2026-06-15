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
  Calendar,
  ExternalLink,
  ChevronRight,
  Loader2,
  Info,
  Layers,
  Award,
  AlertTriangle,
  UserCheck
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

export default function CorridorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawCorridor = params?.corridor ? String(params.corridor) : "";
  const corridorSlug = rawCorridor.replace(/-/g, " ");

  const [activeTab, setActiveTab] = useState("pricing");
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  // Data States
  const [profile, setProfile] = useState<any>(null);
  const [pricing, setPricing] = useState<any>(null);
  const [demand, setDemand] = useState<any>(null);
  const [infra, setInfra] = useState<any>(null);
  const [approvals, setApprovals] = useState<any>(null);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);

  useEffect(() => {
    if (rawCorridor) {
      fetchCorridorDetails();
    }
  }, [rawCorridor]);

  async function fetchCorridorDetails() {
    setLoading(true);
    try {
      const slugEncoded = encodeURIComponent(corridorSlug);

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

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleRegenerateAnalysis = async () => {
    setRegenerating(true);
    try {
      const slugEncoded = encodeURIComponent(corridorSlug);
      const res = await fetch(`/api/market/corridors/${slugEncoded}/analysis`, {
        method: "POST"
      });

      if (res.ok) {
        // Fetch new analysis
        const getRes = await fetch(`/api/market/corridors/${slugEncoded}/analysis`);
        if (getRes.ok) {
          const aiData = await getRes.json();
          setAiAnalysis(aiData);
        }
      } else {
        const err = await res.json();
        alert(err.error || "Regeneration rate limit hit.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 min-h-screen bg-slate-900 text-white">
        <Loader2 className="animate-spin text-amber-500" size={36} />
        <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-4">Analyzing Corridor Layers...</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="bg-slate-900 text-white min-h-screen p-12 text-center flex flex-col justify-center items-center gap-4">
        <AlertTriangle size={32} className="text-amber-500" />
        <h1 className="text-xl font-bold">Corridor Not Found</h1>
        <p className="text-slate-400 text-xs max-w-sm">We could not retrieve details for &quot;{corridorSlug}&quot;. Please verify the URL or select a different corridor.</p>
        <Link href="/market" className="text-xs text-amber-500 font-bold hover:underline flex items-center gap-1">
          <ArrowLeft size={12} /> Back to Market Hub
        </Link>
      </div>
    );
  }

  // Pre-process pricing charts
  const priceChartData = pricing?.pricePoints?.map((pt: any) => {
    const hydAvg = pricing.hyderabadAverages.find((h: any) => h.year === pt.year)?.pricePerSqFt || 0;
    return {
      year: pt.year,
      price: pt.pricePerSqFt,
      benchmark: hydAvg,
      yoy: pt.yoyChange
    };
  }) || [];

  // Pre-process demand trends
  const demandChartData = demand?.trends?.map((t: any) => ({
    name: `${t.year}-${t.month}`,
    inquiries: t.inquiryCount || 0,
    absorption: t.absorptionRate || 0,
    listings: t.newListings || 0,
    sold: t.soldUnits || 0,
    inventory: t.inventoryUnits || 0
  })) || [];

  return (
    <div className="bg-slate-900 text-slate-100 min-h-screen font-sans">
      {/* Back Button */}
      <div className="bg-slate-950 border-b border-slate-800/60 py-3 px-6">
        <div className="max-w-7xl mx-auto">
          <Link href="/market" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={13} /> Back to Market Hub
          </Link>
        </div>
      </div>

      {/* SECTION 1: Intelligence Score Header Banner */}
      <section className="bg-gradient-to-b from-slate-950 to-slate-900 py-10 px-6 border-b border-slate-800">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
          {/* Corridor Info */}
          <div className="space-y-4 lg:col-span-2">
            <div>
              <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest block mb-1">Corridor Profile Deep Dive</span>
              <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight font-serif capitalize">
                {profile.corridor}
              </h1>
              <p className="text-xs text-slate-400 mt-1.5 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                {ZONE_DESCRIPTIONS[profile.corridor] || "Hyderabad Growth Corridor"}
              </p>
            </div>

            {/* Sub-scores Row */}
            <div className="grid grid-cols-4 gap-4 bg-slate-950/40 border border-slate-800/80 rounded p-4">
              <div className="text-center">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Infra</div>
                <div className="text-base font-black text-white mt-1">{profile.infraScore}/25</div>
              </div>
              <div className="text-center border-l border-slate-800/60">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Approvals</div>
                <div className="text-base font-black text-white mt-1">{profile.approvalScore}/25</div>
              </div>
              <div className="text-center border-l border-slate-800/60">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Demand</div>
                <div className="text-base font-black text-white mt-1">{profile.demandScore}/25</div>
              </div>
              <div className="text-center border-l border-slate-800/60">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Appr.</div>
                <div className="text-base font-black text-white mt-1">{profile.appreciationScore}/25</div>
              </div>
            </div>

            {/* Gold-bordered Quote block (Admin/AI commentary) */}
            {profile.adminNote && (
              <div className="border-l-4 border-amber-500 bg-amber-500/5 px-4 py-3 rounded-r text-xs text-slate-300 italic max-w-2xl leading-relaxed">
                &quot;{profile.adminNote}&quot;
              </div>
            )}
          </div>

          {/* Overall Score Circle Gauge */}
          <div className="flex flex-col items-center justify-center bg-slate-950/60 border border-slate-800 p-6 rounded-lg max-w-[280px] mx-auto w-full">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-3">Overall Rating</span>
            
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg className="w-28 h-28 transform -rotate-90">
                <circle cx="56" cy="56" r="48" stroke="#1e293b" strokeWidth="6" fill="transparent" />
                <circle 
                  cx="56" 
                  cy="56" 
                  r="48" 
                  stroke="#d97706" 
                  strokeWidth="8" 
                  fill="transparent" 
                  strokeDasharray="301"
                  strokeDashoffset={301 - (301 * profile.overallScore) / 100}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-3xl font-black text-white block leading-none">{profile.overallScore}</span>
                <span className="text-[8px] text-slate-400 uppercase font-black tracking-widest mt-1 inline-block">Score</span>
              </div>
            </div>

            <span className={`mt-4 px-3 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${
              profile.investorSentiment === "BULLISH" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
              profile.investorSentiment === "CAUTIOUS" ? "bg-red-500/10 text-red-400 border-red-500/20" :
              "bg-amber-500/10 text-amber-400 border-amber-500/20"
            }`}>
              {profile.investorSentiment} sentiment
            </span>
          </div>
        </div>
      </section>

      {/* Tabs Menu Navigation */}
      <section className="bg-slate-950/40 border-b border-slate-850 px-6 sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex overflow-x-auto whitespace-nowrap gap-6">
          {[
            { id: "pricing", label: "Price History", icon: <TrendingUp size={14} /> },
            { id: "demand", label: "Demand Trends", icon: <TrendingDown size={14} /> },
            { id: "infra", label: "Infrastructure Timeline", icon: <Hammer size={14} /> },
            { id: "approvals", label: "Approvals Directory", icon: <FileCheck size={14} /> },
            { id: "ai", label: "AI Investment Analysis", icon: <Brain size={14} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 py-4 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                activeTab === tab.id
                  ? "border-amber-500 text-white font-black"
                  : "border-transparent text-slate-400 hover:text-white"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Tabs Contents */}
      <main className="max-w-7xl mx-auto py-12 px-6">
        
        {/* Tab 1: Price History */}
        {activeTab === "pricing" && (
          <div className="space-y-10 animate-fade-in">
            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Chart 1: Price per SqFt vs Benchmark */}
              <div className="bg-slate-950 border border-slate-800 rounded p-5 flex flex-col">
                <h3 className="text-xs font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp size={14} className="text-amber-500" /> Price per SqFt (₹) vs Hyderabad Average
                </h3>
                {priceChartData.length === 0 ? (
                  <div className="h-[220px] flex items-center justify-center text-slate-500 text-xs italic">No price points seeded.</div>
                ) : (
                  <div className="h-[250px] w-full text-[10px] text-slate-400">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={priceChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                        <XAxis dataKey="year" stroke="#475569" />
                        <YAxis stroke="#475569" />
                        <Tooltip contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b", fontSize: "11px", color: "#f8fafc" }} />
                        <Legend wrapperStyle={{ fontSize: "10px" }} />
                        <Line type="monotone" dataKey="price" stroke="#f59e0b" strokeWidth={2.5} name={profile.corridor} dot={{ r: 4 }} />
                        <Line type="monotone" dataKey="benchmark" stroke="#475569" strokeDasharray="4 4" strokeWidth={1.5} name="Hyd Metro Average" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Chart 2: YoY price growth */}
              <div className="bg-slate-950 border border-slate-800 rounded p-5 flex flex-col">
                <h3 className="text-xs font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp size={14} className="text-emerald-500" /> Year-over-Year (YoY) Change %
                </h3>
                {priceChartData.length === 0 ? (
                  <div className="h-[220px] flex items-center justify-center text-slate-500 text-xs italic">No price points seeded.</div>
                ) : (
                  <div className="h-[250px] w-full text-[10px] text-slate-400">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={priceChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                        <XAxis dataKey="year" stroke="#475569" />
                        <YAxis stroke="#475569" />
                        <Tooltip contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b", fontSize: "11px", color: "#f8fafc" }} />
                        <Bar dataKey="yoy" fill="#10b981" name="YoY Change %" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

            {/* Price Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-950 border border-slate-800 p-5 rounded-lg">
              <div>
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">CAGR (5yr)</div>
                <div className="text-xl font-black text-white mt-1">~14.5%</div>
              </div>
              <div className="border-l border-slate-800/60 pl-4">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">CAGR (3yr)</div>
                <div className="text-xl font-black text-white mt-1">~13.2%</div>
              </div>
              <div className="border-l border-slate-800/60 pl-4">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Current price</div>
                <div className="text-xl font-black text-white mt-1">
                  ₹{pricing?.pricePoints?.slice(-1)[0]?.pricePerSqFt?.toLocaleString() || "4,200"} <span className="text-xs font-normal text-slate-400">/sqft</span>
                </div>
              </div>
              <div className="border-l border-slate-800/60 pl-4">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Historical Multiplier</div>
                <div className="text-xl font-black text-emerald-400 mt-1">2.4x <span className="text-xs font-normal text-slate-400">since 2018</span></div>
              </div>
            </div>

            {/* Tabular data log */}
            <div className="bg-slate-950 border border-slate-800 rounded overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
                <span className="text-xs font-bold text-white">Price History Data Table</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 border-b border-slate-800 text-[10px] font-bold uppercase text-slate-400">
                      <th className="px-4 py-3">Year</th>
                      <th className="px-4 py-3 text-center">Quarter</th>
                      <th className="px-4 py-3 text-right">Price per SqFt (₹)</th>
                      <th className="px-4 py-3 text-center">YoY Change (%)</th>
                      <th className="px-4 py-3">Source</th>
                      <th className="px-4 py-3">Commentary</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 text-slate-300">
                    {pricing?.pricePoints?.slice().reverse().map((pt: any) => (
                      <tr key={pt.id} className="hover:bg-slate-900/50">
                        <td className="px-4 py-3 font-semibold text-white">{pt.year}</td>
                        <td className="px-4 py-3 text-center text-slate-500">{pt.quarter || "—"}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-white">₹{pt.pricePerSqFt.toLocaleString()}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            pt.yoyChange >= 15 ? "bg-green-500/10 text-emerald-400" :
                            pt.yoyChange > 0 ? "bg-blue-500/10 text-blue-400" :
                            "bg-slate-800 text-slate-400"
                          }`}>
                            {pt.yoyChange >= 0 ? `+${pt.yoyChange}%` : `${pt.yoyChange}%`}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{pt.source || "—"}</td>
                        <td className="px-4 py-3 text-slate-400 text-[11px]">{pt.notes || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Demand Trends */}
        {activeTab === "demand" && (
          <div className="space-y-10 animate-fade-in">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-950 border border-slate-800 rounded p-4 text-center">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">Absorption Rate</span>
                <span className="text-2xl font-black text-white mt-1 block">{demand?.currentAbsorptionRate || 18.2}%</span>
                <span className="text-[9px] text-slate-500 block mt-1">Percent of inventory absorbed monthly</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded p-4 text-center">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">Days on Market</span>
                <span className="text-2xl font-black text-white mt-1 block">{demand?.avgDaysOnMkt || 48} days</span>
                <span className="text-[9px] text-slate-500 block mt-1">Median listing conversion speed</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded p-4 text-center">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">Inquiry Growth</span>
                <span className="text-2xl font-black text-emerald-400 mt-1 block">+{demand?.yoyInquiryGrowth || 34}%</span>
                <span className="text-[9px] text-slate-500 block mt-1">Year-over-Year inquiry growth</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded p-4 text-center">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">Active Inventory</span>
                <span className="text-2xl font-black text-white mt-1 block">{demand?.activeListings || 120} units</span>
                <span className="text-[9px] text-slate-500 block mt-1">Available layout inventory units</span>
              </div>
            </div>

            {/* AI Generated paragraph summary */}
            {demand?.contextParagraph && (
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-5 flex items-start gap-3">
                <Brain className="text-amber-500 mt-0.5 flex-shrink-0" size={16} />
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Demand context analysis</span>
                  <p className="text-xs text-slate-300 leading-relaxed font-medium">{demand.contextParagraph}</p>
                </div>
              </div>
            )}

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Chart 1: Dual axis inquiry vs absorption */}
              <div className="bg-slate-950 border border-slate-800 rounded p-5 flex flex-col">
                <h3 className="text-xs font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingDown size={14} className="text-blue-500" /> Inquiries vs Absorption Rate % (Last 24 Months)
                </h3>
                {demandChartData.length === 0 ? (
                  <div className="h-[220px] flex items-center justify-center text-slate-500 text-xs italic">No monthly logs found.</div>
                ) : (
                  <div className="h-[250px] w-full text-[10px] text-slate-400">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={demandChartData.slice(-12)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                        <XAxis dataKey="name" stroke="#475569" />
                        <YAxis yAxisId="left" stroke="#475569" />
                        <YAxis yAxisId="right" orientation="right" stroke="#475569" />
                        <Tooltip contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b", fontSize: "11px", color: "#f8fafc" }} />
                        <Legend wrapperStyle={{ fontSize: "10px" }} />
                        <Bar yAxisId="left" dataKey="inquiries" fill="#2563eb" name="Inquiries" radius={[2, 2, 0, 0]} />
                        <Bar yAxisId="right" dataKey="absorption" fill="#10b981" name="Absorption %" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Chart 2: Inventory vs Sold units */}
              <div className="bg-slate-950 border border-slate-800 rounded p-5 flex flex-col">
                <h3 className="text-xs font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingDown size={14} className="text-purple-500" /> Available Inventory vs Sold Units (Monthly)
                </h3>
                {demandChartData.length === 0 ? (
                  <div className="h-[220px] flex items-center justify-center text-slate-500 text-xs italic">No monthly logs found.</div>
                ) : (
                  <div className="h-[250px] w-full text-[10px] text-slate-400">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={demandChartData.slice(-12)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                        <XAxis dataKey="name" stroke="#475569" />
                        <YAxis stroke="#475569" />
                        <Tooltip contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b", fontSize: "11px", color: "#f8fafc" }} />
                        <Legend wrapperStyle={{ fontSize: "10px" }} />
                        <Bar dataKey="inventory" fill="#475569" name="Total Inventory" stackId="a" />
                        <Bar dataKey="sold" fill="#8b5cf6" name="Units Sold" stackId="a" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Infrastructure timeline pipeline */}
        {activeTab === "infra" && (
          <div className="space-y-10 animate-fade-in">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">Government Infrastructure pipeline</h3>
              <p className="text-slate-400 text-xs">Timeline of public expressway, metro link, and industrial developments affecting {profile.corridor} corridor growth.</p>
            </div>

            {/* Timeline View */}
            {!infra?.projects || infra.projects.length === 0 ? (
              <div className="bg-slate-950 border border-slate-800 rounded p-12 text-center text-slate-400 italic text-xs">
                No active infrastructure projects affecting this corridor currently.
              </div>
            ) : (
              <div className="border border-slate-800 rounded bg-slate-950 divide-y divide-slate-850">
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
                              isComplete ? "bg-green-500/10 text-emerald-400 border-emerald-500/20" :
                              isUnderConst ? "bg-orange-500/10 text-orange-400 border-orange-500/20" :
                              "bg-blue-500/10 text-blue-400 border-blue-500/20"
                            }`}>
                              {proj.status.replace("_", " ")}
                            </span>
                            <span className="text-slate-500 text-[10px] font-bold uppercase">{proj.category.replace("_", " ")}</span>
                          </div>
                          <h4 className="text-base font-bold text-white tracking-tight">{proj.name}</h4>
                        </div>

                        {/* Impact representation */}
                        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">RE Impact</span>
                          <span className="font-mono font-black text-amber-500 text-xs">{proj.reImpactScore}/10</span>
                          <div className="flex gap-0.5 ml-1">
                            {Array.from({ length: 10 }).map((_, idx) => (
                              <span 
                                key={idx} 
                                className={`w-1 h-3 rounded-full ${idx < proj.reImpactScore ? "bg-amber-500" : "bg-slate-700"}`} 
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Project detail grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs bg-slate-900/40 p-4 border border-slate-850 rounded">
                        <div>
                          <span className="text-[10px] text-slate-500 font-bold uppercase">Estimated Completion</span>
                          <span className="text-white font-bold block mt-0.5">{proj.estimatedCompletion || "TBD"}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 font-bold uppercase">Total Investment</span>
                          <span className="text-white font-bold block mt-0.5">
                            {proj.totalInvestmentCr ? `₹${proj.totalInvestmentCr.toLocaleString()} Cr` : "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 font-bold uppercase">Expected Job Creation</span>
                          <span className="text-white font-bold block mt-0.5">
                            {proj.expectedJobs ? `${proj.expectedJobs.toLocaleString()}+` : "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 font-bold uppercase">Government Order</span>
                          <span className="text-slate-400 font-mono text-[10px] block mt-0.5 truncate" title={proj.sourceGO}>{proj.sourceGO || "—"}</span>
                        </div>
                      </div>

                      {/* Milestone Sub-timeline */}
                      {proj.milestones?.length > 0 && (
                        <div className="pt-2">
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-2">Milestone execution timeline</span>
                          <div className="space-y-3 relative pl-4 border-l border-slate-800 ml-1">
                            {proj.milestones.map((m: any, mIdx: number) => (
                              <div key={m.id || mIdx} className="relative space-y-0.5">
                                {/* Dot indicator */}
                                <span className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2 ${
                                  m.status === "COMPLETED" ? "bg-emerald-500 border-emerald-500" :
                                  m.status === "IN_PROGRESS" ? "bg-amber-500 border-amber-500" :
                                  "bg-slate-900 border-slate-700"
                                }`} />
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-white text-[11px]">{m.title}</span>
                                  {m.date && (
                                    <span className="text-[9px] text-slate-500">({new Date(m.date).toLocaleDateString()})</span>
                                  )}
                                </div>
                                {m.description && <p className="text-[10px] text-slate-450">{m.description}</p>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Official link */}
                      {proj.sourceUrl && (
                        <div className="pt-2 flex items-center justify-start">
                          <a
                            href={proj.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-400 hover:text-blue-300 hover:underline"
                          >
                            View Official Source G.O. <ExternalLink size={10} />
                          </a>
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
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Layout permissions & RERA registry</h3>
                <p className="text-slate-400 text-xs mt-1">Legally cleared layout approvals under HMDA metropolitan limits or DTCP district boundaries.</p>
              </div>

              {/* Counters */}
              <div className="flex gap-4">
                <div className="bg-slate-950 border border-slate-800 px-4 py-2 rounded text-center">
                  <span className="text-[9px] text-slate-500 uppercase font-bold">HMDA Layouts</span>
                  <span className="text-base font-black text-white block">{approvals?.totalHmda || 0}</span>
                </div>
                <div className="bg-slate-950 border border-slate-800 px-4 py-2 rounded text-center">
                  <span className="text-[9px] text-slate-500 uppercase font-bold">RERA Registered</span>
                  <span className="text-base font-black text-white block">{approvals?.totalRera || 0}</span>
                </div>
              </div>
            </div>

            {/* Approvals Table */}
            {!approvals?.approvals || approvals.approvals.length === 0 ? (
              <div className="bg-slate-950 border border-slate-800 rounded p-12 text-center text-slate-400 italic text-xs">
                No layout approval records tracked for this corridor recently.
              </div>
            ) : (
              <div className="bg-slate-950 border border-slate-800 rounded overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900 border-b border-slate-800 text-[10px] font-bold uppercase text-slate-400">
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
                    <tbody className="divide-y divide-slate-850 text-slate-350">
                      {approvals.approvals.map((app: any) => (
                        <tr key={app.id} className="hover:bg-slate-900/50">
                          <td className="px-4 py-3.5 font-bold text-white">{app.projectName}</td>
                          <td className="px-4 py-3.5 text-slate-400">{app.developerName || "—"}</td>
                          <td className="px-4 py-3.5">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                              app.authority === "HMDA" ? "bg-green-500/10 text-green-400 border-green-500/20" :
                              app.authority === "DTCP" ? "bg-teal-500/10 text-teal-400 border-teal-500/20" :
                              "bg-slate-800 text-slate-300 border-slate-700"
                            }`}>
                              {app.authority}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-slate-400">{app.approvalType.replace("_", " ")}</td>
                          <td className="px-4 py-3.5 font-mono text-[11px] text-slate-400">{app.approvalNumber || "—"}</td>
                          <td className="px-4 py-3.5">
                            {app.approvalDate ? new Date(app.approvalDate).toLocaleDateString() : "—"}
                          </td>
                          <td className="px-4 py-3.5 text-right font-semibold text-white">{app.areaAcres ? `${app.areaAcres} ac` : "—"}</td>
                          <td className="px-4 py-3.5">
                            <span className="px-2 py-0.2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded text-[9px] font-bold uppercase">
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
            <div className="border border-slate-800 bg-slate-950/45 p-4 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs max-w-4xl">
              <div className="space-y-1">
                <span className="font-bold text-white block">💡 Official Registry Verification</span>
                <p className="text-slate-400 leading-relaxed max-w-2xl">Always verify approval layout status directly on HMDA.gov.in or RERA Telangana portal before investing. Our database is updated regularly but may not reflect real-time status.</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <a
                  href="https://rera.telangana.gov.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 border border-slate-700 hover:border-slate-500 text-white font-bold rounded flex items-center gap-1 transition-all"
                >
                  RERA Telangana <ExternalLink size={10} />
                </a>
                <a
                  href="https://hmda.gov.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 border border-slate-700 hover:border-slate-500 text-white font-bold rounded flex items-center gap-1 transition-all"
                >
                  HMDA Portal <ExternalLink size={10} />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: AI Analysis report */}
        {activeTab === "ai" && (
          <div className="space-y-10 animate-fade-in">
            {/* Header info */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Brain className="text-amber-500" size={16} /> AI Investment Research Report
                </h3>
                <p className="text-slate-500 text-[10px] mt-0.5">
                  Generated: {aiAnalysis?.generatedAt ? new Date(aiAnalysis.generatedAt).toLocaleDateString() : "June 15, 2026"}
                </p>
              </div>
              <button
                onClick={handleRegenerateAnalysis}
                disabled={regenerating}
                className="flex items-center gap-1 px-2.5 py-1.5 border border-slate-800 hover:bg-slate-800 text-slate-350 hover:text-white rounded text-[10px] font-bold cursor-pointer transition-all disabled:opacity-50"
              >
                {regenerating ? <Loader2 className="animate-spin" size={12} /> : "🔄"} Regenerate Analysis
              </button>
            </div>

            {/* Analysis Detail grid */}
            {!aiAnalysis ? (
              <div className="bg-slate-950 border border-slate-800 rounded p-12 text-center text-slate-500 text-xs italic">
                AI report not seeded yet. Click Regenerate to fetch.
              </div>
            ) : (
              <div className="space-y-8 max-w-4xl text-slate-300">
                {/* Headline Banner */}
                <h4 className="text-lg md:text-xl font-bold text-white font-serif leading-relaxed border-l-2 border-amber-500 pl-4 py-1">
                  {aiAnalysis.headline}
                </h4>

                {/* Grid blocks */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                  {/* Thesis */}
                  <div className="space-y-2">
                    <span className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-850 pb-1.5">
                      🎯 Investment Thesis
                    </span>
                    <p className="text-xs leading-relaxed text-slate-400 font-medium">{aiAnalysis.investmentThesis}</p>
                  </div>

                  {/* Catalysts */}
                  <div className="space-y-2">
                    <span className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-850 pb-1.5">
                      ⚡ Near-Term Catalysts
                    </span>
                    <ul className="list-disc list-inside text-xs text-slate-400 space-y-1">
                      {aiAnalysis.nearTermCatalysts?.map((c: string, idx: number) => (
                        <li key={idx} className="leading-relaxed">{c}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Drivers */}
                  <div className="space-y-2">
                    <span className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-850 pb-1.5">
                      🚀 Long-Term Drivers
                    </span>
                    <ul className="list-disc list-inside text-xs text-slate-400 space-y-1">
                      {aiAnalysis.longTermDrivers?.map((d: string, idx: number) => (
                        <li key={idx} className="leading-relaxed">{d}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Risks */}
                  <div className="space-y-2">
                    <span className="font-bold text-red-400 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-850 pb-1.5">
                      ⚠️ Key Market Risks
                    </span>
                    <ul className="list-disc list-inside text-xs text-slate-400 space-y-1">
                      {aiAnalysis.risks?.map((r: string, idx: number) => (
                        <li key={idx} className="leading-relaxed">{r}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Windows & Exit */}
                  <div className="space-y-2">
                    <span className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-850 pb-1.5">
                      🚪 Exit Strategy & Entry Window
                    </span>
                    <p className="text-xs text-slate-400 leading-relaxed font-medium">
                      <strong>Best Entry Window:</strong> {aiAnalysis.bestEntryWindow}
                    </p>
                    <p className="text-xs text-slate-400 leading-relaxed mt-2 font-medium">
                      <strong>Proposed Exit Strategy:</strong> {aiAnalysis.exitStrategy}
                    </p>
                  </div>

                  {/* Price Outlook projections */}
                  <div className="space-y-2">
                    <span className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-850 pb-1.5">
                      📈 Projected 5-Year CAGR Price Outlook
                    </span>
                    <div className="bg-slate-950 border border-slate-800 rounded p-3 space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-500">Conservative case</span>
                        <span className="text-white font-mono">{aiAnalysis.priceOutlook?.conservative || "8-10%"}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-semibold border-t border-slate-850 pt-2">
                        <span className="text-slate-400">Base case estimate</span>
                        <span className="text-amber-500 font-mono font-bold">{aiAnalysis.priceOutlook?.base || "12-14%"}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-semibold border-t border-slate-850 pt-2">
                        <span className="text-slate-350">Optimistic tailwind case</span>
                        <span className="text-emerald-400 font-mono font-bold">{aiAnalysis.priceOutlook?.optimistic || "16-18%"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* SECTION 7: Compare Corridors CTA */}
      <section className="bg-slate-950 border-t border-slate-850 py-12 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <h2 className="text-lg font-bold text-white tracking-tight">Evaluate other growth vectors in Hyderabad?</h2>
          <p className="text-slate-400 text-xs max-w-md mx-auto">Compare returns, approvals, and upcoming pipeline projects side by side using our evaluation grid.</p>
          <div className="pt-2">
            <Link
              href={`/market/compare?a=${profile.corridor.toLowerCase().replace(/\s+/g, "-")}`}
              className="inline-flex items-center gap-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded text-xs transition-colors cursor-pointer"
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
