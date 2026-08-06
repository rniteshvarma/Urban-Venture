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
  { value: "APPROVED", label: "Approved", color: "bg-emerald-100 text-emerald-800" },
  { value: "PENDING", label: "Pending", color: "bg-amber-100 text-amber-800" },
  { value: "REVOKED", label: "Revoked", color: "bg-rose-100 text-rose-800" },
  { value: "EXPIRED", label: "Expired", color: "bg-slate-100 text-slate-600" },
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
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 flex-grow flex flex-col animate-fade-in text-[#1A1A2E] w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#F0EDFA]">
        <div>
          <span className="text-[11px] text-[#5B4FE0] font-bold uppercase tracking-widest block mb-1">
            Market Intelligence
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#1A1A2E]">
            Approval Records
          </h1>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="crm-btn-primary text-xs"
        >
          <Plus size={14} /> Add Approval Record
        </button>
      </div>

      {/* Filters Bar */}
      <div className="crm-card p-6 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#8A8A9E]">Corridor</label>
            <select
              value={filterCorridor}
              onChange={(e) => setFilterCorridor(e.target.value)}
              className="bg-[#F9F8FD] border border-[#E8E5F5] rounded-full px-4 py-2 text-xs text-[#1A1A2E] focus:outline-none focus:border-[#5B4FE0]"
            >
              <option value="ALL">All Corridors</option>
              {corridorList.map(c => (
                <option key={c.id} value={c.corridor}>{c.shortName || c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#8A8A9E]">Authority</label>
            <select
              value={filterAuthority}
              onChange={(e) => setFilterAuthority(e.target.value)}
              className="bg-[#F9F8FD] border border-[#E8E5F5] rounded-full px-4 py-2 text-xs text-[#1A1A2E] focus:outline-none focus:border-[#5B4FE0]"
            >
              <option value="ALL">All Authorities</option>
              {AUTHORITIES.map(a => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1 w-full sm:w-72">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[#8A8A9E]">Search</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search project, developer, number..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              onKeyDown={handleSearchKeyPress}
              className="w-full bg-[#F9F8FD] border border-[#E8E5F5] pl-9 pr-4 py-2 rounded-full text-xs text-[#1A1A2E] placeholder-[#8A8A9E] focus:outline-none focus:border-[#5B4FE0]"
            />
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A8A9E]" size={13} />
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20 bg-white rounded-2xl animate-pulse">
          <Loader2 className="animate-spin text-[#5B4FE0]" size={30} />
        </div>
      ) : approvals.length === 0 ? (
        <div className="crm-card py-16 px-4 text-center">
          <p className="text-[#8A8A9E] text-xs font-semibold">No approval records found.</p>
        </div>
      ) : (
        <div className="crm-card p-0 overflow-hidden flex-grow">
          <table className="crm-table text-xs w-full">
            <thead>
              <tr>
                <th>Project Name</th>
                <th>Developer</th>
                <th>Authority</th>
                <th>Approval Type</th>
                <th>Number</th>
                <th>Date</th>
                <th>Corridor</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {approvals.map((app) => {
                const authInfo = AUTHORITIES.find(a => a.value === app.authority);
                const typeInfo = APPROVAL_TYPES.find(t => t.value === app.approvalType);
                const statInfo = STATUSES.find(s => s.value === app.status);

                return (
                  <tr key={app.id}>
                    <td className="font-bold text-[#1A1A2E]">{app.projectName}</td>
                    <td className="text-[#8A8A9E]">{app.developerName || "—"}</td>
                    <td>
                      <span className="badge bg-[#F4F0FF] text-[#5B4FE0] font-bold text-[10px]">
                        {authInfo?.label || app.authority}
                      </span>
                    </td>
                    <td className="text-[#1A1A2E] font-medium">{typeInfo?.label || app.approvalType}</td>
                    <td className="font-mono text-[11px] text-[#6E6D8A]">{app.approvalNumber || "—"}</td>
                    <td className="text-[#8A8A9E]">
                      {app.approvalDate ? (
                        <span className="flex items-center gap-1">
                          <Calendar size={11} className="text-[#8A8A9E]" />
                          {new Date(app.approvalDate).toLocaleDateString()}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="font-semibold text-[#1A1A2E]">{app.corridor || "—"}</td>
                    <td>
                      <span className={`badge px-3 py-1 text-[10px] font-bold rounded-full ${statInfo?.color || "bg-slate-100 text-slate-700"}`}>
                        {statInfo?.label || app.status}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="flex justify-end items-center gap-2">
                        <button
                          onClick={() => handleOpenEditModal(app)}
                          className="crm-btn-ghost text-xs text-[#5B4FE0] font-bold px-2.5 py-1"
                          title="Edit"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(app.id)}
                          className="crm-btn-ghost text-xs text-rose-600 font-bold px-2.5 py-1"
                          title="Delete"
                        >
                          <Trash2 size={13} />
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

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#1A1A2E]/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="crm-card bg-white w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0EDFA]">
              <h2 className="text-base font-bold text-[#1A1A2E] flex items-center gap-2">
                <FileCheck size={16} className="text-[#5B4FE0]" />
                {editingApproval ? "Edit Approval Record" : "Add Approval Record"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-[#8A8A9E] hover:text-[#1A1A2E] p-1 rounded-full hover:bg-[#F4F0FF]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto pt-4 space-y-4 text-xs pr-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-[#8A8A9E] text-[10px] uppercase">Project Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Aura Premium Plots"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="bg-[#F9F8FD] border border-[#E8E5F5] rounded-full px-4 py-2 text-xs text-[#1A1A2E] focus:outline-none focus:border-[#5B4FE0]"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-[#8A8A9E] text-[10px] uppercase">Developer Name</label>
                  <input
                    type="text"
                    placeholder="Aura Developers"
                    value={developerName}
                    onChange={(e) => setDeveloperName(e.target.value)}
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
