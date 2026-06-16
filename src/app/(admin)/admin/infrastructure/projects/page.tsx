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
  MapPin
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
  { value: "ANNOUNCED", label: "Announced", color: "bg-slate-100 text-slate-700 border-slate-200" },
  { value: "APPROVED", label: "Approved", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "LAND_ACQUISITION", label: "Land Acquisition", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "UNDER_CONSTRUCTION", label: "Under Construction", color: "bg-orange-100 text-orange-700 border-orange-200 animate-pulse" },
  { value: "PARTIALLY_COMPLETE", label: "Partially Complete", color: "bg-teal-100 text-teal-700 border-teal-200" },
  { value: "COMPLETE", label: "Complete", color: "bg-green-100 text-green-700 border-green-200" },
  { value: "DELAYED", label: "Delayed", color: "bg-red-100 text-red-700 border-red-200" },
  { value: "CANCELLED", label: "Cancelled", color: "bg-slate-200 text-slate-500 border-slate-300 line-through" },
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

        // If edit mode, clear current milestones in DB first if any changes made, then save
        if (editingProject) {
          await fetch(`/api/admin/infra-projects/${editingProject.id}/milestones`, { method: "DELETE" });
        }

        // Save milestones sequentially
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

  // Milestone actions
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

  // Helper labels for RE impact score
  const getImpactLabel = (score: number) => {
    if (score <= 3) return "Minor (1-3)";
    if (score <= 6) return "Moderate (4-6)";
    if (score <= 8) return "Significant (7-8)";
    return "Transformative (9-10)";
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Hammer className="text-blue-650" size={20} />
            Infrastructure Projects
          </h1>
          <p className="text-xs text-slate-500 mt-1">Manage public government projects, corridors impacted, and real estate tailwinds.</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-650 hover:bg-blue-750 text-white rounded text-xs font-bold transition-all shadow-sm shadow-blue-500/10 cursor-pointer"
        >
          <Plus size={14} /> Add Infra Project
        </button>
      </div>

      {/* Filters */}
      <div className="bg-slate-50 border border-slate-200 rounded p-4 flex flex-wrap gap-4 items-center">
        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Category</label>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="border border-slate-200 rounded px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-650"
          >
            <option value="ALL">All Categories</option>
            {CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-slate-200 rounded px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-650"
          >
            <option value="ALL">All Statuses</option>
            {STATUSES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Corridor Affected</label>
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
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20 bg-white border border-slate-200 rounded">
          <Loader2 className="animate-spin text-blue-650" size={30} />
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded py-12 px-4 text-center">
          <p className="text-slate-500 text-xs font-semibold">No infrastructure projects found matching the filters.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Affected Corridors</th>
                  <th className="px-4 py-3 text-center">Impact Score</th>
                  <th className="px-4 py-3 text-center">Published</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {projects.map((proj) => {
                  const catInfo = CATEGORIES.find(c => c.value === proj.category);
                  const statInfo = STATUSES.find(s => s.value === proj.status);

                  return (
                    <tr key={proj.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900">{proj.name}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{proj.shortName}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="flex items-center gap-1">
                          <span>{catInfo?.icon}</span>
                          <span>{catInfo?.label}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${statInfo?.color || "bg-slate-100 text-slate-700"}`}>
                          {statInfo?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {proj.affectedCorridors.map((c: string) => (
                            <span key={c} className="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded text-[9px] font-semibold">
                              {c}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`font-bold px-2 py-0.5 rounded ${proj.reImpactScore >= 8 ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-slate-100 text-slate-600"}`}>
                          {proj.reImpactScore}/10
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`inline-flex items-center justify-center p-0.5 rounded-full ${proj.isPublished ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-400"}`}>
                          {proj.isPublished ? <Check size={12} /> : <X size={12} />}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right space-x-1.5">
                        <button
                          onClick={() => handleOpenEditModal(proj)}
                          className="p-1.5 text-slate-500 hover:text-blue-650 hover:bg-slate-100 rounded transition-colors cursor-pointer inline-flex"
                          title="Edit"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(proj.id)}
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

      {/* Modal Dialog Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded shadow-xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50 rounded-t">
              <h2 className="text-sm font-bold text-slate-950 flex items-center gap-1.5">
                <Hammer size={16} className="text-blue-650" />
                {editingProject ? "Edit Infrastructure Project" : "Add Infrastructure Project"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              {/* Core Information */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-1 uppercase tracking-wider">Project details</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-slate-650">Project Name (full) *</label>
                    <input
                      type="text"
                      required
                      placeholder="Regional Ring Road - Northern Corridor"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="border border-slate-250 rounded px-3 py-2 text-xs focus:ring-1 focus:ring-blue-650 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="font-semibold text-slate-650">Short Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="RRR North"
                        value={shortName}
                        onChange={(e) => setShortName(e.target.value)}
                        className="border border-slate-250 rounded px-3 py-2 text-xs focus:ring-1 focus:ring-blue-650 focus:outline-none"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="font-semibold text-slate-650">Category *</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="border border-slate-250 rounded px-3 py-2 text-xs focus:ring-1 focus:ring-blue-650 focus:outline-none bg-white"
                      >
                        {CATEGORIES.map(c => (
                          <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-slate-650">Sub-category</label>
                    <input
                      type="text"
                      placeholder="Expressway / Metro / SEZ"
                      value={subCategory}
                      onChange={(e) => setSubCategory(e.target.value)}
                      className="border border-slate-250 rounded px-3 py-2 text-xs focus:ring-1 focus:ring-blue-650 focus:outline-none"
                    />
                  </div>

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

                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-slate-650">Completion: {completionPct}%</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={completionPct}
                      onChange={(e) => setCompletionPct(Number(e.target.value))}
                      className="h-8 accent-blue-650"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-650">Project Description *</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Provide a detailed description of the project..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="border border-slate-250 rounded px-3 py-2 text-xs focus:ring-1 focus:ring-blue-650 focus:outline-none"
                  />
                </div>
              </div>

              {/* Financials, Demographics, & Impact */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-1 uppercase tracking-wider">Metrics & Impact</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-slate-650">Total Investment (₹ Crores)</label>
                    <input
                      type="number"
                      placeholder="e.g. 15600"
                      value={totalInvestmentCr}
                      onChange={(e) => setTotalInvestmentCr(e.target.value ? Number(e.target.value) : "")}
                      className="border border-slate-250 rounded px-3 py-2 text-xs focus:ring-1 focus:ring-blue-650 focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-slate-650">Expected Jobs Created</label>
                    <input
                      type="number"
                      placeholder="e.g. 50000"
                      value={expectedJobs}
                      onChange={(e) => setExpectedJobs(e.target.value ? Number(e.target.value) : "")}
                      className="border border-slate-250 rounded px-3 py-2 text-xs focus:ring-1 focus:ring-blue-650 focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-slate-650">Estimated Completion (text)</label>
                    <input
                      type="text"
                      placeholder="Q3 2027"
                      value={estimatedCompletion}
                      onChange={(e) => setEstimatedCompletion(e.target.value)}
                      className="border border-slate-250 rounded px-3 py-2 text-xs focus:ring-1 focus:ring-blue-650 focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-slate-650">Impact Radius: {impactRadius} km</label>
                    <input
                      type="range"
                      min="1"
                      max="50"
                      value={impactRadius}
                      onChange={(e) => setImpactRadius(Number(e.target.value))}
                      className="h-8 accent-blue-650"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-slate-650">Real Estate Impact Score: {getImpactLabel(reImpactScore)}</label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={reImpactScore}
                      onChange={(e) => setReImpactScore(Number(e.target.value))}
                      className="h-8 accent-blue-650"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-slate-650">Coordinates (Latitude, Longitude)</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        step="any"
                        placeholder="Lat e.g. 17.06"
                        value={latitude}
                        onChange={(e) => setLatitude(e.target.value ? Number(e.target.value) : "")}
                        className="border border-slate-250 rounded px-3 py-2 text-xs focus:ring-1 focus:ring-blue-650 focus:outline-none"
                      />
                      <input
                        type="number"
                        step="any"
                        placeholder="Long e.g. 78.20"
                        value={longitude}
                        onChange={(e) => setLongitude(e.target.value ? Number(e.target.value) : "")}
                        className="border border-slate-250 rounded px-3 py-2 text-xs focus:ring-1 focus:ring-blue-650 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-slate-650">Affected Corridors (Multi-select)</label>
                    <div className="border border-slate-250 rounded p-2 max-h-[85px] overflow-y-auto space-y-1 bg-white">
                      {corridorList.map(c => {
                        const checked = affectedCorridors.includes(c.corridor);
                        return (
                          <label key={c.id} className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                if (checked) {
                                  setAffectedCorridors(affectedCorridors.filter(x => x !== c.corridor));
                                } else {
                                  setAffectedCorridors([...affectedCorridors, c.corridor]);
                                }
                              }}
                              className="accent-blue-650 rounded"
                            />
                            <span className="text-xs text-slate-700">{c.shortName || c.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Authorities and References */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-1 uppercase tracking-wider">Zoning & references</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-slate-650">Approval Authority</label>
                    <input
                      type="text"
                      placeholder="HMDA / NHAI / DTCP"
                      value={approvalAuthority}
                      onChange={(e) => setApprovalAuthority(e.target.value)}
                      className="border border-slate-250 rounded px-3 py-2 text-xs focus:ring-1 focus:ring-blue-650 focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-slate-650">Government Order (G.O. Number)</label>
                    <input
                      type="text"
                      placeholder="e.g. G.O.Ms.No.68"
                      value={sourceGO}
                      onChange={(e) => setSourceGO(e.target.value)}
                      className="border border-slate-250 rounded px-3 py-2 text-xs focus:ring-1 focus:ring-blue-650 focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-slate-650">Official Source URL</label>
                    <input
                      type="url"
                      placeholder="https://official-government-link.gov.in"
                      value={sourceUrl}
                      onChange={(e) => setSourceUrl(e.target.value)}
                      className="border border-slate-250 rounded px-3 py-2 text-xs focus:ring-1 focus:ring-blue-650 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-slate-650">Tags</label>
                    <div className="flex flex-wrap gap-2 border border-slate-250 rounded p-2 bg-white">
                      {TAGS_OPTIONS.map(tag => {
                        const checked = tags.includes(tag);
                        return (
                          <label key={tag} className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                if (checked) {
                                  setTags(tags.filter(t => t !== tag));
                                } else {
                                  setTags([...tags, tag]);
                                }
                              }}
                              className="accent-blue-650"
                            />
                            <span>{tag}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border border-slate-200 bg-slate-50 rounded p-4 h-full">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900">Publish Project</span>
                      <span className="text-[10px] text-slate-400">Control visibility on public client portal.</span>
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
              </div>

              {/* Milestones Timeline */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-1 uppercase tracking-wider">Project Timeline & Milestones</h3>
                
                {/* Milestone Add Form */}
                <div className="bg-slate-50 border border-slate-200 rounded p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="font-bold text-slate-500">Milestone Title</label>
                      <input
                        type="text"
                        placeholder="Land Acquisition Completed"
                        value={newMilestoneTitle}
                        onChange={(e) => setNewMilestoneTitle(e.target.value)}
                        className="border border-slate-250 rounded px-2 py-1.5 bg-white text-xs"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="font-bold text-slate-500">Target Date</label>
                      <input
                        type="date"
                        value={newMilestoneDate}
                        onChange={(e) => setNewMilestoneDate(e.target.value)}
                        className="border border-slate-250 rounded px-2 py-1.5 bg-white text-xs"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="font-bold text-slate-500">Milestone Status</label>
                      <select
                        value={newMilestoneStatus}
                        onChange={(e) => setNewMilestoneStatus(e.target.value)}
                        className="border border-slate-250 rounded px-2 py-1.5 bg-white text-xs"
                      >
                        <option value="COMPLETED">✅ COMPLETED</option>
                        <option value="IN_PROGRESS">🔨 IN PROGRESS</option>
                        <option value="UPCOMING">📋 UPCOMING</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-slate-500">Description</label>
                    <textarea
                      rows={1.5}
                      placeholder="Add brief details about the milestone..."
                      value={newMilestoneDesc}
                      onChange={(e) => setNewMilestoneDesc(e.target.value)}
                      className="border border-slate-250 rounded px-2 py-1.5 bg-white text-xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddMilestone}
                    className="px-2.5 py-1.5 bg-slate-800 text-white rounded text-[10px] font-bold hover:bg-slate-900 cursor-pointer"
                  >
                    Add Milestone to List
                  </button>
                </div>

                {/* Milestones List */}
                {milestones.length === 0 ? (
                  <p className="text-slate-400 italic text-[11px]">No milestones added yet. Timeline will display empty.</p>
                ) : (
                  <div className="border border-slate-200 rounded divide-y divide-slate-100 bg-white">
                    {milestones.map((ms, idx) => (
                      <div key={idx} className="p-3 flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-950">{ms.title}</span>
                            <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold uppercase border ${
                              ms.status === "COMPLETED" ? "bg-green-50 text-green-700 border-green-200" :
                              ms.status === "IN_PROGRESS" ? "bg-amber-50 text-amber-700 border-amber-200" :
                              "bg-slate-100 text-slate-600 border-slate-200"
                            }`}>
                              {ms.status}
                            </span>
                          </div>
                          {ms.date && (
                            <div className="text-[10px] text-slate-400 flex items-center gap-1">
                              <Calendar size={10} />
                              <span>{new Date(ms.date).toLocaleDateString()}</span>
                            </div>
                          )}
                          {ms.description && (
                            <p className="text-slate-500 text-[10px]">{ms.description}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveMilestone(idx)}
                          className="text-slate-400 hover:text-red-650 cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
                  {editingProject ? "Update Project" : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
