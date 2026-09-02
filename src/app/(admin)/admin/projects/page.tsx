"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Building2, 
  MapPin, 
  TrendingUp, 
  Plus, 
  Trash2, 
  Edit, 
  Activity, 
  RefreshCw,
  Search,
  ChevronRight,
  X
} from "lucide-react";

interface Project {
  id: string;
  name: string;
  developer: string;
  corridor: string;
  city: string;
  minBudgetLakhs: number;
  maxBudgetLakhs: number;
  minHorizonYears: number;
  maxHorizonYears: number;
  riskLevel: string;
  propertyType: string;
  status: "ACTIVE" | "SOLD_OUT" | "UPCOMING" | "ARCHIVED";
}

interface CorridorMetric {
  id: string;
  corridor: string;
  city: string;
  historicalCAGR: number;
  projectedCAGRMin: number;
  projectedCAGRMax: number;
  rentalYieldMin: number;
  rentalYieldMax: number;
  infraScore: number;
  demandScore: number;
  riskLevel: string;
  lastUpdated: string;
}

export default function AdminProjectsPage() {
  const router = useRouter();
  
  // Tabs
  const [activeTab, setActiveTab] = useState<"projects" | "corridors">("projects");

  // Projects State
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Corridors State
  const [corridors, setCorridors] = useState<CorridorMetric[]>([]);
  const [isLoadingCorridors, setIsLoadingCorridors] = useState(false);

  // Corridor Form/Modal State
  const [showCorridorModal, setShowCorridorModal] = useState(false);
  const [editingCorridor, setEditingCorridor] = useState<CorridorMetric | null>(null);
  
  const [corridorName, setCorridorName] = useState("");
  const [historicalCagr, setHistoricalCagr] = useState<number>(12);
  const [cagrMin, setCagrMin] = useState<number>(10);
  const [cagrMax, setCagrMax] = useState<number>(15);
  const [rentMin, setRentMin] = useState<number>(2);
  const [rentMax, setRentMax] = useState<number>(4);
  const [infraScore, setInfraScore] = useState<number>(7);
  const [demandScore, setDemandScore] = useState<number>(7);
  const [riskLevel, setRiskLevel] = useState("MEDIUM");
  const [city, setCity] = useState("Hyderabad");

  const [isSavingCorridor, setIsSavingCorridor] = useState(false);

  // Matching Leads Modal state
  const [activeProjectMatches, setActiveProjectMatches] = useState<Project | null>(null);
  const [matchedLeads, setMatchedLeads] = useState<any[]>([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);

  async function loadProjects() {
    setIsLoading(true);
    try {
      // Inventory means ADMIN-owned inventory. Seller listings have their own
      // lifecycle and live in the review queue at /admin/projects/review —
      // without this filter, unsubmitted seller drafts appeared here as though
      // they were published inventory, while the public feed correctly hid them.
      let url = `/api/admin/projects?source=ADMIN&`;
      if (statusFilter !== "ALL") {
        url += `status=${statusFilter}&`;
      }
      if (search) {
        url += `search=${encodeURIComponent(search)}&`;
      }
      
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (err) {
      console.error("Failed to load projects", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadCorridors() {
    setIsLoadingCorridors(true);
    try {
      const res = await fetch("/api/admin/corridors");
      if (res.ok) {
        const data = await res.json();
        setCorridors(data.corridors || []);
      }
    } catch (err) {
      console.error("Failed to load corridor metrics", err);
    } finally {
      setIsLoadingCorridors(false);
    }
  }

  useEffect(() => {
    if (activeTab === "projects") {
      loadProjects();
    } else {
      loadCorridors();
    }
  }, [statusFilter, activeTab]);

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      loadProjects();
    }
  };

  const handleOpenMatches = async (project: Project) => {
    setActiveProjectMatches(project);
    setIsLoadingMatches(true);
    try {
      const res = await fetch(`/api/admin/projects/${project.id}/matches`);
      if (res.ok) {
        const data = await res.json();
        setMatchedLeads(data);
      }
    } finally {
      setIsLoadingMatches(false);
    }
  };

  // Corridor CRUD Handlers
  const handleOpenAddCorridor = () => {
    setEditingCorridor(null);
    setCorridorName("");
    setHistoricalCagr(12);
    setCagrMin(10);
    setCagrMax(15);
    setRentMin(2);
    setRentMax(4);
    setInfraScore(7);
    setDemandScore(7);
    setRiskLevel("MEDIUM");
    setCity("Hyderabad");
    setShowCorridorModal(true);
  };

  const handleOpenEditCorridor = (c: CorridorMetric) => {
    setEditingCorridor(c);
    setCorridorName(c.corridor);
    setHistoricalCagr(c.historicalCAGR);
    setCagrMin(c.projectedCAGRMin);
    setCagrMax(c.projectedCAGRMax);
    setRentMin(c.rentalYieldMin);
    setRentMax(c.rentalYieldMax);
    setInfraScore(c.infraScore);
    setDemandScore(c.demandScore);
    setRiskLevel(c.riskLevel);
    setCity(c.city);
    setShowCorridorModal(true);
  };

  const handleDeleteCorridor = async (id: string) => {
    if (!confirm("Are you sure you want to delete this corridor metrics record?")) return;
    try {
      const res = await fetch(`/api/admin/corridors/${id}`, { method: "DELETE" });
      if (res.ok) {
        setCorridors((prev) => prev.filter((c) => c.id !== id));
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(`Failed to delete record: ${errData.error || "Server error"}${errData.details ? " - " + errData.details : ""}`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Error deleting record: ${err.message || "Connection failed"}`);
    }
  };

  const handleSaveCorridor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!corridorName.trim()) return;

    setIsSavingCorridor(true);
    try {
      const payload = {
        corridor: corridorName,
        city,
        historicalCAGR: historicalCagr,
        projectedCAGRMin: cagrMin,
        projectedCAGRMax: cagrMax,
        rentalYieldMin: rentMin,
        rentalYieldMax: rentMax,
        infraScore,
        demandScore,
        riskLevel
      };

      const url = editingCorridor 
        ? `/api/admin/corridors/${editingCorridor.id}`
        : "/api/admin/corridors";
      const method = editingCorridor ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowCorridorModal(false);
        loadCorridors();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to save corridor metric: ${err.error || "Failed to save corridor metric."}${err.details ? " - " + err.details : ""}`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Error saving corridor metric: ${err.message || "Connection failed"}`);
    } finally {
      setIsSavingCorridor(false);
    }
  };

  const formatPrice = (min: number, max: number) => {
    const minText = min < 100 ? `${min}L` : `${(min / 100).toFixed(1)}Cr`;
    const maxText = max < 100 ? `${max}L` : `${(max / 100).toFixed(1)}Cr`;
    return `₹${minText} - ₹${maxText}`;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 flex-grow flex flex-col animate-fade-in text-[#1A1A2E] w-full pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#F0EDFA]">
        <div>
          <span className="text-[11px] text-[#5B4FE0] font-bold uppercase tracking-widest block mb-1">
            Portfolio Assets
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#1A1A2E]">
            Project Management
          </h1>
        </div>
        
        {activeTab === "projects" ? (
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/admin/projects/review" className="crm-btn-secondary text-xs" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Building2 size={14} /> Seller listings
            </Link>
            <Link
              href="/admin/projects/new"
              className="crm-btn-primary text-xs"
            >
              <Plus size={14} /> Add New Project
            </Link>
          </div>
        ) : (
          <div>
            <button
              onClick={handleOpenAddCorridor}
              className="crm-btn-primary text-xs"
            >
              <Plus size={14} /> Add Corridor Metric
            </button>
          </div>
        )}
      </div>

      {/* Pill tabs */}
      <div className="flex items-center gap-3">
        <div className="crm-pill-nav">
          <button
            onClick={() => setActiveTab("projects")}
            className={activeTab === "projects" ? "crm-pill-tab crm-pill-tab-active" : "crm-pill-tab"}
          >
            <Building2 size={14} className="inline mr-1.5" /> Inventory Projects ({projects.length})
          </button>
          
          <button
            onClick={() => setActiveTab("corridors")}
            className={activeTab === "corridors" ? "crm-pill-tab crm-pill-tab-active" : "crm-pill-tab"}
          >
            <TrendingUp size={14} className="inline mr-1.5" /> Corridor Metrics ({corridors.length})
          </button>
        </div>
      </div>

      {activeTab === "projects" ? (
        <>
          {/* Projects Filters Bar */}
          <div className="crm-card p-6 flex flex-col sm:flex-row items-center gap-3.5 w-full">
            <div className="relative flex-grow w-full sm:w-auto">
              <input
                type="text"
                placeholder="Search projects by name, developer, or corridor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleSearchKeyPress}
                className="w-full bg-[#F9F8FD] border border-[#E8E5F5] pl-9 pr-4 py-2.5 rounded-full text-xs text-[#1A1A2E] placeholder-[#8A8A9E] focus:outline-none focus:border-[#5B4FE0]"
              />
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A8A9E]" size={14} />
            </div>

            <button
              onClick={loadProjects}
              className="crm-btn-primary text-xs px-6 py-2.5 shrink-0 w-full sm:w-auto"
            >
              Search
            </button>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#F9F8FD] border border-[#E8E5F5] rounded-full px-4 py-2.5 text-xs text-[#1A1A2E] focus:outline-none focus:border-[#5B4FE0] shrink-0 w-full sm:w-auto min-w-[140px]"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="SOLD_OUT">SOLD OUT</option>
              <option value="UPCOMING">UPCOMING</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
          </div>

          {/* Projects Table */}
          <div className="crm-card p-0 overflow-hidden flex-grow">
            {isLoading ? (
              <div className="p-12 text-center text-[#8A8A9E] animate-pulse text-xs">
                Loading project records...
              </div>
            ) : projects.length === 0 ? (
              <div className="p-16 text-center text-[#8A8A9E] space-y-3">
                <span className="text-3xl">🏢</span>
                <h3 className="font-display text-lg font-bold text-[#1A1A2E]">No Projects Found</h3>
                <p className="text-xs max-w-sm mx-auto leading-relaxed">
                  No project records match your search filters. Try clearing filters or create a project.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto w-full">
                <table className="crm-table text-xs w-full">
                  <thead>
                    <tr>
                      <th className="whitespace-nowrap px-4 py-3.5">Project / Developer</th>
                      <th className="whitespace-nowrap px-4 py-3.5">Corridor</th>
                      <th className="whitespace-nowrap px-4 py-3.5">Budget Range</th>
                      <th className="whitespace-nowrap px-4 py-3.5">Horizon</th>
                      <th className="whitespace-nowrap px-4 py-3.5">Risk Level</th>
                      <th className="whitespace-nowrap px-4 py-3.5">Type</th>
                      <th className="whitespace-nowrap px-4 py-3.5">Status</th>
                      <th className="text-right whitespace-nowrap px-4 py-3.5">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((project) => (
                      <tr key={project.id}>
                        <td className="font-bold text-[#1A1A2E] whitespace-nowrap px-4 py-3.5">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold text-[#1A1A2E] text-sm">{project.name}</span>
                            <span className="text-[#8A8A9E] text-xs font-normal">by {project.developer}</span>
                          </div>
                        </td>
                        <td className="font-semibold text-[#1A1A2E] whitespace-nowrap px-4 py-3.5">{project.corridor}</td>
                        <td className="font-bold text-[#5B4FE0] whitespace-nowrap px-4 py-3.5">
                          {formatPrice(project.minBudgetLakhs, project.maxBudgetLakhs)}
                        </td>
                        <td className="text-[#8A8A9E] whitespace-nowrap px-4 py-3.5">{project.minHorizonYears} - {project.maxHorizonYears} Years</td>
                        <td className="whitespace-nowrap px-4 py-3.5">
                          <span className="badge bg-amber-100 text-amber-800 text-[10px] font-bold">
                            {project.riskLevel}
                          </span>
                        </td>
                        <td className="text-[#1A1A2E] font-medium whitespace-nowrap px-4 py-3.5">{project.propertyType}</td>
                        <td className="whitespace-nowrap px-4 py-3.5">
                          <span className={`badge text-[10px] font-bold ${
                            project.status === "ACTIVE" 
                              ? "bg-emerald-100 text-emerald-800"
                              : project.status === "SOLD_OUT"
                              ? "bg-slate-100 text-slate-700"
                              : project.status === "UPCOMING"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-rose-100 text-rose-800"
                          }`}>
                            {project.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="text-right whitespace-nowrap px-4 py-3.5">
                          <div className="flex items-center justify-end gap-2.5">
                            <button
                              onClick={() => handleOpenMatches(project)}
                              className="crm-btn-secondary text-[11px] px-3.5 py-1.5 rounded-full inline-flex items-center gap-1 font-bold shadow-2xs"
                            >
                              🎯 Matches
                            </button>
                            <Link
                              href={`/admin/projects/${project.id}`}
                              className="crm-btn-ghost text-xs text-[#5B4FE0] font-bold px-3.5 py-1.5 rounded-full inline-flex items-center gap-1 hover:bg-[#F4F0FF]"
                            >
                              <Edit size={13} /> Edit
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Corridor Metrics CRUD Panel */
        <div className="crm-card p-0 overflow-hidden flex-grow">
          {isLoadingCorridors ? (
            <div className="p-12 text-center text-[#8A8A9E] animate-pulse text-xs">
              Loading corridor CAGR metrics...
            </div>
          ) : corridors.length === 0 ? (
            <div className="p-16 text-center text-[#8A8A9E] space-y-3">
              <span className="text-3xl">📈</span>
              <h3 className="font-display text-lg font-bold text-[#1A1A2E]">No Corridor Metrics Found</h3>
              <p className="text-xs max-w-sm mx-auto leading-relaxed">
                Add corridor CAGR and yield mappings to feed the AI investment engine.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="crm-table text-xs w-full">
                <thead>
                  <tr>
                    <th className="whitespace-nowrap px-4 py-3.5">Corridor Name</th>
                    <th className="whitespace-nowrap px-4 py-3.5">Historical CAGR</th>
                    <th className="whitespace-nowrap px-4 py-3.5">Projected CAGR</th>
                    <th className="whitespace-nowrap px-4 py-3.5">Rental Yield</th>
                    <th className="whitespace-nowrap px-4 py-3.5">Risk Rating</th>
                    <th className="whitespace-nowrap px-4 py-3.5">Infra Score</th>
                    <th className="whitespace-nowrap px-4 py-3.5">Demand Score</th>
                    <th className="text-right whitespace-nowrap px-4 py-3.5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {corridors.map((c) => (
                    <tr key={c.id}>
                      <td className="font-bold text-[#1A1A2E] whitespace-nowrap px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <MapPin size={13} className="text-[#5B4FE0]" /> {c.corridor}
                        </div>
                      </td>
                      <td className="font-semibold text-[#1A1A2E] whitespace-nowrap px-4 py-3.5">{c.historicalCAGR}%</td>
                      <td className="font-bold text-[#5B4FE0] whitespace-nowrap px-4 py-3.5">
                        {c.projectedCAGRMin}% - {c.projectedCAGRMax}%
                      </td>
                      <td className="text-[#8A8A9E] whitespace-nowrap px-4 py-3.5">
                        {c.rentalYieldMin}% - {c.rentalYieldMax}%
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <span className="badge bg-[#F4F0FF] text-[#5B4FE0] text-[10px] font-bold">
                          {c.riskLevel}
                        </span>
                      </td>
                      <td className="font-bold text-[#1A1A2E] whitespace-nowrap px-4 py-3.5">{c.infraScore} / 10</td>
                      <td className="font-bold text-[#1A1A2E] whitespace-nowrap px-4 py-3.5">{c.demandScore} / 10</td>
                      <td className="text-right whitespace-nowrap px-4 py-3.5">
                        <div className="flex justify-end items-center gap-2">
                          <button
                            onClick={() => handleOpenEditCorridor(c)}
                            className="crm-btn-ghost text-xs text-[#5B4FE0] font-bold px-3.5 py-1.5 rounded-full inline-flex items-center gap-1 hover:bg-[#F4F0FF]"
                          >
                            <Edit size={13} /> Edit
                          </button>
                          <button
                            onClick={() => handleDeleteCorridor(c.id)}
                            className="crm-btn-ghost text-xs text-rose-600 font-bold px-3.5 py-1.5 rounded-full inline-flex items-center gap-1 hover:bg-rose-50"
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Auto-Matched Leads modal drawer */}
      {activeProjectMatches && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-[#1A1A2E]/40 backdrop-blur-xs">
          <div onClick={() => setActiveProjectMatches(null)} className="absolute inset-0" />
          <div className="relative z-10 w-full max-w-lg h-full crm-card bg-white rounded-none flex flex-col justify-between shadow-2xl animate-slide-in p-6">
            <div className="pb-4 border-b border-[#F0EDFA] flex justify-between items-center">
              <div>
                <span className="text-[10px] text-[#5B4FE0] font-bold uppercase tracking-wider block">Auto-Match Lead Matrix</span>
                <h3 className="font-display font-bold text-[#1A1A2E] text-base">{activeProjectMatches.name} Leads</h3>
              </div>
              <button 
                onClick={() => setActiveProjectMatches(null)}
                className="text-[#8A8A9E] hover:text-[#1A1A2E] p-1 rounded-full hover:bg-[#F4F0FF]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-grow overflow-y-auto py-4 space-y-4">
              <p className="text-xs text-[#8A8A9E] leading-relaxed">
                Leads matching budget range ({formatPrice(activeProjectMatches.minBudgetLakhs, activeProjectMatches.maxBudgetLakhs)}) and horizon ({activeProjectMatches.minHorizonYears}-{activeProjectMatches.maxHorizonYears} Yrs):
              </p>

              {isLoadingMatches ? (
                <p className="text-xs text-[#8A8A9E] animate-pulse">Running lead correlation calculations...</p>
              ) : matchedLeads.length === 0 ? (
                <div className="text-center py-12 text-[#8A8A9E] bg-[#F9F8FD] rounded-2xl space-y-2">
                  <span className="text-3xl block">👥</span>
                  <p className="text-xs italic">No matching leads in database.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {matchedLeads.map((lead) => (
                    <div key={lead.id} className="bg-[#F9F8FD] p-4 rounded-2xl border border-[#F0EDFA] flex justify-between items-center text-xs">
                      <div>
                        <h4 className="font-bold text-[#1A1A2E] text-sm">{lead.name}</h4>
                        <p className="text-[11px] text-[#8A8A9E] mt-0.5">{lead.email} · {lead.phone}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-[#5B4FE0] block text-sm">
                          {lead.budget < 100 ? `₹${lead.budget}L` : `₹${(lead.budget / 100).toFixed(1)}Cr`}
                        </span>
                        <span className="text-[10px] text-[#8A8A9E]">{lead.horizon} Yrs horizon</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-[#F0EDFA]">
              <button
                onClick={() => setActiveProjectMatches(null)}
                className="crm-btn-primary w-full text-xs py-2.5"
              >
                Close Match View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Corridor Modal Form */}
      {showCorridorModal && (
        <div className="fixed inset-0 bg-[#1A1A2E]/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="crm-card bg-white w-full max-w-lg shadow-2xl p-6 space-y-5 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0EDFA]">
              <h2 className="font-display font-bold text-[#1A1A2E] text-base">
                {editingCorridor ? "Edit Corridor Metrics" : "Add Corridor Metrics"}
              </h2>
              <button 
                onClick={() => setShowCorridorModal(false)}
                className="text-[#8A8A9E] hover:text-[#1A1A2E] p-1 rounded-full hover:bg-[#F4F0FF]"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSaveCorridor} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block font-bold text-[#8A8A9E] uppercase tracking-wider text-[10px]">Corridor Name</label>
                  <input
                    type="text"
                    placeholder="e.g. yadadri corridor"
                    value={corridorName}
                    onChange={(e) => setCorridorName(e.target.value)}
                    className="w-full bg-[#F9F8FD] border border-[#E8E5F5] rounded-full px-4 py-2 text-xs text-[#1A1A2E] focus:outline-none focus:border-[#5B4FE0]"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block font-bold text-[#8A8A9E] uppercase tracking-wider text-[10px]">City Location</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-[#F9F8FD] border border-[#E8E5F5] rounded-full px-4 py-2 text-xs text-[#1A1A2E] focus:outline-none focus:border-[#5B4FE0]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="block font-bold text-[#8A8A9E] uppercase tracking-wider text-[10px]">Hist. CAGR (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={historicalCagr}
                    onChange={(e) => setHistoricalCagr(parseFloat(e.target.value))}
                    className="w-full bg-[#F9F8FD] border border-[#E8E5F5] rounded-full px-3 py-2 text-xs text-[#1A1A2E] focus:outline-none focus:border-[#5B4FE0]"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block font-bold text-[#8A8A9E] uppercase tracking-wider text-[10px]">Proj. CAGR Min</label>
                  <input
                    type="number"
                    step="0.1"
                    value={cagrMin}
                    onChange={(e) => setCagrMin(parseFloat(e.target.value))}
                    className="w-full bg-[#F9F8FD] border border-[#E8E5F5] rounded-full px-3 py-2 text-xs text-[#1A1A2E] focus:outline-none focus:border-[#5B4FE0]"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block font-bold text-[#8A8A9E] uppercase tracking-wider text-[10px]">Proj. CAGR Max</label>
                  <input
                    type="number"
                    step="0.1"
                    value={cagrMax}
                    onChange={(e) => setCagrMax(parseFloat(e.target.value))}
                    className="w-full bg-[#F9F8FD] border border-[#E8E5F5] rounded-full px-3 py-2 text-xs text-[#1A1A2E] focus:outline-none focus:border-[#5B4FE0]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block font-bold text-[#8A8A9E] uppercase tracking-wider text-[10px]">Rent Yield Min (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={rentMin}
                    onChange={(e) => setRentMin(parseFloat(e.target.value))}
                    className="w-full bg-[#F9F8FD] border border-[#E8E5F5] rounded-full px-4 py-2 text-xs text-[#1A1A2E] focus:outline-none focus:border-[#5B4FE0]"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block font-bold text-[#8A8A9E] uppercase tracking-wider text-[10px]">Rent Yield Max (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={rentMax}
                    onChange={(e) => setRentMax(parseFloat(e.target.value))}
                    className="w-full bg-[#F9F8FD] border border-[#E8E5F5] rounded-full px-4 py-2 text-xs text-[#1A1A2E] focus:outline-none focus:border-[#5B4FE0]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="block font-bold text-[#8A8A9E] uppercase tracking-wider text-[10px]">Risk Rating</label>
                  <select
                    value={riskLevel}
                    onChange={(e) => setRiskLevel(e.target.value)}
                    className="w-full bg-[#F9F8FD] border border-[#E8E5F5] rounded-full px-3 py-2 text-xs text-[#1A1A2E] focus:outline-none focus:border-[#5B4FE0]"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block font-bold text-[#8A8A9E] uppercase tracking-wider text-[10px]">Infra (1-10)</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={infraScore}
                    onChange={(e) => setInfraScore(parseInt(e.target.value))}
                    className="w-full bg-[#F9F8FD] border border-[#E8E5F5] rounded-full px-3 py-2 text-xs text-[#1A1A2E] focus:outline-none focus:border-[#5B4FE0]"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block font-bold text-[#5B4FE0] uppercase tracking-wider text-[10px]">Demand (1-10)</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={demandScore}
                    onChange={(e) => setDemandScore(parseInt(e.target.value))}
                    className="w-full bg-[#F9F8FD] border border-[#E8E5F5] rounded-full px-3 py-2 text-xs text-[#1A1A2E] focus:outline-none focus:border-[#5B4FE0]"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#F0EDFA]">
                <button
                  type="button"
                  onClick={() => setShowCorridorModal(false)}
                  className="crm-btn-secondary px-5 py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCorridor}
                  className="crm-btn-primary px-5 py-2 text-xs"
                >
                  {isSavingCorridor ? "Saving..." : "Save Metrics"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
