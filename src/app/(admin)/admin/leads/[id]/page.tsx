"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { StageStatus } from "@prisma/client";
import LeadRoadmapTimeline from "@/components/admin/LeadRoadmapTimeline";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function LeadDetailPage({ params }: PageProps) {
  const { id } = use(params);
  
  const [lead, setLead] = useState<any | null>(null);
  const [roadmap, setRoadmap] = useState<any | null>(null);
  const [isRoadmapInitialized, setIsRoadmapInitialized] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"roadmap" | "profile">("roadmap");

  // Profile fields state
  const [notes, setNotes] = useState("");
  const [newNoteText, setNewNoteText] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isInitializingRoadmap, setIsInitializingRoadmap] = useState(false);
  const [matchedProjects, setMatchedProjects] = useState<any[]>([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);

  // Load Lead details and roadmap
  async function loadData() {
    setIsLoading(true);
    try {
      // Fetch Lead
      const leadRes = await fetch(`/api/admin/leads/${id}`);
      if (leadRes.ok) {
        const leadData = await leadRes.json();
        setLead(leadData.lead);
        setNotes(leadData.lead.notes || "");
      }

      // Fetch Roadmap
      const roadmapRes = await fetch(`/api/admin/leads/${id}/roadmap`);
      if (roadmapRes.ok) {
        const roadmapData = await roadmapRes.json();
        setIsRoadmapInitialized(roadmapData.initialized);
        if (roadmapData.initialized) {
          setRoadmap(roadmapData.roadmap);
        } else {
          setRoadmap(null);
        }
      }
    } catch (err) {
      console.error("Failed to load lead details", err);
    } finally {
      setIsLoading(false);
    }
  }

  // Load matched projects
  async function loadMatches() {
    setIsLoadingMatches(true);
    try {
      const res = await fetch(`/api/admin/leads/${id}/matches`);
      if (res.ok) {
        const data = await res.json();
        setMatchedProjects(data);
      }
    } catch (err) {
      console.error("Failed to load matching projects", err);
    } finally {
      setIsLoadingMatches(false);
    }
  }

  useEffect(() => {
    loadData();
    loadMatches();
  }, [id]);

  // Handle manual roadmap initialization
  const handleInitializeRoadmap = async () => {
    setIsInitializingRoadmap(true);
    try {
      const res = await fetch(`/api/admin/leads/${id}/roadmap`, {
        method: "POST"
      });
      if (res.ok) {
        const data = await res.json();
        setIsRoadmapInitialized(true);
        setRoadmap(data.roadmap);
        loadData();
      } else {
        const data = await res.json();
        alert(`Failed to initialize roadmap: ${data.error || "Server Error"}${data.details ? " - " + data.details : ""}`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Error initializing roadmap: ${err.message || "Connection failed"}`);
    } finally {
      setIsInitializingRoadmap(false);
    }
  };

  // Handle adding a CRM note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim() || !lead) return;

    setIsSavingNote(true);
    try {
      const dateStr = new Date().toISOString().replace("T", " ").substring(0, 16);
      const updatedNotes = notes 
        ? `${notes}\n\n[${dateStr}] ${newNoteText}`
        : `[${dateStr}] ${newNoteText}`;

      const res = await fetch(`/api/admin/leads/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: updatedNotes })
      });

      if (res.ok) {
        setNotes(updatedNotes);
        setNewNoteText("");
        // Refresh lead data
        const leadRes = await fetch(`/api/admin/leads/${id}`);
        if (leadRes.ok) {
          const leadData = await leadRes.json();
          setLead(leadData.lead);
        }
      } else {
        const data = await res.json();
        alert(`Failed to save note: ${data.error || "Server Error"}${data.details ? " - " + data.details : ""}`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Error saving note: ${err.message || "Connection failed"}`);
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!lead) return;
    try {
      const res = await fetch(`/api/admin/leads/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setLead((prev: any) => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  const formatPrice = (val: number) => {
    return val < 100 ? `₹${val}L` : `₹${(val / 100).toFixed(1)}Cr`;
  };

  if (isLoading) {
    return (
      <div className="flex-grow flex items-center justify-center p-12 text-text-secondary animate-pulse text-sm">
        Loading lead and closure roadmap details...
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="p-8 text-center text-text-secondary space-y-4">
        <span className="text-4xl">⚠️</span>
        <h3 className="font-display text-xl font-bold text-primary">Lead Not Found</h3>
        <p className="text-xs max-w-sm mx-auto">
          The lead record you are attempting to access does not exist or has been deleted.
        </p>
        <Link 
          href="/admin/leads"
          className="inline-block px-4 py-2 bg-primary text-surface text-xs font-semibold rounded-tag uppercase tracking-wider"
        >
          Back to Leads
        </Link>
      </div>
    );
  }

  // Calculate if lead is stale: active stage status IN_PROGRESS for > 7 days
  let isStale = false;
  let activeStageName = "";
  let daysInStage = 0;

  if (roadmap && isRoadmapInitialized) {
    let activeStage = roadmap.stages.find((s: any) => s.status === StageStatus.IN_PROGRESS);
    if (!activeStage) {
      activeStage = roadmap.stages.find((s: any) => s.status === StageStatus.PENDING);
    }
    if (!activeStage) {
      activeStage = roadmap.stages[roadmap.stages.length - 1];
    }

    if (activeStage && activeStage.status === StageStatus.IN_PROGRESS && activeStage.scheduledAt) {
      const scheduledDate = new Date(activeStage.scheduledAt);
      const diffMs = Date.now() - scheduledDate.getTime();
      daysInStage = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      isStale = daysInStage > 7;
      activeStageName = activeStage.stageKey.replace(/_/g, " ");
    }
  }

  const searchRecommendations = lead.user?.searches || [];

  return (
    <div className="space-y-6 flex-grow flex flex-col">
      {/* Header Back Link */}
      <div>
        <Link 
          href="/admin/leads" 
          className="text-xs font-semibold uppercase tracking-wider text-text-secondary hover:text-primary transition-colors flex items-center gap-1.5"
        >
          ← Back to Leads Directory
        </Link>
      </div>

      {/* Hero Banner Header */}
      <div className="bg-surface border border-luxury p-6 rounded-card shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-accent font-bold uppercase tracking-widest block">
                Lead Management Portal
              </span>
              {isStale && (
                <span className="bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider animate-pulse">
                  ⚠️ STALE: {activeStageName} ({daysInStage} Days)
                </span>
              )}
            </div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-primary mt-1">
              {lead.name}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div>
              <label className="block text-[9px] uppercase tracking-wider text-text-secondary font-semibold mb-1">
                Pipeline Status
              </label>
              <select
                value={lead.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="bg-luxury-bg border border-luxury px-3 py-1.5 rounded-tag text-xs font-bold text-primary focus:outline-none"
              >
                <option value="NEW">NEW</option>
                <option value="CONTACTED">CONTACTED</option>
                <option value="INTERESTED">INTERESTED</option>
                <option value="NEGOTIATING">NEGOTIATING</option>
                <option value="CONVERTED">CONVERTED</option>
                <option value="LOST">LOST</option>
              </select>
            </div>
            {roadmap && (
              <div className="border border-luxury bg-luxury-bg/20 px-4 py-2 rounded-card text-center">
                <span className="text-[9px] uppercase tracking-wider text-text-secondary block">
                  Probability
                </span>
                <span className="text-sm font-bold text-primary">
                  {roadmap.probability}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Quick info row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-luxury/40 text-xs">
          <div>
            <span className="text-[10px] text-text-secondary uppercase block mb-0.5">Email</span>
            <a href={`mailto:${lead.email}`} className="font-semibold text-primary underline">{lead.email}</a>
          </div>
          <div>
            <span className="text-[10px] text-text-secondary uppercase block mb-0.5">Phone</span>
            <a href={`tel:${lead.phone}`} className="font-semibold text-primary">{lead.phone}</a>
          </div>
          <div>
            <span className="text-[10px] text-text-secondary uppercase block mb-0.5">Budget & Horizon</span>
            <span className="font-semibold text-primary">
              {formatPrice(lead.budget)} · {lead.horizon} Yrs
            </span>
          </div>
          <div>
            <span className="text-[10px] text-text-secondary uppercase block mb-0.5">Target Location</span>
            <span className="font-semibold text-primary capitalize">{lead.city}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-luxury">
        <button
          onClick={() => setActiveTab("roadmap")}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 -mb-[2px] transition-colors ${
            activeTab === "roadmap"
              ? "border-[#0F1F3D] text-[#0F1F3D]"
              : "border-transparent text-text-secondary hover:text-primary"
          }`}
        >
          🛣️ Closure Roadmap
        </button>
        <button
          onClick={() => setActiveTab("profile")}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 -mb-[2px] transition-colors ${
            activeTab === "profile"
              ? "border-[#0F1F3D] text-[#0F1F3D]"
              : "border-transparent text-text-secondary hover:text-primary"
          }`}
        >
          📋 Client Profile & AI History
        </button>
      </div>

      {/* Tab Panels */}
      <div className="flex-grow">
        {activeTab === "roadmap" ? (
          <div>
            {isRoadmapInitialized && roadmap ? (
              <LeadRoadmapTimeline 
                roadmap={roadmap} 
                onRefresh={loadData} 
              />
            ) : (
              <div className="bg-surface border border-luxury p-12 text-center rounded-card shadow-sm space-y-4">
                <span className="text-4xl block">🛣️</span>
                <h3 className="font-display text-lg font-bold text-primary">Closure Roadmap Uninitialized</h3>
                <p className="text-xs text-text-secondary max-w-md mx-auto leading-relaxed">
                  A visual stage-by-stage pipeline roadmap hasn't been set up for this client. Initialize it to seed default verification checkmarks, log timeline dates, and track closure progress.
                </p>
                <button
                  onClick={handleInitializeRoadmap}
                  disabled={isInitializingRoadmap}
                  className="px-5 py-2.5 bg-primary hover:bg-blue-700 text-surface text-xs font-semibold uppercase tracking-wider rounded-tag transition-colors disabled:opacity-50"
                >
                  {isInitializingRoadmap ? "Initializing..." : "Initialize Closure Roadmap"}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left/Middle Column - Profile & AI Search Logs */}
            <div className="lg:col-span-2 space-y-6">
              {/* Profile Card */}
              <div className="bg-surface border border-luxury p-6 rounded-card shadow-sm space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-primary border-b border-luxury pb-2">
                  Client Profile Details
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-text-secondary uppercase block mb-1">Source captured</span>
                    <span className="font-semibold text-primary uppercase text-[10px] tracking-wider bg-luxury-bg border border-luxury px-2 py-0.5 rounded-tag">
                      {lead.source}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-secondary uppercase block mb-1">Created Date</span>
                    <span className="font-semibold text-primary">
                      {new Date(lead.createdAt).toLocaleDateString("en-IN")} at {new Date(lead.createdAt).toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Auto Matched Projects */}
              <div className="bg-surface border border-luxury p-6 rounded-card shadow-sm space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-primary border-b border-luxury pb-2">
                  Auto-Matched Portfolio Projects ({matchedProjects.length})
                </h3>
                {isLoadingMatches ? (
                  <p className="text-xs text-text-secondary animate-pulse">Matching database properties...</p>
                ) : matchedProjects.length === 0 ? (
                  <p className="text-xs text-text-secondary italic">No active projects currently match this budget and horizon combination.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {matchedProjects.map((p) => (
                      <div 
                        key={p.id} 
                        className="border border-luxury p-4 rounded-card bg-luxury-bg/10 hover:bg-luxury-bg/30 transition-colors flex flex-col justify-between"
                      >
                        <div>
                          <h4 className="font-semibold text-xs text-primary">{p.name}</h4>
                          <p className="text-[10px] text-text-secondary mt-0.5">{p.developer} · {p.corridor}</p>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-[9px] bg-primary text-white px-2 py-0.5 rounded font-semibold">
                            {p.propertyType}
                          </span>
                          <span className="text-xs font-bold text-primary">
                            {formatPrice(p.minBudgetLakhs)} - {formatPrice(p.maxBudgetLakhs)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* AI Recommendations Logs */}
              <div className="bg-surface border border-luxury p-6 rounded-card shadow-sm space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-primary border-b border-luxury pb-2">
                  AI Recommendation Logs ({searchRecommendations.length})
                </h3>
                {searchRecommendations.length === 0 ? (
                  <p className="text-xs text-text-secondary italic">No AI recommendation searches run by this client.</p>
                ) : (
                  <div className="space-y-4">
                    {searchRecommendations.map((search: any) => {
                      const corridors = search.aiResponse?.corridors || [];
                      return (
                        <div key={search.id} className="border border-luxury p-4 rounded-card bg-luxury-bg/10 space-y-3">
                          <div className="flex items-center justify-between text-[10px] text-text-secondary">
                            <span>Generated: {new Date(search.createdAt).toLocaleString("en-IN")}</span>
                            <span>Parameters: {formatPrice(search.budget)} budget · {search.horizon} Yrs</span>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {corridors.map((c: any, i: number) => (
                              <div key={i} className="bg-surface border border-luxury/40 p-2.5 rounded text-xs">
                                <div className="flex justify-between font-semibold text-primary">
                                  <span>{c.name}</span>
                                  <span className="text-accent">{c.matchScore}% Score</span>
                                </div>
                                <p className="text-[9px] text-text-secondary mt-1">{c.rationale?.substring(0, 100)}...</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Notes and Activity Log */}
            <div className="space-y-6">
              <div className="bg-surface border border-luxury p-6 rounded-card shadow-sm flex flex-col h-full justify-between">
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary border-b border-luxury pb-2">
                    CRM Activity Timeline / Notes
                  </h3>
                  
                  {notes ? (
                    <div className="bg-luxury-bg/20 p-4 rounded-card border border-luxury/40 whitespace-pre-line text-[11px] leading-relaxed text-text-primary max-h-[350px] overflow-y-auto font-mono scrollbar-thin">
                      {notes}
                    </div>
                  ) : (
                    <p className="text-xs text-text-secondary italic py-4">No activity notes logged yet for this lead.</p>
                  )}
                </div>

                <form onSubmit={handleAddNote} className="mt-6 pt-4 border-t border-luxury/40 space-y-3">
                  <label className="block text-[9px] uppercase tracking-wider text-text-secondary font-bold">
                    Log New Activity Note
                  </label>
                  <textarea
                    placeholder="E.g. Called client, interested in site visit next Sunday..."
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    rows={4}
                    className="w-full bg-surface border border-luxury p-3 rounded-input text-xs text-text-primary focus:outline-none focus:border-accent resize-none"
                    required
                  />
                  <button
                    type="submit"
                    disabled={isSavingNote || !newNoteText.trim()}
                    className="w-full py-2 bg-primary hover:bg-blue-700 text-surface text-xs font-bold uppercase tracking-wider rounded-tag transition-colors disabled:opacity-50"
                  >
                    {isSavingNote ? "Saving Note..." : "Add Update Note"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
