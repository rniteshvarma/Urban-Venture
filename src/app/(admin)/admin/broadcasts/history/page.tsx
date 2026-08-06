"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Megaphone,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Eye,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
  Mail,
  MessageSquare
} from "lucide-react";

interface BroadcastCampaign {
  id: string;
  name: string;
  channel: string;
  groupType: string;
  recipientCount: number;
  status: string;
  scheduledAt: string | null;
  sentAt: string | null;
  createdAt: string;
  stats: {
    waDeliveredRate: number;
    emailOpenRate: number;
  };
}

export default function BroadcastHistoryPage() {
  const [broadcasts, setBroadcasts] = useState<BroadcastCampaign[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, pages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadBroadcasts(currentPage);
  }, [currentPage]);

  const loadBroadcasts = async (page: number) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/broadcasts?limit=10&page=${page}`);
      if (res.ok) {
        const data = await res.json();
        setBroadcasts(data.broadcasts || []);
        setPagination(data.pagination || { total: 0, page: 1, limit: 10, pages: 1 });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDraft = async (id: string) => {
    if (!confirm("Are you sure you want to delete this broadcast campaign? This action is permanent.")) return;
    try {
      const res = await fetch(`/api/admin/broadcasts/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setBroadcasts(prev => prev.filter(b => b.id !== id));
      } else {
        const data = await res.json();
        alert(`Failed to delete: ${data.error || "Unknown error"}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SENT":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle size={10} /> Completed
          </span>
        );
      case "SENDING":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 animate-pulse">
            <Clock size={10} /> Sending
          </span>
        );
      case "SCHEDULED":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
            <Clock size={10} /> Scheduled
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <AlertTriangle size={10} /> Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
            Draft
          </span>
        );
    }
  };

  const getChannelBadge = (channel: string) => {
    switch (channel) {
      case "WHATSAPP":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 text-xs text-emerald-800 font-bold bg-emerald-100 rounded-full border border-emerald-200">
            <MessageSquare size={12} /> WhatsApp
          </span>
        );
      case "EMAIL":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 text-xs text-purple-800 font-bold bg-purple-100 rounded-full border border-purple-200">
            <Mail size={12} /> Email
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 text-xs text-blue-800 font-bold bg-blue-100 rounded-full border border-blue-200">
            <Megaphone size={12} /> Email + WA
          </span>
        );
    }
  };

  const filteredBroadcasts = broadcasts.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 flex-grow flex flex-col animate-fade-in text-[#1A1A2E] w-full">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#F0EDFA]">
        <div>
          <span className="text-[11px] text-[#5B4FE0] font-bold uppercase tracking-widest block mb-1">
            Broadcasting Center
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#1A1A2E] flex items-center gap-2">
            Bulk Broadcast Center
          </h1>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/broadcasts/templates"
            className="crm-btn-secondary text-xs"
          >
            <FileText size={14} className="text-[#5B4FE0]" /> Templates
          </Link>
          <Link
            href="/admin/broadcasts/new"
            className="crm-btn-primary text-xs"
          >
            <Plus size={14} /> New Broadcast
          </Link>
        </div>
      </div>

      {/* Search & Actions Bar */}
      <div className="crm-card p-4 flex items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <input
            type="text"
            placeholder="Search campaigns by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#F9F8FD] border border-[#E8E5F5] pl-9 pr-4 py-2 rounded-full text-xs text-[#1A1A2E] focus:outline-none focus:border-[#5B4FE0]"
          />
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A8A9E]" />
        </div>

        <button
          onClick={() => loadBroadcasts(currentPage)}
          className="crm-btn-secondary p-2.5 text-xs"
          title="Refresh campaigns"
        >
          <RefreshCw size={14} className="text-[#5B4FE0]" />
        </button>
      </div>

      {/* Campaigns Listing */}
      <div className="crm-card p-0 overflow-hidden flex-grow">
        {isLoading ? (
          <div className="py-16 text-center text-[#8A8A9E] animate-pulse text-xs">
            Loading broadcast campaigns history...
          </div>
        ) : filteredBroadcasts.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <p className="text-xs text-[#8A8A9E] italic">No broadcast campaigns found.</p>
            <Link
              href="/admin/broadcasts/new"
              className="crm-btn-primary text-xs"
            >
              <Plus size={14} /> Create One
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="crm-table text-xs w-full">
              <thead>
                <tr>
                  <th className="whitespace-nowrap px-4 py-3.5">Campaign Name</th>
                  <th className="whitespace-nowrap px-4 py-3.5">Channel</th>
                  <th className="whitespace-nowrap px-4 py-3.5">Target Group</th>
                  <th className="whitespace-nowrap px-4 py-3.5">Recipients</th>
                  <th className="whitespace-nowrap px-4 py-3.5">Stats</th>
                  <th className="whitespace-nowrap px-4 py-3.5">Status</th>
                  <th className="whitespace-nowrap px-4 py-3.5">Created Date</th>
                  <th className="text-right whitespace-nowrap px-4 py-3.5">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBroadcasts.map((b) => (
                  <tr key={b.id}>
                    <td className="font-bold text-[#1A1A2E] whitespace-nowrap px-4 py-3.5">
                      <Link href={`/admin/broadcasts/history/${b.id}`} className="hover:text-[#5B4FE0]">
                        {b.name}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5">{getChannelBadge(b.channel)}</td>
                    <td className="font-semibold text-[#8A8A9E] uppercase tracking-wider text-[10px] whitespace-nowrap px-4 py-3.5">
                      {b.groupType.replace(/_/g, " ")}
                    </td>
                    <td className="text-[#1A1A2E] font-medium whitespace-nowrap px-4 py-3.5">
                      {b.recipientCount} leads
                    </td>
                    <td className="space-y-0.5 text-[11px] text-[#6E6D8A] whitespace-nowrap px-4 py-3.5">
                      {b.channel !== "EMAIL" && (
                        <div>WA Delivered: <strong className="text-[#5B4FE0]">{b.stats.waDeliveredRate}%</strong></div>
                      )}
                      {b.channel !== "WHATSAPP" && (
                        <div>Email Opened: <strong className="text-[#5B4FE0]">{b.stats.emailOpenRate}%</strong></div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5">{getStatusBadge(b.status)}</td>
                    <td className="text-[#8A8A9E] whitespace-nowrap px-4 py-3.5">
                      {new Date(b.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric"
                      })}
                    </td>
                    <td className="text-right whitespace-nowrap px-4 py-3.5">
                      <div className="flex justify-end items-center gap-2">
                        <Link
                          href={`/admin/broadcasts/history/${b.id}`}
                          className="crm-btn-ghost text-xs text-[#5B4FE0] font-bold px-3 py-1 inline-flex items-center gap-1 hover:bg-[#F4F0FF]"
                          title="View Detailed Report"
                        >
                          <Eye size={13} /> View
                        </Link>
                        
                        <button
                          onClick={() => handleDeleteDraft(b.id)}
                          className="crm-btn-ghost text-xs text-rose-600 font-bold px-3 py-1 inline-flex items-center gap-1 hover:bg-rose-50"
                          title="Delete Broadcast"
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

      {/* Pagination Panel */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between text-xs text-[#8A8A9E] pt-2">
          <span>Page {pagination.page} of {pagination.pages} ({pagination.total} campaigns total)</span>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="crm-btn-ghost text-xs"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(pagination.pages, prev + 1))}
              disabled={currentPage === pagination.pages}
              className="crm-btn-ghost text-xs"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
