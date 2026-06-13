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
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
            <CheckCircle size={10} /> Completed
          </span>
        );
      case "SENDING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
            <Clock size={10} /> Sending
          </span>
        );
      case "SCHEDULED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <Clock size={10} /> Scheduled
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
            <AlertTriangle size={10} /> Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 text-slate-500 border border-slate-200">
            Draft
          </span>
        );
    }
  };

  const getChannelBadge = (channel: string) => {
    switch (channel) {
      case "WHATSAPP":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs text-green-700 font-medium bg-green-50 rounded border border-green-150">
            <MessageSquare size={11} /> WhatsApp
          </span>
        );
      case "EMAIL":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs text-purple-700 font-medium bg-purple-50 rounded border border-purple-150">
            <Mail size={11} /> Email
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs text-blue-700 font-medium bg-blue-50 rounded border border-blue-150">
            <Megaphone size={11} /> Email + WA
          </span>
        );
    }
  };

  const filteredBroadcasts = broadcasts.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 flex-grow flex flex-col">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[10px] text-blue-600 font-bold uppercase tracking-widest block">
            Broadcasting Center
          </span>
          <h1 className="font-display text-2xl sm:text-4xl font-bold text-slate-900 flex items-center gap-2">
            <Megaphone size={28} className="text-blue-600" /> Bulk Broadcast Center
          </h1>
        </div>

        <div className="flex gap-2">
          <Link
            href="/admin/broadcasts/templates"
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider rounded transition-colors shadow-sm"
          >
            <FileText size={14} /> Templates
          </Link>
          <Link
            href="/admin/broadcasts/new"
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded transition-colors shadow-sm"
          >
            <Plus size={14} /> New Broadcast
          </Link>
        </div>
      </div>

      {/* Search & Actions bar */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-3.5">
        <div className="relative w-full max-w-sm">
          <input
            type="text"
            placeholder="Search campaigns by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 pl-8 pr-3 py-1.5 rounded text-xs focus:outline-none focus:border-blue-600"
          />
          <Search size={12} className="absolute left-2.5 top-2.5 text-slate-400" />
        </div>

        <button
          onClick={() => loadBroadcasts(currentPage)}
          className="p-1.5 border border-slate-200 rounded hover:bg-slate-50 text-slate-500 transition-colors"
          title="Refresh campaigns"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Campaigns Listing */}
      <div className="bg-white border border-slate-200 rounded shadow-sm overflow-x-auto flex-grow">
        {isLoading ? (
          <div className="py-16 text-center text-slate-500 animate-pulse text-xs">
            Loading broadcast campaigns history...
          </div>
        ) : filteredBroadcasts.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <p className="text-xs text-slate-450 italic">No broadcast campaigns found.</p>
            <Link
              href="/admin/broadcasts/new"
              className="inline-flex items-center gap-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded transition-colors shadow-sm"
            >
              <Plus size={14} /> Create One
            </Link>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="px-5 py-3">Campaign Name</th>
                <th className="px-5 py-3">Channel</th>
                <th className="px-5 py-3">Target Group</th>
                <th className="px-5 py-3">Recipients</th>
                <th className="px-5 py-3">Stats</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Created Date</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBroadcasts.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4 font-semibold text-slate-800">
                    <Link href={`/admin/broadcasts/history/${b.id}`} className="hover:text-blue-600 hover:underline">
                      {b.name}
                    </Link>
                  </td>
                  <td className="px-5 py-4">{getChannelBadge(b.channel)}</td>
                  <td className="px-5 py-4 font-medium text-slate-600 uppercase tracking-wider text-[9px]">
                    {b.groupType.replace(/_/g, " ")}
                  </td>
                  <td className="px-5 py-4 text-slate-700 font-medium">
                    {b.recipientCount} leads
                  </td>
                  <td className="px-5 py-4 space-y-0.5 text-[10px] text-slate-500">
                    {b.channel !== "EMAIL" && (
                      <div>WA Delivered: <strong className="text-slate-800">{b.stats.waDeliveredRate}%</strong></div>
                    )}
                    {b.channel !== "WHATSAPP" && (
                      <div>Email Opened: <strong className="text-slate-800">{b.stats.emailOpenRate}%</strong></div>
                    )}
                  </td>
                  <td className="px-5 py-4">{getStatusBadge(b.status)}</td>
                  <td className="px-5 py-4 text-slate-400 font-mono text-[10px]">
                    {new Date(b.createdAt).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric"
                    })}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex justify-end gap-3.5">
                      <Link
                        href={`/admin/broadcasts/history/${b.id}`}
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold uppercase tracking-wider text-[9px]"
                        title="View Detailed Report"
                      >
                        <Eye size={12} /> View
                      </Link>
                      
                      {(b.status === "DRAFT" || b.status === "SCHEDULED") && (
                        <button
                          onClick={() => handleDeleteDraft(b.id)}
                          className="flex items-center gap-1 text-red-500 hover:text-red-700 font-bold uppercase tracking-wider text-[9px]"
                          title="Delete Draft"
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination panel */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
          <span>Showing page {pagination.page} of {pagination.pages} ({pagination.total} campaigns total)</span>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 border border-slate-200 rounded disabled:opacity-40 hover:bg-slate-50 text-[10px] uppercase font-bold tracking-wider"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(pagination.pages, prev + 1))}
              disabled={currentPage === pagination.pages}
              className="px-3 py-1.5 border border-slate-200 rounded disabled:opacity-40 hover:bg-slate-50 text-[10px] uppercase font-bold tracking-wider"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
