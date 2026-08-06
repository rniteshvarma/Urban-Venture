"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import LeadsByStatus from "@/components/admin/charts/LeadsByStatus";
import BudgetDistribution from "@/components/admin/charts/BudgetDistribution";
import CorridorHeatmap from "@/components/admin/charts/CorridorHeatmap";
import ConversionFunnel from "@/components/admin/charts/ConversionFunnel";
import InboundActivityWidget from "@/components/admin/InboundActivityWidget";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { 
  Flame, 
  Phone, 
  ArrowRight, 
  User, 
  Megaphone, 
  CheckCircle2, 
  TrendingUp, 
  Award, 
  Layers, 
  Sparkles, 
  Compass, 
  BarChart3, 
  RefreshCw,
  AlertTriangle,
  ChevronRight,
  Zap,
  Target,
  FileText
} from "lucide-react";

interface DashboardData {
  leadsByStatus: any[];
  budgetDistribution: any[];
  leadsByCity: any[];
  horizonDistribution: any[];
  corridorPopularity: any[];
  weeklyLeadVolume: any[];
  conversionFunnel: any[];
  hotLeads?: any[];
  kpis: {
    totalLeads: number;
    newLeads7Days: number;
    activeProjects: number;
    conversionRate: string;
  };
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [staleCount, setStaleCount] = useState(0);
  const [recentBroadcasts, setRecentBroadcasts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [intelSummary, setIntelSummary] = useState<{
    projectCount: number;
    highestScoreCorridor: string;
    highestScore: number;
    bullishCorridors: string[];
    lastComputed: string | null;
  } | null>(null);
  const [isRecomputing, setIsRecomputing] = useState(false);

  const loadIntelSummary = async () => {
    try {
      const corridorsRes = await fetch("/api/market/corridors");
      const projectsRes = await fetch("/api/admin/infra-projects");
      if (corridorsRes.ok && projectsRes.ok) {
        const corridors = await corridorsRes.json();
        const projects = await projectsRes.json();
        
        const highest = corridors.length > 0 ? corridors[0] : null;
        const bullish = corridors
          .filter((c: any) => c.investorSentiment === "BULLISH")
          .map((c: any) => c.corridor);
          
        const lastComp = corridors.find((c: any) => c.lastComputedAt)?.lastComputedAt || null;

        setIntelSummary({
          projectCount: projects.length,
          highestScoreCorridor: highest ? highest.corridor : "None",
          highestScore: highest ? highest.overallScore : 0,
          bullishCorridors: bullish,
          lastComputed: lastComp
        });
      }
    } catch (intelErr) {
      console.error("Failed to load intelligence summary on dashboard:", intelErr);
    }
  };

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const analyticsRes = await fetch("/api/admin/analytics");
        if (analyticsRes.ok) {
          const analytics = await analyticsRes.json();
          setData(analytics);
        }

        const pipelineRes = await fetch("/api/admin/pipeline");
        if (pipelineRes.ok) {
          const pipelineData = await pipelineRes.json();
          setStaleCount(pipelineData.staleCount || 0);
        }

        const broadcastsRes = await fetch("/api/admin/broadcasts?limit=5");
        if (broadcastsRes.ok) {
          const broadcastsData = await broadcastsRes.json();
          setRecentBroadcasts(broadcastsData.broadcasts || []);
        }

        await loadIntelSummary();
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  const handleRecompute = async () => {
    setIsRecomputing(true);
    try {
      const res = await fetch("/api/admin/intelligence/recompute", {
        method: "POST"
      });
      if (res.ok) {
        const resultData = await res.json();
        alert(resultData.message || "Successfully recomputed scores!");
        await loadIntelSummary();
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`Failed to recompute: ${errorData.error || "Unknown error"}`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Error recomputing: ${err.message || "Request failed"}`);
    } finally {
      setIsRecomputing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 flex-grow flex flex-col justify-center items-center py-20 animate-pulse">
        <div className="h-8 bg-[#EBE7F5] w-64 rounded-full" />
        <div className="h-28 bg-[#EBE7F5] w-full rounded-2xl" />
        <div className="grid grid-cols-4 gap-6 w-full">
          {[1,2,3,4].map(i => <div key={i} className="h-28 bg-[#EBE7F5] rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-md mx-auto my-20 crm-card text-center space-y-4">
        <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="font-display text-xl font-bold text-[#1A1A2E]">Error Loading Dashboard</h2>
        <p className="text-xs text-[#8A8A9E]">Please check database connection settings.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 flex-grow animate-fade-in w-full">
      {/* Welcome Executive Card */}
      <div className="crm-card bg-white text-black p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 z-10 relative">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#5B4FE0] animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest block text-black">LoopAI Executive Console</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-black tracking-tight">
            Real Estate Analytics & Growth Hub
          </h1>
          <p className="text-xs sm:text-sm text-black max-w-2xl leading-relaxed font-medium">
            Real-time pipeline data and intelligent corridor forecasts for Hyderabad as of {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 shrink-0 z-10 relative">
          <Link href="/admin/leads" className="crm-btn-secondary text-xs px-5 py-2.5 flex items-center gap-2">
            <User className="w-4 h-4 text-[#5B4FE0]" /> Manage Clients
          </Link>
          <Link href="/admin/broadcasts/new" className="crm-btn-primary text-xs px-5 py-2.5 flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> Launch Campaign
          </Link>
        </div>
      </div>

      {/* Stale Leads Warning Pill */}
      {staleCount > 0 && (
        <div className="bg-rose-50 border border-rose-200/60 p-4 rounded-2xl text-xs text-rose-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
            <div>
              <span className="font-bold uppercase tracking-wider block text-[10px] text-rose-600 mb-0.5">Pipeline Alert</span>
              There are <strong>{staleCount} client roadmaps</strong> stuck in progress for &gt; 7 days.
            </div>
          </div>
          <Link 
            href="/admin/pipeline" 
            className="crm-btn-primary bg-rose-600 text-white text-[11px] font-bold px-4 py-2 shrink-0 self-start sm:self-auto"
          >
            Review Pipeline →
          </Link>
        </div>
      )}

      {/* 1. LoopAI KPI Cards (Hero Numerals, Soft Two-Tone Gradient Bars, Pill Badges) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI Card 1 */}
        <div className="crm-card p-6 flex flex-col justify-between space-y-4 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#8A8A9E]">Captured Clients</span>
            <span className="badge bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full">+4.2%</span>
          </div>

          <div className="space-y-1">
            <div className="text-4xl font-display font-bold text-[#1A1A2E] tracking-tight">{data.kpis.totalLeads}</div>
            <div className="text-xs text-[#8A8A9E]">Active inquiries logged</div>
          </div>

          {/* Two-Tone Soft Gradient Fill Bar */}
          <div className="w-full h-2 rounded-full bg-[#F0EEFA] overflow-hidden">
            <div className="h-full rounded-full crm-gradient-peach-mint w-[75%]" />
          </div>
        </div>

        {/* KPI Card 2 */}
        <div className="crm-card p-6 flex flex-col justify-between space-y-4 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#8A8A9E]">New Leads (7 Days)</span>
            <span className="badge bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">High Priority</span>
          </div>

          <div className="space-y-1">
            <div className="text-4xl font-display font-bold text-[#5B4FE0] tracking-tight">{data.kpis.newLeads7Days}</div>
            <div className="text-xs text-[#8A8A9E]">Requires initial outreach</div>
          </div>

          {/* Two-Tone Soft Gradient Fill Bar */}
          <div className="w-full h-2 rounded-full bg-[#F0EEFA] overflow-hidden">
            <div className="h-full rounded-full crm-gradient-purple-lavender w-[60%]" />
          </div>
        </div>

        {/* KPI Card 3 */}
        <div className="crm-card p-6 flex flex-col justify-between space-y-4 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#8A8A9E]">Active Projects</span>
            <span className="badge bg-blue-100 text-blue-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full">8 Corridors</span>
          </div>

          <div className="space-y-1">
            <div className="text-4xl font-display font-bold text-[#1A1A2E] tracking-tight">{data.kpis.activeProjects}</div>
            <div className="text-xs text-[#8A8A9E]">Mapped inventory units</div>
          </div>

          {/* Two-Tone Soft Gradient Fill Bar */}
          <div className="w-full h-2 rounded-full bg-[#F0EEFA] overflow-hidden">
            <div className="h-full rounded-full crm-gradient-blue-cyan w-[85%]" />
          </div>
        </div>

        {/* KPI Card 4 */}
        <div className="crm-card p-6 flex flex-col justify-between space-y-4 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#8A8A9E]">Conversion Rate</span>
            <span className="badge bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full">Optimized</span>
          </div>

          <div className="space-y-1">
            <div className="text-4xl font-display font-bold text-emerald-600 tracking-tight">{data.kpis.conversionRate}%</div>
            <div className="text-xs text-[#8A8A9E]">Qualified pipeline funnel</div>
          </div>

          {/* Two-Tone Soft Gradient Fill Bar */}
          <div className="w-full h-2 rounded-full bg-[#F0EEFA] overflow-hidden">
            <div className="h-full rounded-full crm-gradient-peach-mint w-[90%]" />
          </div>
        </div>
      </div>

      {/* Inbound Activity Live Feed Widget */}
      <InboundActivityWidget />

      {/* 2 & 4. Hot Leads & Broadcasts Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Hot Leads Section Card */}
        <div className="crm-card p-6 sm:p-7 flex flex-col justify-between space-y-6">
          <div className="space-y-5">
            {/* Clean Section Header with Chevron */}
            <div className="flex items-center justify-between pb-3 border-b border-[#F5F3FB]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center font-bold shrink-0">
                  <Flame className="w-5 h-5 fill-rose-500" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-[#1A1A2E]">
                    Hot Client Leads
                  </h3>
                  <p className="text-xs text-[#8A8A9E]">
                    Grade-A priority leads requiring immediate callback
                  </p>
                </div>
              </div>
              <Link
                href="/admin/leads"
                className="crm-btn-ghost text-xs font-bold text-[#5B4FE0] flex items-center gap-1"
              >
                All Clients <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {/* 3. Empty State: Intentional, Clean */}
            {data.hotLeads && data.hotLeads.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="crm-table text-xs">
                  <thead>
                    <tr>
                      <th>Client Name</th>
                      <th>Buyer Persona</th>
                      <th>Status</th>
                      <th className="text-right">Score</th>
                      <th className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.hotLeads.map((lead: any) => (
                      <tr key={lead.id}>
                        <td className="font-bold text-[#1A1A2E]">
                          <Link href={`/admin/leads?id=${lead.id}`} className="hover:text-[#5B4FE0] flex items-center gap-2">
                            <div className="crm-avatar-ring">
                              <div className="w-7 h-7 rounded-full bg-[#EBE7F5] flex items-center justify-center text-[#5B4FE0] font-bold text-[10px]">
                                {lead.name.charAt(0)}
                              </div>
                            </div>
                            {lead.name}
                          </Link>
                        </td>
                        <td>
                          <span className="badge bg-[#F4F0FF] text-[#5B4FE0] text-[10px] font-semibold">
                            {lead.persona ? lead.persona.replace(/_/g, " ") : "Unsegmented"}
                          </span>
                        </td>
                        <td>
                          <span className="badge bg-[#EBE7F5] text-[#1A1A2E] text-[10px] font-semibold">
                            {lead.status}
                          </span>
                        </td>
                        <td className="text-right font-bold text-emerald-600">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold">
                            {lead.leadScore} pts
                          </span>
                        </td>
                        <td className="text-right">
                          <a
                            href={`tel:${lead.phone}`}
                            className="crm-btn-primary px-3 py-1 text-[11px] font-bold inline-flex items-center gap-1"
                          >
                            <Phone className="w-3 h-3" /> Call
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-10 px-4 text-center flex flex-col items-center justify-center space-y-3 bg-[#F9F8FD] rounded-2xl">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="font-display font-bold text-sm text-[#1A1A2E]">All Caught Up!</h4>
                <p className="text-xs text-[#8A8A9E] max-w-xs leading-relaxed">
                  No Grade-A hot leads require immediate callback right now.
                </p>
              </div>
            )}

            {/* LoopAI Insight Callout Box */}
            <div className="crm-insight-box">
              <Sparkles className="w-4 h-4 text-[#5B4FE0] shrink-0 mt-0.5" />
              <span>Fast initial responses within 30 minutes build trust and boost conversion rates by 4x.</span>
            </div>
          </div>
        </div>

        {/* 4. Campaign Table (Right Section) */}
        <div className="crm-card p-6 sm:p-7 flex flex-col justify-between space-y-6">
          <div className="space-y-5">
            {/* Clean Section Header with Chevron */}
            <div className="flex items-center justify-between pb-3 border-b border-[#F5F3FB]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#F4F0FF] text-[#5B4FE0] flex items-center justify-center font-bold shrink-0">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-[#1A1A2E]">
                    Broadcast Campaigns
                  </h3>
                  <p className="text-xs text-[#8A8A9E]">
                    Recent bulk campaign dispatches & delivery performance
                  </p>
                </div>
              </div>
              <Link
                href="/admin/broadcasts"
                className="crm-btn-ghost text-xs font-bold text-[#5B4FE0] flex items-center gap-1"
              >
                All Campaigns <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {recentBroadcasts && recentBroadcasts.length > 0 ? (
              <div className="overflow-x-auto w-full">
                <table className="crm-table text-xs w-full">
                  <thead>
                    <tr>
                      <th className="whitespace-nowrap px-3 py-3">Campaign</th>
                      <th className="whitespace-nowrap px-3 py-3">Channel</th>
                      <th className="whitespace-nowrap px-3 py-3">Recipients</th>
                      <th className="text-right whitespace-nowrap px-3 py-3">Performance</th>
                      <th className="text-right whitespace-nowrap px-3 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentBroadcasts.map((b: any) => (
                      <tr key={b.id}>
                        <td className="font-bold text-[#1A1A2E] whitespace-nowrap px-3 py-3">
                          <Link href={`/admin/broadcasts/history/${b.id}`} className="hover:text-[#5B4FE0]">
                            {b.name}
                          </Link>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3">
                          <span className={`badge text-[10px] font-bold px-2.5 py-0.5 rounded-full ${b.channel === 'WHATSAPP' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>
                            {b.channel}
                          </span>
                        </td>
                        <td className="font-medium text-[#8A8A9E] whitespace-nowrap px-3 py-3">
                          {b.recipientCount} leads
                        </td>
                        <td className="text-right text-xs font-semibold whitespace-nowrap px-3 py-3">
                          {b.channel !== "EMAIL" && (
                            <span className="text-[#1A1A2E]">WA Deliv: <strong className="text-[#5B4FE0]">{b.stats.waDeliveredRate}%</strong></span>
                          )}
                          {b.channel !== "WHATSAPP" && (
                            <span className="text-[#1A1A2E]">Open: <strong className="text-[#5B4FE0]">{b.stats.emailOpenRate}%</strong></span>
                          )}
                        </td>
                        <td className="text-right whitespace-nowrap px-3 py-3">
                          <span className={`badge text-[10px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap ${
                            b.status === "SENT" ? "bg-emerald-100 text-emerald-800" :
                            b.status === "SENDING" ? "bg-amber-100 text-amber-800" :
                            b.status === "FAILED" ? "bg-rose-100 text-rose-800" :
                            "bg-slate-100 text-slate-700"
                          }`}>
                            {b.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-10 px-4 text-center flex flex-col items-center justify-center space-y-3 bg-[#F9F8FD] rounded-2xl">
                <div className="w-12 h-12 rounded-full bg-[#F4F0FF] text-[#5B4FE0] flex items-center justify-center">
                  <Megaphone className="w-6 h-6" />
                </div>
                <h4 className="font-display font-bold text-sm text-[#1A1A2E]">No Active Broadcasts</h4>
                <p className="text-xs text-[#8A8A9E] max-w-xs leading-relaxed">
                  Launch multi-channel email or WhatsApp marketing campaigns.
                </p>
                <Link href="/admin/broadcasts/new" className="crm-btn-primary text-xs font-bold px-4 py-2 mt-2">
                  <Sparkles className="w-3.5 h-3.5" /> Launch First Campaign
                </Link>
              </div>
            )}

            {/* LoopAI Insight Callout Box */}
            <div className="crm-insight-box">
              <Sparkles className="w-4 h-4 text-[#5B4FE0] shrink-0 mt-0.5" />
              <span>WhatsApp broadcasts deliver 98% open rates compared to traditional email campaigns.</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Market Intelligence Section (Big Card): Dashboard inside a Dashboard */}
      {intelSummary && (
        <div className="crm-card p-6 sm:p-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#F5F3FB]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center font-bold shrink-0">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-[#1A1A2E]">
                  AI Corridor Intelligence Console
                </h3>
                <p className="text-xs text-[#8A8A9E]">
                  Infrastructure tracking, predictive pricing models, and automated corridor scores
                </p>
              </div>
            </div>
            <Link
              href="/admin/infrastructure/intelligence"
              className="crm-btn-secondary text-xs font-bold px-4 py-2 shrink-0 self-start sm:self-auto"
            >
              Intelligence Console <ChevronRight className="w-4 h-4 text-[#5B4FE0]" />
            </Link>
          </div>

          {/* 3 Mini Dashboard Cards with Soft Two-Tone Gradient Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* Mini Card 1 */}
            <div className="bg-[#F9F8FD] p-5 rounded-2xl flex flex-col justify-between space-y-3 hover:bg-[#F4F0FF] transition-colors">
              <span className="text-[10px] text-[#8A8A9E] uppercase font-bold tracking-wider block">Tracked Infrastructure Projects</span>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-display font-bold text-[#1A1A2E]">{intelSummary.projectCount}</span>
                <Link
                  href="/admin/infrastructure/projects"
                  className="crm-btn-ghost text-xs text-[#5B4FE0] font-bold px-2 py-1"
                >
                  Manage →
                </Link>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[#EBE7F5] overflow-hidden">
                <div className="h-full rounded-full crm-gradient-blue-cyan w-[80%]" />
              </div>
            </div>

            {/* Mini Card 2 */}
            <div className="bg-[#F9F8FD] p-5 rounded-2xl flex flex-col justify-between space-y-3 hover:bg-[#F4F0FF] transition-colors">
              <span className="text-[10px] text-[#8A8A9E] uppercase font-bold tracking-wider block">Leading Growth Corridor</span>
              <div>
                <span className="text-base font-bold text-[#1A1A2E] block truncate font-display">{intelSummary.highestScoreCorridor}</span>
                <span className="badge bg-emerald-100 text-emerald-800 text-[10px] mt-1 font-bold">
                  Score: {intelSummary.highestScore}/100
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[#EBE7F5] overflow-hidden">
                <div className="h-full rounded-full crm-gradient-peach-mint w-[95%]" />
              </div>
            </div>

            {/* Mini Card 3 */}
            <div className="bg-[#F9F8FD] p-5 rounded-2xl flex flex-col justify-between space-y-3 hover:bg-[#F4F0FF] transition-colors">
              <span className="text-[10px] text-[#8A8A9E] uppercase font-bold tracking-wider block">Bullish Zones</span>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {intelSummary.bullishCorridors.length > 0 ? (
                  intelSummary.bullishCorridors.map((c, idx) => (
                    <span key={idx} className="badge bg-purple-100 text-purple-800 text-[10px] font-semibold uppercase">
                      {c}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-[#8A8A9E] italic">None</span>
                )}
              </div>
              <div className="w-full h-1.5 rounded-full bg-[#EBE7F5] overflow-hidden">
                <div className="h-full rounded-full crm-gradient-purple-lavender w-[85%]" />
              </div>
            </div>
          </div>

          {/* Recompute Footer */}
          <div className="flex flex-col sm:flex-row justify-between items-center pt-4 border-t border-[#F5F3FB] gap-4 text-xs">
            <span className="text-[#8A8A9E] font-medium">
              Last Intelligence Recomputation: <strong className="text-[#1A1A2E] font-bold">{intelSummary.lastComputed ? new Date(intelSummary.lastComputed).toLocaleString('en-IN') : "Never"}</strong>
            </span>
            <button
              onClick={handleRecompute}
              disabled={isRecomputing}
              className="crm-btn-primary text-xs px-5 py-2.5"
            >
              <RefreshCw className={`w-4 h-4 ${isRecomputing ? "animate-spin" : ""}`} />
              {isRecomputing ? "Recomputing Engine..." : "Recompute Intelligence ⚡"}
            </button>
          </div>
        </div>
      )}

      {/* 7. Airy & Structured Charts Grid (Pure White Cards, No Borders) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Leads by Status Donut */}
        <div className="crm-card p-6 sm:p-7 flex flex-col justify-between space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#F5F3FB]">
            <div>
              <h3 className="font-display font-bold text-base text-[#1A1A2E]">
                Leads By Pipeline Status
              </h3>
              <p className="text-xs text-[#8A8A9E]">Distribution across CRM stage funnel</p>
            </div>
            <ChevronRight className="w-4 h-4 text-[#8A8A9E]" />
          </div>
          <LeadsByStatus data={data.leadsByStatus} />
        </div>

        {/* Budget Distribution */}
        <div className="crm-card p-6 sm:p-7 flex flex-col justify-between space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#F5F3FB]">
            <div>
              <h3 className="font-display font-bold text-base text-[#1A1A2E]">
                Leads Budget Range Distribution
              </h3>
              <p className="text-xs text-[#8A8A9E]">Capital allocation brackets across inquiries</p>
            </div>
            <ChevronRight className="w-4 h-4 text-[#8A8A9E]" />
          </div>
          <BudgetDistribution data={data.budgetDistribution} />
        </div>

        {/* Corridor Heatmap */}
        <div className="crm-card p-6 sm:p-7 flex flex-col justify-between space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#F5F3FB]">
            <div>
              <h3 className="font-display font-bold text-base text-[#1A1A2E]">
                Top Searched Corridors
              </h3>
              <p className="text-xs text-[#8A8A9E]">AI recommendation and inquiry heatmap</p>
            </div>
            <ChevronRight className="w-4 h-4 text-[#8A8A9E]" />
          </div>
          <CorridorHeatmap data={data.corridorPopularity} />
        </div>

        {/* Conversion Funnel */}
        <div className="crm-card p-6 sm:p-7 flex flex-col justify-between space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#F5F3FB]">
            <div>
              <h3 className="font-display font-bold text-base text-[#1A1A2E]">
                Leads Conversion Pipeline Funnel
              </h3>
              <p className="text-xs text-[#8A8A9E]">Conversion rates across customer roadmap</p>
            </div>
            <ChevronRight className="w-4 h-4 text-[#8A8A9E]" />
          </div>
          <ConversionFunnel data={data.conversionFunnel} />
        </div>

        {/* Weekly Lead Volume (12 weeks Line Chart) */}
        <div className="crm-card p-6 sm:p-7 lg:col-span-2 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#F5F3FB]">
            <div>
              <h3 className="font-display font-bold text-base text-[#1A1A2E]">
                Weekly Client Inbound Volume (Last 12 Weeks)
              </h3>
              <p className="text-xs text-[#8A8A9E]">Inbound lead capture velocity trend</p>
            </div>
            <ChevronRight className="w-4 h-4 text-[#8A8A9E]" />
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data.weeklyLeadVolume}
                margin={{ top: 15, right: 20, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0EDFA" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 10, fill: "#8A8A9E" }}
                  axisLine={{ stroke: "#F0EDFA" }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: "#8A8A9E" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#FFFFFF",
                    border: "none",
                    borderRadius: "14px",
                    fontFamily: "Inter",
                    boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#5B4FE0" 
                  strokeWidth={3}
                  activeDot={{ r: 7, fill: "#5B4FE0" }} 
                  dot={{ stroke: "#7C6EF5", strokeWidth: 2, fill: "#FFFFFF" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
