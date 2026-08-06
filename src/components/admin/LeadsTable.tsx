"use client";

import React from "react";
import { User, ChevronRight, Check } from "lucide-react";

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

const PERSONA_CONFIGS: Record<string, { label: string; icon: string; bg: string; text: string; border: string }> = {
  FIRST_TIME_BUYER: { label: "First-Time Buyer", icon: "🏠", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-100" },
  NRI_INVESTOR: { label: "NRI Investor", icon: "✈️", bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-100" },
  LAND_SPECULATOR: { label: "Land Speculator", icon: "📈", bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-100" },
  RETIREMENT_PLANNER: { label: "Retirement Planner", icon: "👴", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-100" },
  HNI_PORTFOLIO_BUILDER: { label: "HNI Portfolio", icon: "💼", bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-100" },
  PROFESSIONAL_FIRST_HOME: { label: "Professional Home", icon: "💻", bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-100" }
};

const GRADE_CONFIGS: Record<string, { icon: string; color: string; label: string }> = {
  A: { icon: "🔥", color: "bg-rose-50 text-rose-700 border-rose-200", label: "Hot" },
  B: { icon: "⭐", color: "bg-amber-50 text-amber-800 border-amber-200", label: "Warm" },
  C: { icon: "🕐", color: "bg-blue-50 text-blue-700 border-blue-200", label: "Cool" },
  D: { icon: "❄️", color: "bg-slate-50 text-slate-600 border-slate-200", label: "Cold" }
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
        return "bg-blue-100 text-blue-800";
      case "CONTACTED":
        return "bg-amber-100 text-amber-800";
      case "INTERESTED":
        return "bg-purple-100 text-purple-800";
      case "NEGOTIATING":
        return "bg-amber-100 text-amber-800";
      case "CONVERTED":
        return "bg-emerald-100 text-emerald-800";
      case "LOST":
        return "bg-rose-100 text-rose-800";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const formatPrice = (val: number) => {
    return val < 100 ? `₹${val}L` : `₹${(val / 100).toFixed(1)}Cr`;
  };

  const sortedLeads = [...leads].sort((a, b) => (b.leadScore || 0) - (a.leadScore || 0));

  return (
    <div className="overflow-x-auto w-full">
      <table className="crm-table w-full text-xs">
        <thead>
          <tr>
            <th className="px-4 py-3.5 w-4">
              <input
                type="checkbox"
                onChange={(e) => onSelectAll(e.target.checked)}
                checked={leads.length > 0 && selectedIds.length === leads.length}
                className="rounded border-[#E2E8F0] text-[#5B4FE0] focus:ring-[#5B4FE0]"
              />
            </th>
            <th className="px-4 py-3.5 whitespace-nowrap">Client Name / Contact</th>
            <th className="px-4 py-3.5 whitespace-nowrap">Source</th>
            <th className="px-4 py-3.5 whitespace-nowrap">AI Segment</th>
            <th className="px-4 py-3.5 whitespace-nowrap">Lead Score</th>
            <th className="px-4 py-3.5 whitespace-nowrap">City</th>
            <th className="px-4 py-3.5 whitespace-nowrap">Budget</th>
            <th className="px-4 py-3.5 whitespace-nowrap">Horizon</th>
            <th className="px-4 py-3.5 whitespace-nowrap">Status</th>
            <th className="px-4 py-3.5 whitespace-nowrap">Registration</th>
            <th className="px-4 py-3.5 whitespace-nowrap text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {sortedLeads.map((lead) => {
            const isChecked = selectedIds.includes(lead.id);
            const persona = lead.persona ? PERSONA_CONFIGS[lead.persona] : null;
            const scoreGrade = lead.leadScoreGrade || "D";
            const gradeInfo = GRADE_CONFIGS[scoreGrade];
            const score = lead.leadScore || 0;

            const factors = typeof lead.leadScoreFactors === "string"
              ? JSON.parse(lead.leadScoreFactors)
              : (lead.leadScoreFactors || {});

            return (
              <tr 
                key={lead.id}
                className={`cursor-pointer ${
                  isChecked ? "bg-[#F4F0FF]" : ""
                }`}
                onClick={() => onSelectRow(lead)}
              >
                {/* Checkbox column */}
                <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => onToggleRow(lead.id, e.target.checked)}
                    className="rounded border-[#E2E8F0] text-[#5B4FE0] focus:ring-[#5B4FE0]"
                  />
                </td>
                
                {/* Contact details */}
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="crm-avatar-ring shrink-0">
                      <div className="w-8 h-8 rounded-full bg-[#EBE7F5] flex items-center justify-center text-[#5B4FE0] font-bold text-xs">
                        {lead.name.charAt(0)}
                      </div>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-[#1A1A2E] text-sm whitespace-nowrap">{lead.name}</span>
                      <span className="text-[#8A8A9E] text-xs whitespace-nowrap">{lead.email}</span>
                      <span className="text-[#8A8A9E] text-[10px] whitespace-nowrap">{lead.phone}</span>
                    </div>
                  </div>
                </td>

                {/* Source Pill Badge */}
                <td className="px-4 py-3.5 whitespace-nowrap">
                  {(() => {
                    const src = (lead.source || '').toLowerCase();
                    if (src.includes('99acres')) return <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-100 inline-flex items-center gap-1">99acres</span>;
                    if (src.includes('magicbricks')) return <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 inline-flex items-center gap-1">MagicBricks</span>;
                    if (src.includes('housing')) return <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-100 inline-flex items-center gap-1">Housing</span>;
                    if (src.includes('nobroker')) return <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-100 inline-flex items-center gap-1">NoBroker</span>;
                    if (src.includes('whatsapp')) return <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 inline-flex items-center gap-1">WhatsApp</span>;
                    if (src.includes('gmail')) return <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-100 inline-flex items-center gap-1">Gmail</span>;
                    if (src.includes('website')) return <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 inline-flex items-center gap-1">Website</span>;
                    return <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 inline-flex items-center gap-1">{lead.source || 'Manual'}</span>;
                  })()}
                </td>

                {/* AI Persona Segment */}
                <td className="px-4 py-3.5 whitespace-nowrap">
                  {persona ? (
                    <div className="relative group/persona inline-block">
                      <span 
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border select-none ${persona.bg} ${persona.text} ${persona.border}`}
                      >
                        <span>{persona.icon}</span>
                        <span>{persona.label}</span>
                      </span>
                      {lead.personaReason && (
                        <div className="absolute left-0 bottom-full mb-2 hidden group-hover/persona:block bg-[#1A1A2E] text-white text-[10px] p-3 rounded-xl shadow-xl z-50 w-60 leading-relaxed font-normal">
                          <span className="font-bold block mb-1 text-[11px]">Classification Rationale:</span>
                          {lead.personaReason}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="bg-[#F9F8FD] text-[#8A8A9E] border border-[#E8E5F5] px-3 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold">
                      Unclassified
                    </span>
                  )}
                </td>

                {/* Predictive Score with Popover */}
                <td className="px-4 py-3.5 whitespace-nowrap">
                  <div className="relative group/score inline-block" onClick={(e) => e.stopPropagation()}>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold leading-none select-none cursor-help ${gradeInfo.color}`}>
                      <span>{gradeInfo.icon}</span>
                      <span>{score}</span>
                      <span className="opacity-60">·</span>
                      <span>{gradeInfo.label}</span>
                    </span>

                    {/* Hover Popover */}
                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover/score:block bg-white text-[#1A1A2E] text-[10px] p-4 rounded-xl shadow-2xl border border-[#EBE7F5] z-50 w-64 font-normal">
                      <span className="font-bold text-[11px] block border-b border-[#F0EDFA] pb-2 text-[#1A1A2E]">
                        Predictive Conversion Score Factors
                      </span>
                      <div className="space-y-1.5 mt-2">
                        <div className="flex justify-between">
                          <span>Budget Fit</span>
                          <span className="font-bold text-[#5B4FE0]">{factors.budget || 0} / 20</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Horizon Alignment</span>
                          <span className="font-bold text-[#5B4FE0]">{factors.horizon || 0} / 15</span>
                        </div>
                        <div className="flex justify-between">
                          <span>AI Searches Count</span>
                          <span className="font-bold text-[#5B4FE0]">{factors.searches || 0} / 20</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Pipeline Stage Status</span>
                          <span className="font-bold text-[#5B4FE0]">{factors.stage || 0} / 20</span>
                        </div>
                        <div className="flex justify-between border-t border-[#F0EDFA] pt-1.5 font-bold">
                          <span>Total Score</span>
                          <span className="text-[#5B4FE0]">{score} / 100</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </td>
                
                {/* City */}
                <td className="px-4 py-3.5 capitalize font-semibold text-[#1A1A2E] whitespace-nowrap">{lead.city}</td>
                
                {/* Budget */}
                <td className="px-4 py-3.5 font-bold text-[#1A1A2E] whitespace-nowrap">
                  {formatPrice(lead.budget)}
                </td>
                
                {/* Horizon */}
                <td className="px-4 py-3.5 font-medium text-[#8A8A9E] whitespace-nowrap">{lead.horizon} Yrs</td>
                
                {/* Status Dropdown */}
                <td className="px-4 py-3.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  <select
                    value={lead.status}
                    onChange={(e) => onStatusChange(lead.id, e.target.value)}
                    className={`focus:outline-none px-3 py-1 rounded-full text-xs font-bold ${getStatusBadge(lead.status)}`}
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
                <td className="px-4 py-3.5 text-[#8A8A9E] whitespace-nowrap">
                  {new Date(lead.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                
                {/* Action arrow */}
                <td className="px-4 py-3.5 text-right text-[#5B4FE0] font-bold text-xs whitespace-nowrap">
                  <span className="hover:underline flex items-center justify-end gap-1">
                    Details <ChevronRight size={14} />
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
