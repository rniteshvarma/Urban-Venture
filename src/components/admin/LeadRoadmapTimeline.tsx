"use client";

import React, { useState } from "react";
import { StageKey, StageStatus } from "@prisma/client";

interface ActionItem {
  id: string;
  title: string;
  completed: boolean;
  dueDate: string | null;
  completedAt: string | null;
}

interface RoadmapStage {
  id: string;
  stageKey: StageKey;
  status: StageStatus;
  scheduledAt: string | null;
  completedAt: string | null;
  notes: string | null;
  order: number;
  actionItems: ActionItem[];
}

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  budget: number;
  horizon: number;
  city: string;
}

interface LeadRoadmap {
  id: string;
  leadId: string;
  targetCloseDate: string | null;
  estimatedValue: number | null;
  probability: number;
  assignedTo: string | null;
  stages: RoadmapStage[];
  lead: Lead;
}

interface LeadRoadmapTimelineProps {
  roadmap: LeadRoadmap;
  onRefresh: () => void;
}

const STAGE_LABELS: Record<StageKey, string> = {
  INITIAL_CONTACT: "Initial Contact",
  NEEDS_ASSESSMENT: "Needs Assessment",
  SITE_VISIT: "Site Visit",
  PROPOSAL_SENT: "Proposal Sent",
  NEGOTIATION: "Negotiation",
  LEGAL_REVIEW: "Legal Review",
  BOOKING_AMOUNT: "Booking Amount",
  AGREEMENT_SIGNED: "Agreement Signed",
  CLOSURE: "Closure & Handover"
};

const STAGE_DESCRIPTIONS: Record<StageKey, string> = {
  INITIAL_CONTACT: "Initial phone, email, or WhatsApp touchpoint.",
  NEEDS_ASSESSMENT: "Understanding client specifications, budget, and horizon.",
  SITE_VISIT: "Coordinating and completing the on-site physical visit.",
  PROPOSAL_SENT: "Sharing cost sheets, registration details, and payment options.",
  NEGOTIATION: "Finalizing pricing discounts, adjustments, and payment timeline.",
  LEGAL_REVIEW: "Due diligence, review of RERA documents and sale agreement drafts.",
  BOOKING_AMOUNT: "Collecting booking cheque / wire transfer to reserve unit.",
  AGREEMENT_SIGNED: "Executing and registering the final sale agreement.",
  CLOSURE: "Handing over documents, collecting feedback, and closing the CP invoice."
};

export default function LeadRoadmapTimeline({ roadmap, onRefresh }: LeadRoadmapTimelineProps) {
  const [expandedStageId, setExpandedStageId] = useState<string | null>(() => {
    // Expand active stage by default
    const active = roadmap.stages.find(s => s.status === StageStatus.IN_PROGRESS) 
      || roadmap.stages.find(s => s.status === StageStatus.PENDING)
      || roadmap.stages[0];
    return active ? active.id : null;
  });

  const [savingStageId, setSavingStageId] = useState<string | null>(null);
  const [newActionText, setNewActionText] = useState("");
  const [addingActionStageId, setAddingActionStageId] = useState<string | null>(null);
  const [stageNotes, setStageNotes] = useState<Record<string, string>>({});

  // Status color mapper
  const getStageStatusClasses = (status: StageStatus) => {
    switch (status) {
      case StageStatus.COMPLETED:
        return "bg-amber-500/10 text-amber-600 border border-amber-500/30";
      case StageStatus.SKIPPED:
        return "bg-gray-100 text-gray-500 border border-gray-200";
      case StageStatus.IN_PROGRESS:
        return "bg-blue-900/10 text-blue-800 border border-blue-900/30 animate-pulse font-bold";
      default:
        return "bg-gray-50 text-gray-400 border border-gray-100";
    }
  };

  const getStageDotClasses = (status: StageStatus) => {
    switch (status) {
      case StageStatus.COMPLETED:
        return "bg-amber-500 text-white shadow-[0_0_10px_rgba(245,158,11,0.5)]";
      case StageStatus.SKIPPED:
        return "bg-gray-400 text-white";
      case StageStatus.IN_PROGRESS:
        return "bg-[#0F1F3D] text-amber-400 ring-4 ring-[#0F1F3D]/20 animate-bounce scale-110";
      default:
        return "bg-gray-200 text-gray-500";
    }
  };

  // Stage updates
  const handleUpdateStageStatus = async (stageId: string, status: StageStatus) => {
    setSavingStageId(stageId);
    try {
      const res = await fetch(`/api/admin/roadmap/stages/${stageId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        onRefresh();
      } else {
        alert("Failed to update stage status");
      }
    } catch (err) {
      console.error(err);
      alert("Error occurred updating status");
    } finally {
      setSavingStageId(null);
    }
  };

  const handleSaveStageNotes = async (stageId: string, notes: string) => {
    setSavingStageId(stageId);
    try {
      const res = await fetch(`/api/admin/roadmap/stages/${stageId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes })
      });
      if (res.ok) {
        onRefresh();
      } else {
        alert("Failed to save stage notes");
      }
    } catch (err) {
      console.error(err);
      alert("Error occurred saving notes");
    } finally {
      setSavingStageId(null);
    }
  };

  // Toggle ActionItem checkbox
  const handleToggleAction = async (actionId: string, completed: boolean) => {
    try {
      const res = await fetch(`/api/admin/roadmap/actions/${actionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed })
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Add custom ActionItem
  const handleAddActionItem = async (e: React.FormEvent, stageId: string) => {
    e.preventDefault();
    if (!newActionText.trim()) return;

    setAddingActionStageId(stageId);
    try {
      const res = await fetch(`/api/admin/roadmap/stages/${stageId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newActionText })
      });
      if (res.ok) {
        setNewActionText("");
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAddingActionStageId(null);
    }
  };

  // Delete ActionItem
  const handleDeleteActionItem = async (actionId: string) => {
    if (!confirm("Are you sure you want to delete this action item?")) return;
    try {
      const res = await fetch(`/api/admin/roadmap/actions/${actionId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Stepper Bar (Horizontal) */}
      <div className="bg-surface border border-luxury p-5 rounded-card shadow-sm overflow-x-auto">
        <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-6">
          Pipeline Overview ({roadmap.probability}% Probability)
        </h3>
        
        <div className="flex items-center min-w-[800px] justify-between relative px-2">
          {/* Connector Line */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-200 -translate-y-1/2 z-0" />
          
          {/* Active Progress Line */}
          <div 
            className="absolute top-1/2 left-0 h-0.5 bg-amber-500 -translate-y-1/2 z-0 transition-all duration-500"
            style={{
              width: `${
                (roadmap.stages.filter(s => s.status === StageStatus.COMPLETED || s.status === StageStatus.SKIPPED).length /
                  roadmap.stages.length) * 100
              }%`
            }}
          />

          {roadmap.stages.map((stage, idx) => {
            const isCurrent = stage.status === StageStatus.IN_PROGRESS;
            const isDone = stage.status === StageStatus.COMPLETED || stage.status === StageStatus.SKIPPED;
            
            return (
              <button
                key={stage.id}
                onClick={() => setExpandedStageId(stage.id === expandedStageId ? null : stage.id)}
                className="flex flex-col items-center relative z-10 focus:outline-none group"
              >
                <div 
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all ${getStageDotClasses(stage.status)}`}
                >
                  {isDone ? "✓" : idx + 1}
                </div>
                <span 
                  className={`text-[9px] font-bold uppercase mt-2 tracking-wider transition-colors max-w-[80px] text-center ${
                    isCurrent ? "text-blue-900 font-bold" : isDone ? "text-amber-600" : "text-gray-400"
                  }`}
                >
                  {STAGE_LABELS[stage.stageKey]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Stages Accordion Timeline */}
      <div className="space-y-3">
        {roadmap.stages.map((stage) => {
          const isExpanded = stage.id === expandedStageId;
          const isActive = stage.status === StageStatus.IN_PROGRESS;
          
          return (
            <div 
              key={stage.id} 
              className={`bg-surface border rounded-card overflow-hidden transition-all shadow-sm ${
                isActive ? "border-blue-900/40 ring-1 ring-blue-900/10" : "border-luxury"
              }`}
            >
              {/* Header */}
              <div 
                onClick={() => setExpandedStageId(isExpanded ? null : stage.id)}
                className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-luxury-bg/10 select-none"
              >
                <div className="flex items-center gap-4">
                  <div 
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      stage.status === StageStatus.COMPLETED || stage.status === StageStatus.SKIPPED
                        ? "bg-amber-500 text-white" 
                        : isActive 
                        ? "bg-[#0F1F3D] text-amber-400" 
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {stage.order}
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-sm text-primary flex items-center gap-2">
                      {STAGE_LABELS[stage.stageKey]}
                      {isActive && <span className="inline-block w-2 h-2 rounded-full bg-blue-700 animate-ping" />}
                    </h4>
                    <p className="text-[10px] text-text-secondary mt-0.5">{STAGE_DESCRIPTIONS[stage.stageKey]}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-0.5 rounded-tag text-[9px] uppercase tracking-wider ${getStageStatusClasses(stage.status)}`}>
                    {stage.status.replace(/_/g, " ")}
                  </span>
                  <span className="text-text-secondary text-xs">{isExpanded ? "▲" : "▼"}</span>
                </div>
              </div>

              {/* Collapsible content */}
              {isExpanded && (
                <div className="px-6 pb-6 pt-4 border-t border-luxury/40 bg-luxury-bg/5 space-y-6 animate-slide-down">
                  {/* Status update area & Dates */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-surface p-4 border border-luxury/50 rounded-card">
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-[9px] text-text-secondary uppercase tracking-wider block mb-1">Scheduled Date</span>
                        <span className="font-semibold text-primary">
                          {stage.scheduledAt ? new Date(stage.scheduledAt).toLocaleDateString("en-IN") : "Not scheduled"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-text-secondary uppercase tracking-wider block mb-1">Completed Date</span>
                        <span className="font-semibold text-primary">
                          {stage.completedAt ? new Date(stage.completedAt).toLocaleDateString("en-IN") : "Incomplete"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-text-secondary uppercase tracking-wider font-semibold">Change Status:</span>
                      <div className="flex gap-1">
                        {Object.values(StageStatus).map((s) => (
                          <button
                            key={s}
                            disabled={savingStageId !== null}
                            onClick={() => handleUpdateStageStatus(stage.id, s)}
                            className={`px-2 py-1 text-[9px] font-bold uppercase tracking-wider rounded-tag transition-colors border ${
                              stage.status === s
                                ? "bg-[#0F1F3D] text-white border-[#0F1F3D]"
                                : "bg-surface hover:bg-luxury-bg/40 text-text-secondary border-luxury"
                            }`}
                          >
                            {s.replace(/_/g, " ")}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Checklist & Notes split */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Checklist */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-luxury pb-2">
                        <h5 className="text-xs font-bold uppercase tracking-wider text-primary">
                          Verification Checklist
                        </h5>
                        <span className="text-[10px] bg-luxury-bg border border-luxury text-text-secondary px-2 py-0.5 rounded-tag font-semibold">
                          {stage.actionItems.filter(a => a.completed).length} / {stage.actionItems.length} Done
                        </span>
                      </div>

                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {stage.actionItems.length === 0 ? (
                          <p className="text-xs text-text-secondary italic">No actions registered for this stage.</p>
                        ) : (
                          stage.actionItems.map((action) => (
                            <div 
                              key={action.id} 
                              className="flex items-center justify-between p-2 rounded border border-luxury/40 bg-surface hover:border-luxury transition-colors"
                            >
                              <label className="flex items-center gap-3 cursor-pointer select-none text-xs text-text-primary flex-grow">
                                <input
                                  type="checkbox"
                                  checked={action.completed}
                                  onChange={(e) => handleToggleAction(action.id, e.target.checked)}
                                  className="w-3.5 h-3.5 rounded border-luxury text-[#0F1F3D] focus:ring-[#0F1F3D]/20 accent-[#0F1F3D]"
                                />
                                <span className={action.completed ? "line-through text-text-secondary" : ""}>
                                  {action.title}
                                </span>
                              </label>
                              
                              <button
                                onClick={() => handleDeleteActionItem(action.id)}
                                className="text-[10px] text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-colors"
                                title="Delete task"
                              >
                                ✕
                              </button>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Add action form */}
                      <form 
                        onSubmit={(e) => handleAddActionItem(e, stage.id)}
                        className="flex gap-2"
                      >
                        <input
                          type="text"
                          placeholder="Add custom verification step..."
                          value={addingActionStageId === stage.id ? "" : newActionText}
                          onChange={(e) => setNewActionText(e.target.value)}
                          className="flex-grow bg-surface border border-luxury px-3 py-1.5 rounded-input text-xs text-text-primary focus:outline-none focus:border-accent"
                          required
                        />
                        <button
                          type="submit"
                          disabled={addingActionStageId !== null}
                          className="px-3 bg-primary hover:bg-primary-light text-surface text-xs font-semibold rounded-[4px] transition-colors"
                        >
                          Add
                        </button>
                      </form>
                    </div>

                    {/* Stage Notes */}
                    <div className="space-y-4">
                      <div className="border-b border-luxury pb-2">
                        <h5 className="text-xs font-bold uppercase tracking-wider text-primary">
                          Stage Notes & Observations
                        </h5>
                      </div>

                      <div className="space-y-2">
                        <textarea
                          placeholder="Log updates specific to this stage (e.g. KYC documentation provided, pending signature, etc.)"
                          defaultValue={stage.notes || ""}
                          onBlur={(e) => {
                            if (e.target.value !== (stage.notes || "")) {
                              handleSaveStageNotes(stage.id, e.target.value);
                            }
                          }}
                          rows={6}
                          className="w-full bg-surface border border-luxury p-3 rounded-input text-xs text-text-primary focus:outline-none focus:border-accent resize-none"
                        />
                        <p className="text-[9px] text-text-secondary italic">
                          * Notes are auto-saved on text area blur (clicking outside the text area).
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
