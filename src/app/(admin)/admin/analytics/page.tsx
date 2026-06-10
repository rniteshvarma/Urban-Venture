"use client";

import React, { useState, useEffect } from "react";
import BudgetDistribution from "@/components/admin/charts/BudgetDistribution";
import CorridorHeatmap from "@/components/admin/charts/CorridorHeatmap";
import ConversionFunnel from "@/components/admin/charts/ConversionFunnel";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LineChart, Line, AreaChart, Area } from "recharts";

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

  // Fetch pipeline data when tab changes to pipeline
  useEffect(() => {
    if (activeTab === "pipeline" && !pipelineData) {
      setIsLoadingPipeline(true);
      async function loadPipelineAnalytics() {
        try {
          const res = await fetch("/api/admin/analytics/pipeline");
          if (res.ok) {
            const data = await res.json();
            setPipelineData(data);
          }
        } catch (err) {
          console.error("Failed to load pipeline analytics", err);
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
    <div className="space-y-6 flex-grow flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[10px] text-accent font-bold uppercase tracking-widest block">Market Intelligence & Sales Velocity</span>
          <h1 className="font-display text-2xl sm:text-4xl font-bold text-primary">CRM Analytics</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-luxury">
        <button
          onClick={() => setActiveTab("market")}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 -mb-[2px] transition-colors ${
            activeTab === "market"
              ? "border-[#0F1F3D] text-[#0F1F3D]"
              : "border-transparent text-text-secondary hover:text-primary"
          }`}
        >
          📊 Market Intelligence
        </button>
        <button
          onClick={() => setActiveTab("pipeline")}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 -mb-[2px] transition-colors ${
            activeTab === "pipeline"
              ? "border-[#0F1F3D] text-[#0F1F3D]"
              : "border-transparent text-text-secondary hover:text-primary"
          }`}
        >
          🛣️ Sales Pipeline Closure
        </button>
      </div>

      {/* Tab Panels */}
      <div className="flex-grow">
        {activeTab === "market" ? (
          <div>
            {isMarketLoading ? (
              <div className="flex justify-center items-center py-20 bg-luxury-bg/5 animate-pulse rounded-card border border-luxury">
                <span className="text-xs text-text-secondary">Loading market intelligence metrics...</span>
              </div>
            ) : !marketData ? (
              <div className="flex flex-col justify-center items-center py-20 text-center">
                <span className="text-3xl">⚠️</span>
                <h2 className="font-display text-xl font-bold text-primary mt-2">Error Loading Analytics</h2>
                <p className="text-xs text-text-secondary">Please check DB configurations.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-slide-in">
                {/* Corridor Heatmap Analysis */}
                <div className="bg-surface border border-luxury p-6 rounded-card shadow-sm space-y-4">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-primary">Corridor Popularity Heatmap</h3>
                    <p className="text-xs text-text-secondary mt-1">
                      Distribution of corridors recommended by the AI recommendations engine. Highly useful for assessing hot market demands.
                    </p>
                  </div>
                  <div className="border-t border-luxury pt-4">
                    <CorridorHeatmap data={marketData.corridorPopularity} />
                  </div>
                </div>

                {/* Budget distribution Histogram */}
                <div className="bg-surface border border-luxury p-6 rounded-card shadow-sm space-y-4">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-primary">Lead Budget Distribution Histogram</h3>
                    <p className="text-xs text-text-secondary mt-1">
                      Aggregated budget preferences of captured leads. Helps focus inventory mapping on high-demand ticket sizes.
                    </p>
                  </div>
                  <div className="border-t border-luxury pt-4">
                    <BudgetDistribution data={marketData.budgetDistribution} />
                  </div>
                </div>

                {/* Horizon Distribution Chart */}
                <div className="bg-surface border border-luxury p-6 rounded-card shadow-sm space-y-4">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-primary">Preferred Investment Horizons</h3>
                    <p className="text-xs text-text-secondary mt-1">
                      How long clients intend to hold assets. Essential for targeting plotting (long-term) vs residential/villas (mid-term).
                    </p>
                  </div>
                  <div className="border-t border-luxury pt-4">
                    <div className="h-64 w-full">
                      {isHydrated && (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={marketData.horizonDistribution} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E4DC" />
                            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#6B6B6B" }} tickLine={false} />
                            <YAxis tick={{ fontSize: 10, fill: "#6B6B6B" }} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: "#FFFFFF", border: "1px solid #E8E4DC", borderRadius: "6px", fontFamily: "DM Sans" }} />
                            <Bar dataKey="value" fill="#C9A84C" radius={[4, 4, 0, 0]} barSize={24}>
                              {marketData.horizonDistribution.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={index % 2 === 0 ? "#C9A84C" : "#0F1F3D"} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                </div>

                {/* Conversion Funnel */}
                <div className="bg-surface border border-luxury p-6 rounded-card shadow-sm space-y-4">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-primary">Conversion Funnel Analytics</h3>
                    <p className="text-xs text-text-secondary mt-1">
                      Visualizes conversion stages starting from initial AI searches on landing portals to closed CRM leads.
                    </p>
                  </div>
                  <div className="border-t border-luxury pt-4">
                    <ConversionFunnel data={marketData.conversionFunnel} />
                  </div>
                </div>

                {/* AI Buyer Persona Segment Split */}
                <div className="bg-surface border border-luxury p-6 rounded-card shadow-sm space-y-4">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-primary">AI Buyer Persona Distribution</h3>
                    <p className="text-xs text-text-secondary mt-1">
                      Proportional split of leads into AI-classified buyer personas based on budget, horizon, and context.
                    </p>
                  </div>
                  <div className="border-t border-luxury pt-4">
                    <div className="h-64 w-full">
                      {isHydrated && marketData.personaDistribution && (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={marketData.personaDistribution} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E4DC" />
                            <XAxis dataKey="name" tick={{ fontSize: 8, fill: "#6B6B6B" }} interval={0} angle={-10} dx={-2} dy={2} tickLine={false} />
                            <YAxis tick={{ fontSize: 10, fill: "#6B6B6B" }} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: "#FFFFFF", border: "1px solid #E8E4DC", borderRadius: "6px", fontFamily: "DM Sans" }} />
                            <Bar dataKey="value" fill="#2563EB" radius={[4, 4, 0, 0]} barSize={24} name="Leads">
                              {marketData.personaDistribution.map((entry, index) => {
                                const colors = ["#3B82F6", "#8B5CF6", "#EF4444", "#10B981", "#F59E0B", "#06B6D4"];
                                return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                              })}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                </div>

                {/* Predictive Lead Score Grade Split */}
                <div className="bg-surface border border-luxury p-6 rounded-card shadow-sm space-y-4">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-primary">Predictive Lead Score Grades</h3>
                    <p className="text-xs text-text-secondary mt-1">
                      Overview of leads grouped by conversion score grades. Focuses attention on Grade-A and Grade-B warm opportunities.
                    </p>
                  </div>
                  <div className="border-t border-luxury pt-4">
                    <div className="h-64 w-full">
                      {isHydrated && marketData.scoreGradeDistribution && (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={marketData.scoreGradeDistribution} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E4DC" />
                            <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#6B6B6B" }} tickLine={false} />
                            <YAxis tick={{ fontSize: 10, fill: "#6B6B6B" }} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: "#FFFFFF", border: "1px solid #E8E4DC", borderRadius: "6px", fontFamily: "DM Sans" }} />
                            <Bar dataKey="value" fill="#10B981" radius={[4, 4, 0, 0]} barSize={36} name="Leads">
                              {marketData.scoreGradeDistribution.map((entry, index) => {
                                const colors = { "Grade A": "#EF4444", "Grade B": "#F59E0B", "Grade C": "#3B82F6", "Grade D": "#64748B" };
                                const key = entry.name as keyof typeof colors;
                                return <Cell key={`cell-${index}`} fill={colors[key] || "#94A3B8"} />;
                              })}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                </div>

                {/* City Breakdown */}
                <div className="bg-surface border border-luxury p-6 rounded-card shadow-sm lg:col-span-2 space-y-4">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-primary font-display">Target Markets geographical share</h3>
                    <p className="text-xs text-text-secondary mt-1">Percentage split of investor queries by city preferences.</p>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-4 border-t border-luxury">
                    {marketData.leadsByCity.map((item, idx) => (
                      <div key={idx} className="border border-luxury p-4 rounded-card text-center bg-luxury-bg/20">
                        <span className="text-[10px] text-text-secondary uppercase block mb-1">{item.name}</span>
                        <span className="text-xl font-bold text-primary block">{item.value} Leads</span>
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
              <div className="flex justify-center items-center py-20 bg-luxury-bg/5 animate-pulse rounded-card border border-luxury">
                <span className="text-xs text-text-secondary">Loading pipeline closure KPIs...</span>
              </div>
            ) : !pipelineData ? (
              <div className="flex flex-col justify-center items-center py-20 text-center">
                <span className="text-3xl">🛣️</span>
                <h2 className="font-display text-xl font-bold text-primary mt-2">Error Loading Pipeline Data</h2>
                <p className="text-xs text-text-secondary">Verify that closure roadmaps are initialized.</p>
              </div>
            ) : (
              <div className="space-y-8 animate-slide-in">
                
                {/* 1. Funnel and Velocity grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Pipeline Cumulative Funnel */}
                  <div className="bg-surface border border-luxury p-6 rounded-card shadow-sm space-y-4">
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wider text-primary">Sales Funnel Drop-offs</h3>
                      <p className="text-xs text-text-secondary mt-1">
                        Cumulative counts of active leads that have reached or passed each stage in the closure pipeline.
                      </p>
                    </div>
                    <div className="border-t border-luxury pt-4">
                      <div className="h-64 w-full">
                        {isHydrated && (
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={pipelineData.funnelData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                              <defs>
                                <linearGradient id="colorFunnel" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#C9A84C" stopOpacity={0.4}/>
                                  <stop offset="95%" stopColor="#C9A84C" stopOpacity={0.0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E4DC" />
                              <XAxis dataKey="stage" tick={{ fontSize: 8, fill: "#6B6B6B" }} interval={0} angle={-15} dx={-5} dy={5} tickLine={false} />
                              <YAxis tick={{ fontSize: 10, fill: "#6B6B6B" }} axisLine={false} tickLine={false} />
                              <Tooltip contentStyle={{ backgroundColor: "#FFFFFF", border: "1px solid #E8E4DC", borderRadius: "6px", fontFamily: "DM Sans" }} />
                              <Area type="monotone" dataKey="count" stroke="#C9A84C" strokeWidth={2} fillOpacity={1} fill="url(#colorFunnel)" name="Leads Reached" />
                            </AreaChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Stage Velocity */}
                  <div className="bg-surface border border-luxury p-6 rounded-card shadow-sm space-y-4">
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wider text-primary">Average Stage Velocity</h3>
                      <p className="text-xs text-text-secondary mt-1">
                        Average duration in days that a lead spends in each stage before advancing to the next.
                      </p>
                    </div>
                    <div className="border-t border-luxury pt-4">
                      <div className="h-64 w-full">
                        {isHydrated && (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart 
                              data={pipelineData.velocityData} 
                              layout="vertical"
                              margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E8E4DC" />
                              <XAxis type="number" tick={{ fontSize: 10, fill: "#6B6B6B" }} axisLine={false} tickLine={false} />
                              <YAxis dataKey="stage" type="category" tick={{ fontSize: 8, fill: "#6B6B6B" }} width={90} tickLine={false} axisLine={false} />
                              <Tooltip contentStyle={{ backgroundColor: "#FFFFFF", border: "1px solid #E8E4DC", borderRadius: "6px", fontFamily: "DM Sans" }} />
                              <Bar dataKey="avgDays" fill="#0F1F3D" radius={[0, 4, 4, 0]} name="Average Days" barSize={14} />
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Weekly Intake Trend Chart */}
                <div className="bg-surface border border-luxury p-6 rounded-card shadow-sm space-y-4">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-primary">Weekly Leads Intake & Deal Volume</h3>
                    <p className="text-xs text-text-secondary mt-1">
                      Visualizes lead capturing volume and their corresponding budget sizes over the past 8 weeks.
                    </p>
                  </div>
                  <div className="border-t border-luxury pt-4">
                    <div className="h-64 w-full">
                      {isHydrated && (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={pipelineData.weeklyData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E4DC" />
                            <XAxis dataKey="week" tick={{ fontSize: 10, fill: "#6B6B6B" }} tickLine={false} />
                            <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "#6B6B6B" }} axisLine={false} tickLine={false} />
                            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "#6B6B6B" }} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: "#FFFFFF", border: "1px solid #E8E4DC", borderRadius: "6px", fontFamily: "DM Sans" }} />
                            <Line yAxisId="left" type="monotone" dataKey="count" stroke="#0F1F3D" strokeWidth={2.5} name="Intake Count" activeDot={{ r: 6 }} />
                            <Line yAxisId="right" type="monotone" dataKey="valueLakhs" stroke="#C9A84C" strokeWidth={2.5} name="Total Budget (₹Lakhs)" strokeDasharray="5 5" />
                          </LineChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. Agent Performance Table */}
                <div className="bg-surface border border-luxury p-6 rounded-card shadow-sm space-y-4 overflow-hidden">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-primary">Agent Closure Performance</h3>
                    <p className="text-xs text-text-secondary mt-1">
                      Closure success rates, active allocations, and pipeline deal sizes managed by each advisory agent.
                    </p>
                  </div>
                  <div className="border-t border-luxury pt-4 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-luxury text-[9px] uppercase tracking-wider text-text-secondary font-bold">
                          <th className="pb-3">Advisor Name</th>
                          <th className="pb-3 text-center">Allocated Leads</th>
                          <th className="pb-3 text-center">Active Pipeline</th>
                          <th className="pb-3 text-center">Converted Deals</th>
                          <th className="pb-3 text-center">Conversion Rate</th>
                          <th className="pb-3 text-right">Deal Value managed</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pipelineData.agentPerformance.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-6 text-center text-text-secondary italic">
                              No advisor allocations registered.
                            </td>
                          </tr>
                        ) : (
                          pipelineData.agentPerformance.map((agent, idx) => (
                            <tr key={idx} className="border-b border-luxury/40 hover:bg-luxury-bg/10 transition-colors">
                              <td className="py-3.5 font-bold text-primary">{agent.name}</td>
                              <td className="py-3.5 text-center text-text-primary">{agent.totalLeads}</td>
                              <td className="py-3.5 text-center text-text-primary">{agent.activeLeads}</td>
                              <td className="py-3.5 text-center text-green-700 font-bold">{agent.convertedLeads}</td>
                              <td className="py-3.5 text-center">
                                <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                  agent.conversionRate > 35 
                                    ? "bg-green-50 text-green-700 border border-green-200" 
                                    : "bg-amber-50 text-amber-700 border border-amber-200"
                                }`}>
                                  {agent.conversionRate}%
                                </span>
                              </td>
                              <td className="py-3.5 text-right font-semibold text-primary">
                                {formatPrice(agent.totalValueLakhs)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
