"use client";

import React, { useState, useEffect } from "react";
import CustomerProfile from "@/components/admin/CustomerProfile";

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

      if (res.ok) {
        setCustomers((prev) =>
          prev.map((c) => (c.id === customerId ? { ...c, ...updatedData } : c))
        );
        if (activeCustomer && activeCustomer.id === customerId) {
          setActiveCustomer((prev: any) => ({ ...prev, ...updatedData }));
        }
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
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "CONTACTED":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "INTERESTED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "NEGOTIATING":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "CONVERTED":
        return "bg-green-100 text-green-800 border-green-300";
      case "LOST":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  return (
    <div className="space-y-6 flex-grow flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[10px] text-accent font-bold uppercase tracking-widest block">Client Profile Ledger</span>
          <h1 className="font-display text-2xl sm:text-4xl font-bold text-primary">Customer Directory</h1>
        </div>
        <div>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 border border-luxury hover:bg-luxury-bg/40 text-text-primary text-xs font-semibold uppercase tracking-wider rounded-tag transition-colors"
          >
            📊 Export CSV
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-surface border border-luxury p-4 rounded-card shadow-sm flex gap-2">
        <input
          type="text"
          placeholder="Search customers by name, email, or phone... (Press Enter)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleSearchKeyPress}
          className="w-full bg-luxury-bg border border-luxury px-3 py-2 rounded-input text-xs text-text-primary focus:outline-none focus:border-accent"
        />
        <button
          onClick={loadCustomers}
          className="bg-primary hover:bg-primary-light px-4 rounded-input text-xs text-surface uppercase font-semibold tracking-wider transition-colors"
        >
          Search
        </button>
      </div>

      {/* Directory Table */}
      <div className="bg-surface border border-luxury rounded-card shadow-sm flex-grow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-text-secondary animate-pulse">
            Loading directory entries...
          </div>
        ) : customers.length === 0 ? (
          <div className="p-16 text-center text-text-secondary space-y-3">
            <span className="text-3xl">👥</span>
            <h3 className="font-display text-lg font-bold text-primary">No Customers Found</h3>
            <p className="text-xs max-w-sm mx-auto leading-relaxed">
              No matching client profiles found.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="min-w-full divide-y divide-luxury text-left text-xs text-text-primary">
              <thead className="bg-luxury-bg text-text-secondary uppercase font-semibold tracking-wider">
                <tr>
                  <th className="px-6 py-4">Client Name</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Phone</th>
                  <th className="px-6 py-4">Searches Count</th>
                  <th className="px-6 py-4">Lead status</th>
                  <th className="px-6 py-4">Last activity</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-luxury bg-surface">
                {customers.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-luxury-bg/30 transition-colors cursor-pointer"
                    onClick={() => setActiveCustomer(c)}
                  >
                    <td className="px-6 py-4 font-semibold text-primary text-sm">{c.name}</td>
                    <td className="px-6 py-4 text-text-secondary">{c.email}</td>
                    <td className="px-6 py-4 text-text-secondary">{c.phone}</td>
                    <td className="px-6 py-4 font-medium text-center sm:text-left">{c.searchesCount} Searches</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded border text-[9px] font-bold uppercase ${getStatusBadge(c.leadStatus)}`}>
                        {c.leadStatus.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-text-secondary">
                      {new Date(c.lastActivity).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-4 text-right text-accent font-bold text-sm">
                      <span>View Profile →</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
