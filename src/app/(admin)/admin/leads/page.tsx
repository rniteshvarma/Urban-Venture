"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import LeadsTable from "@/components/admin/LeadsTable";
import LeadDetailPanel from "@/components/admin/LeadDetailPanel";

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  budget: number;
  horizon: number;
  city: string;
  status: "NEW" | "CONTACTED" | "INTERESTED" | "NEGOTIATING" | "CONVERTED" | "LOST";
  source: string;
  notes: string | null;
  assignedTo: string | null;
  createdAt: string;
  persona: string | null;
  personaScore: number | null;
  personaReason: string | null;
  leadScore: number | null;
  leadScoreGrade: string | null;
  leadScoreFactors: any;
}

const PERSONA_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  FIRST_TIME_BUYER: { label: "First-Time Buyer", icon: "🏠", color: "#3B82F6" },
  NRI_INVESTOR: { label: "NRI Investor", icon: "✈️", color: "#8B5CF6" },
  LAND_SPECULATOR: { label: "Land Speculator", icon: "📈", color: "#EF4444" },
  RETIREMENT_PLANNER: { label: "Retirement Planner", icon: "👴", color: "#10B981" },
  HNI_PORTFOLIO_BUILDER: { label: "HNI Portfolio", icon: "💼", color: "#F59E0B" },
  PROFESSIONAL_FIRST_HOME: { label: "Professional Home", icon: "💻", color: "#06B6D4" }
};

function LeadsPageContent() {
  const searchParams = useSearchParams();
  const initialPersona = searchParams.get("persona") || "ALL";

  const [leads, setLeads] = useState<Lead[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [cityFilter, setCityFilter] = useState("");
  const [personaFilter, setPersonaFilter] = useState(initialPersona);

  // Selection & Details panel
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeLead, setActiveLead] = useState<any | null>(null);

  // Manual Add Lead Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newBudget, setNewBudget] = useState(50);
  const [newHorizon, setNewHorizon] = useState(5);
  const [newCity, setNewCity] = useState("Hyderabad");
  const [newNotes, setNewNotes] = useState("");
  const [newStatus, setNewStatus] = useState<any>("NEW");
  const [isCreating, setIsCreating] = useState(false);

  // Load leads from API
  async function loadLeads() {
    setIsLoading(true);
    try {
      let url = `/api/admin/leads?page=${page}&limit=20`;
      if (statusFilter !== "ALL") {
        url += `&status=${statusFilter}`;
      }
      if (cityFilter) {
        url += `&city=${encodeURIComponent(cityFilter)}`;
      }
      if (search) {
        url += `&search=${encodeURIComponent(search)}`;
      }
      if (personaFilter !== "ALL") {
        url += `&persona=${personaFilter}`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
        setTotalLeads(data.pagination?.total || 0);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (err) {
      console.error("Failed to load leads", err);
    } finally {
      setIsLoading(false);
    }
  }

  // Load leads when filters or page change
  useEffect(() => {
    loadLeads();
  }, [page, statusFilter, cityFilter, personaFilter]);

  // Sync state if url parameter changes
  useEffect(() => {
    const urlPersona = searchParams.get("persona");
    if (urlPersona) {
      setPersonaFilter(urlPersona);
      setPage(1);
    }
    const leadId = searchParams.get("id");
    if (leadId) {
      fetch(`/api/admin/leads/${leadId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.lead) {
            setActiveLead(data.lead);
          }
        })
        .catch((err) => console.error("Error fetching active lead from query param:", err));
    }
  }, [searchParams]);

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      setPage(1);
      loadLeads();
    }
  };

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/leads/${leadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setLeads((prev) =>
          prev.map((l) => (l.id === leadId ? { ...l, status: newStatus as any } : l))
        );
        if (activeLead && activeLead.id === leadId) {
          setActiveLead((prev: any) => ({ ...prev, status: newStatus }));
        }
      }
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  const handleUpdateNotes = async (leadId: string, updatedNotes: string) => {
    try {
      const res = await fetch(`/api/admin/leads/${leadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: updatedNotes }),
      });
      if (res.ok) {
        setLeads((prev) =>
          prev.map((l) => (l.id === leadId ? { ...l, notes: updatedNotes } : l))
        );
      }
    } catch (err) {
      console.error("Failed to update notes", err);
      throw err;
    }
  };

  // Bulk selections
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(leads.map((l) => l.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (leads.length === 0) return;
    
    // Create header row
    const headers = ["ID", "Name", "Email", "Phone", "Budget (Lakhs)", "Horizon (Years)", "City", "Persona", "Lead Score", "Status", "Source", "Date"];
    const rows = leads.map((l) => [
      l.id,
      l.name,
      l.email,
      l.phone,
      l.budget,
      l.horizon,
      l.city,
      l.persona || "Unclassified",
      l.leadScore || 0,
      l.status,
      l.source,
      new Date(l.createdAt).toISOString().substring(0, 10),
    ]);

    const csvContent = 
      "data:text/csv;charset=utf-8," + 
      [headers.join(","), ...rows.map((r) => r.map(val => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `urban_ventures_crm_leads_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Manual Create Lead Submit
  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail || !newPhone) {
      alert("Please fill in Name, Email, and Phone.");
      return;
    }
    
    setIsCreating(true);
    try {
      const res = await fetch("/api/admin/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          email: newEmail,
          phone: newPhone,
          budget: newBudget,
          horizon: newHorizon,
          city: newCity,
          notes: newNotes,
          status: newStatus,
        }),
      });

      if (res.ok) {
        // Reset inputs and close
        setNewName("");
        setNewEmail("");
        setNewPhone("");
        setNewBudget(50);
        setNewHorizon(5);
        setNewCity("Hyderabad");
        setNewNotes("");
        setNewStatus("NEW");
        setShowAddModal(false);
        loadLeads(); // Reload table
      } else {
        const errData = await res.json();
        alert(errData.error || "Failed to create lead.");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6 flex-grow flex flex-col">
      
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[10px] text-accent font-bold uppercase tracking-widest block">Customer Relationship Management</span>
          <h1 className="font-display text-2xl sm:text-4xl font-bold text-primary">Leads Directory</h1>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 border border-luxury hover:bg-luxury-bg/40 text-text-primary text-xs font-semibold uppercase tracking-wider rounded-tag transition-colors"
          >
            📊 Export CSV
          </button>
          
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-primary hover:bg-primary-light text-surface text-xs font-semibold uppercase tracking-wider rounded-tag transition-colors shadow-sm"
          >
            ➕ Add Lead Manually
          </button>
        </div>
      </div>

      {/* Persona Filter Chips Row */}
      <div className="flex flex-wrap gap-2 items-center pb-2 overflow-x-auto select-none border-b border-slate-100">
        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mr-2">Segment Filter:</span>
        
        <button
          onClick={() => { setPage(1); setPersonaFilter("ALL"); }}
          className={`px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-colors border ${
            personaFilter === "ALL"
              ? "bg-[#2563EB] text-white border-[#2563EB]"
              : "bg-white hover:bg-slate-50 text-slate-600 border-slate-200"
          }`}
        >
          All Segments
        </button>

        {Object.entries(PERSONA_LABELS).map(([key, config]) => (
          <button
            key={key}
            onClick={() => { setPage(1); setPersonaFilter(key); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-colors border ${
              personaFilter === key
                ? "text-white border-transparent"
                : "bg-white hover:bg-slate-50 text-slate-600 border-slate-200"
            }`}
            style={{ 
              backgroundColor: personaFilter === key ? config.color : undefined,
              borderColor: personaFilter === key ? config.color : undefined
            }}
          >
            <span>{config.icon}</span>
            <span>{config.label}</span>
          </button>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface border border-luxury p-4 rounded-card shadow-sm grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
        
        {/* Search */}
        <div className="sm:col-span-2 flex gap-2">
          <input
            type="text"
            placeholder="Search leads by name, email, or phone... (Press Enter)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyPress}
            className="w-full bg-luxury-bg border border-luxury px-3 py-2 rounded-input text-xs text-text-primary focus:outline-none focus:border-accent"
          />
          <button
            onClick={() => { setPage(1); loadLeads(); }}
            className="bg-primary hover:bg-primary-light px-3.5 rounded-input text-xs text-surface uppercase font-semibold tracking-wider transition-colors"
          >
            Search
          </button>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => { setPage(1); setStatusFilter(e.target.value); }}
            className="w-full bg-luxury-bg border border-luxury px-3 py-2 rounded-input text-xs text-text-primary focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="NEW">NEW</option>
            <option value="CONTACTED">CONTACTED</option>
            <option value="INTERESTED">INTERESTED</option>
            <option value="NEGOTIATING">NEGOTIATING</option>
            <option value="CONVERTED">CONVERTED</option>
            <option value="LOST">LOST</option>
          </select>
        </div>

        {/* City Filter */}
        <div>
          <input
            type="text"
            placeholder="Filter by City (e.g. Hyderabad)"
            value={cityFilter}
            onChange={(e) => { setPage(1); setCityFilter(e.target.value); }}
            className="w-full bg-luxury-bg border border-luxury px-3 py-2 rounded-input text-xs text-text-primary focus:outline-none focus:border-accent"
          />
        </div>

      </div>

      {/* Leads Grid/Table panel */}
      <div className="bg-surface border border-luxury rounded-card shadow-sm flex-grow overflow-hidden flex flex-col justify-between">
        
        {isLoading ? (
          <div className="p-8 text-center text-text-secondary animate-pulse">
            Loading leads records...
          </div>
        ) : leads.length === 0 ? (
          <div className="p-16 text-center text-text-secondary space-y-3">
            <span className="text-3xl">👥</span>
            <h3 className="font-display text-lg font-bold text-primary">No Leads Found</h3>
            <p className="text-xs max-w-sm mx-auto leading-relaxed">
              No lead records match your queries. Try clearing search strings or add a manual lead profile.
            </p>
          </div>
        ) : (
          <LeadsTable
            leads={leads}
            onSelectRow={(lead) => setActiveLead(lead)}
            onStatusChange={handleStatusChange}
            selectedIds={selectedIds}
            onSelectAll={handleSelectAll}
            onToggleRow={handleToggleRow}
          />
        )}

        {/* Pagination footer */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-luxury bg-luxury-bg/20 flex items-center justify-between text-xs">
            <span className="text-text-secondary">
              Showing page {page} of {totalPages} ({totalLeads} total leads)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 border border-luxury rounded bg-surface text-text-secondary disabled:opacity-50 hover:bg-luxury-bg/50 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 border border-luxury rounded bg-surface text-text-secondary disabled:opacity-50 hover:bg-luxury-bg/50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Lead details panel sidebar drawer */}
      {activeLead && (
        <LeadDetailPanel
          lead={activeLead}
          onClose={() => setActiveLead(null)}
          onUpdateNotes={handleUpdateNotes}
          onStatusChange={handleStatusChange}
          onRefresh={loadLeads}
        />
      )}

      {/* Manual Add Lead Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-surface border border-luxury rounded-card shadow-luxury w-full max-w-lg overflow-hidden animate-slide-in">
            <div className="px-6 py-4 border-b border-luxury bg-luxury-bg/30 flex justify-between items-center">
              <h3 className="font-display font-bold text-primary">Add CRM Lead Manually</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-text-secondary hover:text-primary text-sm font-semibold"
              >
                ✕ Close
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-text-secondary mb-1">
                    Client Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-luxury-bg border border-luxury px-3 py-2 rounded-input text-text-primary focus:outline-none focus:border-accent"
                    placeholder="Enter full name"
                  />
                </div>
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-text-secondary mb-1">
                    City location
                  </label>
                  <input
                    type="text"
                    required
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    className="w-full bg-luxury-bg border border-luxury px-3 py-2 rounded-input text-text-primary focus:outline-none focus:border-accent"
                    placeholder="e.g. Hyderabad"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-text-secondary mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full bg-luxury-bg border border-luxury px-3 py-2 rounded-input text-text-primary focus:outline-none focus:border-accent"
                    placeholder="name@example.com"
                  />
                </div>
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-text-secondary mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full bg-luxury-bg border border-luxury px-3 py-2 rounded-input text-text-primary focus:outline-none focus:border-accent"
                    placeholder="+91 99999 99999"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-text-secondary mb-1">
                    Budget (₹ Lakhs)
                  </label>
                  <input
                    type="number"
                    required
                    value={newBudget}
                    onChange={(e) => setNewBudget(Number(e.target.value))}
                    className="w-full bg-luxury-bg border border-luxury px-3 py-2 rounded-input text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-text-secondary mb-1">
                    Horizon (Years)
                  </label>
                  <input
                    type="number"
                    required
                    value={newHorizon}
                    onChange={(e) => setNewHorizon(Number(e.target.value))}
                    className="w-full bg-luxury-bg border border-luxury px-3 py-2 rounded-input text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-text-secondary mb-1">
                    Pipeline Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full bg-luxury-bg border border-luxury px-3 py-2 rounded-input text-text-primary focus:outline-none"
                  >
                    <option value="NEW">NEW</option>
                    <option value="CONTACTED">CONTACTED</option>
                    <option value="INTERESTED">INTERESTED</option>
                    <option value="NEGOTIATING">NEGOTIATING</option>
                    <option value="CONVERTED">CONVERTED</option>
                    <option value="LOST">LOST</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-text-secondary mb-1">
                  CRM Follow-up Notes
                </label>
                <textarea
                  placeholder="Notes from initial manual entry details..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  rows={3}
                  className="w-full bg-surface border border-luxury p-3 rounded-input text-text-primary focus:outline-none focus:border-accent resize-none"
                />
              </div>

              <div className="pt-4 border-t border-luxury flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-luxury rounded bg-surface hover:bg-luxury-bg text-text-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2 bg-primary hover:bg-primary-light text-surface font-semibold rounded-[4px] disabled:opacity-50"
                >
                  {isCreating ? "Creating..." : "Save CRM Lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default function AdminLeadsPage() {
  return (
    <Suspense fallback={<div className="flex-grow flex items-center justify-center text-text-secondary text-sm">Loading leads directory...</div>}>
      <LeadsPageContent />
    </Suspense>
  );
}
