"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Users, DollarSign, Calendar, TrendingUp, RefreshCw, Compass } from "lucide-react";

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
    } catch (err) {
      console.error("Failed to load persona stats", err);
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
      <div className="flex-grow flex items-center justify-center p-12 text-text-secondary animate-pulse text-sm">
        Analyzing buyer personas and calculating conversion metrics...
      </div>
    );
  }

  return (
    <div className="space-y-6 flex-grow flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[10px] text-accent font-bold uppercase tracking-widest block">
            AI Buyer Profiling
          </span>
          <h1 className="font-display text-2xl sm:text-4xl font-bold text-primary">
            Persona Segmentation
          </h1>
        </div>

        <button
          onClick={handleReclassifyAll}
          disabled={isReclassifying}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-blue-700 text-surface text-xs font-bold uppercase tracking-wider rounded transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={isReclassifying ? "animate-spin" : ""} />
          {isReclassifying ? "Reclassifying..." : "Reclassify All Leads"}
        </button>
      </div>

      {/* Intro info banner */}
      <div className="bg-blue-50/20 border border-blue-200/50 p-4 rounded-card text-xs text-text-secondary flex items-start gap-3">
        <span className="text-xl">💡</span>
        <p className="leading-relaxed">
          Leads are automatically assigned to one of six buyer personas upon creation based on their budget range, investment horizon, preferred corridor, and context notes. Personas are used to drive project recommendations and trigger targeted automated WhatsApp campaigns.
        </p>
      </div>

      {/* Grid of 6 personas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((p) => (
          <div
            key={p.persona}
            className="bg-white border border-slate-200/80 hover:border-slate-300 rounded-card shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
          >
            {/* Top Bar with Icon and Count */}
            <div className="p-5 border-b border-slate-100 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-sm border border-slate-100"
                  style={{ backgroundColor: `${p.color}15` }}
                >
                  {p.icon}
                </span>
                <div>
                  <h3 className="font-bold text-sm text-slate-800">{p.displayName}</h3>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{p.persona.replace(/_/g, " ")}</span>
                </div>
              </div>
              
              <div className="bg-slate-50 border border-slate-150 rounded-tag px-2.5 py-1 text-center">
                <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider leading-none">Leads</span>
                <span className="text-sm font-black text-slate-800 leading-none block mt-1">{p.count}</span>
              </div>
            </div>

            {/* Description */}
            <p className="px-5 py-3 text-xs text-text-secondary leading-relaxed flex-grow italic">
              "{p.description}"
            </p>

            {/* Metrics list */}
            <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50 grid grid-cols-2 gap-4 text-xs">
              <div className="flex items-center gap-2">
                <DollarSign size={14} className="text-slate-400" />
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase tracking-wider">Avg Budget</span>
                  <span className="font-bold text-slate-700">
                    {p.avgBudget === 0 ? "N/A" : p.avgBudget < 100 ? `₹${p.avgBudget}L` : `₹${(p.avgBudget / 100).toFixed(1)}Cr`}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-slate-400" />
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase tracking-wider">Avg Horizon</span>
                  <span className="font-bold text-slate-700">{p.avgHorizon === 0 ? "N/A" : `${p.avgHorizon} Yrs`}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Compass size={14} className="text-slate-400" />
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase tracking-wider">Top Corridor</span>
                  <span className="font-bold text-slate-700 truncate block max-w-[100px]">{p.topCorridor}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <TrendingUp size={14} className="text-slate-400" />
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase tracking-wider">Conversion</span>
                  <span className={`font-bold px-1.5 py-0.2 rounded text-[10px] ${
                    p.conversionRate > 25 ? "bg-green-50 text-green-600 border border-green-100" : "bg-slate-100 text-slate-600"
                  }`}>
                    {p.conversionRate}%
                  </span>
                </div>
              </div>
            </div>

            {/* Card Action Link */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center px-5 text-xs font-bold uppercase tracking-wider">
              <Link
                href={`/admin/leads?persona=${p.persona}`}
                className="text-blue-600 hover:text-blue-800 transition-colors"
              >
                View Leads →
              </Link>
              <Link
                href={`/admin/broadcasts/new?groupType=PERSONA&persona=${p.persona}`}
                className="text-[#D97706] hover:text-amber-700 transition-colors flex items-center gap-0.5"
              >
                Broadcast 📣
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
