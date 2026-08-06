"use client";

import React, { useState, useEffect } from "react";
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  Calendar, 
  Hammer, 
  ExternalLink,
  Loader2,
  Sliders,
  MapPin,
  ChevronRight
} from "lucide-react";

const CATEGORIES = [
  { value: "ROAD_HIGHWAY", label: "Roads & Highways", icon: "🛣️" },
  { value: "METRO_RAIL", label: "Metro & Railways", icon: "🚝" },
  { value: "INDUSTRIAL_ZONE", label: "Industrial Parks/Zones", icon: "🏭" },
  { value: "PHARMA_BIOTECH", label: "Pharma & Biotech Hubs", icon: "🧪" },
  { value: "LOGISTICS_PARK", label: "Logistics & Warehousing", icon: "📦" },
  { value: "AIRPORT_AVIATION", label: "Airport & Aviation", icon: "✈️" },
  { value: "GOVT_APPROVAL", label: "Zoning & Approvals", icon: "🏛️" },
  { value: "TOWNSHIP", label: "Townships & Masterplans", icon: "🏘️" },
  { value: "IT_TECH_PARK", label: "IT & Tech Parks", icon: "💻" },
  { value: "UTILITY", label: "Utilities & Grids", icon: "⚡" },
];

const STATUSES = [
  { value: "ANNOUNCED", label: "Announced", color: "bg-slate-100 text-slate-700" },
  { value: "APPROVED", label: "Approved", color: "bg-blue-100 text-blue-800" },
  { value: "LAND_ACQUISITION", label: "Land Acquisition", color: "bg-amber-100 text-amber-800" },
  { value: "UNDER_CONSTRUCTION", label: "Under Construction", color: "bg-amber-100 text-amber-800" },
  { value: "PARTIALLY_COMPLETE", label: "Partially Complete", color: "bg-purple-100 text-purple-800" },
  { value: "COMPLETE", label: "Complete", color: "bg-emerald-100 text-emerald-800" },
  { value: "DELAYED", label: "Delayed", color: "bg-rose-100 text-rose-800" },
  { value: "CANCELLED", label: "Cancelled", color: "bg-slate-100 text-slate-500 line-through" },
];

const TAGS_OPTIONS = ["HMDA", "NHAI", "Bharatmala", "TSIIC", "GoT", "RERA"];

export default function InfrastructureProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [corridorList, setCorridorList] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);

  // Form Fields
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [category, setCategory] = useState("ROAD_HIGHWAY");
  const [subCategory, setSubCategory] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("ANNOUNCED");
  const [completionPct, setCompletionPct] = useState(0);
  const [estimatedCompletion, setEstimatedCompletion] = useState("");
  const [totalInvestmentCr, setTotalInvestmentCr] = useState<number | "">("");
  const [expectedJobs, setExpectedJobs] = useState<number | "">("");
  const [affectedCorridors, setAffectedCorridors] = useState<string[]>([]);
  const [impactRadius, setImpactRadius] = useState(10);
  const [latitude, setLatitude] = useState<number | "">("");
  const [longitude, setLongitude] = useState<number | "">("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceGO, setSourceGO] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [approvalAuthority, setApprovalAuthority] = useState("");
  const [reImpactScore, setReImpactScore] = useState(5);
  const [isPublished, setIsPublished] = useState(true);

  // Filters
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterCorridor, setFilterCorridor] = useState("ALL");

  // Milestones State
  const [milestones, setMilestones] = useState<any[]>([]);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState("");
  const [newMilestoneDate, setNewMilestoneDate] = useState("");
  const [newMilestoneStatus, setNewMilestoneStatus] = useState("UPCOMING");
  const [newMilestoneDesc, setNewMilestoneDesc] = useState("");

  useEffect(() => {
    fetchProjects();
  }, [filterCategory, filterStatus, filterCorridor]);

  useEffect(() => {
    async function loadCorridors() {
      try {
        const res = await fetch("/api/admin/corridors");
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.corridors) {
            setCorridorList(data.corridors);
          }
        }
      } catch (err) {
        console.error("Failed to load corridors", err);
      }
    }
    loadCorridors();
  }, []);

  async function fetchProjects() {
    setLoading(true);
    try {
      let url = `/api/admin/infra-projects?category=${filterCategory}&status=${filterStatus}&corridor=${filterCorridor}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (err) {
      console.error("Failed to load projects", err);
    } finally {
      setLoading(false);
    }
  }

  const handleOpenAddModal = () => {
    setEditingProject(null);
    setName("");
    setShortName("");
    setCategory("ROAD_HIGHWAY");
    setSubCategory("");
    setDescription("");
    setStatus("ANNOUNCED");
    setCompletionPct(0);
    setEstimatedCompletion("");
    setTotalInvestmentCr("");
    setExpectedJobs("");
    setAffectedCorridors([]);
    setImpactRadius(10);
    setLatitude("");
    setLongitude("");
    setSourceUrl("");
    setSourceGO("");
    setTags([]);
    setApprovalAuthority("");
    setReImpactScore(5);
    setIsPublished(true);
    setMilestones([]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (proj: any) => {
    setEditingProject(proj);
    setName(proj.name);
    setShortName(proj.shortName);
    setCategory(proj.category);
    setSubCategory(proj.subCategory || "");
    setDescription(proj.description);
    setStatus(proj.status);
    setCompletionPct(proj.completionPct);
    setEstimatedCompletion(proj.estimatedCompletion || "");
    setTotalInvestmentCr(proj.totalInvestmentCr || "");
    setExpectedJobs(proj.expectedJobs || "");
    setAffectedCorridors(proj.affectedCorridors || []);
    setImpactRadius(proj.impactRadius);
    setLatitude(proj.latitude || "");
    setLongitude(proj.longitude || "");
    setSourceUrl(proj.sourceUrl || "");
    setSourceGO(proj.sourceGO || "");
    setTags(proj.tags || []);
    setApprovalAuthority(proj.approvalAuthority || "");
    setReImpactScore(proj.reImpactScore);
    setIsPublished(proj.isPublished);
    setMilestones(proj.milestones || []);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name,
      shortName,
      category,
      subCategory: subCategory || null,
      description,
      status,
      completionPct,
      estimatedCompletion: estimatedCompletion || null,
      totalInvestmentCr: totalInvestmentCr ? Number(totalInvestmentCr) : null,
      expectedJobs: expectedJobs ? Number(expectedJobs) : null,
      affectedCorridors,
      impactRadius,
      latitude: latitude ? Number(latitude) : null,
      longitude: longitude ? Number(longitude) : null,
      sourceUrl: sourceUrl || null,
      sourceGO: sourceGO || null,
      tags,
      approvalAuthority: approvalAuthority || null,
      reImpactScore,
      isPublished
    };

    try {
      let res;
      if (editingProject) {
        res = await fetch(`/api/admin/infra-projects/${editingProject.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch("/api/admin/infra-projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        const savedProject = await res.json();
        const projectObj = savedProject.project || savedProject;

        if (editingProject) {
          await fetch(`/api/admin/infra-projects/${editingProject.id}/milestones`, { method: "DELETE" });
        }

        for (const ms of milestones) {
          await fetch(`/api/admin/infra-projects/${projectObj.id}/milestones`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: ms.title,
              date: ms.date,
              status: ms.status,
              description: ms.description,
              sourceUrl: ms.sourceUrl
            })
          });
        }

        setIsModalOpen(false);
        fetchProjects();
      } else {
        const err = await res.json();
        alert(`Error: ${err.error || "Failed to save project"}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error saving project");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this infrastructure project? This will also delete all associated milestones.")) return;
    try {
      const res = await fetch(`/api/admin/infra-projects/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchProjects();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddMilestone = () => {
    if (!newMilestoneTitle) return;
    const newMs = {
      title: newMilestoneTitle,
      date: newMilestoneDate || null,
      status: newMilestoneStatus,
      description: newMilestoneDesc || null
    };
    setMilestones([...milestones, newMs]);
    setNewMilestoneTitle("");
    setNewMilestoneDate("");
    setNewMilestoneStatus("UPCOMING");
    setNewMilestoneDesc("");
  };

  const handleRemoveMilestone = (index: number) => {
    setMilestones(milestones.filter((_, i) => i !== index));
  };

  const getImpactLabel = (score: number) => {
    if (score <= 3) return "Minor (1-3)";
    if (score <= 6) return "Moderate (4-6)";
    if (score <= 8) return "Significant (7-8)";
    return "Transformative (9-10)";
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
            Infrastructure Projects
          </h1>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="crm-btn-primary text-xs"
        >
          <Plus size={14} /> Add Infra Project
        </button>
      </div>

      {/* Filters */}
      <div className="crm-card p-6 flex flex-wrap gap-4 items-center">
        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[#8A8A9E]">Category</label>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-[#F9F8FD] border border-[#E8E5F5] rounded-full px-4 py-2 text-xs text-[#1A1A2E] focus:outline-none focus:border-[#5B4FE0]"
          >
            <option value="ALL">All Categories</option>
            {CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[#8A8A9E]">Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-[#F9F8FD] border border-[#E8E5F5] rounded-full px-4 py-2 text-xs text-[#1A1A2E] focus:outline-none focus:border-[#5B4FE0]"
          >
            <option value="ALL">All Statuses</option>
            {STATUSES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[#8A8A9E]">Corridor Affected</label>
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
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20 bg-white rounded-2xl animate-pulse">
          <Loader2 className="animate-spin text-[#5B4FE0]" size={30} />
        </div>
      ) : projects.length === 0 ? (
        <div className="crm-card py-16 px-4 text-center">
          <p className="text-[#8A8A9E] text-xs font-semibold">No infrastructure projects found matching the filters.</p>
        </div>
      ) : (
        <div className="crm-card p-0 overflow-hidden flex-grow">
          <table className="crm-table text-xs w-full">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Status</th>
                <th>Affected Corridors</th>
                <th className="text-center">Impact Score</th>
                <th className="text-center">Published</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((proj) => {
                const catInfo = CATEGORIES.find(c => c.value === proj.category);
                const statInfo = STATUSES.find(s => s.value === proj.status);

                return (
                  <tr key={proj.id}>
                    <td className="font-bold text-[#1A1A2E]">
                      <div className="font-bold text-[#1A1A2E] text-sm">{proj.name}</div>
                      <div className="text-[10px] text-[#8A8A9E] font-normal mt-0.5">{proj.shortName}</div>
                    </td>
                    <td className="text-[#1A1A2E]">
                      <span className="flex items-center gap-1.5 font-medium">
                        <span>{catInfo?.icon}</span>
                        <span>{catInfo?.label}</span>
                      </span>
                    </td>
                    <td>
                      <span className={`badge px-3 py-1 text-[10px] font-bold rounded-full ${statInfo?.color || "bg-slate-100 text-slate-700"}`}>
                        {statInfo?.label}
                      </span>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {proj.affectedCorridors.map((c: string) => (
                          <span key={c} className="badge bg-[#F4F0FF] text-[#5B4FE0] text-[10px] font-semibold">
                            {c}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="text-center">
                      <span className={`font-bold px-2.5 py-0.5 rounded-full text-xs ${proj.reImpactScore >= 8 ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"}`}>
                        {proj.reImpactScore}/10
                      </span>
                    </td>
                    <td className="text-center">
                      <span className={`inline-flex items-center justify-center p-1 rounded-full ${proj.isPublished ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-400"}`}>
                        {proj.isPublished ? <Check size={12} /> : <X size={12} />}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="flex justify-end items-center gap-2">
                        <button
                          onClick={() => handleOpenEditModal(proj)}
                          className="crm-btn-ghost text-xs text-[#5B4FE0] font-bold px-2.5 py-1"
                          title="Edit"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(proj.id)}
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

      {/* Modal Dialog Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#1A1A2E]/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="crm-card bg-white w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0EDFA]">
              <h2 className="text-base font-bold text-[#1A1A2E] flex items-center gap-2">
                <Hammer size={16} className="text-[#5B4FE0]" />
                {editingProject ? "Edit Infrastructure Project" : "Add Infrastructure Project"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-[#8A8A9E] hover:text-[#1A1A2E] p-1 rounded-full hover:bg-[#F4F0FF]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto pt-4 space-y-6 text-xs pr-2">
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-[#1A1A2E] uppercase tracking-wider">Project Details</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-[#8A8A9E] text-[10px] uppercase">Project Name (Full) *</label>
                    <input
                      type="text"
                      required
                      placeholder="Regional Ring Road - Northern Corridor"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="bg-[#F9F8FD] border border-[#E8E5F5] rounded-full px-4 py-2 text-xs text-[#1A1A2E] focus:outline-none focus:border-[#5B4FE0]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1.5">
                      <label className="font-bold text-[#8A8A9E] text-[10px] uppercase">Short Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="RRR North"
                        value={shortName}
                        onChange={(e) => setShortName(e.target.value)}
                        className="bg-[#F9F8FD] border border-[#E8E5F5] rounded-full px-4 py-2 text-xs text-[#1A1A2E] focus:outline-none focus:border-[#5B4FE0]"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="font-bold text-[#8A8A9E] text-[10px] uppercase">Category *</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="bg-[#F9F8FD] border border-[#E8E5F5] rounded-full px-4 py-2 text-xs text-[#1A1A2E] focus:outline-none focus:border-[#5B4FE0]"
                      >
                        {CATEGORIES.map(c => (
                          <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-[#8A8A9E] text-[10px] uppercase">Sub-category</label>
                    <input
                      type="text"
                      placeholder="Expressway / Metro / SEZ"
                      value={subCategory}
                      onChange={(e) => setSubCategory(e.target.value)}
                      className="bg-[#F9F8FD] border border-[#E8E5F5] rounded-full px-4 py-2 text-xs text-[#1A1A2E] focus:outline-none focus:border-[#5B4FE0]"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-[#8A8A9E] text-[10px] uppercase">Status *</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="bg-[#F9F8FD] border border-[#E8E5F5] rounded-full px-4 py-2 text-xs text-[#1A1A2E] focus:outline-none focus:border-[#5B4FE0]"
                    >
                      {STATUSES.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-[#8A8A9E] text-[10px] uppercase">Completion: {completionPct}%</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={completionPct}
                      onChange={(e) => setCompletionPct(Number(e.target.value))}
                      className="h-8 accent-[#5B4FE0]"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-[#8A8A9E] text-[10px] uppercase">Project Description *</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Provide a detailed description of the project..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="bg-[#F9F8FD] border border-[#E8E5F5] rounded-2xl p-4 text-xs text-[#1A1A2E] focus:outline-none focus:border-[#5B4FE0] resize-none"
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
                  Save Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
