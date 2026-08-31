"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Users, DollarSign, Calendar, TrendingUp, RefreshCw, Compass, Sparkles, ChevronRight, Megaphone } from "lucide-react";

interface PersonaStat {
  persona: string;
  displayName: string;
  description: string;
  color: string;
  icon: string;
  count: number;
  avgBudget: number;
  avgHorizon: number;
  conversionRate: number;
  topCorridor: string;
}

export default function AdminPersonasPage() {
  const [stats, setStats] = useState<PersonaStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReclassifying, setIsReclassifying] = useState(false);

  async function loadStats() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/personas/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats || []);
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadStats();
  }, []);

  const handleReclassifyAll = async () => {
    if (!confirm("Are you sure you want to reclassify all leads? This runs the AI classifier for every lead and updates their persona profiles.")) return;
    
    setIsReclassifying(true);
    try {
      const res = await fetch("/api/admin/personas/reclassify-all", {
        method: "POST"
      });
      if (res.ok) {
        alert("Bulk persona reclassification complete!");
        loadStats();
      } else {
        const data = await res.json();
        alert(`Failed to reclassify leads: ${data.error || "Server Error"}${data.details ? " - " + data.details : ""}`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Error executing bulk classification: ${err.message || "Connection failed"}`);
    } finally {
      setIsReclassifying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 flex-grow flex flex-col justify-center items-center py-20 animate-pulse">
        <div className="h-8 bg-[#EBE7F5] w-64 rounded-full" />
        <div className="h-24 bg-[#EBE7F5] w-full rounded-2xl" />
        <div className="grid grid-cols-3 gap-6 w-full">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-64 bg-[#EBE7F5] rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 flex-grow flex flex-col animate-fade-in w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#F0EDFA]">
        <div>
          <span className="text-[11px] text-[#5B4FE0] font-bold uppercase tracking-widest block mb-1">
            AI Buyer Profiling
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#1A1A2E]">
            Persona Segmentation
          </h1>
        </div>

        <button
          onClick={handleReclassifyAll}
          disabled={isReclassifying}
          className="crm-btn-primary text-xs"
        >
          <RefreshCw size={14} className={isReclassifying ? "animate-spin" : ""} />
          {isReclassifying ? "Reclassifying..." : "Reclassify All Leads"}
        </button>
      </div>

      {/* Insight box */}
      <div className="crm-insight-box">
        <Sparkles className="w-4 h-4 text-[#5B4FE0] shrink-0 mt-0.5" />
        <span>Leads are automatically assigned to one of six buyer personas upon creation based on their budget range, investment horizon, preferred corridor, and context notes. Personas drive automated recommendations and targeted WhatsApp broadcasts.</span>
      </div>

      {/* Grid of 6 persona cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {stats.map((p, index) => (
          <div
            key={p.persona}
            className="crm-card p-6 sm:p-7 flex flex-col justify-between space-y-5"
          >
            {/* Top Bar with Icon, Persona Name, Count & Chevron */}
            <div className="flex items-start justify-between pb-3 border-b border-[#F5F3FB]">
              <div className="flex items-center gap-3">
                <div className="crm-avatar-ring shrink-0">
                  <div className="w-10 h-10 rounded-full bg-[#F4F0FF] flex items-center justify-center text-lg shadow-xs">
                    {p.icon}
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#1A1A2E] leading-tight">{p.displayName}</h3>
                  <span className="text-[10px] text-[#8A8A9E] font-bold uppercase tracking-wider block mt-0.5">{p.persona.replace(/_/g, " ")}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="badge bg-[#F4F0FF] text-[#5B4FE0] font-bold text-xs px-3 py-1 rounded-full">
                  {p.count} {p.count === 1 ? "Lead" : "Leads"}
                </span>
                <ChevronRight size={16} className="text-[#8A8A9E]" />
              </div>
            </div>

            {/* Description Card Box */}
            <div className="bg-[#F9F8FD] p-3.5 rounded-xl border border-[#F0EDFA] text-xs text-[#6E6D8A] italic leading-relaxed">
              "{p.description}"
            </div>

            {/* Metrics List Block */}
            <div className="bg-[#F9F8FD] p-4 rounded-2xl border border-[#F0EDFA] grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] text-[#8A8A9E] font-bold uppercase tracking-wider block">Avg Budget</span>
                <span className="font-bold text-[#1A1A2E] text-sm block">
                  {p.avgBudget === 0 ? "N/A" : p.avgBudget < 100 ? `₹${p.avgBudget}L` : `₹${(p.avgBudget / 100).toFixed(1)}Cr`}
                </span>
              </div>
              
              <div className="space-y-1">
                <span className="text-[10px] text-[#8A8A9E] font-bold uppercase tracking-wider block">Avg Horizon</span>
                <span className="font-bold text-[#1A1A2E] text-sm block">{p.avgHorizon === 0 ? "N/A" : `${p.avgHorizon} Yrs`}</span>
              </div>

              <div className="space-y-1 pt-1">
                <span className="text-[10px] text-[#8A8A9E] font-bold uppercase tracking-wider block">Top Corridor</span>
                <span className="font-bold text-[#1A1A2E] truncate block text-xs">{p.topCorridor}</span>
              </div>

              <div className="space-y-1 pt-1">
                <span className="text-[10px] text-[#8A8A9E] font-bold uppercase tracking-wider block">Conversion</span>
                <span className="badge bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  {p.conversionRate}%
                </span>
              </div>
            </div>

            {/* Soft Two-Tone Gradient Bar Accent */}
            <div className="w-full h-1.5 rounded-full bg-[#F0EEFA] overflow-hidden">
              <div className={`h-full rounded-full ${
                index % 3 === 0 ? 'crm-gradient-peach-mint w-[85%]' :
                index % 3 === 1 ? 'crm-gradient-purple-lavender w-[75%]' :
                'crm-gradient-blue-cyan w-[90%]'
              }`} />
            </div>

            {/* Card Action Bar */}
            <div className="pt-3 border-t border-[#F5F3FB] flex justify-between items-center text-xs">
              <Link
                href={`/admin/leads?persona=${p.persona}`}
                className="crm-btn-ghost text-xs text-[#5B4FE0] font-bold"
              >
                View Clients →
              </Link>
              <Link
                href={`/admin/broadcasts/new?groupType=PERSONA&persona=${p.persona}`}
                className="crm-btn-primary text-xs py-1.5 px-4 flex items-center gap-1.5"
              >
                <Megaphone size={13} /> Broadcast
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
