"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Briefcase, 
  User, 
  Send, 
  Trash2, 
  RefreshCw, 
  Filter, 
  TrendingUp, 
  Award, 
  ChevronRight,
  Megaphone
} from "lucide-react";

interface Match {
  id: string;
  projectId: string;
  leadId: string;
  matchScore: number;
  matchReasons: string[];
  project: {
    id: string;
    name: string;
    developer: string;
    corridor: string;
    city: string;
    minBudgetLakhs: number;
    maxBudgetLakhs: number;
    riskLevel: string;
  };
  lead: {
    id: string;
    name: string;
    email: string;
    phone: string;
    budget: number;
    horizon: number;
    city: string;
    persona: string | null;
  };
}

export default function AdminMatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  
  // Filters
  const [selectedProjectId, setSelectedProjectId] = useState<string>("ALL");
  const [selectedLeadId, setSelectedLeadId] = useState<string>("ALL");
  const [minScore, setMinScore] = useState<number>(50);

  const [isLoading, setIsLoading] = useState(true);
  const [isRecalculating, setIsRecalculating] = useState(false);

  // Load projects & leads for dropdown filters
  useEffect(() => {
    async function loadFiltersData() {
      try {
        const [projRes, leadsRes] = await Promise.all([
          fetch("/api/admin/projects"),
          fetch("/api/admin/leads?limit=200")
        ]);

        if (projRes.ok) {
          const projs = await projRes.json();
          setProjects(projs || []);
        }

        if (leadsRes.ok) {
          const leadsData = await leadsRes.json();
          setLeads(leadsData.leads || []);
        }
      } catch (err) {
        console.error("Error loading matches filter datasets:", err);
      }
    }
    loadFiltersData();
  }, []);

  // Fetch matches based on current filters
  async function loadMatches() {
    setIsLoading(true);
    try {
      let url = `/api/admin/matching?minScore=${minScore}`;
      if (selectedProjectId !== "ALL") {
        url += `&projectId=${selectedProjectId}`;
      }
      if (selectedLeadId !== "ALL") {
        url += `&leadId=${selectedLeadId}`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setMatches(data.matches || []);
      }
    } catch (err) {
      console.error("Error fetching matches:", err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadMatches();
  }, [selectedProjectId, selectedLeadId, minScore]);

  const handleRecalculateAll = async () => {
    if (!confirm("Are you sure you want to recalculate matches for all projects and leads? This might take a few moments.")) return;
    setIsRecalculating(true);
    try {
      const res = await fetch("/api/admin/matching/run-all", { method: "POST" });
      if (res.ok) {
        alert("Matching matrices updated successfully!");
        loadMatches();
      } else {
        const data = await res.json();
        alert(`Failed to run matching engine: ${data.error || "Server Error"}${data.details ? " - " + data.details : ""}`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Error executing matches engine: ${err.message || "Connection failed"}`);
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleDismiss = async (matchId: string) => {
    if (!confirm("Dismiss this match? It will no longer show in recommendations.")) return;
    try {
      const res = await fetch(`/api/admin/matches/${matchId}/dismiss`, { method: "POST" });
      if (res.ok) {
        setMatches((prev) => prev.filter((m) => m.id !== matchId));
      } else {
        const data = await res.json();
        alert(`Failed to dismiss match: ${data.error || "Server Error"}${data.details ? " - " + data.details : ""}`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Error dismissing match: ${err.message || "Connection failed"}`);
    }
  };

  const handlePitch = async (matchId: string) => {
    try {
      const res = await fetch(`/api/admin/matches/${matchId}/pitch`);
      if (res.ok) {
        const data = await res.json();
        window.open(data.whatsappUrl, "_blank");
      } else {
        const data = await res.json();
        alert(`Failed to generate pitch details: ${data.error || "Server Error"}${data.details ? " - " + data.details : ""}`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Error generating pitch: ${err.message || "Connection failed"}`);
    }
  };

  const formatPrice = (val: number) => {
    return val < 100 ? `₹${val}L` : `₹${(val / 100).toFixed(1)}Cr`;
  };

  // Stats helper
  const totalCount = matches.length;
  const highMatchCount = matches.filter((m) => m.matchScore >= 75).length;
  const avgScore = totalCount > 0 
    ? Math.round(matches.reduce((acc, m) => acc + m.matchScore, 0) / totalCount) 
    : 0;

  return (
    <div className="space-y-6 sm:space-y-8 flex-grow flex flex-col animate-fade-in max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#F0EDFA]">
        <div>
          <span className="text-[11px] text-[#5B4FE0] font-bold uppercase tracking-widest block mb-1">
            Intelligence Engine
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#1A1A2E]">
            Smart Matching Dashboard
          </h1>
        </div>

        <div className="flex flex-wrap gap-3">
          {selectedProjectId !== "ALL" && (
            <Link
              href={`/admin/broadcasts/new?groupType=CORRIDOR_INTEREST&corridor=${encodeURIComponent(projects.find(p => p.id === selectedProjectId)?.corridor || "")}`}
              className="crm-btn-secondary text-xs"
            >
              <Megaphone size={14} className="text-[#5B4FE0]" /> Broadcast to Matches
            </Link>
          )}

          <button
            onClick={handleRecalculateAll}
            disabled={isRecalculating}
            className="crm-btn-primary text-xs"
          >
            <RefreshCw size={14} className={isRecalculating ? "animate-spin" : ""} />
            {isRecalculating ? "Recalculating..." : "Run Matching Engine"}
          </button>
        </div>
      </div>

      {/* KPI Stats Blocks */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="crm-card p-6 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#8A8A9E]">Active Matches</span>
            <span className="badge bg-purple-100 text-purple-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">AI Matrix</span>
          </div>
          <div className="text-4xl font-display font-bold text-[#1A1A2E]">{totalCount}</div>
          <div className="w-full h-1.5 rounded-full bg-[#F0EEFA] overflow-hidden">
            <div className="h-full rounded-full crm-gradient-purple-lavender w-[85%]" />
          </div>
        </div>

        <div className="crm-card p-6 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#8A8A9E]">High Match (≥75%)</span>
            <span className="badge bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">High Fit</span>
          </div>
          <div className="text-4xl font-display font-bold text-emerald-600">{highMatchCount}</div>
          <div className="w-full h-1.5 rounded-full bg-[#F0EEFA] overflow-hidden">
            <div className="h-full rounded-full crm-gradient-peach-mint w-[90%]" />
          </div>
        </div>

        <div className="crm-card p-6 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#8A8A9E]">Average Match Score</span>
            <span className="badge bg-blue-100 text-blue-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">Confidence</span>
          </div>
          <div className="text-4xl font-display font-bold text-[#5B4FE0]">{avgScore}%</div>
          <div className="w-full h-1.5 rounded-full bg-[#F0EEFA] overflow-hidden">
            <div className="h-full rounded-full crm-gradient-blue-cyan w-[75%]" />
          </div>
        </div>
      </div>

      {/* Filters Card */}
      <div className="crm-card p-6 sm:p-7 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#F5F3FB]">
          <h3 className="font-display text-base font-bold text-[#1A1A2E] flex items-center gap-2 m-0">
            <Filter size={16} className="text-[#5B4FE0]" /> Filter Matches Matrix
          </h3>
          <span className="text-xs text-[#8A8A9E] font-medium">Refine lead-to-inventory matches</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#8A8A9E] font-bold mb-2">Filter by Project</label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full bg-[#F9F8FD] border border-[#E8E5F5] rounded-full px-4 py-2.5 text-xs text-[#1A1A2E] focus:outline-none focus:border-[#5B4FE0]"
            >
              <option value="ALL">All Inventory Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.corridor})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#8A8A9E] font-bold mb-2">Filter by Active Lead</label>
            <select
              value={selectedLeadId}
              onChange={(e) => setSelectedLeadId(e.target.value)}
              className="w-full bg-[#F9F8FD] border border-[#E8E5F5] rounded-full px-4 py-2.5 text-xs text-[#1A1A2E] focus:outline-none focus:border-[#5B4FE0]"
            >
              <option value="ALL">All Leads</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} (Budget: ₹{l.budget}L)
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-[11px] uppercase tracking-wider text-[#8A8A9E] font-bold">
                Minimum Match Score
              </label>
              <span className="font-bold text-[#5B4FE0] text-xs bg-[#F4F0FF] px-2.5 py-0.5 rounded-full">{minScore}%</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="100" 
              step="5"
              value={minScore} 
              onChange={(e) => setMinScore(parseInt(e.target.value))}
              className="w-full h-2 bg-[#F0EEFA] rounded-lg appearance-none cursor-pointer accent-[#5B4FE0] mt-3"
            />
          </div>
        </div>
      </div>

      {/* Matches Grid */}
      <div className="flex-grow">
        {isLoading ? (
          <div className="flex items-center justify-center p-16 text-[#8A8A9E] animate-pulse text-xs">
            Fetching project matches matrix...
          </div>
        ) : matches.length === 0 ? (
          <div className="crm-card p-16 text-center text-[#8A8A9E] text-xs italic">
            No active project recommendations found matching your current filter set.
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {matches.map((match) => (
              <div 
                key={match.id}
                className="crm-card p-6 sm:p-7 flex flex-col justify-between space-y-5"
              >
                {/* Top Info Header */}
                <div className="flex justify-between items-start gap-4 pb-3 border-b border-[#F5F3FB]">
                  <div className="space-y-1.5">
                    <span className={`badge px-3 py-1 text-xs rounded-full ${
                      match.matchScore >= 75 ? "bg-emerald-100 text-emerald-800" :
                      match.matchScore >= 50 ? "bg-amber-100 text-amber-800" :
                      "bg-blue-100 text-blue-800"
                    }`}>
                      {match.matchScore}% Match Score
                    </span>
                    
                    <div className="flex items-center gap-2 text-[10px] font-bold text-[#8A8A9E] uppercase tracking-wider pt-1">
                      <span>Lead ID: <strong className="text-[#1A1A2E]">{match.lead.id.substring(0, 8)}</strong></span>
                      <span>·</span>
                      <span>Project ID: <strong className="text-[#1A1A2E]">{match.project.id.substring(0, 8)}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="badge bg-amber-100 text-amber-800 px-3 py-1 text-xs rounded-full">
                      {match.project.riskLevel} Risk
                    </span>
                    <ChevronRight size={16} className="text-[#8A8A9E]" />
                  </div>
                </div>

                {/* Lead ↔ Project Split Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#F9F8FD] p-4 rounded-2xl text-xs">
                  {/* Lead Info */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-[#8A8A9E] font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <User size={12} className="text-[#5B4FE0]" /> Lead Details
                    </span>
                    <Link 
                      href={`/admin/leads?id=${match.lead.id}`}
                      className="font-bold text-[#1A1A2E] text-sm hover:text-[#5B4FE0] block leading-tight truncate"
                    >
                      {match.lead.name}
                    </Link>
                    <span className="text-[11px] text-[#8A8A9E] block font-medium">
                      ₹{match.lead.budget}L · {match.lead.horizon}Yrs · {match.lead.city}
                    </span>
                  </div>

                  {/* Project Info */}
                  <div className="space-y-1.5 sm:border-l sm:border-[#EBE7F5] sm:pl-4">
                    <span className="text-[10px] text-[#8A8A9E] font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Briefcase size={12} className="text-[#5B4FE0]" /> Project Details
                    </span>
                    <Link 
                      href={`/admin/projects/${match.project.id}`}
                      className="font-bold text-[#1A1A2E] text-sm hover:text-[#5B4FE0] block leading-tight truncate"
                    >
                      {match.project.name}
                    </Link>
                    <span className="text-[11px] text-[#8A8A9E] block truncate font-medium">
                      {formatPrice(match.project.minBudgetLakhs)} - {formatPrice(match.project.maxBudgetLakhs)} · {match.project.corridor}
                    </span>
                  </div>
                </div>

                {/* Match Reasons */}
                {match.matchReasons.length > 0 && (
                  <div className="space-y-2 text-xs max-w-xl">
                    <span className="text-[10px] text-[#8A8A9E] font-bold uppercase tracking-wider block">Matching Metrics:</span>
                    <ul className="list-disc pl-5 text-[12px] text-[#6E6D8A] space-y-1.5 font-normal leading-relaxed">
                      {match.matchReasons.map((reason, idx) => (
                        <li key={idx}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Actions row */}
                <div className="pt-3 border-t border-[#F5F3FB] flex items-center justify-between mt-auto gap-4">
                  <button
                    onClick={() => handleDismiss(match.id)}
                    className="crm-btn-ghost text-rose-600 hover:bg-rose-50 text-xs px-3.5 py-2"
                  >
                    <Trash2 size={14} /> Dismiss Match
                  </button>

                  <button
                    onClick={() => handlePitch(match.id)}
                    className="crm-btn-primary text-xs px-5 py-2"
                  >
                    <Send size={14} /> Pitch Lead via WA
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
