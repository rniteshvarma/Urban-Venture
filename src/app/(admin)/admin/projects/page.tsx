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
  RefreshCw 
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
      let url = `/api/admin/projects?`;
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
    } catch (err) {
      console.error("Failed to load matches", err);
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
        alert("Failed to delete record.");
      }
    } catch (err) {
      console.error(err);
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
        const err = await res.json();
        alert(err.error || "Failed to save corridor metric.");
      }
    } catch (err) {
      console.error(err);
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
    <div className="space-y-6 flex-grow flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[10px] text-accent font-bold uppercase tracking-widest block">Portfolio Assets</span>
          <h1 className="font-display text-2xl sm:text-4xl font-bold text-primary">Project Management</h1>
        </div>
        
        {activeTab === "projects" ? (
          <div>
            <Link
              href="/admin/projects/new"
              className="px-4 py-2 bg-primary hover:bg-primary-light text-surface text-xs font-semibold uppercase tracking-wider rounded-tag transition-colors shadow-sm animate-fade-in"
            >
              ➕ Add New Project
            </Link>
          </div>
        ) : (
          <div>
            <button
              onClick={handleOpenAddCorridor}
              className="px-4 py-2 bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded transition-colors shadow-sm animate-fade-in"
            >
              ➕ Add Corridor Metric
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-luxury">
        <button
          onClick={() => setActiveTab("projects")}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 -mb-[2px] transition-colors flex items-center gap-2 ${
            activeTab === "projects"
              ? "border-[#2563EB] text-[#2563EB]"
              : "border-transparent text-text-secondary hover:text-primary"
          }`}
        >
          <Building2 size={14} /> Inventory Projects ({projects.length})
        </button>
        
        <button
          onClick={() => setActiveTab("corridors")}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 -mb-[2px] transition-colors flex items-center gap-2 ${
            activeTab === "corridors"
              ? "border-[#2563EB] text-[#2563EB]"
              : "border-transparent text-text-secondary hover:text-primary"
          }`}
        >
          <TrendingUp size={14} /> Corridor Metrics CRUD ({corridors.length})
        </button>
      </div>

      {activeTab === "projects" ? (
        <>
          {/* Projects Filters */}
          <div className="bg-surface border border-luxury p-4 rounded-card shadow-sm flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-grow flex gap-2">
              <input
                type="text"
                placeholder="Search projects by name, developer, or corridor... (Press Enter)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleSearchKeyPress}
                className="w-full bg-luxury-bg border border-luxury px-3 py-2 rounded-input text-xs text-text-primary focus:outline-none focus:border-accent"
              />
              <button
                onClick={loadProjects}
                className="bg-primary hover:bg-primary-light px-4 rounded-input text-xs text-surface uppercase font-semibold tracking-wider transition-colors"
              >
                Search
              </button>
            </div>

            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-luxury-bg border border-luxury px-3 py-2 rounded-input text-xs text-text-primary focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="SOLD_OUT">SOLD OUT</option>
                <option value="UPCOMING">UPCOMING</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </div>
          </div>

          {/* Projects Table */}
          <div className="bg-surface border border-luxury rounded-card shadow-sm flex-grow overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-text-secondary animate-pulse">
                Loading project records...
              </div>
            ) : projects.length === 0 ? (
              <div className="p-16 text-center text-text-secondary space-y-3">
                <span className="text-3xl">🏢</span>
                <h3 className="font-display text-lg font-bold text-primary">No Projects Found</h3>
                <p className="text-xs max-w-sm mx-auto leading-relaxed">
                  No project records match your filters. Seed default data or create a project.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto w-full">
                <table className="min-w-full divide-y divide-luxury text-left text-xs text-text-primary">
                  <thead className="bg-luxury-bg text-text-secondary uppercase font-semibold tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Project / Developer</th>
                      <th className="px-6 py-4">Corridor</th>
                      <th className="px-6 py-4">Budget Range</th>
                      <th className="px-6 py-4">Horizon</th>
                      <th className="px-6 py-4">Risk Level</th>
                      <th className="px-6 py-4">Type</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-luxury bg-surface">
                    {projects.map((project) => (
                      <tr key={project.id} className="hover:bg-luxury-bg/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-primary text-sm">{project.name}</span>
                            <span className="text-text-secondary">by {project.developer}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium">{project.corridor}</td>
                        <td className="px-6 py-4 font-semibold text-primary">
                          {formatPrice(project.minBudgetLakhs, project.maxBudgetLakhs)}
                        </td>
                        <td className="px-6 py-4">{project.minHorizonYears} - {project.maxHorizonYears} Years</td>
                        <td className="px-6 py-4 uppercase font-semibold tracking-wide text-accent">{project.riskLevel}</td>
                        <td className="px-6 py-4">{project.propertyType}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-tag text-[9px] font-bold uppercase tracking-wider border ${
                            project.status === "ACTIVE" 
                              ? "bg-green-50 text-green-700 border-green-200"
                              : project.status === "SOLD_OUT"
                              ? "bg-gray-100 text-gray-700 border-gray-200"
                              : project.status === "UPCOMING"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-red-50 text-red-700 border-red-200"
                          }`}>
                            {project.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-3" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleOpenMatches(project)}
                            className="text-xs font-bold text-accent hover:text-accent-light uppercase tracking-wider"
                          >
                            🎯 Matches
                          </button>
                          <Link
                            href={`/admin/projects/${project.id}`}
                            className="text-xs font-bold text-primary hover:text-primary-light uppercase tracking-wider"
                          >
                            Edit
                          </Link>
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
        <div className="bg-surface border border-luxury rounded-card shadow-sm flex-grow overflow-hidden">
          {isLoadingCorridors ? (
            <div className="p-8 text-center text-text-secondary animate-pulse">
              Loading corridor CAGR metrics...
            </div>
          ) : corridors.length === 0 ? (
            <div className="p-16 text-center text-text-secondary space-y-3">
              <span className="text-3xl">📈</span>
              <h3 className="font-display text-lg font-bold text-primary">No Corridor Metrics Found</h3>
              <p className="text-xs max-w-sm mx-auto leading-relaxed">
                Add corridor CAGR and yield mappings to feed the ROI Calculator.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="min-w-full divide-y divide-luxury text-left text-xs text-text-primary">
                <thead className="bg-luxury-bg text-text-secondary uppercase font-semibold tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Corridor Name</th>
                    <th className="px-6 py-4">Historical CAGR</th>
                    <th className="px-6 py-4">Projected CAGR</th>
                    <th className="px-6 py-4">Rental Yield</th>
                    <th className="px-6 py-4">Risk Rating</th>
                    <th className="px-6 py-4">Infra Score</th>
                    <th className="px-6 py-4">Demand Score</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-luxury bg-surface">
                  {corridors.map((c) => (
                    <tr key={c.id} className="hover:bg-luxury-bg/30 transition-colors">
                      <td className="px-6 py-4 font-semibold text-primary text-sm flex items-center gap-1">
                        <MapPin size={12} className="text-slate-400" /> {c.corridor}
                      </td>
                      <td className="px-6 py-4 font-medium">{c.historicalCAGR}%</td>
                      <td className="px-6 py-4 font-medium text-blue-600">
                        {c.projectedCAGRMin}% - {c.projectedCAGRMax}%
                      </td>
                      <td className="px-6 py-4">
                        {c.rentalYieldMin}% - {c.rentalYieldMax}%
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-[10px] uppercase tracking-wide bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                          {c.riskLevel}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold">{c.infraScore} / 10</td>
                      <td className="px-6 py-4 font-semibold">{c.demandScore} / 10</td>
                      <td className="px-6 py-4 text-right space-x-3">
                        <button
                          onClick={() => handleOpenEditCorridor(c)}
                          className="text-xs font-bold text-[#2563EB] hover:underline uppercase tracking-wider"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteCorridor(c.id)}
                          className="text-xs font-bold text-red-500 hover:text-red-700 uppercase tracking-wider"
                        >
                          Delete
                        </button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40">
          <div onClick={() => setActiveProjectMatches(null)} className="absolute inset-0" />
          <div className="relative z-10 w-full max-w-lg h-full bg-surface border-l border-luxury shadow-luxury flex flex-col justify-between animate-slide-in">
            <div className="px-6 py-4 border-b border-luxury bg-luxury-bg/30 flex justify-between items-center">
              <div>
                <span className="text-[9px] text-accent font-bold uppercase tracking-wider block">Auto-Match Lead Matrix</span>
                <h3 className="font-display font-semibold text-primary">{activeProjectMatches.name} Leads</h3>
              </div>
              <button 
                onClick={() => setActiveProjectMatches(null)}
                className="text-text-secondary hover:text-primary text-sm font-semibold"
              >
                ✕ Close
              </button>
            </div>

            <div className="flex-grow overflow-y-auto p-6 space-y-4">
              <p className="text-xs text-text-secondary leading-relaxed">
                The following leads have investment profiles (Budget: {formatPrice(activeProjectMatches.minBudgetLakhs, activeProjectMatches.maxBudgetLakhs)}, Horizon: {activeProjectMatches.minHorizonYears}-{activeProjectMatches.maxHorizonYears}Yrs) that match this project location:
              </p>

              {isLoadingMatches ? (
                <p className="text-xs text-text-secondary animate-pulse">Running lead correlation calculations...</p>
              ) : matchedLeads.length === 0 ? (
                <div className="text-center py-10 text-text-secondary border border-dashed border-luxury rounded-card">
                  <span className="text-2xl block mb-2">👥</span>
                  <p className="text-xs italic">No matching leads in database.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {matchedLeads.map((lead) => (
                    <div key={lead.id} className="border border-luxury p-3.5 rounded-card flex justify-between items-center bg-luxury-bg/10 hover:bg-luxury-bg/30 transition-colors text-xs">
                      <div>
                        <h4 className="font-bold text-primary">{lead.name}</h4>
                        <p className="text-[10px] text-text-secondary">{lead.email} · {lead.phone}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-primary block">
                          {lead.budget < 100 ? `₹${lead.budget}L` : `₹${(lead.budget / 100).toFixed(1)}Cr`}
                        </span>
                        <span className="text-[9px] text-text-secondary">{lead.horizon} Yrs horizon</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-luxury bg-luxury-bg/20 text-center">
              <button
                onClick={() => setActiveProjectMatches(null)}
                className="px-6 py-2 bg-primary text-surface text-xs font-semibold uppercase tracking-wider rounded-tag"
              >
                Close Match View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Corridor Modal Form */}
      {showCorridorModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-luxury w-full max-w-lg rounded-card shadow-luxury overflow-hidden animate-slide-in">
            <div className="px-6 py-4 border-b border-luxury bg-slate-50/50 flex items-center justify-between">
              <h2 className="font-display font-bold text-slate-800 text-sm">
                {editingCorridor ? "Edit Corridor Metrics" : "Add Corridor Metrics"}
              </h2>
              <button 
                onClick={() => setShowCorridorModal(false)}
                className="text-slate-600 hover:text-slate-900 border border-slate-200 rounded px-2.5 py-1 text-xs bg-white font-bold"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSaveCorridor} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block font-bold text-slate-500 uppercase tracking-wider">Corridor Name</label>
                  <input
                    type="text"
                    placeholder="e.g. yadadri corridor"
                    value={corridorName}
                    onChange={(e) => setCorridorName(e.target.value)}
                    className="w-full bg-luxury-bg border border-luxury px-3.5 py-2 rounded text-xs text-text-primary focus:outline-none focus:border-[#2563EB]"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-500 uppercase tracking-wider">City Location</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-luxury-bg border border-luxury px-3.5 py-2 rounded text-xs text-text-primary focus:outline-none focus:border-[#2563EB]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="block font-bold text-slate-500 uppercase tracking-wider">Hist. CAGR (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={historicalCagr}
                    onChange={(e) => setHistoricalCagr(parseFloat(e.target.value))}
                    className="w-full bg-luxury-bg border border-luxury px-3.5 py-2 rounded text-xs text-text-primary focus:outline-none focus:border-[#2563EB]"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-500 uppercase tracking-wider">Proj. CAGR Min (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={cagrMin}
                    onChange={(e) => setCagrMin(parseFloat(e.target.value))}
                    className="w-full bg-luxury-bg border border-luxury px-3.5 py-2 rounded text-xs text-text-primary focus:outline-none focus:border-[#2563EB]"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-500 uppercase tracking-wider">Proj. CAGR Max (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={cagrMax}
                    onChange={(e) => setCagrMax(parseFloat(e.target.value))}
                    className="w-full bg-luxury-bg border border-luxury px-3.5 py-2 rounded text-xs text-text-primary focus:outline-none focus:border-[#2563EB]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block font-bold text-slate-500 uppercase tracking-wider">Rent Yield Min (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={rentMin}
                    onChange={(e) => setRentMin(parseFloat(e.target.value))}
                    className="w-full bg-luxury-bg border border-luxury px-3.5 py-2 rounded text-xs text-text-primary focus:outline-none focus:border-[#2563EB]"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-500 uppercase tracking-wider">Rent Yield Max (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={rentMax}
                    onChange={(e) => setRentMax(parseFloat(e.target.value))}
                    className="w-full bg-luxury-bg border border-luxury px-3.5 py-2 rounded text-xs text-text-primary focus:outline-none focus:border-[#2563EB]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="block font-bold text-slate-500 uppercase tracking-wider">Risk Rating</label>
                  <select
                    value={riskLevel}
                    onChange={(e) => setRiskLevel(e.target.value)}
                    className="w-full bg-luxury-bg border border-luxury px-3.5 py-2 rounded text-xs text-text-primary focus:outline-none focus:border-[#2563EB]"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-500 uppercase tracking-wider">Infra Score (1-10)</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={infraScore}
                    onChange={(e) => setInfraScore(parseInt(e.target.value))}
                    className="w-full bg-luxury-bg border border-luxury px-3.5 py-2 rounded text-xs text-text-primary focus:outline-none focus:border-[#2563EB]"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-[#2563EB] uppercase tracking-wider">Demand (1-10)</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={demandScore}
                    onChange={(e) => setDemandScore(parseInt(e.target.value))}
                    className="w-full bg-luxury-bg border border-luxury px-3.5 py-2 rounded text-xs text-text-primary focus:outline-none focus:border-[#2563EB]"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-luxury/40">
                <button
                  type="button"
                  onClick={() => setShowCorridorModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded font-bold text-slate-600 hover:bg-slate-50 uppercase tracking-wider text-[10px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCorridor}
                  className="px-4 py-2 bg-[#2563EB] hover:bg-blue-700 text-white rounded font-bold uppercase tracking-wider text-[10px] transition-colors disabled:opacity-50"
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
