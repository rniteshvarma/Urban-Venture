"use client";

import React, { useState, useEffect } from "react";
import { 
  Brain, 
  RefreshCw, 
  Edit, 
  Check, 
  X, 
  Loader2,
  Calendar,
  AlertCircle
} from "lucide-react";

const SENTIMENTS = [
  { value: "BULLISH", label: "Bullish", color: "bg-emerald-100 text-emerald-800" },
  { value: "NEUTRAL", label: "Neutral", color: "bg-amber-100 text-amber-800" },
  { value: "CAUTIOUS", label: "Cautious", color: "bg-rose-100 text-rose-800" },
];

const PERSONAS = [
  { value: "FIRST_TIME_BUYER", label: "First-Time Buyer" },
  { value: "NRI_INVESTOR", label: "NRI Investor" },
  { value: "LAND_SPECULATOR", label: "Land Speculator" },
  { value: "RETIREMENT_PLANNER", label: "Retirement Planner" },
  { value: "HNI_PORTFOLIO_BUILDER", label: "HNI Portfolio Builder" },
  { value: "PROFESSIONAL_FIRST_HOME", label: "Professional First Home" },
];

export default function CorridorIntelligencePage() {
  const [corridors, setCorridors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [recomputing, setRecomputing] = useState(false);
  const [recomputingSingle, setRecomputingSingle] = useState<string | null>(null);
  
  // Override Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCorridor, setEditingCorridor] = useState<any>(null);
  const [overrideSentiment, setOverrideSentiment] = useState<string>("NEUTRAL");
  const [overrideNote, setOverrideNote] = useState("");
  const [overrideDrivers, setOverrideDrivers] = useState<string>("");
  const [overrideRisks, setOverrideRisks] = useState<string>("");
  const [overridePersonas, setOverridePersonas] = useState<string[]>([]);

  useEffect(() => {
    fetchCorridors();
  }, []);

  async function fetchCorridors() {
    setLoading(true);
    try {
      const res = await fetch("/api/market/corridors");
      if (res.ok) {
        const data = await res.json();
        setCorridors(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleRecomputeAll = async () => {
    setRecomputing(true);
    try {
      const res = await fetch("/api/admin/intelligence/recompute", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        alert(data.message || "Recomputed all scores successfully!");
        fetchCorridors();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRecomputing(false);
    }
  };

  const handleRecomputeSingle = async (corridorName: string) => {
    setRecomputingSingle(corridorName);
    try {
      const res = await fetch(`/api/admin/intelligence/${encodeURIComponent(corridorName)}/recompute`, { method: "POST" });
      if (res.ok) {
        fetchCorridors();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRecomputingSingle(null);
    }
  };

  const handleOpenOverrideModal = (c: any) => {
    setEditingCorridor(c);
    setOverrideSentiment(c.investorSentiment || "NEUTRAL");
    setOverrideNote(c.adminNote || "");
    setOverrideDrivers(c.keyDrivers ? c.keyDrivers.join("\n") : "");
    setOverrideRisks(c.keyRisks ? c.keyRisks.join("\n") : "");
    setOverridePersonas(c.bestFor || []);
    setIsModalOpen(true);
  };

  const handleSaveOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      investorSentiment: overrideSentiment,
      adminNote: overrideNote,
      keyDrivers: overrideDrivers.split("\n").map(d => d.trim()).filter(d => d.length > 0),
      keyRisks: overrideRisks.split("\n").map(r => r.trim()).filter(r => r.length > 0),
      bestFor: overridePersonas
    };

    try {
      const res = await fetch(`/api/admin/intelligence/${encodeURIComponent(editingCorridor.corridor)}/override`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchCorridors();
      } else {
        const err = await res.json();
        alert(`Error: ${err.error || "Failed to update overrides"}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 flex-grow flex flex-col animate-fade-in text-[#1A1A2E] w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#F0EDFA]">
        <div>
          <span className="text-[11px] text-[#5B4FE0] font-bold uppercase tracking-widest block mb-1">
            Market Intelligence
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#1A1A2E]">
            Corridor Intelligence Scores
          </h1>
        </div>
        <button
          onClick={handleRecomputeAll}
          disabled={recomputing}
          className="crm-btn-primary text-xs disabled:opacity-50"
        >
          {recomputing ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
          Recompute All Scores
        </button>
      </div>

      {/* Grid Dashboard */}
      {loading ? (
        <div className="flex items-center justify-center py-20 bg-white rounded-2xl animate-pulse">
          <Loader2 className="animate-spin text-[#5B4FE0]" size={30} />
        </div>
      ) : (
        <div className="crm-card p-0 overflow-hidden flex-grow">
          <table className="crm-table text-xs w-full">
            <thead>
              <tr>
                <th>Corridor</th>
                <th className="text-center">Overall (100)</th>
                <th className="text-center">Infra (25)</th>
                <th className="text-center">Approvals (25)</th>
                <th className="text-center">Demand (25)</th>
                <th className="text-center">Appreciation (25)</th>
                <th>Sentiment</th>
                <th>Last Computed</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {corridors.map((c) => {
                const sentInfo = SENTIMENTS.find(s => s.value === c.investorSentiment);
                const isRec = recomputingSingle === c.corridor;

                return (
                  <tr key={c.corridor}>
                    <td className="font-bold text-[#1A1A2E]">{c.corridor}</td>
                    <td className="text-center">
                      <span className={`font-bold px-2.5 py-0.5 rounded-full text-xs ${
                        c.overallScore >= 75 ? "bg-emerald-100 text-emerald-800" :
                        c.overallScore >= 50 ? "bg-amber-100 text-amber-800" :
                        "bg-rose-100 text-rose-800"
                      }`}>
                        {c.overallScore}/100
                      </span>
                    </td>
                    <td className="text-center font-semibold text-[#1A1A2E]">{c.infraScore}/25</td>
                    <td className="text-center text-[#8A8A9E]">{c.approvalScore}/25</td>
                    <td className="text-center text-[#8A8A9E]">{c.demandScore}/25</td>
                    <td className="text-center text-[#8A8A9E]">{c.appreciationScore}/25</td>
                    <td>
                      <span className={`badge px-3 py-1 text-[10px] font-bold rounded-full ${sentInfo?.color || "bg-slate-100 text-slate-700"}`}>
                        {sentInfo?.label || c.investorSentiment}
                      </span>
                    </td>
                    <td className="text-[#8A8A9E] text-[11px]">
                      {c.lastComputedAt ? (
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />
                          {new Date(c.lastComputedAt).toLocaleString()}
                        </span>
                      ) : "Never"}
                    </td>
                    <td className="text-right">
                      <div className="flex justify-end items-center gap-2">
                        <button
                          onClick={() => handleRecomputeSingle(c.corridor)}
                          disabled={isRec}
                          className="crm-btn-ghost text-xs text-[#5B4FE0] font-bold px-2 py-1 disabled:opacity-50"
                          title="Recompute Rating"
                        >
                          {isRec ? <Loader2 className="animate-spin" size={13} /> : <RefreshCw size={13} />}
                        </button>
                        <button
                          onClick={() => handleOpenOverrideModal(c)}
                          className="crm-btn-ghost text-xs text-[#5B4FE0] font-bold px-2 py-1"
                          title="Override Narrative"
                        >
                          <Edit size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Override Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#1A1A2E]/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="crm-card bg-white w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0EDFA]">
              <h2 className="text-base font-bold text-[#1A1A2E] flex items-center gap-2">
                <Brain size={16} className="text-[#5B4FE0]" />
                Override: {editingCorridor?.corridor}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-[#8A8A9E] hover:text-[#1A1A2E] p-1 rounded-full hover:bg-[#F4F0FF]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveOverride} className="flex-1 overflow-y-auto pt-4 space-y-4 text-xs pr-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-[#8A8A9E] text-[10px] uppercase">Investor Sentiment *</label>
                  <select
                    value={overrideSentiment}
                    onChange={(e) => setOverrideSentiment(e.target.value)}
                    className="bg-[#F9F8FD] border border-[#E8E5F5] rounded-full px-4 py-2 text-xs text-[#1A1A2E] font-bold focus:outline-none focus:border-[#5B4FE0]"
                  >
                    {SENTIMENTS.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#F0EDFA]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="crm-btn-secondary px-5 py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="crm-btn-primary px-5 py-2 text-xs"
                >
                  Save Overrides
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
