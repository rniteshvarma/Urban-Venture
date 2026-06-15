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
  Check
} from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const CORRIDORS = ["Shadnagar", "Pharma City", "Sangareddy", "Kokapet", "Shamshabad", "Yadadri", "Kompally", "Adibatla"];

export default function AppreciationPage() {
  const [selectedCorridor, setSelectedCorridor] = useState("Shadnagar");
  const [points, setPoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

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

  // Format Recharts chart data
  const chartData = points.map(pt => ({
    name: pt.quarter ? `${pt.year} Q${pt.quarter}` : `${pt.year}`,
    price: pt.pricePerSqFt,
    yoy: pt.yoyChange
  }));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <TrendingUp className="text-blue-650" size={20} />
            Price History Manager
          </h1>
          <p className="text-xs text-slate-500 mt-1">Manage historic property valuations per square foot / yard and trace appreciation rates.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-250 text-slate-600 hover:bg-slate-100 rounded text-xs font-bold transition-all cursor-pointer"
          >
            <Upload size={14} /> Bulk Import CSV
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-650 hover:bg-blue-750 text-white rounded text-xs font-bold transition-all shadow-sm shadow-blue-500/10 cursor-pointer"
          >
            <Plus size={14} /> Add Data Point
          </button>
        </div>
      </div>

      {/* Corridor Selector & Mini Chart Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Selector Panel */}
        <div className="bg-slate-50 border border-slate-200 rounded p-4 flex flex-col gap-3">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Selected Corridor</label>
          <div className="space-y-1.5">
            {CORRIDORS.map(c => (
              <button
                key={c}
                onClick={() => setSelectedCorridor(c)}
                className={`w-full text-left px-3 py-2 text-xs font-semibold rounded border transition-all cursor-pointer ${
                  selectedCorridor === c 
                    ? "bg-blue-650 border-blue-650 text-white shadow-sm font-bold" 
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Chart Preview */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded p-4 flex flex-col">
          <h2 className="text-xs font-bold text-slate-900 border-b border-slate-150 pb-2 mb-3">
            Price Appreciation Trend: {selectedCorridor}
          </h2>
          {loading ? (
            <div className="flex-1 flex items-center justify-center min-h-[200px]">
              <Loader2 className="animate-spin text-blue-650" size={24} />
            </div>
          ) : points.length === 0 ? (
            <div className="flex-1 flex items-center justify-center min-h-[200px] text-slate-400 italic text-xs">
              No price data points seeded for this corridor. Add a point to display chart.
            </div>
          ) : (
            <div className="flex-1 h-[220px] w-full text-[10px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip contentStyle={{ fontSize: "11px", borderRadius: "4px" }} />
                  <Line type="monotone" dataKey="price" stroke="#0f172a" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Price (₹/sqft)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Pricing Data Grid Table */}
      <div className="bg-white border border-slate-200 rounded overflow-hidden shadow-sm">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-900">Historical Valuations ({selectedCorridor})</span>
          <span className="text-[10px] text-slate-400 font-semibold">{points.length} records active</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-blue-650" size={24} />
          </div>
        ) : points.length === 0 ? (
          <div className="py-8 text-center text-slate-400 italic text-xs">No records present.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Year</th>
                  <th className="px-4 py-3 text-center">Quarter</th>
                  <th className="px-4 py-3 text-right">Price per SqFt (₹)</th>
                  <th className="px-4 py-3 text-right">Price per SqYd (₹)</th>
                  <th className="px-4 py-3 text-center">YoY Change (%)</th>
                  <th className="px-4 py-3 text-center">QoQ Change (%)</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Notes</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {points.map((pt) => (
                  <tr key={pt.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900">{pt.year}</td>
                    <td className="px-4 py-3 text-center text-slate-500">{pt.quarter || "—"}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">₹{pt.pricePerSqFt.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {pt.pricePerSqYd ? `₹${pt.pricePerSqYd.toLocaleString()}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                        pt.yoyChange >= 15 ? "bg-green-50 text-green-700" :
                        pt.yoyChange > 0 ? "bg-blue-50 text-blue-700" :
                        "bg-slate-100 text-slate-500"
                      }`}>
                        {pt.yoyChange >= 0 ? `+${pt.yoyChange}%` : `${pt.yoyChange}%`}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                        pt.qoqChange === null ? "text-slate-400" :
                        pt.qoqChange >= 0 ? "bg-green-50/50 text-green-600" :
                        "bg-red-50 text-red-600"
                      }`}>
                        {pt.qoqChange === null ? "—" : pt.qoqChange >= 0 ? `+${pt.qoqChange}%` : `${pt.qoqChange}%`}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{pt.source || "—"}</td>
                    <td className="px-4 py-3 text-slate-400 text-[11px] max-w-[200px] truncate" title={pt.notes}>{pt.notes || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(pt.id)}
                        className="p-1 text-slate-400 hover:text-red-650 hover:bg-red-50 rounded transition-colors cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Data Point Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded shadow-xl border border-slate-200 w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50 rounded-t">
              <h2 className="text-sm font-bold text-slate-950 flex items-center gap-1.5">
                <TrendingUp size={16} className="text-blue-650" />
                Add Appreciation Point
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-650">Corridor</label>
                <input
                  type="text"
                  disabled
                  value={selectedCorridor}
                  className="border border-slate-200 bg-slate-50 text-slate-500 rounded px-3 py-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-650">Year *</label>
                  <input
                    type="number"
                    required
                    min="2000"
                    max="2100"
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="border border-slate-250 rounded px-3 py-2 text-xs focus:ring-1 focus:ring-blue-650 focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-650">Quarter (1-4, leave blank for Annual)</label>
                  <select
                    value={quarter}
                    onChange={(e) => setQuarter(e.target.value ? Number(e.target.value) : "")}
                    className="border border-slate-250 rounded px-3 py-2 text-xs focus:ring-1 focus:ring-blue-650 focus:outline-none bg-white"
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
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-650">Price per SqFt (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 4200"
                    value={pricePerSqFt}
                    onChange={(e) => setPricePerSqFt(e.target.value ? Number(e.target.value) : "")}
                    className="border border-slate-250 rounded px-3 py-2 text-xs focus:ring-1 focus:ring-blue-650 focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-650">Price per SqYd (₹, plot markets)</label>
                  <input
                    type="number"
                    placeholder="e.g. 35000"
                    value={pricePerSqYd}
                    onChange={(e) => setPricePerSqYd(e.target.value ? Number(e.target.value) : "")}
                    className="border border-slate-250 rounded px-3 py-2 text-xs focus:ring-1 focus:ring-blue-650 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-650">Data Source</label>
                <input
                  type="text"
                  placeholder="RERA Data / Market Surveys"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="border border-slate-250 rounded px-3 py-2 text-xs focus:ring-1 focus:ring-blue-650 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-650">Admin Commentary / Notes</label>
                <textarea
                  rows={2.5}
                  placeholder="Notes about local pricing tailwinds..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="border border-slate-250 rounded px-3 py-2 text-xs focus:ring-1 focus:ring-blue-650 focus:outline-none"
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
                  Save Point
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Bulk Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded shadow-xl border border-slate-200 w-full max-w-lg">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50 rounded-t">
              <h2 className="text-sm font-bold text-slate-950 flex items-center gap-1.5">
                <Upload size={16} className="text-blue-650" />
                Bulk Import Price History
              </h2>
              <button onClick={() => {
                setIsImportModalOpen(false);
                setCsvFile(null);
                setCsvPreview([]);
                setImportSummary(null);
              }} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs">
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded p-3">
                <div className="flex flex-col">
                  <span className="font-bold text-slate-900">Download CSV Format Template</span>
                  <span className="text-[10px] text-slate-450">Format required: corridor, year, quarter, pricePerSqFt, pricePerSqYd, source, notes</span>
                </div>
                <button
                  onClick={downloadCSVTemplate}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded text-[10px] cursor-pointer"
                >
                  <Download size={12} /> Template
                </button>
              </div>

              <div className="flex flex-col gap-1 border border-dashed border-slate-300 rounded p-6 bg-slate-50/50 justify-center items-center">
                <Upload size={24} className="text-slate-400 mb-2" />
                <label className="px-3 py-1.5 bg-white border border-slate-250 text-slate-700 font-semibold rounded cursor-pointer hover:bg-slate-50">
                  Select CSV File
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                {csvFile && <span className="text-[10px] text-slate-500 font-bold mt-2">{csvFile.name}</span>}
              </div>

              {/* Preview */}
              {csvPreview.length > 0 && !importSummary && (
                <div className="space-y-1.5">
                  <span className="font-bold text-slate-650 uppercase text-[9px] tracking-wider">CSV Data File Preview</span>
                  <div className="border border-slate-200 rounded overflow-x-auto">
                    <table className="w-full text-left border-collapse text-[10px] font-mono bg-slate-50/50">
                      <tbody>
                        {csvPreview.map((row, rIdx) => (
                          <tr key={rIdx} className="border-b border-slate-100">
                            {row.map((col, cIdx) => (
                              <td key={cIdx} className="px-2 py-1 truncate max-w-[100px]">{col}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Import Results Summary */}
              {importSummary && (
                <div className="bg-green-50 border border-green-200 text-green-800 rounded p-4 space-y-2">
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <Check size={16} /> Import Completed
                  </div>
                  <ul className="text-[11px] list-disc list-inside space-y-1">
                    <li>Records successfully imported/updated: <strong>{importSummary.importedCount}</strong></li>
                    <li>Records failed: <strong>{importSummary.failedCount}</strong></li>
                  </ul>
                  {importSummary.errors.length > 0 && (
                    <div className="mt-3">
                      <span className="font-bold text-red-700 block mb-1">Failures Details:</span>
                      <div className="max-h-[80px] overflow-y-auto font-mono text-[9px] text-red-650 bg-white border border-red-100 p-2 rounded space-y-1">
                        {importSummary.errors.map((err: string, idx: number) => (
                          <div key={idx}>{err}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Actions Footer */}
              <div className="border-t border-slate-200 pt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsImportModalOpen(false);
                    setCsvFile(null);
                    setCsvPreview([]);
                    setImportSummary(null);
                  }}
                  className="px-4 py-2 border border-slate-250 text-slate-600 rounded text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Close
                </button>
                {csvFile && !importSummary && (
                  <button
                    type="button"
                    disabled={importing}
                    onClick={handleImport}
                    className="px-4 py-2 bg-blue-650 text-white rounded text-xs font-bold hover:bg-blue-750 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {importing ? <Loader2 className="animate-spin" size={13} /> : <Upload size={13} />}
                    Start Import
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
