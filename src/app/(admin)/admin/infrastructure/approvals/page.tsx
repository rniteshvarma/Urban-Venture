"use client";

import React, { useState, useEffect } from "react";
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  FileCheck,
  Calendar,
  Loader2
} from "lucide-react";

const APPROVAL_TYPES = [
  { value: "LAYOUT_APPROVAL", label: "Layout Approval (LP)" },
  { value: "BUILDING_PERMISSION", label: "Building Permission" },
  { value: "RERA_REGISTRATION", label: "RERA Registration" },
  { value: "ENVIRONMENTAL_CLEARANCE", label: "Environmental Clearance" },
  { value: "SEZ_APPROVAL", label: "SEZ Approval" },
  { value: "INDUSTRIAL_ALLOTMENT", label: "Industrial Allotment" },
  { value: "TOWNSHIP_APPROVAL", label: "Township Approval" },
];

const AUTHORITIES = [
  { value: "HMDA", label: "HMDA (Metropolitan)" },
  { value: "DTCP", label: "DTCP (Districts)" },
  { value: "GHMC", label: "GHMC (Municipal)" },
  { value: "RERA_TELANGANA", label: "RERA Telangana" },
  { value: "TSIIC", label: "TSIIC (Industrial)" },
  { value: "NHAI", label: "NHAI (Highways)" },
  { value: "MOEF", label: "MoEF (Environment)" },
  { value: "GOT", label: "GoT (Government of Telangana)" },
];

const STATUSES = [
  { value: "APPROVED", label: "Approved", color: "bg-green-100 text-green-700 border-green-200" },
  { value: "PENDING", label: "Pending", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "REVOKED", label: "Revoked", color: "bg-red-100 text-red-700 border-red-200" },
  { value: "EXPIRED", label: "Expired", color: "bg-slate-100 text-slate-500 border-slate-200" },
];

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [corridorList, setCorridorList] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingApproval, setEditingApproval] = useState<any>(null);

  // Form Fields
  const [projectName, setProjectName] = useState("");
  const [developerName, setDeveloperName] = useState("");
  const [approvalType, setApprovalType] = useState("LAYOUT_APPROVAL");
  const [authority, setAuthority] = useState("HMDA");
  const [approvalNumber, setApprovalNumber] = useState("");
  const [approvalDate, setApprovalDate] = useState("");
  const [corridor, setCorridor] = useState("shadnagar");
  const [areaAcres, setAreaAcres] = useState<number | "">("");
  const [surveyNumbersInput, setSurveyNumbersInput] = useState("");
  const [status, setStatus] = useState("APPROVED");
  const [reraNumber, setReraNumber] = useState("");
  const [reraUrl, setReraUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [isPublished, setIsPublished] = useState(true);

  // Filters
  const [filterSearch, setFilterSearch] = useState("");
  const [filterCorridor, setFilterCorridor] = useState("ALL");
  const [filterAuthority, setFilterAuthority] = useState("ALL");

  useEffect(() => {
    fetchApprovals();
  }, [filterCorridor, filterAuthority]);

  useEffect(() => {
    async function loadCorridors() {
      try {
        const res = await fetch("/api/admin/corridors");
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.corridors) {
            setCorridorList(data.corridors);
            if (data.corridors.length > 0) {
              setCorridor(data.corridors[0].corridor);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load corridors", err);
      }
    }
    loadCorridors();
  }, []);

  async function fetchApprovals() {
    setLoading(true);
    try {
      let url = `/api/admin/approvals?corridor=${filterCorridor}&authority=${filterAuthority}&search=${encodeURIComponent(filterSearch)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setApprovals(data);
      }
    } catch (err) {
      console.error("Failed to load approvals", err);
    } finally {
      setLoading(false);
    }
  }

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      fetchApprovals();
    }
  };

  const handleOpenAddModal = () => {
    setEditingApproval(null);
    setProjectName("");
    setDeveloperName("");
    setApprovalType("LAYOUT_APPROVAL");
    setAuthority("HMDA");
    setApprovalNumber("");
    setApprovalDate("");
    setCorridor("Shadnagar");
    setAreaAcres("");
    setSurveyNumbersInput("");
    setStatus("APPROVED");
    setReraNumber("");
    setReraUrl("");
    setNotes("");
    setIsPublished(true);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (app: any) => {
    setEditingApproval(app);
    setProjectName(app.projectName);
    setDeveloperName(app.developerName || "");
    setApprovalType(app.approvalType);
    setAuthority(app.authority);
    setApprovalNumber(app.approvalNumber || "");
    setApprovalDate(app.approvalDate ? new Date(app.approvalDate).toISOString().split("T")[0] : "");
    setCorridor(app.corridor || "Shadnagar");
    setAreaAcres(app.areaAcres || "");
    setSurveyNumbersInput(app.surveyNumbers ? app.surveyNumbers.join(", ") : "");
    setStatus(app.status);
    setReraNumber(app.reraNumber || "");
    setReraUrl(app.reraUrl || "");
    setNotes(app.notes || "");
    setIsPublished(app.isPublished);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // Parse survey numbers comma-separated
    const surveyNumbers = surveyNumbersInput
      .split(",")
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const payload = {
      projectName,
      developerName: developerName || null,
      approvalType,
      authority,
      approvalNumber: approvalNumber || null,
      approvalDate: approvalDate || null,
      corridor: corridor || null,
      areaAcres: areaAcres ? Number(areaAcres) : null,
      surveyNumbers,
      status,
      reraNumber: reraNumber || null,
      reraUrl: reraUrl || null,
      notes: notes || null,
      isPublished
    };

    try {
      let res;
      if (editingApproval) {
        res = await fetch(`/api/admin/approvals/${editingApproval.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch("/api/admin/approvals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        setIsModalOpen(false);
        fetchApprovals();
      } else {
        const err = await res.json();
        alert(`Error: ${err.error || "Failed to save approval record"}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error saving approval record");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this approval record?")) return;
    try {
      const res = await fetch(`/api/admin/approvals/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchApprovals();
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
            <FileCheck className="text-blue-650" size={20} />
            Approval Records
          </h1>
          <p className="text-xs text-slate-500 mt-1">Track HMDA Layout permissions, DTCP permits, and RERA registration databases.</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-650 hover:bg-blue-750 text-white rounded text-xs font-bold transition-all shadow-sm shadow-blue-500/10 cursor-pointer"
        >
          <Plus size={14} /> Add Approval Record
        </button>
      </div>

      {/* Filters */}
      <div className="bg-slate-50 border border-slate-200 rounded p-4 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Corridor</label>
            <select
              value={filterCorridor}
              onChange={(e) => setFilterCorridor(e.target.value)}
              className="border border-slate-200 rounded px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-650"
            >
              <option value="ALL">All Corridors</option>
              {corridorList.map(c => (
                <option key={c.id} value={c.corridor}>{c.shortName || c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Authority</label>
            <select
              value={filterAuthority}
              onChange={(e) => setFilterAuthority(e.target.value)}
              className="border border-slate-200 rounded px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-650"
            >
              <option value="ALL">All Authorities</option>
              {AUTHORITIES.map(a => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1 w-full sm:w-72 mt-2 sm:mt-0">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Search</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search project, developer, number..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              onKeyDown={handleSearchKeyPress}
              className="w-full border border-slate-200 rounded pl-8 pr-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-650"
            />
            <Search className="absolute left-2.5 top-2.5 text-slate-400" size={13} />
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20 bg-white border border-slate-200 rounded">
          <Loader2 className="animate-spin text-blue-650" size={30} />
        </div>
      ) : approvals.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded py-12 px-4 text-center">
          <p className="text-slate-500 text-xs font-semibold">No approval records found.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Project Name</th>
                  <th className="px-4 py-3">Developer</th>
                  <th className="px-4 py-3">Authority</th>
                  <th className="px-4 py-3">Approval Type</th>
                  <th className="px-4 py-3">Number</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Corridor</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {approvals.map((app) => {
                  const authInfo = AUTHORITIES.find(a => a.value === app.authority);
                  const typeInfo = APPROVAL_TYPES.find(t => t.value === app.approvalType);
                  const statInfo = STATUSES.find(s => s.value === app.status);

                  return (
                    <tr key={app.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3.5 font-semibold text-slate-900">{app.projectName}</td>
                      <td className="px-4 py-3.5 text-slate-600">{app.developerName || "—"}</td>
                      <td className="px-4 py-3.5">
                        <span className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[9px] font-bold text-slate-700">
                          {authInfo?.label || app.authority}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-650">{typeInfo?.label || app.approvalType}</td>
                      <td className="px-4 py-3.5 font-mono text-[11px] text-slate-500">{app.approvalNumber || "—"}</td>
                      <td className="px-4 py-3.5 text-slate-500">
                        {app.approvalDate ? (
                          <span className="flex items-center gap-1">
                            <Calendar size={11} className="text-slate-400" />
                            {new Date(app.approvalDate).toLocaleDateString()}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-600">{app.corridor || "—"}</td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${statInfo?.color || "bg-slate-100 text-slate-700"}`}>
                          {statInfo?.label || app.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right space-x-1.5">
                        <button
                          onClick={() => handleOpenEditModal(app)}
                          className="p-1.5 text-slate-500 hover:text-blue-650 hover:bg-slate-100 rounded transition-colors cursor-pointer inline-flex"
                          title="Edit"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(app.id)}
                          className="p-1.5 text-slate-500 hover:text-red-650 hover:bg-red-50 rounded transition-colors cursor-pointer inline-flex"
                          title="Delete"
                        >
                          <Trash2 size={13} />
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

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded shadow-xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50 rounded-t">
              <h2 className="text-sm font-bold text-slate-950 flex items-center gap-1.5">
                <FileCheck size={16} className="text-blue-650" />
                {editingApproval ? "Edit Approval Record" : "Add Approval Record"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-650">Project Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Aura Premium Plots"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="border border-slate-250 rounded px-3 py-2 text-xs focus:ring-1 focus:ring-blue-650 focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-650">Developer Name</label>
                  <input
                    type="text"
                    placeholder="Aura Developers"
                    value={developerName}
                    onChange={(e) => setDeveloperName(e.target.value)}
                    className="border border-slate-250 rounded px-3 py-2 text-xs focus:ring-1 focus:ring-blue-650 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-650">Approval Type *</label>
                  <select
                    value={approvalType}
                    onChange={(e) => setApprovalType(e.target.value)}
                    className="border border-slate-250 rounded px-3 py-2 text-xs focus:ring-1 focus:ring-blue-650 focus:outline-none bg-white"
                  >
                    {APPROVAL_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-650">Authority *</label>
                  <select
                    value={authority}
                    onChange={(e) => setAuthority(e.target.value)}
                    className="border border-slate-250 rounded px-3 py-2 text-xs focus:ring-1 focus:ring-blue-650 focus:outline-none bg-white"
                  >
                    {AUTHORITIES.map(a => (
                      <option key={a.value} value={a.value}>{a.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-650">Approval/LP Number</label>
                  <input
                    type="text"
                    placeholder="LP-000456/2025/HMDA"
                    value={approvalNumber}
                    onChange={(e) => setApprovalNumber(e.target.value)}
                    className="border border-slate-250 rounded px-3 py-2 text-xs focus:ring-1 focus:ring-blue-650 focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-650">Approval Date</label>
                  <input
                    type="date"
                    value={approvalDate}
                    onChange={(e) => setApprovalDate(e.target.value)}
                    className="border border-slate-250 rounded px-3 py-2 text-xs focus:ring-1 focus:ring-blue-650 focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-650">Corridor *</label>
                  <select
                    value={corridor}
                    onChange={(e) => setCorridor(e.target.value)}
                    className="border border-slate-250 rounded px-3 py-2 text-xs focus:ring-1 focus:ring-blue-650 focus:outline-none bg-white"
                  >
                    {corridorList.map(c => (
                      <option key={c.id} value={c.corridor}>{c.shortName || c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-650">Area (in Acres)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 45.2"
                    value={areaAcres}
                    onChange={(e) => setAreaAcres(e.target.value ? Number(e.target.value) : "")}
                    className="border border-slate-250 rounded px-3 py-2 text-xs focus:ring-1 focus:ring-blue-650 focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-650">Survey Numbers (comma-separated)</label>
                  <input
                    type="text"
                    placeholder="120, 121, 122"
                    value={surveyNumbersInput}
                    onChange={(e) => setSurveyNumbersInput(e.target.value)}
                    className="border border-slate-250 rounded px-3 py-2 text-xs focus:ring-1 focus:ring-blue-650 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-650">RERA Number</label>
                  <input
                    type="text"
                    placeholder="P02400005678"
                    value={reraNumber}
                    onChange={(e) => setReraNumber(e.target.value)}
                    className="border border-slate-250 rounded px-3 py-2 text-xs focus:ring-1 focus:ring-blue-650 focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-650">RERA URL</label>
                  <input
                    type="url"
                    placeholder="https://rera.telangana.gov.in"
                    value={reraUrl}
                    onChange={(e) => setReraUrl(e.target.value)}
                    className="border border-slate-250 rounded px-3 py-2 text-xs focus:ring-1 focus:ring-blue-650 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-650">Status *</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="border border-slate-250 rounded px-3 py-2 text-xs focus:ring-1 focus:ring-blue-650 focus:outline-none bg-white"
                  >
                    {STATUSES.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between border border-slate-200 bg-slate-50 rounded px-4 py-2">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-900">Publish Approval</span>
                    <span className="text-[10px] text-slate-400">Control visibility on public portal.</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPublished}
                      onChange={(e) => setIsPublished(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-650"></div>
                  </label>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-650">Notes / Details</label>
                <textarea
                  rows={3}
                  placeholder="Provide any additional layout approval notes..."
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
                  {editingApproval ? "Update Record" : "Create Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
