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
  { value: "BULLISH", label: "Bullish", color: "bg-green-150 text-green-800 border-green-200" },
  { value: "NEUTRAL", label: "Neutral", color: "bg-amber-100 text-amber-800 border-amber-250" },
  { value: "CAUTIOUS", label: "Cautious", color: "bg-red-100 text-red-800 border-red-200" },
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
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Brain className="text-blue-650" size={20} />
            Corridor Intelligence Scores
          </h1>
          <p className="text-xs text-slate-500 mt-1">Audit area intelligence ratings, sentiment trends, and narrative commentary summaries.</p>
        </div>
        <button
          onClick={handleRecomputeAll}
          disabled={recomputing}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-950 text-white rounded text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
        >
          {recomputing ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
          Recompute All Scores
        </button>
      </div>

      {/* Grid Dashboard */}
      {loading ? (
        <div className="flex items-center justify-center py-20 bg-white border border-slate-200 rounded">
          <Loader2 className="animate-spin text-blue-650" size={30} />
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Corridor</th>
                  <th className="px-4 py-3 text-center">Overall (100)</th>
                  <th className="px-4 py-3 text-center">Infra (25)</th>
                  <th className="px-4 py-3 text-center">Approvals (25)</th>
                  <th className="px-4 py-3 text-center">Demand (25)</th>
                  <th className="px-4 py-3 text-center">Appreciation (25)</th>
                  <th className="px-4 py-3">Sentiment</th>
                  <th className="px-4 py-3">Last Computed</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {corridors.map((c) => {
                  const sentInfo = SENTIMENTS.find(s => s.value === c.investorSentiment);
                  const isRec = recomputingSingle === c.corridor;

                  return (
                    <tr key={c.corridor} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3.5 font-bold text-slate-950">{c.corridor}</td>
                      <td className="px-4 py-3.5 text-center font-mono">
                        <span className={`px-2 py-0.5 rounded font-bold ${
                          c.overallScore >= 75 ? "bg-green-50 text-green-700" :
                          c.overallScore >= 50 ? "bg-amber-50 text-amber-700" :
                          "bg-red-50 text-red-700"
                        }`}>
                          {c.overallScore}/100
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center font-semibold text-slate-650">{c.infraScore}/25</td>
                      <td className="px-4 py-3.5 text-center text-slate-600">{c.approvalScore}/25</td>
                      <td className="px-4 py-3.5 text-center text-slate-600">{c.demandScore}/25</td>
                      <td className="px-4 py-3.5 text-center text-slate-600">{c.appreciationScore}/25</td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${sentInfo?.color || "bg-slate-100 text-slate-700"}`}>
                          {sentInfo?.label || c.investorSentiment}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-400 text-[10px]">
                        {c.lastComputedAt ? (
                          <span className="flex items-center gap-1">
                            <Calendar size={11} />
                            {new Date(c.lastComputedAt).toLocaleString()}
                          </span>
                        ) : "Never"}
                      </td>
                      <td className="px-4 py-3.5 text-right space-x-1.5">
                        <button
                          onClick={() => handleRecomputeSingle(c.corridor)}
                          disabled={isRec}
                          className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors inline-flex disabled:opacity-50 cursor-pointer"
                          title="Recompute Rating"
                        >
                          {isRec ? <Loader2 className="animate-spin" size={13} /> : <RefreshCw size={13} />}
                        </button>
                        <button
                          onClick={() => handleOpenOverrideModal(c)}
                          className="p-1 text-slate-500 hover:text-blue-650 hover:bg-slate-100 rounded transition-colors inline-flex cursor-pointer"
                          title="Override Narrative"
                        >
                          <Edit size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Override Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded shadow-xl border border-slate-200 w-full max-w-xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50 rounded-t">
              <h2 className="text-sm font-bold text-slate-950 flex items-center gap-1.5">
                <Brain size={16} className="text-blue-650" />
                Override Intelligence details: {editingCorridor?.corridor}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveOverride} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              <div className="flex flex-col gap-1 border border-slate-200 bg-slate-50 p-3 rounded text-[11px] text-slate-500">
                <div className="flex items-center gap-1 font-bold text-slate-700">
                  <AlertCircle size={14} /> Admin Override
                </div>
                Overriding will keep the calculated score components but replace the sentiment badge, drivers list, and commenting shown to buyers.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-650">Investor Sentiment *</label>
                  <select
                    value={overrideSentiment}
                    onChange={(e) => setOverrideSentiment(e.target.value)}
                    className="border border-slate-250 rounded px-3 py-2 text-xs focus:ring-1 focus:ring-blue-650 focus:outline-none bg-white font-bold"
                  >
                    {SENTIMENTS.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-650">Best Suited For (Persona segments)</label>
                  <div className="border border-slate-250 rounded p-2 max-h-[85px] overflow-y-auto space-y-1 bg-white">
                    {PERSONAS.map(p => {
                      const checked = overridePersonas.includes(p.value);
                      return (
                        <label key={p.value} className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              if (checked) {
                                setOverridePersonas(overridePersonas.filter(x => x !== p.value));
                              } else {
                                setOverridePersonas([...overridePersonas, p.value]);
                              }
                            }}
                            className="accent-blue-650 rounded"
                          />
                          <span>{p.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-650">Key Growth Drivers (One per line)</label>
                <textarea
                  rows={3}
                  placeholder="Proximity to ORR Junction&#10;Affordable plot availability"
                  value={overrideDrivers}
                  onChange={(e) => setOverrideDrivers(e.target.value)}
                  className="border border-slate-250 rounded px-3 py-2 text-xs focus:ring-1 focus:ring-blue-650 focus:outline-none font-sans"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-650">Key Market Risks (One per line)</label>
                <textarea
                  rows={2}
                  placeholder="Delayed utility grid connectivity&#10;Speculative bubbles in outer rings"
                  value={overrideRisks}
                  onChange={(e) => setOverrideRisks(e.target.value)}
                  className="border border-slate-250 rounded px-3 py-2 text-xs focus:ring-1 focus:ring-blue-650 focus:outline-none font-sans"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-650">Investor Commentary (Admin Note shown to client)</label>
                <textarea
                  rows={3}
                  placeholder="2-sentence market commentary for investors..."
                  value={overrideNote}
                  onChange={(e) => setOverrideNote(e.target.value)}
                  className="border border-slate-250 rounded px-3 py-2 text-xs focus:ring-1 focus:ring-blue-650 focus:outline-none font-sans"
                />
              </div>

              {/* Actions Footer */}
              <div className="border-t border-slate-200 pt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-250 text-slate-600 rounded text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-650 text-white rounded text-xs font-bold hover:bg-blue-750 cursor-pointer"
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
