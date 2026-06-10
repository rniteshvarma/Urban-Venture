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
  ChevronRight 
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
        alert("Failed to run matching engine.");
      }
    } catch (err) {
      console.error(err);
      alert("Error executing matches engine.");
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
        alert("Failed to dismiss match");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePitch = async (matchId: string) => {
    try {
      const res = await fetch(`/api/admin/matches/${matchId}/pitch`);
      if (res.ok) {
        const data = await res.json();
        window.open(data.whatsappUrl, "_blank");
      } else {
        alert("Failed to generate pitch details.");
      }
    } catch (err) {
      console.error(err);
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
    <div className="space-y-6 flex-grow flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[10px] text-accent font-bold uppercase tracking-widest block">
            Intelligence Engine
          </span>
          <h1 className="font-display text-2xl sm:text-4xl font-bold text-primary">
            Smart Matching Dashboard
          </h1>
        </div>

        <button
          onClick={handleRecalculateAll}
          disabled={isRecalculating}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded transition-colors disabled:opacity-50 shadow-sm"
        >
          <RefreshCw size={14} className={isRecalculating ? "animate-spin" : ""} />
          {isRecalculating ? "Recalculating..." : "Run Matching Engine"}
        </button>
      </div>

      {/* KPI Stats Blocks */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-surface border border-luxury p-5 rounded-card shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded bg-blue-50 border border-blue-200 flex items-center justify-center text-[#2563EB]">
            <TrendingUp size={20} />
          </div>
          <div>
            <span className="text-[10px] text-text-secondary uppercase tracking-wider block">Total Active Matches</span>
            <span className="text-2xl font-bold text-primary">{totalCount}</span>
          </div>
        </div>

        <div className="bg-surface border border-luxury p-5 rounded-card shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded bg-green-50 border border-green-200 flex items-center justify-center text-green-600">
            <Award size={20} />
          </div>
          <div>
            <span className="text-[10px] text-text-secondary uppercase tracking-wider block">High-Score (≥75%) Matches</span>
            <span className="text-2xl font-bold text-green-600">{highMatchCount}</span>
          </div>
        </div>

        <div className="bg-surface border border-luxury p-5 rounded-card shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
            <TrendingUp size={20} className="transform rotate-45" />
          </div>
          <div>
            <span className="text-[10px] text-text-secondary uppercase tracking-wider block">Average Match Score</span>
            <span className="text-2xl font-bold text-primary">{avgScore}%</span>
          </div>
        </div>
      </div>

      {/* Filters Card */}
      <div className="bg-surface border border-luxury p-5 rounded-card shadow-sm space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5 mb-2">
          <Filter size={14} /> Filter Matches Matrix
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[9px] uppercase tracking-wider text-text-secondary font-bold mb-1">Filter by Project</label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full bg-luxury-bg border border-luxury px-3 py-2 rounded text-xs text-text-primary focus:outline-none focus:border-[#2563EB]"
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
            <label className="block text-[9px] uppercase tracking-wider text-text-secondary font-bold mb-1">Filter by Active Lead</label>
            <select
              value={selectedLeadId}
              onChange={(e) => setSelectedLeadId(e.target.value)}
              className="w-full bg-luxury-bg border border-luxury px-3 py-2 rounded text-xs text-text-primary focus:outline-none focus:border-[#2563EB]"
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
            <label className="block text-[9px] uppercase tracking-wider text-text-secondary font-bold mb-1">
              Minimum Match Score: <span className="font-bold text-[#2563EB]">{minScore}%</span>
            </label>
            <input 
              type="range" 
              min="0" 
              max="100" 
              step="5"
              value={minScore} 
              onChange={(e) => setMinScore(parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#2563EB] mt-3"
            />
          </div>
        </div>
      </div>

      {/* Matches Grid */}
      <div className="flex-grow">
        {isLoading ? (
          <div className="flex items-center justify-center p-12 text-text-secondary animate-pulse text-xs">
            Fetching project matches matrix...
          </div>
        ) : matches.length === 0 ? (
          <div className="bg-surface border border-luxury p-12 text-center rounded-card shadow-sm text-text-secondary text-xs italic">
            No active project recommendations found matching your current filter set.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {matches.map((match) => (
              <div 
                key={match.id}
                className="bg-surface border border-luxury hover:border-slate-350 p-5 rounded-card shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                {/* Top Info */}
                <div className="flex justify-between items-start gap-3">
                  <div className="space-y-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                      match.matchScore >= 75 ? "bg-green-50 text-green-700 border-green-200" :
                      match.matchScore >= 50 ? "bg-blue-50 text-blue-700 border-blue-200" :
                      "bg-slate-50 text-slate-600 border-slate-200"
                    }`}>
                      {match.matchScore}% Match Score
                    </span>
                    
                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-wide pt-1">
                      <span>Lead ID: {match.lead.id.substring(0, 8)}</span>
                      <span>·</span>
                      <span>Project ID: {match.project.id.substring(0, 8)}</span>
                    </div>
                  </div>

                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide bg-slate-50 border border-slate-150 px-2 py-0.5 rounded">
                    {match.project.riskLevel} Risk
                  </span>
                </div>

                {/* Lead ↔ Project Split Cards */}
                <div className="grid grid-cols-2 gap-4 border-t border-b border-luxury/40 py-3 text-xs">
                  {/* Lead Info */}
                  <div className="space-y-1">
                    <span className="text-[9px] text-text-secondary font-bold uppercase tracking-wider block flex items-center gap-1">
                      <User size={10} className="text-slate-400" /> Lead Details
                    </span>
                    <Link 
                      href={`/admin/leads?id=${match.lead.id}`}
                      className="font-bold text-slate-800 hover:text-[#2563EB] hover:underline block leading-tight truncate"
                    >
                      {match.lead.name}
                    </Link>
                    <span className="text-[10px] text-slate-500 block">
                      ₹{match.lead.budget}L · {match.lead.horizon}Yrs · {match.lead.city}
                    </span>
                  </div>

                  {/* Project Info */}
                  <div className="space-y-1">
                    <span className="text-[9px] text-text-secondary font-bold uppercase tracking-wider block flex items-center gap-1">
                      <Briefcase size={10} className="text-slate-400" /> Project Details
                    </span>
                    <Link 
                      href={`/admin/projects/${match.project.id}`}
                      className="font-bold text-slate-800 hover:text-[#2563EB] hover:underline block leading-tight truncate"
                    >
                      {match.project.name}
                    </Link>
                    <span className="text-[10px] text-slate-500 block truncate">
                      {formatPrice(match.project.minBudgetLakhs)} - {formatPrice(match.project.maxBudgetLakhs)} · {match.project.corridor}
                    </span>
                  </div>
                </div>

                {/* Match Reasons */}
                {match.matchReasons.length > 0 && (
                  <div className="space-y-1.5 text-xs">
                    <span className="text-[9px] text-text-secondary font-bold uppercase tracking-wider block">Matching Metrics:</span>
                    <ul className="list-disc pl-4 text-[11px] text-slate-600 space-y-1 font-medium">
                      {match.matchReasons.map((reason, idx) => (
                        <li key={idx} className="leading-snug">{reason}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Actions row */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => handleDismiss(match.id)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-200 hover:border-red-200 rounded font-bold uppercase tracking-wider text-[10px] transition-colors"
                  >
                    <Trash2 size={12} /> Dismiss Match
                  </button>

                  <button
                    onClick={() => handlePitch(match.id)}
                    className="flex items-center gap-1 px-4 py-1.5 bg-[#2563EB] hover:bg-blue-700 text-white rounded font-bold uppercase tracking-wider text-[10px] transition-colors shadow-sm"
                  >
                    <Send size={12} /> Pitch Lead via WA
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
