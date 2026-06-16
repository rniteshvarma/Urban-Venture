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
        // Filter by selected corridor and year
        const filtered = data.filter((d: any) => 
          d.corridor.toLowerCase() === selectedCorridor.toLowerCase() &&
          d.year === selectedYear
        );
        // Ensure all 12 months are represented (with zero counts if no record exists)
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
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <TrendingDown className="text-blue-650" size={20} />
            Demand Trends Manager
          </h1>
          <p className="text-xs text-slate-500 mt-1">Manage monthly search volumes, buyer inquiries, site visits, absorption rates, and inventory movements.</p>
        </div>
      </div>

      {/* Selectors */}
      <div className="bg-slate-50 border border-slate-200 rounded p-4 flex flex-wrap gap-4 items-center">
        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Corridor</label>
          <select
            value={selectedCorridor}
            onChange={(e) => setSelectedCorridor(e.target.value)}
            className="border border-slate-200 rounded px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-650"
          >
            {corridorList.map(c => (
              <option key={c.corridor} value={c.corridor}>
                {c.shortName || c.name || c.corridor}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Year</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="border border-slate-200 rounded px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-650"
          >
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20 bg-white border border-slate-200 rounded">
          <Loader2 className="animate-spin text-blue-650" size={30} />
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded overflow-hidden shadow-sm">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900">Monthly Demand Logs ({currentCorridorName} — {selectedYear})</span>
            <span className="text-[10px] text-slate-400 font-semibold">🔍 Search & Inquiry counts are auto-calculated from portal logs</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Month</th>
                  <th className="px-4 py-3 text-center">Search Volume</th>
                  <th className="px-4 py-3 text-center">Inquiry Count</th>
                  <th className="px-4 py-3 text-center">Site Visits</th>
                  <th className="px-4 py-3 text-center">New Listings</th>
                  <th className="px-4 py-3 text-center">Inventory Units</th>
                  <th className="px-4 py-3 text-center">Sold Units</th>
                  <th className="px-4 py-3 text-center">Absorption Rate</th>
                  <th className="px-4 py-3 text-center">Days on Mkt</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {trends.map((t) => (
                  <tr key={t.month} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-950">{MONTH_NAMES[t.month - 1]}</td>
                    <td className="px-4 py-3 text-center font-semibold text-slate-650">{t.searchVolume}</td>
                    <td className="px-4 py-3 text-center font-semibold text-slate-650">{t.inquiryCount}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{t.siteVisits}</td>
                    <td className="px-4 py-3 text-center text-slate-700">{t.newListings || 0}</td>
                    <td className="px-4 py-3 text-center text-slate-700">{t.inventoryUnits || 0}</td>
                    <td className="px-4 py-3 text-center text-slate-700">{t.soldUnits || 0}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                        t.absorptionRate >= 20 ? "bg-green-50 text-green-700" :
                        t.absorptionRate >= 10 ? "bg-blue-50 text-blue-700" :
                        t.absorptionRate > 0 ? "bg-slate-100 text-slate-600" :
                        "text-slate-400"
                      }`}>
                        {t.absorptionRate ? `${t.absorptionRate}%` : "0%"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600">{t.medianDaysOnMkt || "—"} days</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleOpenEditModal(t)}
                        className="p-1 text-slate-500 hover:text-blue-650 hover:bg-slate-100 rounded transition-colors cursor-pointer inline-flex"
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
        </div>
      )}

      {/* Edit Monthly Data Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded shadow-xl border border-slate-200 w-full max-w-sm">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50 rounded-t">
              <h2 className="text-sm font-bold text-slate-950 flex items-center gap-1.5">
                <Calendar size={16} className="text-blue-650" />
                Update Month Stats: {MONTH_NAMES[month - 1]}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {/* Body Form */}
            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-650">New Listings</label>
                  <input
                    type="number"
                    min="0"
                    value={newListings}
                    onChange={(e) => setNewListings(e.target.value !== "" ? Number(e.target.value) : "")}
                    className="border border-slate-250 rounded px-3 py-2 text-xs focus:ring-1 focus:ring-blue-650 focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-650">Inventory Units</label>
                  <input
                    type="number"
                    min="0"
                    value={inventoryUnits}
                    onChange={(e) => setInventoryUnits(e.target.value !== "" ? Number(e.target.value) : "")}
                    className="border border-slate-250 rounded px-3 py-2 text-xs focus:ring-1 focus:ring-blue-650 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-650">Sold Units</label>
                  <input
                    type="number"
                    min="0"
                    value={soldUnits}
                    onChange={(e) => setSoldUnits(e.target.value !== "" ? Number(e.target.value) : "")}
                    className="border border-slate-250 rounded px-3 py-2 text-xs focus:ring-1 focus:ring-blue-650 focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-650">Median Days on Market</label>
                  <input
                    type="number"
                    min="0"
                    value={medianDaysOnMkt}
                    onChange={(e) => setMedianDaysOnMkt(e.target.value !== "" ? Number(e.target.value) : "")}
                    className="border border-slate-250 rounded px-3 py-2 text-xs focus:ring-1 focus:ring-blue-650 focus:outline-none"
                  />
                </div>
              </div>

              {/* Dynamic absorption rate info */}
              <div className="bg-slate-50 border border-slate-150 p-3 rounded text-[11px] text-slate-500">
                💡 Absorption rate is auto-calculated: 
                <strong> {inventoryUnits && soldUnits && Number(inventoryUnits) > 0 
                  ? ((Number(soldUnits) / Number(inventoryUnits)) * 100).toFixed(1) 
                  : 0}%
                </strong>.
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
                  className="px-4 py-2 bg-blue-650 text-white rounded text-xs font-bold hover:bg-blue-750 flex items-center gap-1 cursor-pointer"
                >
                  <Save size={13} /> Update Stats
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
