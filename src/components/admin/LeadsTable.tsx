"use client";

import React from "react";

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
  persona: string | null;
  personaScore: number | null;
  personaReason: string | null;
  leadScore: number | null;
  leadScoreGrade: string | null;
  leadScoreFactors: any;
}

interface LeadsTableProps {
  leads: Lead[];
  onSelectRow: (lead: Lead) => void;
  onStatusChange: (leadId: string, newStatus: string) => Promise<void>;
  selectedIds: string[];
  onSelectAll: (checked: boolean) => void;
  onToggleRow: (id: string, checked: boolean) => void;
}

const PERSONA_CONFIGS: Record<string, { label: string; icon: string; color: string }> = {
  FIRST_TIME_BUYER: { label: "First-Time Buyer", icon: "🏠", color: "#3B82F6" },
  NRI_INVESTOR: { label: "NRI Investor", icon: "✈️", color: "#8B5CF6" },
  LAND_SPECULATOR: { label: "Land Speculator", icon: "📈", color: "#EF4444" },
  RETIREMENT_PLANNER: { label: "Retirement Planner", icon: "👴", color: "#10B981" },
  HNI_PORTFOLIO_BUILDER: { label: "HNI Portfolio", icon: "💼", color: "#F59E0B" },
  PROFESSIONAL_FIRST_HOME: { label: "Professional Home", icon: "💻", color: "#06B6D4" }
};

const GRADE_CONFIGS: Record<string, { icon: string; color: string; label: string }> = {
  A: { icon: "🔥", color: "bg-red-50 text-red-600 border-red-200", label: "Hot" },
  B: { icon: "⭐", color: "bg-amber-50 text-amber-600 border-amber-200", label: "Warm" },
  C: { icon: "🕐", color: "bg-blue-50 text-blue-600 border-blue-200", label: "Cool" },
  D: { icon: "❄️", color: "bg-slate-50 text-slate-500 border-slate-200", label: "Cold" }
};

export default function LeadsTable({
  leads,
  onSelectRow,
  onStatusChange,
  selectedIds,
  onSelectAll,
  onToggleRow,
}: LeadsTableProps) {
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "NEW":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "CONTACTED":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "INTERESTED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "NEGOTIATING":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "CONVERTED":
        return "bg-green-100 text-green-800 border-green-300";
      case "LOST":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const formatPrice = (val: number) => {
    return val < 100 ? `₹${val}L` : `₹${(val / 100).toFixed(1)}Cr`;
  };

  // Sort leads: highest leadScore first by default
  const sortedLeads = [...leads].sort((a, b) => (b.leadScore || 0) - (a.leadScore || 0));

  return (
    <div className="overflow-x-auto w-full">
      <table className="min-w-full divide-y divide-luxury text-left text-xs text-text-primary">
        <thead className="bg-luxury-bg text-text-secondary uppercase font-bold tracking-wider">
          <tr>
            <th className="px-6 py-4 w-4">
              <input
                type="checkbox"
                onChange={(e) => onSelectAll(e.target.checked)}
                checked={leads.length > 0 && selectedIds.length === leads.length}
                className="rounded border-luxury text-accent focus:ring-accent"
              />
            </th>
            <th className="px-6 py-4">Name / Contact</th>
            <th className="px-6 py-4">AI Segment</th>
            <th className="px-6 py-4">Lead Score</th>
            <th className="px-6 py-4">City</th>
            <th className="px-6 py-4">Budget</th>
            <th className="px-6 py-4">Horizon</th>
            <th className="px-6 py-4">Status</th>
            <th className="px-6 py-4">Registration</th>
            <th className="px-6 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-luxury bg-surface">
          {sortedLeads.map((lead) => {
            const isChecked = selectedIds.includes(lead.id);
            const persona = lead.persona ? PERSONA_CONFIGS[lead.persona] : null;
            const scoreGrade = lead.leadScoreGrade || "D";
            const gradeInfo = GRADE_CONFIGS[scoreGrade];
            const score = lead.leadScore || 0;

            // Safe parsing of score factors
            const factors = typeof lead.leadScoreFactors === "string"
              ? JSON.parse(lead.leadScoreFactors)
              : (lead.leadScoreFactors || {});

            return (
              <tr 
                key={lead.id}
                className={`hover:bg-luxury-bg/30 transition-colors cursor-pointer ${
                  isChecked ? "bg-accent/5" : ""
                }`}
                onClick={() => onSelectRow(lead)}
              >
                {/* Checkbox column */}
                <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => onToggleRow(lead.id, e.target.checked)}
                    className="rounded border-luxury text-accent focus:ring-accent"
                  />
                </td>
                
                {/* Contact details */}
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-primary text-sm">{lead.name}</span>
                    <span className="text-text-secondary">{lead.email}</span>
                    <span className="text-text-secondary text-[10px]">{lead.phone}</span>
                  </div>
                </td>

                {/* AI Persona Segment */}
                <td className="px-6 py-4">
                  {persona ? (
                    <div className="relative group/persona inline-block">
                      <span 
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider text-white select-none"
                        style={{ backgroundColor: persona.color }}
                      >
                        <span>{persona.icon}</span>
                        <span>{persona.label}</span>
                      </span>
                      {lead.personaReason && (
                        <div className="absolute left-0 bottom-full mb-2 hidden group-hover/persona:block bg-slate-900 text-white text-[10px] p-2.5 rounded-lg shadow-xl z-50 w-60 border border-slate-700 leading-relaxed font-normal normal-case">
                          <span className="font-bold block mb-1 text-[11px]">Classification Rationale:</span>
                          {lead.personaReason}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded text-[9px] uppercase tracking-wider font-bold">
                      Unclassified
                    </span>
                  )}
                </td>

                {/* Predictive Score with Popover */}
                <td className="px-6 py-4">
                  <div className="relative group/score inline-block" onClick={(e) => e.stopPropagation()}>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold leading-none select-none cursor-help ${gradeInfo.color}`}>
                      <span>{gradeInfo.icon}</span>
                      <span>{score}</span>
                      <span className="opacity-60">·</span>
                      <span>{gradeInfo.label}</span>
                    </span>

                    {/* CSS Hover Tooltip Popover */}
                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover/score:block bg-white text-slate-800 text-[10px] p-3.5 rounded-lg shadow-xl border border-slate-200 z-50 w-64 font-normal">
                      <span className="font-bold text-[11px] block border-b border-slate-100 pb-1.5 text-slate-900">
                        Predictive Conversion Score Factors
                      </span>
                      <div className="space-y-1.5 mt-2">
                        <div className="flex justify-between">
                          <span>Budget (₹ Lakhs)</span>
                          <span className="font-bold text-slate-700">{factors.budget || 0} / 20</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Horizon Alignment</span>
                          <span className="font-bold text-slate-700">{factors.horizon || 0} / 15</span>
                        </div>
                        <div className="flex justify-between">
                          <span>AI Searches Count</span>
                          <span className="font-bold text-slate-700">{factors.searches || 0} / 20</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Pipeline Stage Status</span>
                          <span className="font-bold text-slate-700">{factors.stage || 0} / 20</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Recency of Activity</span>
                          <span className="font-bold text-slate-700">{factors.recency || 0} / 15</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Lead Source Value</span>
                          <span className="font-bold text-slate-700">{factors.source || 0} / 5</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-100 pt-1.5 font-bold">
                          <span>Total Confidence Score</span>
                          <span className="text-blue-600">{score} / 100</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </td>
                
                {/* City */}
                <td className="px-6 py-4 capitalize font-semibold">{lead.city}</td>
                
                {/* Budget */}
                <td className="px-6 py-4 font-bold text-slate-900">
                  {formatPrice(lead.budget)}
                </td>
                
                {/* Horizon */}
                <td className="px-6 py-4 font-medium">{lead.horizon} Yrs</td>
                
                {/* Status Dropdown */}
                <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                  <select
                    value={lead.status}
                    onChange={(e) => onStatusChange(lead.id, e.target.value)}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-tag uppercase border focus:outline-none ${getStatusBadge(
                      lead.status
                    )}`}
                  >
                    <option value="NEW">New</option>
                    <option value="CONTACTED">Contacted</option>
                    <option value="INTERESTED">Interested</option>
                    <option value="NEGOTIATING">Negotiating</option>
                    <option value="CONVERTED">Converted</option>
                    <option value="LOST">Lost</option>
                  </select>
                </td>
                
                {/* Date */}
                <td className="px-6 py-4 text-text-secondary">
                  {new Date(lead.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                
                {/* Action arrow */}
                <td className="px-6 py-4 text-right text-blue-600 font-bold text-xs">
                  <span>View Details →</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
