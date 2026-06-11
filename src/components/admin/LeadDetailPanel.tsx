"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Flame, 
  Star, 
  Clock, 
  Compass, 
  RefreshCw, 
  MessageSquare, 
  Send,
  Trash2,
  Plus
} from "lucide-react";

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  budget: number;
  horizon: number;
  city: string;
  status: "NEW" | "CONTACTED" | "INTERESTED" | "NEGOTIATING" | "CONVERTED" | "LOST";
  source: string;
  notes: string | null;
  assignedTo: string | null;
  createdAt: string;
  persona?: string | null;
  personaScore?: number | null;
  personaReason?: string | null;
  leadScore?: number | null;
  leadScoreGrade?: string | null;
  leadScoreFactors?: any;
  user?: {
    searches: {
      id: string;
      createdAt: string;
      aiResponse: any;
    }[];
  } | null;
}

interface LeadDetailPanelProps {
  lead: Lead | null;
  onClose: () => void;
  onUpdateNotes: (leadId: string, newNotes: string) => Promise<void>;
  onStatusChange: (leadId: string, newStatus: string) => Promise<void>;
  onRefresh?: () => void;
}

const PERSONA_CONFIGS: Record<string, { label: string; icon: string; color: string }> = {
  FIRST_TIME_BUYER: { label: "First-Time Buyer", icon: "🏠", color: "#3B82F6" },
  NRI_INVESTOR: { label: "NRI Investor", icon: "✈️", color: "#8B5CF6" },
  LAND_SPECULATOR: { label: "Land Speculator", icon: "📈", color: "#EF4444" },
  RETIREMENT_PLANNER: { label: "Retirement Planner", icon: "👴", color: "#10B981" },
  HNI_PORTFOLIO_BUILDER: { label: "HNI Portfolio", icon: "💼", color: "#F59E0B" },
  PROFESSIONAL_FIRST_HOME: { label: "Professional Home", icon: "💻", color: "#06B6D4" }
};

const GRADE_CONFIGS: Record<string, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
  A: { icon: <Flame size={16} />, color: "text-red-600 border-red-200", bg: "bg-red-50", label: "Hot" },
  B: { icon: <Star size={16} />, color: "text-amber-600 border-amber-200", bg: "bg-amber-50", label: "Warm" },
  C: { icon: <Clock size={16} />, color: "text-blue-600 border-blue-200", bg: "bg-blue-50", label: "Cool" },
  D: { icon: <Compass size={16} />, color: "text-slate-500 border-slate-200", bg: "bg-slate-50", label: "Cold" }
};

export default function LeadDetailPanel({
  lead,
  onClose,
  onUpdateNotes,
  onStatusChange,
  onRefresh
}: LeadDetailPanelProps) {
  const [newNote, setNewNote] = useState("");
  const [matchedProjects, setMatchedProjects] = useState<any[]>([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  
  // Custom states for reclassification & scoring
  const [isReclassifying, setIsReclassifying] = useState(false);
  const [isRescoring, setIsRescoring] = useState(false);

  // WhatsApp states
  const [activeTab, setActiveTab] = useState<"details" | "whatsapp">("details");
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [waPreview, setWaPreview] = useState("");
  const [waLogs, setWaLogs] = useState<any[]>([]);
  const [isSendingWa, setIsSendingWa] = useState(false);

  useEffect(() => {
    if (!lead) return;
    
    async function loadMatches() {
      if (!lead) return;
      setIsLoadingMatches(true);
      try {
        const res = await fetch(`/api/admin/matching/lead/${lead.id}`);
        if (res.ok) {
          const data = await res.json();
          setMatchedProjects(data.matches || []);
        }
      } catch (err) {
        console.error("Failed to load matching projects for lead", err);
      } finally {
        setIsLoadingMatches(false);
      }
    }
    
    async function loadWATemplatesAndLogs() {
      if (!lead) return;
      try {
        // Load Templates
        const tempRes = await fetch("/api/admin/whatsapp/templates");
        if (tempRes.ok) {
          const data = await tempRes.json();
          const active = (data.templates || []).filter((t: any) => t.isActive);
          setTemplates(active);
          if (active.length > 0) setSelectedTemplateId(active[0].id);
        }

        // Load Logs
        const logsRes = await fetch(`/api/admin/whatsapp/logs?leadId=${lead.id}`);
        if (logsRes.ok) {
          const data = await logsRes.json();
          setWaLogs(data.logs || []);
        }
      } catch (err) {
        console.error(err);
      }
    }

    loadMatches();
    loadWATemplatesAndLogs();
    setNewNote("");
    setWaPreview("");
  }, [lead]);

  // Handle template preview text compilation live
  useEffect(() => {
    if (!selectedTemplateId || !lead) return;
    const template = templates.find(t => t.id === selectedTemplateId);
    if (!template) return;

    // Resolve simple preview tags client-side
    let preview = template.message
      .replace(/{{lead_name}}/g, lead.name)
      .replace(/{{budget}}/g, String(lead.budget))
      .replace(/{{horizon}}/g, String(lead.horizon))
      .replace(/{{city}}/g, lead.city)
      .replace(/{{email}}/g, lead.email)
      .replace(/{{portal_url}}/g, window.location.origin)
      .replace(/{{agent_name}}/g, lead.assignedTo || "Property Advisor")
      .replace(/{{corridor}}/g, lead.user?.searches?.[0]?.aiResponse?.corridors?.[0]?.name?.replace("Corridor", "").trim() || "Hyderabad")
      .replace(/{{project_name}}/g, matchedProjects[0]?.project?.name || matchedProjects[0]?.name || "Premium Villa Plots")
      .replace(/{{project_price}}/g, String(matchedProjects[0]?.project?.minBudgetLakhs || matchedProjects[0]?.minBudgetLakhs || 45));

    setWaPreview(preview);
  }, [selectedTemplateId, templates, lead, matchedProjects]);

  if (!lead) return null;

  // Actions
  const handleReclassify = async () => {
    setIsReclassifying(true);
    try {
      const res = await fetch(`/api/admin/leads/${lead.id}/classify`, { method: "POST" });
      if (res.ok) {
        if (onRefresh) onRefresh();
        alert("Persona successfully reclassified by AI Engine!");
      } else {
        const data = await res.json();
        alert(`Failed to reclassify: ${data.error || "Server Error"}${data.details ? " - " + data.details : ""}`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Error reclassifying: ${err.message || "Connection failed"}`);
    } finally {
      setIsReclassifying(false);
    }
  };

  const handleRescore = async () => {
    setIsRescoring(true);
    try {
      const res = await fetch(`/api/admin/leads/${lead.id}/score`, { method: "POST" });
      if (res.ok) {
        if (onRefresh) onRefresh();
        alert("Conversion score successfully recalculated!");
      } else {
        const data = await res.json();
        alert(`Failed to recalculate: ${data.error || "Server Error"}${data.details ? " - " + data.details : ""}`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Error recalculating: ${err.message || "Connection failed"}`);
    } finally {
      setIsRescoring(false);
    }
  };

  const handleDismissMatch = async (matchId: string) => {
    if (!confirm("Are you sure you want to dismiss this project match?")) return;
    try {
      const res = await fetch(`/api/admin/matches/${matchId}/dismiss`, { method: "POST" });
      if (res.ok) {
        setMatchedProjects((prev) => prev.filter((m) => m.id !== matchId));
      } else {
        const data = await res.json();
        alert(`Failed to dismiss match: ${data.error || "Server Error"}${data.details ? " - " + data.details : ""}`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Error dismissing match: ${err.message || "Connection failed"}`);
    }
  };

  const handlePitchMatch = async (matchId: string) => {
    try {
      const res = await fetch(`/api/admin/matches/${matchId}/pitch`);
      if (res.ok) {
        const data = await res.json();
        window.open(data.whatsappUrl, "_blank");
      } else {
        const data = await res.json();
        alert(`Failed to generate pitch: ${data.error || "Server Error"}${data.details ? " - " + data.details : ""}`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Error generating pitch: ${err.message || "Connection failed"}`);
    }
  };

  const handleSendWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplateId) return;

    setIsSendingWa(true);
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: lead.id,
          templateId: selectedTemplateId
        })
      });

      if (res.ok) {
        alert("WhatsApp message dispatched successfully!");
        // Refresh log list
        const logsRes = await fetch(`/api/admin/whatsapp/logs?leadId=${lead.id}`);
        if (logsRes.ok) {
          const data = await logsRes.json();
          setWaLogs(data.logs || []);
        }
      } else {
        const err = await res.json();
        alert(`Failed to send message: ${err.error || "Server Error"}${err.details ? " - " + err.details : ""}`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Error sending WhatsApp message: ${err.message || "Connection failed"}`);
    } finally {
      setIsSendingWa(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    
    setIsSavingNote(true);
    try {
      const dateStr = new Date().toISOString().replace("T", " ").substring(0, 16);
      const formattedNote = lead.notes 
        ? `${lead.notes}\n\n[${dateStr}] ${newNote}`
        : `[${dateStr}] ${newNote}`;

      await onUpdateNotes(lead.id, formattedNote);
      lead.notes = formattedNote;
      setNewNote("");
    } catch (err: any) {
      alert(`Failed to save note: ${err.message || "Connection failed"}`);
    } finally {
      setIsSavingNote(false);
    }
  };

  const formatPrice = (val: number) => {
    return val < 100 ? `₹${val}L` : `₹${(val / 100).toFixed(1)}Cr`;
  };

  const persona = lead.persona ? PERSONA_CONFIGS[lead.persona] : null;
  const score = lead.leadScore || 0;
  const grade = lead.leadScoreGrade || "D";
  const gradeInfo = GRADE_CONFIGS[grade];
  const factors = typeof lead.leadScoreFactors === "string" 
    ? JSON.parse(lead.leadScoreFactors) 
    : (lead.leadScoreFactors || {});

  // Recommendation logic based on missing factor scores
  const scoreImprovementRecommendations = [];
  if ((factors.stage || 0) < 18) {
    scoreImprovementRecommendations.push("Schedule a site visit to advance pipeline stage (adds +10 to +16 points).");
  }
  if ((factors.recency || 0) < 12) {
    scoreImprovementRecommendations.push("Send a WhatsApp follow-up template to reset inactivity recency (restores +12 points).");
  }
  if ((factors.completeness || 0) < 5) {
    scoreImprovementRecommendations.push("Complete missing contact profile details in the edit panel (restores +3 points).");
  }
  if ((factors.searches || 0) < 15) {
    scoreImprovementRecommendations.push("Help client perform another search request to test corridor alignments (adds +5 points).");
  }

  return (
    <>
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-black/20 z-40 transition-opacity"
      />

      <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-surface border-l border-luxury shadow-luxury flex flex-col justify-between animate-slide-in">
        
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-luxury bg-slate-50/50 flex items-center justify-between">
          <div>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Lead ID: {lead.id.substring(0, 8)}...</span>
            <h2 className="font-display text-lg font-bold text-slate-800">{lead.name}</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-600 hover:text-slate-900 px-2.5 py-1.5 text-xs border border-slate-200 rounded bg-white hover:bg-slate-50 transition-colors"
          >
            ✕ Close
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-luxury bg-slate-50/20 px-6">
          <button
            onClick={() => setActiveTab("details")}
            className={`py-3 text-xs font-bold uppercase tracking-wider border-b-2 -mb-[1px] transition-colors mr-6 ${
              activeTab === "details" ? "border-blue-600 text-blue-600" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            📋 Profile Details
          </button>
          <button
            onClick={() => setActiveTab("whatsapp")}
            className={`py-3 text-xs font-bold uppercase tracking-wider border-b-2 -mb-[1px] transition-colors flex items-center gap-1.5 ${
              activeTab === "whatsapp" ? "border-blue-600 text-blue-600" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <MessageSquare size={14} />
            WhatsApp Templates
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-grow overflow-y-auto p-6 space-y-6 scrollbar-thin">
          
          {activeTab === "details" ? (
            <>
              {/* Score & Persona Segment Hero Summary */}
              <section className="grid grid-cols-2 gap-4">
                {/* Score Segment */}
                <div className={`p-4 rounded-lg border border-slate-100 shadow-sm flex flex-col justify-between ${gradeInfo.bg}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500">Lead Score</span>
                    <button 
                      onClick={handleRescore}
                      disabled={isRescoring}
                      className="text-[10px] text-blue-600 font-bold hover:underline flex items-center gap-0.5"
                    >
                      <RefreshCw size={10} className={isRescoring ? "animate-spin" : ""} />
                      Rescore
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center ${gradeInfo.color} border bg-white shadow-sm`}>
                      {gradeInfo.icon}
                    </span>
                    <div>
                      <span className="text-2xl font-black text-slate-800 leading-none block">{score}</span>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block mt-0.5">Grade {grade} · {gradeInfo.label}</span>
                    </div>
                  </div>
                </div>

                {/* Persona Segment */}
                <div className="p-4 rounded-lg border border-slate-100 shadow-sm flex flex-col justify-between bg-white">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500">Buyer Persona</span>
                    <button 
                      onClick={handleReclassify}
                      disabled={isReclassifying}
                      className="text-[10px] text-blue-600 font-bold hover:underline flex items-center gap-0.5"
                    >
                      <RefreshCw size={10} className={isReclassifying ? "animate-spin" : ""} />
                      Reclassify
                    </button>
                  </div>

                  {persona ? (
                    <div className="flex items-center gap-2 mt-2">
                      <span 
                        className="w-8 h-8 rounded-full flex items-center justify-center text-base border shadow-sm"
                        style={{ backgroundColor: `${persona.color}15`, borderColor: `${persona.color}30` }}
                      >
                        {persona.icon}
                      </span>
                      <div>
                        <span className="text-sm font-bold text-slate-800 leading-none block">{persona.label}</span>
                        <span className="text-[9px] font-bold text-slate-500 uppercase block mt-1">AI Classification</span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic block mt-3">Unclassified lead</span>
                  )}
                </div>
              </section>

              {/* Persona Rationale Explanation */}
              {persona && lead.personaReason && (
                <section className="bg-slate-50 border border-slate-200/60 p-3 rounded-lg text-xs leading-relaxed text-slate-600">
                  <span className="font-bold text-[10px] text-slate-700 block uppercase tracking-wider mb-1">AI Persona Rationale:</span>
                  "{lead.personaReason}"
                </section>
              )}

              {/* Lead Score segmented progress bar */}
              <section className="bg-white border border-slate-200/80 p-4 rounded-card shadow-sm space-y-3">
                <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500 block">Score Factors Weightage</span>
                
                <div className="w-full h-2 rounded-full overflow-hidden flex bg-slate-100">
                  <div className="h-full bg-blue-600" style={{ width: `${(factors.budget || 0) * 5}%` }} title="Budget" />
                  <div className="h-full bg-emerald-500" style={{ width: `${(factors.horizon || 0) * 5}%` }} title="Horizon" />
                  <div className="h-full bg-purple-500" style={{ width: `${(factors.searches || 0) * 5}%` }} title="AI Searches" />
                  <div className="h-full bg-amber-500" style={{ width: `${(factors.stage || 0) * 5}%` }} title="Pipeline Stage" />
                  <div className="h-full bg-indigo-500" style={{ width: `${(factors.recency || 0) * 5}%` }} title="Recency" />
                  <div className="h-full bg-slate-400" style={{ width: `${((factors.source || 0) + (factors.completeness || 0)) * 5}%` }} title="Source & Profile" />
                </div>

                <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-[8px] font-bold text-slate-500 uppercase tracking-wider">
                  <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block"/> Budget ({factors.budget || 0})</div>
                  <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"/> Horizon ({factors.horizon || 0})</div>
                  <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-purple-500 inline-block"/> Searches ({factors.searches || 0})</div>
                  <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block"/> Stage ({factors.stage || 0})</div>
                  <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block"/> Recency ({factors.recency || 0})</div>
                </div>
              </section>

              {/* AI Score Recommendations */}
              {scoreImprovementRecommendations.length > 0 && (
                <section className="bg-amber-50/30 border border-amber-200/50 p-4 rounded-card space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1">
                    <span>💡</span> Score Improvement Recommendations
                  </h4>
                  <ul className="list-disc pl-4 space-y-1.5 text-[11px] text-amber-900/80 leading-relaxed font-medium">
                    {scoreImprovementRecommendations.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Quick Info & Status */}
              <section className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-200/60 p-4 rounded-card text-xs">
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Email Address</span>
                  <a href={`mailto:${lead.email}`} className="font-semibold text-blue-600 underline">{lead.email}</a>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Phone Number</span>
                  <a href={`tel:${lead.phone}`} className="font-semibold text-slate-800">{lead.phone}</a>
                </div>
                <div className="mt-2">
                  <span className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Pipeline Status</span>
                  <select
                    value={lead.status}
                    onChange={(e) => onStatusChange(lead.id, e.target.value)}
                    className="font-bold bg-white border border-slate-200 px-2.5 py-1 rounded text-xs text-slate-800 focus:outline-none"
                  >
                    <option value="NEW">NEW</option>
                    <option value="CONTACTED">CONTACTED</option>
                    <option value="INTERESTED">INTERESTED</option>
                    <option value="NEGOTIATING">NEGOTIATING</option>
                    <option value="CONVERTED">CONVERTED</option>
                    <option value="LOST">LOST</option>
                  </select>
                </div>
                <div className="mt-2">
                  <span className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Lead Source</span>
                  <span className="font-bold text-slate-700 uppercase text-[10px] tracking-wider bg-white border border-slate-200 px-2 py-0.5 rounded inline-block">{lead.source}</span>
                </div>
              </section>

              {/* View Closure Roadmap Link */}
              <div className="bg-blue-50/30 border border-blue-200 p-4 rounded-card text-center space-y-2">
                <span className="text-xs text-text-secondary block font-semibold">Need closure timelines & action item checks?</span>
                <Link 
                  href={`/admin/leads/${lead.id}`}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold uppercase tracking-wider rounded transition-colors shadow-sm"
                >
                  🛣️ Open Lead Closure Roadmap
                </Link>
              </div>

              {/* Investment Profile */}
              <section className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1.5">
                  Investment Profile
                </h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="border border-slate-200 p-3 rounded-card bg-white">
                    <span className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Budget</span>
                    <span className="text-sm font-bold text-slate-800">{formatPrice(lead.budget)}</span>
                  </div>
                  <div className="border border-slate-200 p-3 rounded-card bg-white">
                    <span className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Horizon</span>
                    <span className="text-sm font-bold text-slate-800">{lead.horizon} Years</span>
                  </div>
                  <div className="border border-slate-200 p-3 rounded-card bg-white">
                    <span className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Preferred City</span>
                    <span className="text-sm font-bold text-slate-800 capitalize">{lead.city}</span>
                  </div>
                </div>
              </section>

              {/* Matched Projects */}
              <section className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1.5">
                  Auto-Matched Portfolio Projects ({matchedProjects.length})
                </h3>
                {isLoadingMatches ? (
                  <p className="text-xs text-text-secondary">Finding projects...</p>
                ) : matchedProjects.length === 0 ? (
                  <p className="text-xs text-text-secondary italic">No active projects match this lead's criteria.</p>
                ) : (
                  <div className="space-y-3">
                    {matchedProjects.map((match) => {
                      const p = match.project || match;
                      const score = match.matchScore !== undefined ? match.matchScore : 100;
                      const reasons = match.matchReasons || [];
                      
                      return (
                        <div key={match.id || p.id} className="border border-slate-200 p-4 rounded-card bg-slate-50/50 hover:bg-slate-50 transition-colors space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-bold text-xs text-slate-800">{p.name}</h4>
                              <p className="text-[9px] text-text-secondary mt-0.5">{p.developer} · {p.corridor}</p>
                            </div>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                              score >= 75 ? "bg-green-50 text-green-700 border-green-200" :
                              score >= 50 ? "bg-blue-50 text-blue-700 border-blue-200" :
                              "bg-slate-50 text-slate-600 border-slate-200"
                            }`}>
                              {score}% Match
                            </span>
                          </div>

                          {reasons.length > 0 && (
                            <ul className="list-disc pl-3 text-[9px] text-slate-500 space-y-0.5">
                              {reasons.map((r: string, idx: number) => (
                                <li key={idx}>{r}</li>
                              ))}
                            </ul>
                          )}

                          <div className="flex justify-between items-center text-[10px] pt-1">
                            <span className="font-semibold text-slate-700">
                              {formatPrice(p.minBudgetLakhs)} - {formatPrice(p.maxBudgetLakhs)}
                            </span>
                            <div className="flex gap-2">
                              {match.id && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleDismissMatch(match.id)}
                                    className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded font-bold uppercase tracking-wider text-[9px] transition-colors"
                                  >
                                    Dismiss
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handlePitchMatch(match.id)}
                                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold uppercase tracking-wider text-[9px] transition-colors flex items-center gap-1 shadow-sm"
                                  >
                                    <Send size={8} /> Pitch
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </>
          ) : (
            // WhatsApp Automation Tab
            <div className="space-y-6">
              {/* Send message form */}
              <form onSubmit={handleSendWhatsApp} className="bg-slate-50 border border-slate-200/60 p-4 rounded-card space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-2">
                  Dispatch WhatsApp Template
                </h3>

                <div className="space-y-1 text-xs">
                  <label className="block font-bold text-slate-400 uppercase tracking-wider mb-1">Select Active Template</label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="w-full bg-white border border-slate-200 px-3 py-2 rounded text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                    required
                  >
                    {templates.length === 0 ? (
                      <option value="">No active templates seeded</option>
                    ) : (
                      templates.map((t) => (
                        <option key={t.id} value={t.id}>{t.name} ({t.trigger})</option>
                      ))
                    )}
                  </select>
                </div>

                {/* Message preview */}
                {waPreview && (
                  <div className="space-y-1 text-xs">
                    <label className="block font-bold text-slate-400 uppercase tracking-wider mb-1">Message Preview (Merge Tags Filled)</label>
                    <div className="bg-white border border-slate-200 p-3 rounded text-slate-700 leading-relaxed font-mono whitespace-pre-line text-[10px]">
                      {waPreview}
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSendingWa || templates.length === 0}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded transition-colors shadow-sm disabled:opacity-50"
                >
                  <Send size={14} />
                  {isSendingWa ? "Dispatching..." : "Send Personalized Message"}
                </button>
              </form>

              {/* Message logs list */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1.5">
                  Message Logs History ({waLogs.length})
                </h3>
                
                {waLogs.length === 0 ? (
                  <p className="text-xs text-text-secondary italic">No automated messages dispatched yet.</p>
                ) : (
                  <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                    {waLogs.map((log) => {
                      const getStatusColor = (s: string) => {
                        switch (s) {
                          case "READ": return "bg-green-100 text-green-700 border-green-200";
                          case "DELIVERED": return "bg-blue-100 text-blue-700 border-blue-200";
                          case "FAILED": return "bg-red-100 text-red-700 border-red-200";
                          default: return "bg-slate-100 text-slate-500 border-slate-200";
                        }
                      };
                      return (
                        <div key={log.id} className="border border-slate-200 p-3 rounded bg-white space-y-2 text-xs">
                          <div className="flex items-center justify-between text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                            <span>{log.template.name}</span>
                            <span className={`px-2 py-0.2 rounded border ${getStatusColor(log.status)}`}>{log.status}</span>
                          </div>
                          <p className="text-[10px] text-slate-600 leading-relaxed font-mono whitespace-pre-line bg-slate-50/50 p-2 rounded">
                            {log.message}
                          </p>
                          <div className="text-[9px] text-slate-400 text-right">
                            {new Date(log.createdAt).toLocaleString("en-IN")}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Activity timeline / Notes form in details tab only */}
        {activeTab === "details" && (
          <div className="px-6 py-4 border-t border-luxury bg-slate-50/50">
            <form onSubmit={handleAddNote} className="space-y-2">
              <textarea
                placeholder="Type a new update note (e.g. Called client, interested in site visit...)"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={2}
                className="w-full bg-white border border-slate-200 p-3 rounded text-xs text-text-primary focus:outline-none focus:border-blue-500 resize-none"
                required
              />
              <div className="flex justify-between items-center">
                <span className="text-[9px] text-slate-400 font-semibold italic">
                  * Note timeline edits save on submit
                </span>
                <button
                  type="submit"
                  disabled={isSavingNote || !newNote.trim()}
                  className="px-4 py-2 bg-primary hover:bg-primary-light text-surface text-[10px] font-bold uppercase tracking-wider rounded transition-colors disabled:opacity-50"
                >
                  {isSavingNote ? "Saving..." : "Add Update Note"}
                </button>
              </div>
            </form>
          </div>
        )}

      </aside>
    </>
  );
}
