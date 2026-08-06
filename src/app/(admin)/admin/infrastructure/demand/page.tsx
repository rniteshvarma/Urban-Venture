"use client";

import React, { useState, useEffect } from "react";
import { 
  TrendingDown, 
  Search, 
  Edit2, 
  Check, 
  X, 
  Loader2,
  Calendar,
  Save
} from "lucide-react";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function DemandTrendsPage() {
  const [selectedCorridor, setSelectedCorridor] = useState("shadnagar");
  const [corridorList, setCorridorList] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [trends, setTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMonth, setEditingMonth] = useState<any>(null);

  useEffect(() => {
    async function loadCorridors() {
      try {
        const res = await fetch("/api/admin/corridors");
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.corridors) {
            setCorridorList(data.corridors);
            if (data.corridors.length > 0) {
              setSelectedCorridor(data.corridors[0].corridor);
            }
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadCorridors();
  }, []);

  // Form Fields for single month edit
  const [month, setMonth] = useState<number>(1);
  const [newListings, setNewListings] = useState<number | "">("");
  const [inventoryUnits, setInventoryUnits] = useState<number | "">("");
  const [soldUnits, setSoldUnits] = useState<number | "">("");
  const [medianDaysOnMkt, setMedianDaysOnMkt] = useState<number | "">("");

  useEffect(() => {
    fetchTrends();
  }, [selectedCorridor, selectedYear]);

  async function fetchTrends() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/demand");
      if (res.ok) {
        const data = await res.json();
        const filtered = data.filter((d: any) => 
          d.corridor.toLowerCase() === selectedCorridor.toLowerCase() &&
          d.year === selectedYear
        );
        const fullYear = Array.from({ length: 12 }, (_, i) => {
          const m = i + 1;
          const match = filtered.find((f: any) => f.month === m);
          return match || {
            month: m,
            year: selectedYear,
            corridor: selectedCorridor,
            searchVolume: 0,
            inquiryCount: 0,
            siteVisits: 0,
            newListings: 0,
            inventoryUnits: 0,
            soldUnits: 0,
            absorptionRate: 0,
            medianDaysOnMkt: 0,
            id: null
          };
        });
        setTrends(fullYear);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleOpenEditModal = (t: any) => {
    setEditingMonth(t);
    setMonth(t.month);
    setNewListings(t.newListings || 0);
    setInventoryUnits(t.inventoryUnits || 0);
    setSoldUnits(t.soldUnits || 0);
    setMedianDaysOnMkt(t.medianDaysOnMkt || 0);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      newListings: newListings !== "" ? Number(newListings) : 0,
      inventoryUnits: inventoryUnits !== "" ? Number(inventoryUnits) : 0,
      soldUnits: soldUnits !== "" ? Number(soldUnits) : 0,
      medianDaysOnMkt: medianDaysOnMkt !== "" ? Number(medianDaysOnMkt) : 0,
    };

    try {
      const res = await fetch(`/api/admin/demand/${encodeURIComponent(selectedCorridor)}/${selectedYear}/${month}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchTrends();
      } else {
        const err = await res.json();
        alert(`Error: ${err.error || "Failed to update demand statistics"}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error saving data");
    }
  };

  const currentCorridorName = corridorList.find(c => c.corridor === selectedCorridor)?.shortName || selectedCorridor;

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 flex-grow flex flex-col animate-fade-in text-[#1A1A2E] w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#F0EDFA]">
        <div>
          <span className="text-[11px] text-[#5B4FE0] font-bold uppercase tracking-widest block mb-1">
            Market Intelligence
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#1A1A2E]">
            Demand Trends Manager
          </h1>
        </div>
      </div>

      {/* Selectors */}
      <div className="crm-card p-6 flex flex-wrap gap-4 items-center">
        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[#8A8A9E]">Corridor</label>
          <select
            value={selectedCorridor}
            onChange={(e) => setSelectedCorridor(e.target.value)}
            className="bg-[#F9F8FD] border border-[#E8E5F5] rounded-full px-4 py-2 text-xs text-[#1A1A2E] focus:outline-none focus:border-[#5B4FE0]"
          >
            {corridorList.map(c => (
              <option key={c.corridor} value={c.corridor}>
                {c.shortName || c.name || c.corridor}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[#8A8A9E]">Year</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-[#F9F8FD] border border-[#E8E5F5] rounded-full px-4 py-2 text-xs text-[#1A1A2E] focus:outline-none focus:border-[#5B4FE0]"
          >
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20 bg-white rounded-2xl animate-pulse">
          <Loader2 className="animate-spin text-[#5B4FE0]" size={30} />
        </div>
      ) : (
        <div className="crm-card p-0 overflow-hidden flex-grow">
          <div className="px-6 py-4 border-b border-[#F5F3FB] flex items-center justify-between">
            <span className="text-xs font-bold text-[#1A1A2E]">Monthly Demand Logs ({currentCorridorName} — {selectedYear})</span>
            <span className="text-[10px] text-[#8A8A9E] font-semibold">🔍 Search & Inquiry counts auto-calculated</span>
          </div>

          <table className="crm-table text-xs w-full">
            <thead>
              <tr>
                <th>Month</th>
                <th className="text-center">Search Volume</th>
                <th className="text-center">Inquiry Count</th>
                <th className="text-center">Site Visits</th>
                <th className="text-center">New Listings</th>
                <th className="text-center">Inventory Units</th>
                <th className="text-center">Sold Units</th>
                <th className="text-center">Absorption Rate</th>
                <th className="text-center">Days on Mkt</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {trends.map((t) => (
                <tr key={t.month}>
                  <td className="font-bold text-[#1A1A2E]">{MONTH_NAMES[t.month - 1]}</td>
                  <td className="text-center font-semibold text-[#1A1A2E]">{t.searchVolume}</td>
                  <td className="text-center font-semibold text-[#1A1A2E]">{t.inquiryCount}</td>
                  <td className="text-center text-[#8A8A9E]">{t.siteVisits}</td>
                  <td className="text-center text-[#1A1A2E]">{t.newListings || 0}</td>
                  <td className="text-center text-[#1A1A2E]">{t.inventoryUnits || 0}</td>
                  <td className="text-center text-[#1A1A2E]">{t.soldUnits || 0}</td>
                  <td className="text-center">
                    <span className={`badge px-2.5 py-0.5 text-[10px] font-bold rounded-full ${
                      t.absorptionRate >= 20 ? "bg-emerald-100 text-emerald-800" :
                      t.absorptionRate >= 10 ? "bg-blue-100 text-blue-800" :
                      t.absorptionRate > 0 ? "bg-slate-100 text-slate-700" :
                      "text-slate-400"
                    }`}>
                      {t.absorptionRate ? `${t.absorptionRate}%` : "0%"}
                    </span>
                  </td>
                  <td className="text-center text-[#8A8A9E]">{t.medianDaysOnMkt || "—"} days</td>
                  <td className="text-right">
                    <button
                      onClick={() => handleOpenEditModal(t)}
                      className="crm-btn-ghost text-xs text-[#5B4FE0] font-bold px-2 py-1"
                      title="Update Metrics"
                    >
                      <Edit2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Monthly Data Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#1A1A2E]/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="crm-card bg-white w-full max-w-sm shadow-2xl p-6 space-y-5 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0EDFA]">
              <h2 className="text-base font-bold text-[#1A1A2E] flex items-center gap-2">
                <Calendar size={16} className="text-[#5B4FE0]" />
                Update {MONTH_NAMES[month - 1]} Stats
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-[#8A8A9E] hover:text-[#1A1A2E] p-1 rounded-full hover:bg-[#F4F0FF]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-[#8A8A9E] text-[10px] uppercase">New Listings</label>
                  <input
                    type="number"
                    min="0"
                    value={newListings}
                    onChange={(e) => setNewListings(e.target.value !== "" ? Number(e.target.value) : "")}
                    className="bg-[#F9F8FD] border border-[#E8E5F5] rounded-full px-4 py-2 text-xs text-[#1A1A2E] focus:outline-none focus:border-[#5B4FE0]"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-[#8A8A9E] text-[10px] uppercase">Inventory Units</label>
                  <input
                    type="number"
                    min="0"
                    value={inventoryUnits}
                    onChange={(e) => setInventoryUnits(e.target.value !== "" ? Number(e.target.value) : "")}
                    className="bg-[#F9F8FD] border border-[#E8E5F5] rounded-full px-4 py-2 text-xs text-[#1A1A2E] focus:outline-none focus:border-[#5B4FE0]"
                  />
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
                  Update Stats
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
