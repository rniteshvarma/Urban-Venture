"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import LeadsByStatus from "@/components/admin/charts/LeadsByStatus";
import BudgetDistribution from "@/components/admin/charts/BudgetDistribution";
import CorridorHeatmap from "@/components/admin/charts/CorridorHeatmap";
import ConversionFunnel from "@/components/admin/charts/ConversionFunnel";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { Flame, Phone, ArrowRight, User, Megaphone } from "lucide-react";

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

        const broadcastsRes = await fetch("/api/admin/broadcasts?limit=3");
        if (broadcastsRes.ok) {
          const broadcastsData = await broadcastsRes.json();
          setRecentBroadcasts(broadcastsData.broadcasts || []);
        }
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex-grow flex flex-col justify-center items-center py-20 bg-luxury-bg animate-pulse space-y-4">
        <div className="h-8 bg-luxury-border w-48 rounded" />
        <div className="h-24 bg-luxury-border w-full max-w-4xl rounded" />
        <div className="h-64 bg-luxury-border w-full max-w-4xl rounded" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex-grow flex flex-col justify-center items-center py-20 text-center">
        <span className="text-3xl">⚠️</span>
        <h2 className="font-display text-xl font-bold text-primary mt-2">Error Loading Dashboard</h2>
        <p className="text-xs text-text-secondary">Please check your database connectivity.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 flex-grow">
      {/* Header */}
      <div>
        <span className="text-[10px] text-accent font-bold uppercase tracking-widest block">Executive Console</span>
        <h1 className="font-display text-2xl sm:text-4xl font-bold text-primary">
          CRM Analytics Overview
        </h1>
      </div>

      {/* Stale Leads Alert */}
      {staleCount > 0 && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-card text-xs text-red-700 flex items-center justify-between gap-3 animate-slide-in">
          <div className="flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <span className="font-bold uppercase tracking-wider block text-[10px] mb-0.5">Stale Leads Warning</span>
              There are {staleCount} client closure roadmaps currently marked as stale (stuck in progress for &gt; 7 days).
            </div>
          </div>
          <Link 
            href="/admin/pipeline" 
            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] uppercase font-bold tracking-wider transition-colors shrink-0"
          >
            Review Pipeline
          </Link>
        </div>
      )}

      {/* KPI Blocks Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-surface border border-luxury p-5 rounded-card shadow-sm">
          <span className="text-[10px] text-text-secondary uppercase tracking-wider block mb-1">Total Capture Leads</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-primary">{data.kpis.totalLeads}</span>
            <span className="text-xs text-green-600 font-semibold">MoM Growth Active</span>
          </div>
        </div>

        <div className="bg-surface border border-luxury p-5 rounded-card shadow-sm">
          <span className="text-[10px] text-text-secondary uppercase tracking-wider block mb-1">New Leads (Last 7 Days)</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-accent font-display">{data.kpis.newLeads7Days}</span>
            <span className="text-[10px] text-text-secondary">Needs Followup</span>
          </div>
        </div>

        <div className="bg-surface border border-luxury p-5 rounded-card shadow-sm">
          <span className="text-[10px] text-text-secondary uppercase tracking-wider block mb-1">Active Projects</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-primary">{data.kpis.activeProjects}</span>
            <span className="text-[10px] text-text-secondary">Mapped Corridors</span>
          </div>
        </div>

        <div className="bg-surface border border-luxury p-5 rounded-card shadow-sm">
          <span className="text-[10px] text-text-secondary uppercase tracking-wider block mb-1">Lead Conversion Rate</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-primary">{data.kpis.conversionRate}%</span>
            <span className="text-xs text-accent font-semibold uppercase tracking-wider">Converted Status</span>
          </div>
        </div>
      </div>

      {/* Hot Leads & Broadcasts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hot Leads Today */}
        <div className="bg-surface border border-luxury p-5 sm:p-6 rounded-card shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-luxury pb-3">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-red-500 fill-red-500 animate-pulse" />
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                    🔥 Hot Leads Today
                  </h3>
                  <p className="text-[10px] text-text-secondary">
                    Top 5 active leads with Grade-A score (&gt;75) requiring immediate attention
                  </p>
                </div>
              </div>
              <Link
                href="/admin/leads"
                className="text-[10px] uppercase font-bold tracking-wider text-accent hover:underline flex items-center gap-1"
              >
                All Leads <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {data.hotLeads && data.hotLeads.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-luxury text-text-secondary font-semibold uppercase tracking-wider text-[10px]">
                      <th className="py-2 pb-3">Name</th>
                      <th className="py-2 pb-3">Buyer Persona</th>
                      <th className="py-2 pb-3">Status</th>
                      <th className="py-2 pb-3 text-right">Score</th>
                      <th className="py-2 pb-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-luxury">
                    {data.hotLeads.map((lead: any) => (
                      <tr key={lead.id} className="hover:bg-luxury-bg/50 transition-colors">
                        <td className="py-3 font-semibold text-primary">
                          <Link href={`/admin/leads?id=${lead.id}`} className="hover:underline flex items-center gap-2">
                            <User className="w-3.5 h-3.5 text-text-secondary" />
                            {lead.name}
                          </Link>
                        </td>
                        <td className="py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            {lead.persona ? lead.persona.replace(/_/g, " ") : "Not Segmented"}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                            {lead.status}
                          </span>
                        </td>
                        <td className="py-3 text-right font-bold text-green-600">
                          <span className="px-2 py-0.5 rounded bg-green-50 border border-green-200">
                            {lead.leadScore} pts
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <a
                            href={`tel:${lead.phone}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#2563EB] hover:bg-blue-700 text-white font-bold uppercase tracking-wider rounded text-[10px] transition-colors shadow-sm"
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
              <div className="py-8 text-center text-text-secondary text-xs">
                 No Grade-A hot leads found today. All caught up!
              </div>
            )}
          </div>
        </div>

        {/* Campaign Broadcasts Overview */}
        <div className="bg-surface border border-luxury p-5 sm:p-6 rounded-card shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-luxury pb-3">
              <div className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                    📣 Broadcast Campaigns Overview
                  </h3>
                  <p className="text-[10px] text-text-secondary">
                    Recent bulk campaign dispatches and delivery performance
                  </p>
                </div>
              </div>
              <Link
                href="/admin/broadcasts"
                className="text-[10px] uppercase font-bold tracking-wider text-accent hover:underline flex items-center gap-1"
              >
                All Campaigns <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {recentBroadcasts && recentBroadcasts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-luxury text-text-secondary font-semibold uppercase tracking-wider text-[10px]">
                      <th className="py-2 pb-3">Campaign Name</th>
                      <th className="py-2 pb-3">Channel</th>
                      <th className="py-2 pb-3">Recipients</th>
                      <th className="py-2 pb-3 text-right">Performance</th>
                      <th className="py-2 pb-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-luxury">
                    {recentBroadcasts.map((b: any) => (
                      <tr key={b.id} className="hover:bg-luxury-bg/50 transition-colors">
                        <td className="py-3 font-semibold text-primary">
                          <Link href={`/admin/broadcasts/history/${b.id}`} className="hover:underline">
                            {b.name}
                          </Link>
                        </td>
                        <td className="py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                            {b.channel}
                          </span>
                        </td>
                        <td className="py-3 font-medium text-slate-600">
                          {b.recipientCount} leads
                        </td>
                        <td className="py-3 text-right text-[10px] text-slate-500 font-medium">
                          {b.channel !== "EMAIL" && (
                            <div>WA Deliv: <strong className="text-slate-800">{b.stats.waDeliveredRate}%</strong></div>
                          )}
                          {b.channel !== "WHATSAPP" && (
                            <div>Email Open: <strong className="text-slate-800">{b.stats.emailOpenRate}%</strong></div>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                            b.status === "SENT" ? "bg-green-50 text-green-700 border border-green-200" :
                            b.status === "SENDING" ? "bg-blue-50 text-blue-700 border border-blue-200" :
                            b.status === "FAILED" ? "bg-red-50 text-red-700 border border-red-200" :
                            "bg-slate-50 text-slate-500 border border-slate-200"
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
              <div className="py-8 text-center text-text-secondary text-xs">
                No recent broadcast campaigns found.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Leads by Status Donut */}
        <div className="bg-surface border border-luxury p-5 sm:p-6 rounded-card shadow-sm flex flex-col justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-4 border-b border-luxury pb-2">
            Leads By Pipeline Status
          </h3>
          <LeadsByStatus data={data.leadsByStatus} />
        </div>

        {/* Budget Distribution */}
        <div className="bg-surface border border-luxury p-5 sm:p-6 rounded-card shadow-sm flex flex-col justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-4 border-b border-luxury pb-2">
            Leads Budget Range Distribution
          </h3>
          <BudgetDistribution data={data.budgetDistribution} />
        </div>

        {/* Corridor Heatmap */}
        <div className="bg-surface border border-luxury p-5 sm:p-6 rounded-card shadow-sm flex flex-col justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-4 border-b border-luxury pb-2">
            Top Searched Corridors (AI Recommendation Heatmap)
          </h3>
          <CorridorHeatmap data={data.corridorPopularity} />
        </div>

        {/* Conversion Funnel */}
        <div className="bg-surface border border-luxury p-5 sm:p-6 rounded-card shadow-sm flex flex-col justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-4 border-b border-luxury pb-2">
            Leads Conversion Pipeline Funnel
          </h3>
          <ConversionFunnel data={data.conversionFunnel} />
        </div>

        {/* Weekly Lead Volume (12 weeks Line Chart) */}
        <div className="bg-surface border border-luxury p-5 sm:p-6 rounded-card shadow-sm lg:col-span-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-4 border-b border-luxury pb-2">
            Weekly Lead Intake Volume (Last 12 Weeks)
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data.weeklyLeadVolume}
                margin={{ top: 15, right: 20, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E4DC" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 10, fill: "#6B6B6B" }}
                  axisLine={{ stroke: "#E8E4DC" }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: "#6B6B6B" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #E8E4DC",
                    borderRadius: "6px",
                    fontFamily: "DM Sans",
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#0F1F3D" 
                  strokeWidth={2}
                  activeDot={{ r: 6 }} 
                  dot={{ stroke: "#C9A84C", strokeWidth: 2, fill: "#FFFFFF" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
