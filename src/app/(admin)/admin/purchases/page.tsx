"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Search, MapPin, Building2, TrendingUp, TrendingDown, FileText, ChevronRight, User } from "lucide-react";
import Image from "next/image";

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [stats, setStats] = useState({ totalPurchases: 0, totalValue: 0, totalInvested: 0, avgAppreciation: 0 });

  useEffect(() => {
    loadPurchases();
  }, []);

  async function loadPurchases() {
    setIsLoading(true);
    try {
      let url = "/api/admin/purchases";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setPurchases(data);
        
        // Calculate stats
        const totalInvested = data.reduce((sum: number, p: any) => sum + p.purchasePrice, 0);
        const totalValue = data.reduce((sum: number, p: any) => sum + p.currentValue, 0);
        const avgAppreciation = totalInvested > 0 ? ((totalValue - totalInvested) / totalInvested) * 100 : 0;
        
        setStats({
          totalPurchases: data.length,
          totalValue,
          totalInvested,
          avgAppreciation
        });
      }
    } catch (err) {
      console.error("Failed to load purchases", err);
    } finally {
      setIsLoading(false);
    }
  }

  const formatLakhs = (value: number) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    return `₹${value.toLocaleString()}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "BOOKING_RECEIVED": return "bg-blue-100 text-blue-800";
      case "AGREEMENT_SIGNED": return "bg-yellow-100 text-yellow-800";
      case "REGISTERED": return "bg-green-100 text-green-800";
      case "POSSESSION_RECEIVED": return "bg-emerald-100 text-emerald-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const filteredPurchases = purchases.filter(p => {
    const matchesSearch = p.project?.name.toLowerCase().includes(search.toLowerCase()) || 
                          p.user?.name.toLowerCase().includes(search.toLowerCase()) ||
                          p.unitNumber.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 flex-grow flex flex-col animate-fade-in text-[#1A1A2E] w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#F0EDFA]">
        <div>
          <span className="text-[11px] text-[#5B4FE0] font-bold uppercase tracking-widest block mb-1">Portfolio Management</span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#1A1A2E]">Owned Property Tracker</h1>
        </div>
        <div>
          <Link href="/admin/purchases/new" className="crm-btn-primary text-xs flex items-center gap-2">
            <Plus size={14} /> Record Purchase
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="crm-card p-5">
          <div className="text-[11px] font-bold uppercase text-gray-500 mb-1">Total Purchases</div>
          <div className="text-2xl font-bold">{stats.totalPurchases}</div>
        </div>
        <div className="crm-card p-5">
          <div className="text-[11px] font-bold uppercase text-gray-500 mb-1">Total Portfolio Value</div>
          <div className="text-2xl font-bold text-indigo-700">{formatLakhs(stats.totalValue)}</div>
        </div>
        <div className="crm-card p-5">
          <div className="text-[11px] font-bold uppercase text-gray-500 mb-1">Total Invested</div>
          <div className="text-2xl font-bold">{formatLakhs(stats.totalInvested)}</div>
        </div>
        <div className="crm-card p-5">
          <div className="text-[11px] font-bold uppercase text-gray-500 mb-1">Avg Appreciation</div>
          <div className={`text-2xl font-bold flex items-center gap-1 ${stats.avgAppreciation >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {stats.avgAppreciation >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
            {stats.avgAppreciation.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="crm-card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-grow">
          <input
            type="text"
            placeholder="Search by client, project, or unit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#F9F8FD] border border-[#E8E5F5] pl-9 pr-4 py-2 rounded-lg text-xs text-[#1A1A2E] placeholder-[#8A8A9E] focus:outline-none focus:border-[#5B4FE0]"
          />
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A8A9E]" />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-[#F9F8FD] border border-[#E8E5F5] px-4 py-2 rounded-lg text-xs text-[#1A1A2E] focus:outline-none focus:border-[#5B4FE0] min-w-[150px]"
        >
          <option value="ALL">All Statuses</option>
          <option value="BOOKING_RECEIVED">Booking Received</option>
          <option value="AGREEMENT_SIGNED">Agreement Signed</option>
          <option value="REGISTERED">Registered</option>
          <option value="POSSESSION_RECEIVED">Possession Received</option>
        </select>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="crm-card h-64 animate-pulse bg-gray-100"></div>
          ))}
        </div>
      ) : filteredPurchases.length === 0 ? (
        <div className="crm-card p-16 text-center text-[#8A8A9E] space-y-3">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 size={32} className="text-gray-400" />
          </div>
          <h3 className="font-display text-lg font-bold text-[#1A1A2E]">No Purchases Found</h3>
          <p className="text-xs">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPurchases.map(p => {
            const appreciation = p.purchasePrice > 0 ? ((p.currentValue - p.purchasePrice) / p.purchasePrice) * 100 : 0;
            return (
              <Link href={`/admin/purchases/${p.id}`} key={p.id} className="crm-card p-5 hover:shadow-md transition-shadow group">
                <div className="flex gap-4 mb-4">
                  <div className="w-16 h-16 rounded-lg bg-gray-100 overflow-hidden relative shrink-0">
                    {p.project?.imageUrls?.[0] ? (
                      <img src={p.project.imageUrls[0]} alt={p.project.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Building2 size={24} />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-indigo-600 mb-1 flex items-center gap-1">
                      <User size={10} /> {p.user?.name}
                    </div>
                    <h3 className="font-bold text-sm text-gray-900 group-hover:text-indigo-600 transition-colors">{p.project?.name}</h3>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      Unit: {p.unitNumber}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4 pt-4 border-t border-gray-100">
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase font-semibold">Invested</div>
                    <div className="text-sm font-bold text-gray-900">{formatLakhs(p.purchasePrice)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase font-semibold">Current Value</div>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-bold text-gray-900">{formatLakhs(p.currentValue || p.purchasePrice)}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${appreciation >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                        {appreciation >= 0 ? '+' : ''}{appreciation.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${getStatusBadge(p.status)}`}>
                    {p.status.replace("_", " ")}
                  </span>
                  <div className="flex gap-3 text-[10px] text-gray-500 font-semibold">
                    <span className="flex items-center gap-1"><FileText size={12} /> {p.documents?.length || 0}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
