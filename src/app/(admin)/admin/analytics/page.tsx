"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect } from "react";
import BudgetDistribution from "@/components/admin/charts/BudgetDistribution";
import CorridorHeatmap from "@/components/admin/charts/CorridorHeatmap";
import ConversionFunnel from "@/components/admin/charts/ConversionFunnel";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LineChart, Line, AreaChart, Area } from "recharts";
import { BarChart3, TrendingUp, ChevronRight } from "lucide-react";

interface AnalyticsData {
  leadsByStatus: any[];
  budgetDistribution: any[];
  leadsByCity: any[];
  horizonDistribution: any[];
  corridorPopularity: any[];
  conversionFunnel: any[];
  personaDistribution?: any[];
  scoreGradeDistribution?: any[];
}

interface PipelineAnalyticsData {
  totalLeads: number;
  funnelData: { stage: string; count: number; activeCount: number }[];
  velocityData: { stage: string; avgDays: number }[];
  agentPerformance: {
    name: string;
    totalLeads: number;
    activeLeads: number;
    convertedLeads: number;
    conversionRate: number;
    totalValueLakhs: number;
  }[];
  weeklyData: { week: string; count: number; valueLakhs: number }[];
}

export default function AdminAnalyticsPage() {
  const [activeTab, setActiveTab] = useState<"market" | "pipeline">("market");
  
  // Market Analytics state
  const [marketData, setMarketData] = useState<AnalyticsData | null>(null);
  const [isLoadingMarket, setIsLoadingMarket] = useState(true);

  // Pipeline Analytics state
  const [pipelineData, setPipelineData] = useState<PipelineAnalyticsData | null>(null);
  const [isLoadingPipeline, setIsLoadingPipeline] = useState(false);

  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsHydrated(true);
    async function loadMarketAnalytics() {
      try {
        const res = await fetch("/api/admin/analytics");
        if (res.ok) {
          const analytics = await res.json();
          setMarketData(analytics);
        }
      } catch (err) {
        console.error("Failed to load market analytics data", err);
      } finally {
        setIsLoadingMarket(false);
      }
    }
    loadMarketAnalytics();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (activeTab === "pipeline" && !pipelineData) {
      async function loadPipelineAnalytics() {
        setIsLoadingPipeline(true);
        try {
          const res = await fetch("/api/admin/analytics/pipeline");
          if (res.ok) {
            const data = await res.json();
            setPipelineData(data);
          }
        } catch (err) {
          console.error("Failed to load pipeline analytics data", err);
        } finally {
          setIsLoadingPipeline(false);
        }
      }
      loadPipelineAnalytics();
    }
  }, [activeTab, pipelineData]);

  const formatPrice = (val: number) => {
    return val < 100 ? `₹${val}L` : `₹${(val / 100).toFixed(1)}Cr`;
  };

  const isMarketLoading = isLoadingMarket;
  const isPipelineLoading = isLoadingPipeline;

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 flex-grow flex flex-col animate-fade-in text-[#1A1A2E] w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#F0EDFA]">
        <div>
          <span className="text-[11px] text-[#5B4FE0] font-bold uppercase tracking-widest block mb-1">
            Market Intelligence & Sales Velocity
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#1A1A2E]">CRM Analytics</h1>
        </div>
      </div>

      {/* Pill tabs */}
      <div className="flex items-center gap-3">
        <div className="crm-pill-nav">
          <button
            onClick={() => setActiveTab("market")}
            className={activeTab === "market" ? "crm-pill-tab crm-pill-tab-active" : "crm-pill-tab"}
          >
            <BarChart3 size={14} className="inline mr-1.5" /> Market Intelligence
          </button>
          
          <button
            onClick={() => setActiveTab("pipeline")}
            className={activeTab === "pipeline" ? "crm-pill-tab crm-pill-tab-active" : "crm-pill-tab"}
          >
            <TrendingUp size={14} className="inline mr-1.5" /> Sales Pipeline Closure
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      <div className="flex-grow">
        {activeTab === "market" ? (
          <div>
            {isMarketLoading ? (
              <div className="flex justify-center items-center py-20 bg-white rounded-2xl animate-pulse">
                <span className="text-xs text-[#8A8A9E]">Loading market intelligence metrics...</span>
              </div>
            ) : !marketData ? (
              <div className="flex flex-col justify-center items-center py-20 text-center">
                <span className="text-3xl">⚠️</span>
                <h2 className="font-display text-xl font-bold text-[#1A1A2E] mt-2">Error Loading Analytics</h2>
                <p className="text-xs text-[#8A8A9E]">Please check DB configurations.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-slide-in">
                {/* Corridor Heatmap Analysis */}
                <div className="crm-card p-6 sm:p-7 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#F5F3FB]">
                    <div>
                      <h3 className="font-display text-base font-bold text-[#1A1A2E]">Corridor Popularity Heatmap</h3>
                      <p className="text-xs text-[#8A8A9E]">Distribution of corridors recommended by the AI engine</p>
                    </div>
                    <ChevronRight size={16} className="text-[#8A8A9E]" />
                  </div>
                  <CorridorHeatmap data={marketData.corridorPopularity} />
                </div>

                {/* Budget distribution Histogram */}
                <div className="crm-card p-6 sm:p-7 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#F5F3FB]">
                    <div>
                      <h3 className="font-display text-base font-bold text-[#1A1A2E]">Lead Budget Distribution Histogram</h3>
                      <p className="text-xs text-[#8A8A9E]">Aggregated budget preferences of captured leads</p>
                    </div>
                    <ChevronRight size={16} className="text-[#8A8A9E]" />
                  </div>
                  <BudgetDistribution data={marketData.budgetDistribution} />
                </div>

                {/* Horizon Distribution Chart */}
                <div className="crm-card p-6 sm:p-7 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#F5F3FB]">
                    <div>
                      <h3 className="font-display text-base font-bold text-[#1A1A2E]">Preferred Investment Horizons</h3>
                      <p className="text-xs text-[#8A8A9E]">Holding period intentions across inquiries</p>
                    </div>
                    <ChevronRight size={16} className="text-[#8A8A9E]" />
                  </div>
                  <div className="h-64 w-full pt-2">
                    {isHydrated && (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={marketData.horizonDistribution} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0EDFA" />
                          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#8A8A9E" }} tickLine={false} axisLine={{ stroke: "#F0EDFA" }} />
                          <YAxis tick={{ fontSize: 10, fill: "#8A8A9E" }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{ backgroundColor: "#FFFFFF", border: "none", borderRadius: "14px", fontFamily: "Inter", boxShadow: "0 8px 30px rgba(0,0,0,0.08)" }} />
                          <Bar dataKey="value" fill="#5B4FE0" radius={[6, 6, 0, 0]} barSize={28}>
                            {marketData.horizonDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={index % 2 === 0 ? "#5B4FE0" : "#7C6EF5"} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Conversion Funnel */}
                <div className="crm-card p-6 sm:p-7 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#F5F3FB]">
                    <div>
                      <h3 className="font-display text-base font-bold text-[#1A1A2E]">Conversion Funnel Analytics</h3>
                      <p className="text-xs text-[#8A8A9E]">Conversion stages from search to CRM deal closure</p>
                    </div>
                    <ChevronRight size={16} className="text-[#8A8A9E]" />
                  </div>
                  <ConversionFunnel data={marketData.conversionFunnel} />
                </div>

                {/* AI Buyer Persona Segment Split */}
                <div className="crm-card p-6 sm:p-7 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#F5F3FB]">
                    <div>
                      <h3 className="font-display text-base font-bold text-[#1A1A2E]">AI Buyer Persona Distribution</h3>
                      <p className="text-xs text-[#8A8A9E]">Proportional split of leads into AI-classified buyer personas</p>
                    </div>
                    <ChevronRight size={16} className="text-[#8A8A9E]" />
                  </div>
                  <div className="h-64 w-full pt-2">
                    {isHydrated && marketData.personaDistribution && (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={marketData.personaDistribution} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0EDFA" />
                          <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#8A8A9E" }} interval={0} angle={-10} dx={-2} dy={2} tickLine={false} axisLine={{ stroke: "#F0EDFA" }} />
                          <YAxis tick={{ fontSize: 10, fill: "#8A8A9E" }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{ backgroundColor: "#FFFFFF", border: "none", borderRadius: "14px", fontFamily: "Inter", boxShadow: "0 8px 30px rgba(0,0,0,0.08)" }} />
                          <Bar dataKey="value" fill="#5B4FE0" radius={[6, 6, 0, 0]} barSize={28} name="Leads">
                            {marketData.personaDistribution.map((entry, index) => {
                              const colors = ["#7C6EF5", "#5B4FE0", "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6"];
                              return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                            })}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Predictive Lead Score Grade Split */}
                <div className="crm-card p-6 sm:p-7 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#F5F3FB]">
                    <div>
                      <h3 className="font-display text-base font-bold text-[#1A1A2E]">Predictive Lead Score Grades</h3>
                      <p className="text-xs text-[#8A8A9E]">Lead grouping by predictive conversion score grades</p>
                    </div>
                    <ChevronRight size={16} className="text-[#8A8A9E]" />
                  </div>
                  <div className="h-64 w-full pt-2">
                    {isHydrated && marketData.scoreGradeDistribution && (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={marketData.scoreGradeDistribution} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0EDFA" />
                          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#8A8A9E" }} tickLine={false} axisLine={{ stroke: "#F0EDFA" }} />
                          <YAxis tick={{ fontSize: 10, fill: "#8A8A9E" }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{ backgroundColor: "#FFFFFF", border: "none", borderRadius: "14px", fontFamily: "Inter", boxShadow: "0 8px 30px rgba(0,0,0,0.08)" }} />
                          <Bar dataKey="value" fill="#10B981" radius={[6, 6, 0, 0]} barSize={36} name="Leads">
                            {marketData.scoreGradeDistribution.map((entry, index) => {
                              const colors = { "Grade A": "#E11D48", "Grade B": "#F59E0B", "Grade C": "#3B82F6", "Grade D": "#64748B" };
                              const key = entry.name as keyof typeof colors;
                              return <Cell key={`cell-${index}`} fill={colors[key] || "#94A3B8"} />;
                            })}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Source Attribution Stacked Monthly Bar Chart */}
                <div className="crm-card p-6 sm:p-7 lg:col-span-2 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#F5F3FB]">
                    <div>
                      <h3 className="font-display text-base font-bold text-[#1A1A2E]">Omnichannel Source Attribution (Last 12 Months)</h3>
                      <p className="text-xs text-[#8A8A9E]">Monthly breakdown of incoming leads by portal channel, WhatsApp, Gmail, and website forms</p>
                    </div>
                    <ChevronRight size={16} className="text-[#8A8A9E]" />
                  </div>
                  <div className="h-72 w-full pt-2">
                    {isHydrated && (marketData as any).sourceAttribution && (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={(marketData as any).sourceAttribution} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0EDFA" />
                          <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#8A8A9E" }} tickLine={false} axisLine={{ stroke: "#F0EDFA" }} />
                          <YAxis tick={{ fontSize: 10, fill: "#8A8A9E" }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{ backgroundColor: "#FFFFFF", border: "none", borderRadius: "14px", fontFamily: "Inter", boxShadow: "0 8px 30px rgba(0,0,0,0.08)" }} />
                          <Bar dataKey="99acres" stackId="a" fill="#10B981" name="99acres" />
                          <Bar dataKey="MagicBricks" stackId="a" fill="#3B82F6" name="MagicBricks" />
                          <Bar dataKey="Housing" stackId="a" fill="#F59E0B" name="Housing" />
                          <Bar dataKey="NoBroker" stackId="a" fill="#8B5CF6" name="NoBroker" />
                          <Bar dataKey="WhatsApp" stackId="a" fill="#06B6D4" name="WhatsApp" />
                          <Bar dataKey="Gmail" stackId="a" fill="#EF4444" name="Gmail" />
                          <Bar dataKey="Website" stackId="a" fill="#6366F1" name="Website" />
                          <Bar dataKey="Manual" stackId="a" fill="#94A3B8" name="Manual" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* City Breakdown */}
                <div className="crm-card p-6 sm:p-7 lg:col-span-2 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#F5F3FB]">
                    <div>
                      <h3 className="font-display text-base font-bold text-[#1A1A2E]">Target Markets Geographical Share</h3>
                      <p className="text-xs text-[#8A8A9E]">Percentage split of investor queries by city preferences</p>
                    </div>
                    <ChevronRight size={16} className="text-[#8A8A9E]" />
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                    {marketData.leadsByCity.map((item, idx) => (
                      <div key={idx} className="bg-[#F9F8FD] p-4 rounded-2xl text-center hover:bg-[#F4F0FF] transition-colors">
                        <span className="text-[10px] text-[#8A8A9E] uppercase font-bold tracking-wider block mb-1">{item.name}</span>
                        <span className="text-2xl font-display font-bold text-[#1A1A2E] block">{item.value} Leads</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            {isPipelineLoading ? (
              <div className="flex justify-center items-center py-20 bg-white rounded-2xl animate-pulse">
                <span className="text-xs text-[#8A8A9E]">Loading pipeline closure KPIs...</span>
              </div>
            ) : !pipelineData ? (
              <div className="flex flex-col justify-center items-center py-20 text-center">
                <span className="text-3xl">🛣️</span>
                <h2 className="font-display text-xl font-bold text-[#1A1A2E] mt-2">Error Loading Pipeline Data</h2>
                <p className="text-xs text-[#8A8A9E]">Verify that closure roadmaps are initialized.</p>
              </div>
            ) : (
              <div className="space-y-6 animate-slide-in">
                
                {/* 1. Funnel and Velocity Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* Pipeline Cumulative Funnel */}
                  <div className="crm-card p-6 sm:p-7 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-[#F5F3FB]">
                      <div>
                        <h3 className="font-display text-base font-bold text-[#1A1A2E]">Sales Funnel Drop-offs</h3>
                        <p className="text-xs text-[#8A8A9E]">Active leads reached or passed each stage</p>
                      </div>
                      <ChevronRight size={16} className="text-[#8A8A9E]" />
                    </div>
                    <div className="h-64 w-full pt-2">
                      {isHydrated && (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={pipelineData.funnelData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                            <defs>
                              <linearGradient id="colorFunnel" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#7C6EF5" stopOpacity={0.4}/>
                                <stop offset="95%" stopColor="#7C6EF5" stopOpacity={0.0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0EDFA" />
                            <XAxis dataKey="stage" tick={{ fontSize: 9, fill: "#8A8A9E" }} interval={0} angle={-15} dx={-5} dy={5} tickLine={false} axisLine={{ stroke: "#F0EDFA" }} />
                            <YAxis tick={{ fontSize: 10, fill: "#8A8A9E" }} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: "#FFFFFF", border: "none", borderRadius: "14px", fontFamily: "Inter", boxShadow: "0 8px 30px rgba(0,0,0,0.08)" }} />
                            <Area type="monotone" dataKey="count" stroke="#5B4FE0" strokeWidth={2.5} fillOpacity={1} fill="url(#colorFunnel)" name="Leads Reached" />
                          </AreaChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>

                  {/* Stage Velocity */}
                  <div className="crm-card p-6 sm:p-7 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-[#F5F3FB]">
                      <div>
                        <h3 className="font-display text-base font-bold text-[#1A1A2E]">Average Stage Velocity</h3>
                        <p className="text-xs text-[#8A8A9E]">Average duration in days spent per stage</p>
                      </div>
                      <ChevronRight size={16} className="text-[#8A8A9E]" />
                    </div>
                    <div className="h-64 w-full pt-2">
                      {isHydrated && (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart 
                            data={pipelineData.velocityData} 
                            layout="vertical"
                            margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F0EDFA" />
                            <XAxis type="number" tick={{ fontSize: 10, fill: "#8A8A9E" }} axisLine={false} tickLine={false} />
                            <YAxis dataKey="stage" type="category" tick={{ fontSize: 9, fill: "#8A8A9E" }} width={90} tickLine={false} axisLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: "#FFFFFF", border: "none", borderRadius: "14px", fontFamily: "Inter", boxShadow: "0 8px 30px rgba(0,0,0,0.08)" }} />
                            <Bar dataKey="avgDays" fill="#5B4FE0" radius={[0, 6, 6, 0]} name="Average Days" barSize={16} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Weekly Intake Trend Chart */}
                <div className="crm-card p-6 sm:p-7 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#F5F3FB]">
                    <div>
                      <h3 className="font-display text-base font-bold text-[#1A1A2E]">Weekly Leads Intake & Deal Volume</h3>
                      <p className="text-xs text-[#8A8A9E]">Lead capture volume and budget sizes over past 8 weeks</p>
                    </div>
                    <ChevronRight size={16} className="text-[#8A8A9E]" />
                  </div>
                  <div className="h-64 w-full pt-2">
                    {isHydrated && (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={pipelineData.weeklyData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0EDFA" />
                          <XAxis dataKey="week" tick={{ fontSize: 10, fill: "#8A8A9E" }} tickLine={false} axisLine={{ stroke: "#F0EDFA" }} />
                          <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "#8A8A9E" }} axisLine={false} tickLine={false} />
                          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "#8A8A9E" }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{ backgroundColor: "#FFFFFF", border: "none", borderRadius: "14px", fontFamily: "Inter", boxShadow: "0 8px 30px rgba(0,0,0,0.08)" }} />
                          <Line yAxisId="left" type="monotone" dataKey="count" stroke="#5B4FE0" strokeWidth={3} name="Intake Count" activeDot={{ r: 6 }} />
                          <Line yAxisId="right" type="monotone" dataKey="valueLakhs" stroke="#7C6EF5" strokeWidth={2.5} name="Total Budget (₹Lakhs)" strokeDasharray="5 5" />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* 3. Agent Performance Table */}
                <div className="crm-card p-0 overflow-hidden space-y-4">
                  <div className="p-6 pb-3 border-b border-[#F5F3FB] flex items-center justify-between">
                    <div>
                      <h3 className="font-display text-base font-bold text-[#1A1A2E]">Agent Closure Performance</h3>
                      <p className="text-xs text-[#8A8A9E]">Closure rates, allocations, and deal sizes managed by advisors</p>
                    </div>
                    <ChevronRight size={16} className="text-[#8A8A9E]" />
                  </div>
                  <table className="crm-table text-xs w-full">
                    <thead>
                      <tr>
                        <th>Advisor Name</th>
                        <th className="text-center">Allocated Leads</th>
                        <th className="text-center">Active Pipeline</th>
                        <th className="text-center">Converted Deals</th>
                        <th className="text-center">Conversion Rate</th>
                        <th className="text-right">Deal Value Managed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pipelineData.agentPerformance.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-[#8A8A9E] italic">
                            No advisor allocations registered.
                          </td>
                        </tr>
                      ) : (
                        pipelineData.agentPerformance.map((agent, idx) => (
                          <tr key={idx}>
                            <td className="font-bold text-[#1A1A2E]">{agent.name}</td>
                            <td className="text-center text-[#1A1A2E]">{agent.totalLeads}</td>
                            <td className="text-center text-[#1A1A2E]">{agent.activeLeads}</td>
                            <td className="text-center font-bold text-emerald-600">{agent.convertedLeads}</td>
                            <td className="text-center">
                              <span className={`badge px-3 py-1 text-[10px] font-bold rounded-full ${
                                agent.conversionRate > 35 
                                  ? "bg-emerald-100 text-emerald-800" 
                                  : "bg-amber-100 text-amber-800"
                              }`}>
                                {agent.conversionRate}%
                              </span>
                            </td>
                            <td className="text-right font-bold text-[#5B4FE0]">
                              {formatPrice(agent.totalValueLakhs)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
