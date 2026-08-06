"use client";

import React, { useState, useEffect } from "react";
import CustomerProfile from "@/components/admin/CustomerProfile";
import { User, ChevronRight, Search } from "lucide-react";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  searchesCount: number;
  leadStatus: string;
  lastActivity: string;
  leads: any[];
  searches: any[];
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);

  async function loadCustomers() {
    setIsLoading(true);
    try {
      let url = "/api/admin/customers";
      if (search) {
        url += `?search=${encodeURIComponent(search)}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setCustomers(data);
      }
    } catch (err) {
      console.error("Failed to load customer list", err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      loadCustomers();
    }
  };

  const handleUpdateCustomer = async (
    customerId: string,
    updatedData: { name: string; email: string; phone: string }
  ) => {
    try {
      const res = await fetch(`/api/admin/customers/${customerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedData),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errObj = new Error(errorData.error || "Failed to update customer info.");
        (errObj as any).details = errorData.details;
        throw errObj;
      }

      setCustomers((prev) =>
        prev.map((c) => (c.id === customerId ? { ...c, ...updatedData } : c))
      );
      if (activeCustomer && activeCustomer.id === customerId) {
        setActiveCustomer((prev: any) => ({ ...prev, ...updatedData }));
      }
    } catch (err) {
      console.error("Failed to update customer info", err);
      throw err;
    }
  };

  // Export Customer Directory CSV
  const handleExportCSV = () => {
    if (customers.length === 0) return;
    
    const headers = ["ID", "Name", "Email", "Phone", "Searches Count", "Lead Status", "Last Activity"];
    const rows = customers.map((c) => [
      c.id,
      c.name,
      c.email,
      c.phone,
      c.searchesCount,
      c.leadStatus,
      new Date(c.lastActivity).toISOString().substring(0, 10),
    ]);

    const csvContent = 
      "data:text/csv;charset=utf-8," + 
      [headers.join(","), ...rows.map((r) => r.map(val => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `urban_ventures_crm_customers_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "NEW":
        return "bg-blue-100 text-blue-800";
      case "CONTACTED":
        return "bg-purple-100 text-purple-800";
      case "INTERESTED":
        return "bg-[#F4F0FF] text-[#5B4FE0]";
      case "NEGOTIATING":
        return "bg-amber-100 text-amber-800";
      case "CONVERTED":
        return "bg-emerald-100 text-emerald-800";
      case "LOST":
        return "bg-rose-100 text-rose-800";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 flex-grow flex flex-col animate-fade-in text-[#1A1A2E] w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#F0EDFA]">
        <div>
          <span className="text-[11px] text-[#5B4FE0] font-bold uppercase tracking-widest block mb-1">Client Profile Ledger</span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#1A1A2E]">Customer Directory</h1>
        </div>
        <div>
          <button
            onClick={handleExportCSV}
            className="crm-btn-secondary text-xs"
          >
            📊 Export CSV
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="crm-card p-6 flex gap-3 items-center">
        <div className="relative flex-grow">
          <input
            type="text"
            placeholder="Search customers by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyPress}
            className="w-full bg-[#F9F8FD] border border-[#E8E5F5] pl-9 pr-4 py-2 rounded-full text-xs text-[#1A1A2E] placeholder-[#8A8A9E] focus:outline-none focus:border-[#5B4FE0]"
          />
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A8A9E]" />
        </div>
        <button
          onClick={loadCustomers}
          className="crm-btn-primary text-xs px-5"
        >
          Search
        </button>
      </div>

      {/* Directory Table */}
      <div className="crm-card p-0 overflow-hidden flex-grow">
        {isLoading ? (
          <div className="p-12 text-center text-[#8A8A9E] animate-pulse text-xs">
            Loading directory entries...
          </div>
        ) : customers.length === 0 ? (
          <div className="p-16 text-center text-[#8A8A9E] space-y-3">
            <span className="text-3xl">👥</span>
            <h3 className="font-display text-lg font-bold text-[#1A1A2E]">No Customers Found</h3>
            <p className="text-xs max-w-sm mx-auto leading-relaxed">
              No matching client profiles found.
            </p>
          </div>
        ) : (
          <table className="crm-table text-xs w-full">
            <thead>
              <tr>
                <th>Client Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Searches Count</th>
                <th>Lead Status</th>
                <th>Last Activity</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr
                  key={c.id}
                  className="cursor-pointer"
                  onClick={() => setActiveCustomer(c)}
                >
                  <td className="font-bold text-[#1A1A2E]">
                    <div className="flex items-center gap-3">
                      <div className="crm-avatar-ring shrink-0">
                        <div className="w-8 h-8 rounded-full bg-[#EBE7F5] flex items-center justify-center text-[#5B4FE0] font-bold text-xs">
                          {c.name.charAt(0)}
                        </div>
                      </div>
                      <span>{c.name}</span>
                    </div>
                  </td>
                  <td className="text-[#8A8A9E]">{c.email}</td>
                  <td className="text-[#8A8A9E]">{c.phone}</td>
                  <td className="font-semibold text-[#1A1A2E]">{c.searchesCount} Searches</td>
                  <td>
                    <span className={`badge px-3 py-1 rounded-full text-[10px] font-bold ${getStatusBadge(c.leadStatus)}`}>
                      {c.leadStatus.replace("_", " ")}
                    </span>
                  </td>
                  <td className="text-[#8A8A9E]">
                    {new Date(c.lastActivity).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="text-right">
                    <span className="text-[#5B4FE0] font-bold text-xs inline-flex items-center gap-1 hover:underline">
                      View Profile <ChevronRight size={14} />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Customer Profile detail sheet */}
      {activeCustomer && (
        <CustomerProfile
          customer={activeCustomer}
          onClose={() => setActiveCustomer(null)}
          onUpdateCustomer={handleUpdateCustomer}
        />
      )}
    </div>
  );
}
