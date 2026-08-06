"use client";

import React, { useState, useEffect } from "react";
import { 
  Plus, 
  Search, 
  Trash2, 
  TrendingUp, 
  Upload, 
  Download,
  Loader2,
  X,
  Check,
  ChevronRight
} from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function AppreciationPage() {
  const [selectedCorridor, setSelectedCorridor] = useState("shadnagar");
  const [corridorList, setCorridorList] = useState<any[]>([]);
  const [points, setPoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

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
        console.error("Failed to load corridors", err);
      }
    }
    loadCorridors();
  }, []);

  // Form Fields
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [quarter, setQuarter] = useState<number | "">("");
  const [pricePerSqFt, setPricePerSqFt] = useState<number | "">("");
  const [pricePerSqYd, setPricePerSqYd] = useState<number | "">("");
  const [source, setSource] = useState("Market Research");
  const [notes, setNotes] = useState("");

  // CSV Import State
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<string[][]>([]);
  const [importSummary, setImportSummary] = useState<any>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    fetchCorridorPoints();
  }, [selectedCorridor]);

  async function fetchCorridorPoints() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/appreciation/${encodeURIComponent(selectedCorridor)}`);
      if (res.ok) {
        const data = await res.json();
        setPoints(data);
      }
    } catch (err) {
      console.error("Failed to load price points", err);
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      corridor: selectedCorridor,
      year: Number(year),
      quarter: quarter ? Number(quarter) : null,
      pricePerSqFt: Number(pricePerSqFt),
      pricePerSqYd: pricePerSqYd ? Number(pricePerSqYd) : null,
      source: source || null,
      notes: notes || null
    };

    try {
      const res = await fetch("/api/admin/appreciation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsModalOpen(false);
        setQuarter("");
        setPricePerSqFt("");
        setPricePerSqYd("");
        setNotes("");
        fetchCorridorPoints();
      } else {
        const err = await res.json();
        alert(`Error: ${err.error || "Failed to save data point"}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error saving data point");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this price history point?")) return;
    try {
      const res = await fetch(`/api/admin/appreciation/${encodeURIComponent(selectedCorridor)}?id=${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        fetchCorridorPoints();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // CSV Import Helpers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
      const previewRows = lines.slice(0, 5).map(line => line.split(","));
      setCsvPreview(previewRows);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!csvFile) return;
    setImporting(true);
    setImportSummary(null);
    try {
      const csvText = await csvFile.text();
      const res = await fetch("/api/admin/appreciation/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText })
      });

      if (res.ok) {
        const summary = await res.json();
        setImportSummary(summary);
        fetchCorridorPoints();
      } else {
        const err = await res.json();
        alert(`Error: ${err.error || "Failed to import CSV"}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error uploading CSV");
    } finally {
      setImporting(false);
    }
  };

  const downloadCSVTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8,corridor,year,quarter,pricePerSqFt,pricePerSqYd,source,notes\nShadnagar,2025,,4000,,Market Research,Annual average\nKokapet,2025,1,9800,,RERA Data,Q1 Register";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "price_appreciation_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const chartData = points.map(pt => ({
    name: pt.quarter ? `${pt.year} Q${pt.quarter}` : `${pt.year}`,
    price: pt.pricePerSqFt,
    yoy: pt.yoyChange
  }));

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
            Price History Manager
          </h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="crm-btn-secondary text-xs"
          >
            <Upload size={14} className="text-[#5B4FE0]" /> Bulk Import CSV
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="crm-btn-primary text-xs"
          >
            <Plus size={14} /> Add Data Point
          </button>
        </div>
      </div>

      {/* Corridor Selector & Mini Chart Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Selector Panel */}
        <div className="crm-card p-6 flex flex-col gap-3">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[#8A8A9E]">Selected Corridor</label>
          <div className="space-y-1.5 overflow-y-auto max-h-80 pr-1">
            {corridorList.map(c => (
              <button
                key={c.corridor}
                onClick={() => setSelectedCorridor(c.corridor)}
                className={`w-full text-left px-4 py-2.5 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                  selectedCorridor === c.corridor 
                    ? "bg-gradient-to-r from-[#7C6EF5] to-[#5B4FE0] text-white shadow-md shadow-[#5B4FE0]/30 font-bold" 
                    : "bg-[#F9F8FD] hover:bg-[#F4F0FF] text-[#1A1A2E]"
                }`}
              >
                {c.shortName || c.name || c.corridor}
              </button>
            ))}
          </div>
        </div>

        {/* Chart Preview */}
        <div className="crm-card lg:col-span-2 p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-[#F5F3FB] mb-3">
            <h2 className="text-base font-display font-bold text-[#1A1A2E]">
              Price Appreciation Trend: {currentCorridorName}
            </h2>
            <ChevronRight size={16} className="text-[#8A8A9E]" />
          </div>
          {loading ? (
            <div className="flex-1 flex items-center justify-center min-h-[200px]">
              <Loader2 className="animate-spin text-[#5B4FE0]" size={24} />
            </div>
          ) : points.length === 0 ? (
            <div className="flex-1 flex items-center justify-center min-h-[200px] text-[#8A8A9E] italic text-xs">
              No price data points seeded for this corridor. Add a point to display chart.
            </div>
          ) : (
            <div className="flex-1 h-[220px] w-full text-[10px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0EDFA" />
                  <XAxis dataKey="name" stroke="#8A8A9E" />
                  <YAxis stroke="#8A8A9E" />
                  <Tooltip contentStyle={{ backgroundColor: "#FFFFFF", border: "none", borderRadius: "14px", fontFamily: "Inter", boxShadow: "0 8px 30px rgba(0,0,0,0.08)" }} />
                  <Line type="monotone" dataKey="price" stroke="#5B4FE0" strokeWidth={3} dot={{ r: 4, fill: "#7C6EF5" }} activeDot={{ r: 6 }} name="Price (₹/sqft)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Pricing Data Grid Table */}
      <div className="crm-card p-0 overflow-hidden flex-grow">
        <div className="px-6 py-4 border-b border-[#F5F3FB] flex items-center justify-between">
          <span className="text-xs font-bold text-[#1A1A2E]">Historical Valuations ({currentCorridorName})</span>
          <span className="text-[10px] text-[#8A8A9E] font-semibold">{points.length} records active</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-[#5B4FE0]" size={24} />
          </div>
        ) : points.length === 0 ? (
          <div className="py-12 text-center text-[#8A8A9E] italic text-xs">No records present.</div>
        ) : (
          <table className="crm-table text-xs w-full">
            <thead>
              <tr>
                <th>Year</th>
                <th className="text-center">Quarter</th>
                <th className="text-right">Price per SqFt (₹)</th>
                <th className="text-right">Price per SqYd (₹)</th>
                <th className="text-center">YoY Change (%)</th>
                <th className="text-center">QoQ Change (%)</th>
                <th>Source</th>
                <th>Notes</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {points.map((pt) => (
                <tr key={pt.id}>
                  <td className="font-bold text-[#1A1A2E]">{pt.year}</td>
                  <td className="text-center text-[#8A8A9E]">{pt.quarter || "—"}</td>
                  <td className="text-right font-bold text-[#1A1A2E]">₹{pt.pricePerSqFt.toLocaleString()}</td>
                  <td className="text-right text-[#8A8A9E]">
                    {pt.pricePerSqYd ? `₹${pt.pricePerSqYd.toLocaleString()}` : "—"}
                  </td>
                  <td className="text-center">
                    <span className={`badge px-2.5 py-0.5 text-[10px] font-bold rounded-full ${
                      pt.yoyChange >= 15 ? "bg-emerald-100 text-emerald-800" :
                      pt.yoyChange > 0 ? "bg-blue-100 text-blue-800" :
                      "bg-slate-100 text-slate-600"
                    }`}>
                      {pt.yoyChange >= 0 ? `+${pt.yoyChange}%` : `${pt.yoyChange}%`}
                    </span>
                  </td>
                  <td className="text-center">
                    <span className={`badge px-2.5 py-0.5 text-[10px] font-bold rounded-full ${
                      pt.qoqChange === null ? "text-[#8A8A9E]" :
                      pt.qoqChange >= 0 ? "bg-emerald-100 text-emerald-800" :
                      "bg-rose-100 text-rose-800"
                    }`}>
                      {pt.qoqChange === null ? "—" : pt.qoqChange >= 0 ? `+${pt.qoqChange}%` : `${pt.qoqChange}%`}
                    </span>
                  </td>
                  <td className="text-[#8A8A9E]">{pt.source || "—"}</td>
                  <td className="text-[#8A8A9E] text-[11px] max-w-[200px] truncate" title={pt.notes}>{pt.notes || "—"}</td>
                  <td className="text-right">
                    <button
                      onClick={() => handleDelete(pt.id)}
                      className="crm-btn-ghost text-xs text-rose-600 font-bold px-2 py-1"
                      title="Delete"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Data Point Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#1A1A2E]/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="crm-card bg-white w-full max-w-md shadow-2xl p-6 space-y-5 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0EDFA]">
              <h2 className="text-base font-bold text-[#1A1A2E] flex items-center gap-2">
                <TrendingUp size={16} className="text-[#5B4FE0]" />
                Add Appreciation Point
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-[#8A8A9E] hover:text-[#1A1A2E] p-1 rounded-full hover:bg-[#F4F0FF]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-[#8A8A9E] text-[10px] uppercase">Corridor</label>
                <input
                  type="text"
                  disabled
                  value={selectedCorridor}
                  className="bg-[#F9F8FD] border border-[#E8E5F5] text-[#8A8A9E] rounded-full px-4 py-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-[#8A8A9E] text-[10px] uppercase">Year *</label>
                  <input
                    type="number"
                    required
                    min="2000"
                    max="2100"
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="bg-[#F9F8FD] border border-[#E8E5F5] rounded-full px-4 py-2 text-xs text-[#1A1A2E] focus:outline-none focus:border-[#5B4FE0]"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-[#8A8A9E] text-[10px] uppercase">Quarter</label>
                  <select
                    value={quarter}
                    onChange={(e) => setQuarter(e.target.value ? Number(e.target.value) : "")}
                    className="bg-[#F9F8FD] border border-[#E8E5F5] rounded-full px-4 py-2 text-xs text-[#1A1A2E] focus:outline-none focus:border-[#5B4FE0]"
                  >
                    <option value="">Annual Average</option>
                    <option value="1">Q1 (Jan-Mar)</option>
                    <option value="2">Q2 (Apr-Jun)</option>
                    <option value="3">Q3 (Jul-Sep)</option>
                    <option value="4">Q4 (Oct-Dec)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-[#8A8A9E] text-[10px] uppercase">Price per SqFt (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 4200"
                    value={pricePerSqFt}
                    onChange={(e) => setPricePerSqFt(e.target.value ? Number(e.target.value) : "")}
                    className="bg-[#F9F8FD] border border-[#E8E5F5] rounded-full px-4 py-2 text-xs text-[#1A1A2E] focus:outline-none focus:border-[#5B4FE0]"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-[#8A8A9E] text-[10px] uppercase">Price per SqYd (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 35000"
                    value={pricePerSqYd}
                    onChange={(e) => setPricePerSqYd(e.target.value ? Number(e.target.value) : "")}
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
                  Save Point
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
