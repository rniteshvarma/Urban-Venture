"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import LeadsTable from "@/components/admin/LeadsTable";
import LeadDetailPanel from "@/components/admin/LeadDetailPanel";
import Link from "next/link";
import { Megaphone, ArrowRight, Search, Plus, Download } from "lucide-react";

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
  LAND_SPECULATOR: { label: "Land Speculator", icon: "📈", color: "#E11D48" },
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

  useEffect(() => {
    loadLeads();
  }, [page, statusFilter, cityFilter, personaFilter]);

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

  const handleExportCSV = () => {
    if (leads.length === 0) return;
    
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
        setNewName("");
        setNewEmail("");
        setNewPhone("");
        setNewBudget(50);
        setNewHorizon(5);
        setNewCity("Hyderabad");
        setNewNotes("");
        setNewStatus("NEW");
        setShowAddModal(false);
        loadLeads();
      } else {
        const errData = await res.json();
        alert(`Failed to create lead: ${errData.error || "Server Error"}${errData.details ? " - " + errData.details : ""}`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`An error occurred: ${err.message || "Connection failed"}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 flex-grow flex flex-col animate-fade-in text-[#1A1A2E] w-full">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#F0EDFA]">
        <div>
          <span className="text-[11px] text-[#5B4FE0] font-bold uppercase tracking-widest block mb-1">
            Client Management
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#1A1A2E]">
            Client Leads & Accounts
          </h1>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExportCSV}
            className="crm-btn-secondary text-xs"
          >
            <Download size={14} className="text-[#5B4FE0]" /> Export CSV
          </button>
          
          <button
            onClick={() => setShowAddModal(true)}
            className="crm-btn-primary text-xs"
          >
            <Plus size={14} /> Add Client Manually
          </button>
        </div>
      </div>

      {/* Persona Filter Chips Row */}
      <div className="flex flex-wrap gap-2 items-center pb-2 overflow-x-auto select-none border-b border-[#F0EDFA]">
        <span className="text-[10px] uppercase font-bold text-[#8A8A9E] tracking-wider mr-2">Segment Filter:</span>
        
        <button
          onClick={() => { setPage(1); setPersonaFilter("ALL"); }}
          className={personaFilter === "ALL" ? "filter-pill-active text-xs" : "filter-pill text-xs"}
        >
          All Segments
        </button>

        {Object.entries(PERSONA_LABELS).map(([key, config]) => (
          <button
            key={key}
            onClick={() => { setPage(1); setPersonaFilter(key); }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all border ${
              personaFilter === key
                ? "text-white border-transparent shadow-md"
                : "bg-white hover:bg-[#F4F0FF] text-[#4B5563] border-[#E2E8F0]"
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

      {/* Clean Filter and Search Bar */}
      <div className="crm-card p-6 flex flex-col sm:flex-row items-center gap-3.5 w-full">
        <div className="relative flex-grow w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search leads by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyPress}
            className="w-full bg-[#F9F8FD] border border-[#E8E5F5] pl-9 pr-4 py-2.5 rounded-full text-xs text-[#1A1A2E] placeholder-[#8A8A9E] focus:outline-none focus:border-[#5B4FE0]"
          />
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A8A9E]" size={14} />
        </div>

        <button
          onClick={() => { setPage(1); loadLeads(); }}
          className="crm-btn-primary text-xs px-6 py-2.5 shrink-0 w-full sm:w-auto"
        >
          Search
        </button>

        <select
          value={statusFilter}
          onChange={(e) => { setPage(1); setStatusFilter(e.target.value); }}
          className="bg-[#F9F8FD] border border-[#E8E5F5] rounded-full px-4 py-2.5 text-xs text-[#1A1A2E] focus:outline-none focus:border-[#5B4FE0] shrink-0 w-full sm:w-auto min-w-[140px]"
        >
          <option value="ALL">All Statuses</option>
          <option value="NEW">NEW</option>
          <option value="CONTACTED">CONTACTED</option>
          <option value="INTERESTED">INTERESTED</option>
          <option value="NEGOTIATING">NEGOTIATING</option>
          <option value="CONVERTED">CONVERTED</option>
          <option value="LOST">LOST</option>
        </select>

        <input
          type="text"
          placeholder="Filter by City..."
          value={cityFilter}
          onChange={(e) => { setPage(1); setCityFilter(e.target.value); }}
          className="bg-[#F9F8FD] border border-[#E8E5F5] rounded-full px-4 py-2.5 text-xs text-[#1A1A2E] placeholder-[#8A8A9E] focus:outline-none focus:border-[#5B4FE0] shrink-0 w-full sm:w-auto min-w-[150px]"
        />
      </div>

      {/* Leads Table Panel */}
      <div className="crm-card p-0 flex-grow overflow-hidden flex flex-col justify-between">
        {isLoading ? (
          <div className="p-12 text-center text-[#8A8A9E] animate-pulse text-xs">
            Loading client records...
          </div>
        ) : leads.length === 0 ? (
          <div className="p-16 text-center text-[#8A8A9E] space-y-3">
            <span className="text-3xl">👥</span>
            <h3 className="font-display text-lg font-bold text-[#1A1A2E]">No Clients Found</h3>
            <p className="text-xs max-w-sm mx-auto leading-relaxed">
              No lead records match your search criteria. Try clearing filters or add a client profile.
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

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-[#F0EDFA] bg-[#F9F8FD] flex items-center justify-between text-xs">
            <span className="text-[#8A8A9E]">
              Page {page} of {totalPages} ({totalLeads} total leads)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="crm-btn-ghost text-xs"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="crm-btn-ghost text-xs"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Floating Bulk Broadcast bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40 bg-[#1A1A2E] text-white px-6 py-3.5 rounded-full shadow-2xl flex items-center gap-6 animate-slide-in backdrop-blur-md">
          <div className="flex items-center gap-2 text-xs">
            <span className="p-1.5 bg-[#5B4FE0] rounded-full"><Megaphone size={14} /></span>
            <div>
              <span className="font-bold block text-xs">{selectedIds.length} Leads Selected</span>
            </div>
          </div>
          <Link
            href={`/admin/broadcasts/new?groupType=MANUAL_PICK&leadIds=${selectedIds.join(",")}`}
            className="crm-btn-primary text-xs py-1.5 px-4"
          >
            Broadcast Campaign <ArrowRight size={12} />
          </Link>
        </div>
      )}

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A1A2E]/40 backdrop-blur-xs">
          <div className="crm-card bg-white w-full max-w-lg shadow-2xl p-6 space-y-4 animate-scale-in">
            <div className="pb-3 border-b border-[#F0EDFA] flex justify-between items-center">
              <h3 className="font-display font-bold text-[#1A1A2E] text-base">Add CRM Lead Manually</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-[#8A8A9E] hover:text-[#1A1A2E] text-xs font-semibold"
              >
                ✕ Close
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-[#8A8A9E] text-[10px] mb-1">
                    Client Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-[#F9F8FD] border border-[#E8E5F5] px-4 py-2.5 rounded-full text-[#1A1A2E] focus:outline-none focus:border-[#5B4FE0]"
                    placeholder="Enter full name"
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase tracking-wider text-[#8A8A9E] text-[10px] mb-1">
                    City Location
                  </label>
                  <input
                    type="text"
                    required
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    className="w-full bg-[#F9F8FD] border border-[#E8E5F5] px-4 py-2.5 rounded-full text-[#1A1A2E] focus:outline-none focus:border-[#5B4FE0]"
                    placeholder="e.g. Hyderabad"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-[#8A8A9E] text-[10px] mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full bg-[#F9F8FD] border border-[#E8E5F5] px-4 py-2.5 rounded-full text-[#1A1A2E] focus:outline-none focus:border-[#5B4FE0]"
                    placeholder="name@example.com"
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase tracking-wider text-[#8A8A9E] text-[10px] mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full bg-[#F9F8FD] border border-[#E8E5F5] px-4 py-2.5 rounded-full text-[#1A1A2E] focus:outline-none focus:border-[#5B4FE0]"
                    placeholder="+91 99999 99999"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#F0EDFA] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="crm-btn-secondary px-5 py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="crm-btn-primary px-5 py-2 text-xs disabled:opacity-50"
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
    <Suspense fallback={<div className="flex-grow flex items-center justify-center text-[#8A8A9E] text-sm">Loading leads directory...</div>}>
      <LeadsPageContent />
    </Suspense>
  );
}
