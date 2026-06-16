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
  RefreshCw,
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
        if (legalData.success && legalData.risks) {
          const filteredRisks = legalData.risks.filter((r: any) => 
            r.affectedZones.map((z: string) => z.toLowerCase()).includes(rawCorridor.toLowerCase())
          );
          setCorridorLegalRisks(filteredRisks);
        }
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
      const slugEncoded = encodeURIComponent(rawCorridor);
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
      <div className="flex flex-col items-center justify-center py-40 min-h-screen bg-[#F8FAFC] text-[#0F172A]">
        <Loader2 className="animate-spin text-[#2563EB]" size={36} />
        <span className="text-xs text-[#3B82F6] font-semibold uppercase tracking-wider mt-4">Analyzing Corridor Layers...</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="bg-[#F8FAFC] text-[#0F172A] min-h-screen p-12 text-center flex flex-col justify-center items-center gap-4">
        <AlertTriangle size={32} className="text-[#EF4444]" />
        <h1 className="text-xl font-bold font-display">Corridor Not Found</h1>
        <p className="text-[#475569] text-xs max-w-sm">We could not retrieve details for &quot;{rawCorridor}&quot;. Please verify the URL or select a different corridor.</p>
        <Link href="/market" className="text-xs text-[#2563EB] font-bold hover:underline flex items-center gap-1">
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
      <section className="bg-white py-10 px-6 border-b border-luxury shadow-sm">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
          {/* Corridor Info */}
          <div className="space-y-4 lg:col-span-2">
            <div>
              <span className="text-[10px] font-bold text-accent uppercase tracking-widest block mb-1">Corridor Profile Deep Dive</span>
              <h1 className="text-4xl md:text-5xl font-black text-text-primary tracking-tight font-serif capitalize">
                {profile.corridor}
              </h1>
              <p className="text-xs text-text-secondary mt-1.5 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                {ZONE_DESCRIPTIONS[profile.corridor] || "Hyderabad Growth Corridor"}
              </p>
            </div>

            {/* Sub-scores Row */}
            <div className="grid grid-cols-4 gap-4 bg-slate-50 border border-luxury rounded p-4">
              <div className="text-center">
                <div className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Infra</div>
                <div className="text-base font-black text-text-primary mt-1">{profile.infraScore}/25</div>
              </div>
              <div className="text-center border-l border-luxury">
                <div className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Approvals</div>
                <div className="text-base font-black text-text-primary mt-1">{profile.approvalScore}/25</div>
              </div>
              <div className="text-center border-l border-luxury">
                <div className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Demand</div>
                <div className="text-base font-black text-text-primary mt-1">{profile.demandScore}/25</div>
              </div>
              <div className="text-center border-l border-luxury">
                <div className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Appr.</div>
                <div className="text-base font-black text-text-primary mt-1">{profile.appreciationScore}/25</div>
              </div>
            </div>

            {/* Gold-bordered Quote block (Admin/AI commentary) */}
            {profile.adminNote && (
              <div className="border-l-4 border-[#2563EB] bg-blue-50/40 px-4 py-3 rounded-r text-xs text-text-secondary italic max-w-2xl leading-relaxed">
                &quot;{profile.adminNote}&quot;
              </div>
            )}
          </div>

          {/* Overall Score Circle Gauge */}
          <div className="flex flex-col items-center justify-center bg-white border border-luxury p-6 rounded-lg max-w-[280px] mx-auto w-full shadow-sm">
            <span className="text-[9px] font-bold text-text-secondary uppercase tracking-widest mb-3">Overall Rating</span>
            
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg className="w-28 h-28 transform -rotate-90">
                <circle cx="56" cy="56" r="48" stroke="#E2E8F0" strokeWidth="6" fill="transparent" />
                <circle 
                  cx="56" 
                  cy="56" 
                  r="48" 
                  stroke="#3B82F6" 
                  strokeWidth="8" 
                  fill="transparent" 
                  strokeDasharray="301"
                  strokeDashoffset={301 - (301 * profile.overallScore) / 100}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-3xl font-black text-text-primary block leading-none font-mono">{profile.overallScore}</span>
                <span className="text-[8px] text-[#3B82F6] uppercase font-black tracking-widest mt-1 inline-block font-mono">Score</span>
              </div>
            </div>

            <span className={`mt-4 px-3 py-0.5 rounded text-[10px] font-mono font-bold border uppercase tracking-wider ${
              profile.investorSentiment === "BULLISH" ? "bg-emerald-50 text-[#3B82F6] border-emerald-200" :
              profile.investorSentiment === "CAUTIOUS" ? "bg-red-50 text-[#EF4444] border-red-200" :
              "bg-amber-50 text-[#2563EB] border-amber-200"
            }`}>
              {profile.investorSentiment} sentiment
            </span>
          </div>
        </div>
      </section>

      {/* Tabs Menu Navigation */}
      <section className="bg-white border-b border-[#E2E8F0] px-6 sticky top-16 z-30 backdrop-blur-md shadow-sm">
        <div className="max-w-7xl mx-auto flex overflow-x-auto whitespace-nowrap gap-6">
          {[
            { id: "pricing", label: "Price History", icon: <TrendingUp size={14} /> },
            { id: "demand", label: "Demand Trends", icon: <TrendingDown size={14} /> },
            { id: "infra", label: "Infrastructure Timeline", icon: <Hammer size={14} /> },
            { id: "approvals", label: "Approvals Directory", icon: <FileCheck size={14} /> },
            { id: "ai", label: "AI Investment Analysis", icon: <Brain size={14} /> },
            { id: "50yr", label: "50yr Context", icon: <Calendar size={14} /> },
            { id: "legal", label: "Legal Checklist", icon: <ShieldCheck size={14} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 py-4 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                activeTab === tab.id
                  ? "border-[#2563EB] text-[#2563EB]"
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
        
        {/* Tab 1: Price History */}
        {activeTab === "pricing" && (
          <div className="space-y-10 animate-fade-in">
            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Chart 1: Price per SqFt vs Benchmark */}
              <div className="bg-white border border-luxury rounded p-5 flex flex-col shadow-sm">
                <h3 className="text-xs font-bold text-text-primary mb-4 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp size={14} className="text-primary" /> Price per SqFt (₹) vs Hyderabad Average
                </h3>
                {priceChartData.length === 0 ? (
                  <div className="h-[220px] flex items-center justify-center text-text-secondary text-xs italic">No price points seeded.</div>
                ) : (
                  <div className="h-[250px] w-full text-[10px] text-text-secondary">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={priceChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis dataKey="year" stroke="#94A3B8" />
                        <YAxis stroke="#94A3B8" />
                        <Tooltip contentStyle={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8F0", fontSize: "11px", color: "#0F172A" }} />
                        <Legend wrapperStyle={{ fontSize: "10px" }} />
                        <Line type="monotone" dataKey="price" stroke="#2563EB" strokeWidth={2.5} name={profile.corridor} dot={{ r: 4 }} />
                        <Line type="monotone" dataKey="benchmark" stroke="#94A3B8" strokeDasharray="4 4" strokeWidth={1.5} name="Hyd Metro Average" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Chart 2: YoY price growth */}
              <div className="bg-white border border-luxury rounded p-5 flex flex-col shadow-sm">
                <h3 className="text-xs font-bold text-text-primary mb-4 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp size={14} className="text-green-600" /> Year-over-Year (YoY) Change %
                </h3>
                {priceChartData.length === 0 ? (
                  <div className="h-[220px] flex items-center justify-center text-text-secondary text-xs italic">No price points seeded.</div>
                ) : (
                  <div className="h-[250px] w-full text-[10px] text-text-secondary">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={priceChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis dataKey="year" stroke="#94A3B8" />
                        <YAxis stroke="#94A3B8" />
                        <Tooltip contentStyle={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8F0", fontSize: "11px", color: "#0F172A" }} />
                        <Bar dataKey="yoy" fill="#3B82F6" name="YoY Change %" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

            {/* Price Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white border border-luxury p-5 rounded-lg shadow-sm">
              <div>
                <div className="text-[10px] text-text-secondary font-bold uppercase tracking-widest">CAGR (5yr)</div>
                <div className="text-xl font-black text-text-primary mt-1">~14.5%</div>
              </div>
              <div className="border-l border-luxury pl-4">
                <div className="text-[10px] text-text-secondary font-bold uppercase tracking-widest">CAGR (3yr)</div>
                <div className="text-xl font-black text-text-primary mt-1">~13.2%</div>
              </div>
              <div className="border-l border-luxury pl-4">
                <div className="text-[10px] text-text-secondary font-bold uppercase tracking-widest">Current price</div>
                <div className="text-xl font-black text-text-primary mt-1">
                  ₹{pricing?.pricePoints?.slice(-1)[0]?.pricePerSqFt?.toLocaleString() || "4,200"} <span className="text-xs font-normal text-text-secondary">/sqft</span>
                </div>
              </div>
              <div className="border-l border-luxury pl-4">
                <div className="text-[10px] text-text-secondary font-bold uppercase tracking-widest">Historical Multiplier</div>
                <div className="text-xl font-black text-green-600 mt-1">2.4x <span className="text-xs font-normal text-text-secondary">since 2018</span></div>
              </div>
            </div>

            {/* Tabular data log */}
            <div className="bg-white border border-luxury rounded overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-luxury bg-white flex items-center justify-between">
                <span className="text-xs font-bold text-text-primary">Price History Data Table</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-luxury text-[10px] font-bold uppercase text-text-secondary">
                      <th className="px-4 py-3">Year</th>
                      <th className="px-4 py-3 text-center">Quarter</th>
                      <th className="px-4 py-3 text-right">Price per SqFt (₹)</th>
                      <th className="px-4 py-3 text-center">YoY Change (%)</th>
                      <th className="px-4 py-3">Source</th>
                      <th className="px-4 py-3">Commentary</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-text-primary">
                    {pricing?.pricePoints?.slice().reverse().map((pt: any) => (
                      <tr key={pt.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-text-primary">{pt.year}</td>
                        <td className="px-4 py-3 text-center text-text-secondary">{pt.quarter || "—"}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-text-primary">₹{pt.pricePerSqFt.toLocaleString()}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                            pt.yoyChange >= 15 ? "bg-green-50 text-green-700 border-green-200" :
                            pt.yoyChange > 0 ? "bg-blue-50 text-blue-700 border-blue-200" :
                            "bg-slate-100 text-slate-500 border border-slate-200"
                          }`}>
                            {pt.yoyChange >= 0 ? `+${pt.yoyChange}%` : `${pt.yoyChange}%`}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-text-secondary">{pt.source || "—"}</td>
                        <td className="px-4 py-3 text-text-secondary text-[11px]">{pt.notes || "—"}</td>
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
              <div className="bg-white border border-luxury rounded p-4 text-center shadow-sm">
                <span className="text-[10px] text-text-secondary font-bold uppercase tracking-widest block">Absorption Rate</span>
                <span className="text-2xl font-black text-text-primary mt-1 block">{demand?.currentAbsorptionRate || 18.2}%</span>
                <span className="text-[9px] text-text-secondary block mt-1">Percent of inventory absorbed monthly</span>
              </div>
              <div className="bg-white border border-luxury rounded p-4 text-center shadow-sm">
                <span className="text-[10px] text-text-secondary font-bold uppercase tracking-widest block">Days on Market</span>
                <span className="text-2xl font-black text-text-primary mt-1 block">{demand?.avgDaysOnMkt || 48} days</span>
                <span className="text-[9px] text-text-secondary block mt-1">Median listing conversion speed</span>
              </div>
              <div className="bg-white border border-luxury rounded p-4 text-center shadow-sm">
                <span className="text-[10px] text-text-secondary font-bold uppercase tracking-widest block">Inquiry Growth</span>
                <span className="text-2xl font-black text-green-600 mt-1 block">+{demand?.yoyInquiryGrowth || 34}%</span>
                <span className="text-[9px] text-text-secondary block mt-1">Year-over-Year inquiry growth</span>
              </div>
              <div className="bg-white border border-luxury rounded p-4 text-center shadow-sm">
                <span className="text-[10px] text-text-secondary font-bold uppercase tracking-widest block">Active Inventory</span>
                <span className="text-2xl font-black text-text-primary mt-1 block">{demand?.activeListings || 120} units</span>
                <span className="text-[9px] text-text-secondary block mt-1">Available layout inventory units</span>
              </div>
            </div>

            {/* AI Generated paragraph summary */}
            {demand?.contextParagraph && (
              <div className="bg-blue-50/40 border border-blue-200 rounded-lg p-5 flex items-start gap-3 shadow-sm">
                <Brain className="text-primary mt-0.5 flex-shrink-0" size={16} />
                <div className="space-y-1">
                  <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider block">Demand context analysis</span>
                  <p className="text-xs text-text-secondary leading-relaxed font-medium">{demand.contextParagraph}</p>
                </div>
              </div>
            )}

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Chart 1: Dual axis inquiry vs absorption */}
              <div className="bg-white border border-luxury rounded p-5 flex flex-col shadow-sm">
                <h3 className="text-xs font-bold text-text-primary mb-4 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingDown size={14} className="text-[#2563EB]" /> Inquiries vs Absorption Rate % (Last 24 Months)
                </h3>
                {demandChartData.length === 0 ? (
                  <div className="h-[220px] flex items-center justify-center text-text-secondary text-xs italic">No monthly logs found.</div>
                ) : (
                  <div className="h-[250px] w-full text-[10px] text-text-secondary">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={demandChartData.slice(-12)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis dataKey="name" stroke="#94A3B8" />
                        <YAxis yAxisId="left" stroke="#94A3B8" />
                        <YAxis yAxisId="right" orientation="right" stroke="#94A3B8" />
                        <Tooltip contentStyle={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8F0", fontSize: "11px", color: "#0F172A" }} />
                        <Legend wrapperStyle={{ fontSize: "10px" }} />
                        <Bar yAxisId="left" dataKey="inquiries" fill="#2563EB" name="Inquiries" radius={[2, 2, 0, 0]} />
                        <Bar yAxisId="right" dataKey="absorption" fill="#10B981" name="Absorption %" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Chart 2: Inventory vs Sold units */}
              <div className="bg-white border border-luxury rounded p-5 flex flex-col shadow-sm">
                <h3 className="text-xs font-bold text-text-primary mb-4 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingDown size={14} className="text-purple-600" /> Available Inventory vs Sold Units (Monthly)
                </h3>
                {demandChartData.length === 0 ? (
                  <div className="h-[220px] flex items-center justify-center text-text-secondary text-xs italic">No monthly logs found.</div>
                ) : (
                  <div className="h-[250px] w-full text-[10px] text-text-secondary">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={demandChartData.slice(-12)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis dataKey="name" stroke="#94A3B8" />
                        <YAxis stroke="#94A3B8" />
                        <Tooltip contentStyle={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8F0", fontSize: "11px", color: "#0F172A" }} />
                        <Legend wrapperStyle={{ fontSize: "10px" }} />
                        <Bar dataKey="inventory" fill="#94A3B8" name="Total Inventory" stackId="a" />
                        <Bar dataKey="sold" fill="#8B5CF6" name="Units Sold" stackId="a" />
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
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-2">Government Infrastructure pipeline</h3>
              <p className="text-text-secondary text-xs">Timeline of public expressway, metro link, and industrial developments affecting {profile.corridor} corridor growth.</p>
            </div>

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

                        {/* Impact representation */}
                        <div className="flex items-center gap-2 bg-slate-50 border border-luxury px-3 py-1.5 rounded">
                          <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">RE Impact</span>
                          <span className="font-mono font-black text-amber-600 text-xs">{proj.reImpactScore}/10</span>
                          <div className="flex gap-0.5 ml-1">
                            {Array.from({ length: 10 }).map((_, idx) => (
                              <span 
                                key={idx} 
                                className={`w-1 h-3 rounded-full ${idx < proj.reImpactScore ? "bg-amber-500" : "bg-slate-200"}`} 
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Project detail grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs bg-slate-50 p-4 border border-luxury rounded">
                        <div>
                          <span className="text-[10px] text-text-secondary font-bold uppercase">Estimated Completion</span>
                          <span className="text-text-primary font-bold block mt-0.5">{proj.estimatedCompletion || "TBD"}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-text-secondary font-bold uppercase">Total Investment</span>
                          <span className="text-text-primary font-bold block mt-0.5">
                            {proj.totalInvestmentCr ? `₹${proj.totalInvestmentCr.toLocaleString()} Cr` : "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-text-secondary font-bold uppercase">Expected Job Creation</span>
                          <span className="text-text-primary font-bold block mt-0.5">
                            {proj.expectedJobs ? `${proj.expectedJobs.toLocaleString()}+` : "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-text-secondary font-bold uppercase">Government Order</span>
                          <span className="text-text-secondary font-mono text-[10px] block mt-0.5 truncate" title={proj.sourceGO}>{proj.sourceGO || "—"}</span>
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
                                    <span className="text-[9px] text-text-secondary">({new Date(m.date).toLocaleDateString()})</span>
                                  )}
                                </div>
                                {m.description && <p className="text-[10px] text-text-secondary">{m.description}</p>}
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
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:text-blue-700 hover:underline"
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
                <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">Layout permissions & RERA registry</h3>
                <p className="text-text-secondary text-xs mt-1">Legally cleared layout approvals under HMDA metropolitan limits or DTCP district boundaries.</p>
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
                No layout approval records tracked for this corridor recently.
              </div>
            ) : (
              <div className="bg-white border border-luxury rounded overflow-hidden shadow-sm">
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
                          <td className="px-4 py-3.5 font-mono text-[11px] text-text-secondary">{app.approvalNumber || "—"}</td>
                          <td className="px-4 py-3.5 text-text-secondary">
                            {app.approvalDate ? new Date(app.approvalDate).toLocaleDateString() : "—"}
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

        {/* Tab 5: AI Analysis report */}
        {activeTab === "ai" && (
          <div className="space-y-10 animate-fade-in">
            {/* Header info */}
            <div className="flex items-center justify-between border-b border-luxury pb-4">
              <div>
                <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
                  <Brain className="text-primary" size={16} /> AI Investment Research Report
                </h3>
                <p className="text-text-secondary text-[10px] mt-0.5">
                  Generated: {aiAnalysis?.generatedAt ? new Date(aiAnalysis.generatedAt).toLocaleDateString() : "June 15, 2026"}
                </p>
              </div>
              <button
                onClick={handleRegenerateAnalysis}
                disabled={regenerating}
                className="flex items-center gap-1.5 px-2.5 py-1.5 border border-luxury hover:bg-slate-50 text-text-secondary hover:text-text-primary rounded text-[10px] font-bold cursor-pointer transition-all disabled:opacity-50 bg-white shadow-sm"
              >
                <RefreshCw size={11} className={regenerating ? "animate-spin text-primary" : "text-text-secondary"} />
                <span>Regenerate Analysis</span>
              </button>
            </div>

            {/* Analysis Detail grid */}
            {!aiAnalysis ? (
              <div className="bg-white border border-luxury rounded p-12 text-center text-text-secondary text-xs italic shadow-sm">
                AI report not seeded yet. Click Regenerate to fetch.
              </div>
            ) : (
              <div className="space-y-8 max-w-4xl text-text-primary">
                {/* Headline Banner */}
                <h4 className="text-lg md:text-xl font-bold text-text-primary font-serif leading-relaxed border-l-2 border-primary pl-4 py-1">
                  {aiAnalysis.headline}
                </h4>

                {/* Grid blocks */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                  {/* Thesis */}
                  <div className="space-y-2">
                    <span className="font-bold text-text-primary text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-luxury pb-1.5">
                      🎯 Investment Thesis
                    </span>
                    <p className="text-xs leading-relaxed text-text-secondary font-medium">{aiAnalysis.investmentThesis}</p>
                  </div>

                  {/* Catalysts */}
                  <div className="space-y-2">
                    <span className="font-bold text-text-primary text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-luxury pb-1.5">
                      ⚡ Near-Term Catalysts
                    </span>
                    <ul className="list-disc list-inside text-xs text-text-secondary space-y-1">
                      {aiAnalysis.nearTermCatalysts?.map((c: string, idx: number) => (
                        <li key={idx} className="leading-relaxed">{c}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Drivers */}
                  <div className="space-y-2">
                    <span className="font-bold text-text-primary text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-luxury pb-1.5">
                      🚀 Long-Term Drivers
                    </span>
                    <ul className="list-disc list-inside text-xs text-text-secondary space-y-1">
                      {aiAnalysis.longTermDrivers?.map((d: string, idx: number) => (
                        <li key={idx} className="leading-relaxed">{d}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Risks */}
                  <div className="space-y-2">
                    <span className="font-bold text-red-600 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-luxury pb-1.5">
                      ⚠️ Key Market Risks
                    </span>
                    <ul className="list-disc list-inside text-xs text-text-secondary space-y-1">
                      {aiAnalysis.risks?.map((r: string, idx: number) => (
                        <li key={idx} className="leading-relaxed">{r}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Windows & Exit */}
                  <div className="space-y-2">
                    <span className="font-bold text-text-primary text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-luxury pb-1.5">
                      🚪 Exit Strategy & Entry Window
                    </span>
                    <p className="text-xs text-text-secondary leading-relaxed font-medium">
                      <strong>Best Entry Window:</strong> {aiAnalysis.bestEntryWindow}
                    </p>
                    <p className="text-xs text-text-secondary leading-relaxed mt-2 font-medium">
                      <strong>Proposed Exit Strategy:</strong> {aiAnalysis.exitStrategy}
                    </p>
                  </div>

                  {/* Price Outlook projections */}
                  <div className="space-y-2">
                    <span className="font-bold text-text-primary text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-luxury pb-1.5">
                      📈 Projected 5-Year CAGR Price Outlook
                    </span>
                    <div className="bg-slate-50 border border-luxury rounded p-3 space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-text-secondary">Conservative case</span>
                        <span className="text-text-primary font-mono">{aiAnalysis.priceOutlook?.conservative || "8-10%"}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-semibold border-t border-luxury pt-2">
                        <span className="text-text-secondary">Base case estimate</span>
                        <span className="text-amber-700 font-mono font-bold">{aiAnalysis.priceOutlook?.base || "12-14%"}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-semibold border-t border-luxury pt-2">
                        <span className="text-text-secondary">Optimistic tailwind case</span>
                        <span className="text-emerald-700 font-mono font-bold">{aiAnalysis.priceOutlook?.optimistic || "16-18%"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 8: 50-Year Growth Context */}
        {activeTab === "50yr" && (
          <div className="space-y-8 animate-fade-in max-w-4xl text-text-primary">
            <div>
              <h3 className="text-lg font-display text-[#0F172A] flex items-center gap-2">
                <Calendar size={18} className="text-[#2563EB]" />
                50-Year Urban Expansion & Historical Analogue
              </h3>
              <p className="text-text-secondary text-xs mt-1">
                Where does the {profile.name} fit in Hyderabad's radial growth narrative?
              </p>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-lg p-6 space-y-6 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <span className="font-mono text-[10px] font-bold text-[#3B82F6] uppercase tracking-wider block">Historical Analogue</span>
                  <div className="text-xl font-display text-[#0F172A]">
                    {profile.historicalAnalog || "N/A"}
                  </div>
                  <p className="text-xs text-[#475569] leading-relaxed">
                    This analogue indicates that {profile.shortName}'s current price action, infrastructure layout activity, and investor inquiry velocity closely mirror another established corridor during its high-appreciation trigger phase.
                  </p>
                </div>

                <div className="space-y-2 bg-[#F8FAFC]/40 p-4 rounded-md border border-[#E2E8F0]">
                  <span className="font-mono text-[10px] font-bold text-[#2563EB] uppercase tracking-wider block">Geographical Corridor Zone</span>
                  <div className="text-lg font-display text-[#0F172A]">{profile.zone}</div>
                  <p className="text-xs text-[#475569] leading-relaxed">
                    Centred in the <strong>{profile.direction}</strong> region of Hyderabad under the district administration of <strong>{profile.district}</strong>.
                  </p>
                </div>
              </div>

              <div className="border-t border-[#E2E8F0] pt-6 space-y-4">
                <h4 className="text-xs font-mono font-bold text-[#0F172A] uppercase tracking-widest">Growth Era Allocation</h4>
                <div className="relative border-l-2 border-[#E2E8F0] ml-2 pl-6 space-y-6 py-1">
                  <div className="relative">
                    <span className="absolute -left-9 top-0.5 bg-[#E2E8F0] text-[#0F172A] rounded-full w-5 h-5 flex items-center justify-center text-[9px] font-mono font-bold">1</span>
                    <span className="text-xs font-bold text-text-secondary">1990 - 2000: Madhapur Inflection Era (Trigger completed)</span>
                  </div>
                  <div className="relative">
                    <span className="absolute -left-9 top-0.5 bg-[#E2E8F0] text-[#0F172A] rounded-full w-5 h-5 flex items-center justify-center text-[9px] font-mono font-bold">2</span>
                    <span className="text-xs font-bold text-text-secondary">2000 - 2015: ORR & Gachibowli Expansion Era (Matured)</span>
                  </div>
                  <div className="relative">
                    <span className="absolute -left-9 top-0.5 bg-[#E2E8F0] text-[#0F172A] rounded-full w-5 h-5 flex items-center justify-center text-[9px] font-mono font-bold">3</span>
                    <span className="text-xs font-bold text-text-secondary">2015 - 2025: Kokapet Neopolis High-Rise Era (Established Node)</span>
                  </div>
                  <div className="relative">
                    <span className="absolute -left-9 top-0.5 bg-[#2563EB] text-white rounded-full w-5 h-5 flex items-center justify-center text-[9px] font-mono font-bold">4</span>
                    <span className="text-xs font-bold text-[#0F172A]">2025 - 2035+: Mucherla FCDA Future City & RRR Expansion (Active Phase)</span>
                    <p className="text-[11px] text-[#475569] mt-1 leading-relaxed max-w-xl">
                      {profile.shortName} is a direct beneficiary of the active Growth Era 4, fueled by the Regional Ring Road (RRR) alignments and FCDA planning approvals.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 9: Legal Due Diligence Checklist */}
        {activeTab === "legal" && (
          <div className="space-y-8 animate-fade-in max-w-4xl text-text-primary">
            <div>
              <h3 className="text-lg font-display text-[#0F172A] flex items-center gap-2">
                <ShieldCheck size={18} className="text-[#2563EB]" />
                Legal Audit & Due Diligence Checklist
              </h3>
              <p className="text-[#475569] text-xs mt-1">
                Verified warning vectors and legal requirements for {profile.name} compiled from Dharani, Bhu Bharati, and RERA registries.
              </p>
            </div>

            {corridorLegalRisks.length === 0 ? (
              <div className="bg-white border border-[#E2E8F0] rounded-lg p-12 text-center text-text-secondary text-xs italic shadow-sm">
                No active critical legal warnings listed for this specific sector. Ensure standard RERA and LP number validation.
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
                        isOrange ? "border-l-[#2563EB]" :
                        "border-l-[#3B82F6]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold border uppercase tracking-wider ${
                            isRed ? "bg-red-50 text-[#EF4444] border-red-200" :
                            isOrange ? "bg-amber-50 text-[#2563EB] border-amber-200" :
                            "bg-emerald-50 text-[#3B82F6] border-emerald-200"
                          }`}>
                            {risk.severity} SEVERITY RISK
                          </span>
                          <h4 className="font-display text-base text-[#0F172A] mt-1.5">{risk.title}</h4>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-[#3B82F6] bg-[#3B82F6]/15 px-2 py-0.5 rounded animate-pulse">
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
                            <span className="text-[10px] font-mono text-[#3B82F6] font-bold">GOV REF:</span>
                            <span className="font-mono text-[11px] text-text-secondary">{risk.govReference}</span>
                          </div>
                        )}
                        {risk.checkUrl && (
                          <div className="pt-1 flex items-center justify-end">
                            <a
                              href={risk.checkUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-mono text-[10px] text-[#2563EB] hover:text-[#3B82F6] font-bold"
                            >
                              Open Verification Portal <ExternalLink size={10} />
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
