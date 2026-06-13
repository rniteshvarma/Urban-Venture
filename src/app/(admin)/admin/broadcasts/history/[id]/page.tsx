"use client";

import React, { useState, useEffect, useRef, use } from "react";
import Link from "next/link";
import { 
  ArrowLeft,
  Megaphone,
  MessageSquare,
  Mail,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Send,
  Loader2,
  Users,
  Eye,
  Activity
} from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function BroadcastReportPage({ params }: PageProps) {
  const { id } = use(params);
  
  const [broadcast, setBroadcast] = useState<any | null>(null);
  const [stats, setStats] = useState<any | null>(null);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);

  // Recipient search & filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL, FAILED, UNDELIVERED

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadBroadcastAndStats();
    loadRecipients();
    
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [id]);

  // Load recipients whenever filter/search changes
  useEffect(() => {
    loadRecipients();
  }, [statusFilter, searchQuery]);

  // If broadcast status becomes SENDING, start polling
  useEffect(() => {
    if (broadcast?.status === "SENDING") {
      if (!pollIntervalRef.current) {
        pollIntervalRef.current = setInterval(() => {
          pollData();
        }, 2000);
      }
    } else {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }
  }, [broadcast?.status]);

  const loadBroadcastAndStats = async () => {
    try {
      const res = await fetch(`/api/admin/broadcasts/${id}`);
      if (res.ok) {
        const data = await res.json();
        setBroadcast(data.broadcast);
        setStats(data.stats);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRecipients = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (statusFilter !== "ALL") {
        queryParams.set("filter", statusFilter);
      }
      if (searchQuery.trim()) {
        queryParams.set("search", searchQuery.trim());
      }
      
      const res = await fetch(`/api/admin/broadcasts/${id}/recipients?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRecipients(data.recipients || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const pollData = async () => {
    try {
      const [statusRes, recipientsRes] = await Promise.all([
        fetch(`/api/admin/broadcasts/${id}`),
        fetch(`/api/admin/broadcasts/${id}/recipients?${statusFilter !== "ALL" ? "filter=" + statusFilter : ""}${searchQuery.trim() ? "&search=" + searchQuery.trim() : ""}`)
      ]);

      if (statusRes.ok && recipientsRes.ok) {
        const statusData = await statusRes.json();
        const recipientsData = await recipientsRes.json();

        setBroadcast(statusData.broadcast);
        setStats(statusData.stats);
        setRecipients(recipientsData.recipients || []);

        if (statusData.broadcast.status !== "SENDING") {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRetryFailed = async () => {
    setIsRetrying(true);
    try {
      const res = await fetch(`/api/admin/broadcasts/${id}/retry-failed`, {
        method: "POST"
      });
      if (res.ok) {
        setBroadcast((prev: any) => prev ? { ...prev, status: "SENDING" } : null);
        // Polling will auto-trigger via useEffect
      } else {
        const data = await res.json();
        alert(`Failed to retry: ${data.error || "Unknown error"}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRetrying(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SENT":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200"><CheckCircle2 size={10} /> Completed</span>;
      case "SENDING":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 animate-pulse"><Loader2 size={10} className="animate-spin" /> Sending</span>;
      case "SCHEDULED":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200"><Clock size={10} /> Scheduled</span>;
      case "FAILED":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200"><AlertTriangle size={10} /> Failed</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 text-slate-500 border border-slate-200">Draft</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex-grow flex items-center justify-center p-12 text-slate-550 animate-pulse text-xs uppercase tracking-wider font-bold">
        Loading Broadcast Campaign Analytics...
      </div>
    );
  }

  if (!broadcast) {
    return (
      <div className="space-y-4 text-center p-12">
        <AlertTriangle className="text-red-500 mx-auto w-12 h-12" />
        <h2 className="text-lg font-bold text-slate-800">Broadcast Campaign Not Found</h2>
        <Link href="/admin/broadcasts" className="text-xs text-blue-600 hover:underline">
          Return to Broadcast Center
        </Link>
      </div>
    );
  }

  const isSending = broadcast.status === "SENDING";

  return (
    <div className="space-y-6 flex-grow flex flex-col">
      {/* Navigation Headers */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link href="/admin/broadcasts/history" className="hover:text-primary transition-colors flex items-center gap-1">
            <ArrowLeft size={12} /> Broadcast Center
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-semibold">Report Detail</span>
        </div>

        <button
          onClick={loadBroadcastAndStats}
          className="p-1.5 border border-slate-200 rounded hover:bg-slate-50 text-slate-500"
          title="Force refresh"
        >
          <RefreshCw size={13} />
        </button>
      </div>

      {/* Main Campaign Header details */}
      <div className="bg-white border border-slate-200 p-6 rounded shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900">
              {broadcast.name}
            </h1>
            {getStatusBadge(broadcast.status)}
          </div>
          
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
            <span>Channel: <strong className="text-slate-700">{broadcast.channel}</strong></span>
            <span>•</span>
            <span>Target: <strong className="text-slate-700 uppercase tracking-wider text-[10px]">{broadcast.groupType.replace(/_/g, " ")}</strong></span>
            <span>•</span>
            <span>Dispatched By: <strong className="text-slate-700">{broadcast.createdBy}</strong></span>
            {broadcast.sentAt && (
              <>
                <span>•</span>
                <span>Sent: <strong className="text-slate-700">{new Date(broadcast.sentAt).toLocaleString("en-IN")}</strong></span>
              </>
            )}
          </div>
        </div>

        {stats?.failedCount > 0 && broadcast.status !== "SENDING" && (
          <button
            onClick={handleRetryFailed}
            disabled={isRetrying}
            className="flex items-center justify-center gap-1.5 px-4.5 py-2.5 bg-[#2563EB] hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider rounded transition-colors shadow-sm"
          >
            {isRetrying ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Retry Failed Recipients ({stats.failedCount})
          </button>
        )}
      </div>

      {/* Stats Cards Dashboard */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {/* Card 1: Total Size */}
          <div className="bg-white border border-slate-200 p-5 rounded shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Recipients Size</span>
              <div className="text-2xl font-bold text-slate-800">{stats.totalRecipients}</div>
              <span className="text-[10px] text-slate-500 font-medium">Target audience size</span>
            </div>
            <span className="p-3 bg-blue-50 text-blue-600 rounded-full"><Users size={20} /></span>
          </div>

          {/* Card 2: WhatsApp stats */}
          {(broadcast.channel === "WHATSAPP" || broadcast.channel === "BOTH") && (
            <div className="bg-white border border-slate-200 p-5 rounded shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] text-green-600 font-bold uppercase tracking-wider block">WhatsApp Delivery</span>
                <div className="text-2xl font-bold text-green-800">{stats.whatsapp.deliveredRate}%</div>
                <span className="text-[10px] text-slate-500 font-medium">Delivered: {stats.whatsapp.delivered} | Read: {stats.whatsapp.read}</span>
              </div>
              <span className="p-3 bg-green-50 text-green-600 rounded-full"><MessageSquare size={20} /></span>
            </div>
          )}

          {/* Card 3: Email stats */}
          {(broadcast.channel === "EMAIL" || broadcast.channel === "BOTH") && (
            <div className="bg-white border border-slate-200 p-5 rounded shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] text-purple-600 font-bold uppercase tracking-wider block">Email Open Rate</span>
                <div className="text-2xl font-bold text-purple-800">{stats.email.openRate}%</div>
                <span className="text-[10px] text-slate-500 font-medium">Opened: {stats.email.opened} | Sent: {stats.email.sent}</span>
              </div>
              <span className="p-3 bg-purple-50 text-purple-600 rounded-full"><Mail size={20} /></span>
            </div>
          )}

          {/* Card 4: Failed deliveries count */}
          <div className="bg-white border border-slate-200 p-5 rounded shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-red-600 font-bold uppercase tracking-wider block">Failed Dispatches</span>
              <div className="text-2xl font-bold text-red-800">{stats.failedCount}</div>
              <span className="text-[10px] text-slate-500 font-medium">Deliveries requiring attention</span>
            </div>
            <span className="p-3 bg-red-50 text-red-600 rounded-full"><XCircle size={20} /></span>
          </div>
        </div>
      )}

      {/* Campaign Messages Preview Accordion */}
      <div className="bg-white border border-slate-200 p-5 rounded shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
          Campaign Message Preview
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {broadcast.whatsappMessage && (
            <div className="space-y-2">
              <span className="font-bold text-slate-500 block uppercase tracking-wider text-[9px]">WhatsApp Text Structure:</span>
              <div className="p-3 bg-slate-50 rounded border border-slate-200 font-mono text-[10px] whitespace-pre-line text-slate-800 shadow-inner">
                {broadcast.whatsappMessage}
              </div>
            </div>
          )}

          {broadcast.emailBody && (
            <div className="space-y-2">
              <span className="font-bold text-slate-500 block uppercase tracking-wider text-[9px]">Email Content Structure:</span>
              <div className="p-3 bg-slate-50 rounded border border-slate-200 text-[10px] text-slate-800 space-y-2 shadow-inner">
                <div className="border-b border-slate-200 pb-1 font-bold">
                  Subject: <span className="font-normal font-sans text-slate-700">{broadcast.emailSubject}</span>
                </div>
                <div className="font-mono text-[9px] max-h-36 overflow-y-auto whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: broadcast.emailBody }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Live Polling progress bar if status is SENDING */}
      {isSending && (
        <div className="bg-blue-50 border border-blue-200 p-5 rounded shadow-sm space-y-3">
          <div className="flex justify-between items-center text-xs font-bold text-blue-900">
            <span className="flex items-center gap-1.5"><Activity size={14} className="animate-spin text-blue-600" /> Active batch dispatcher is processing...</span>
            <span>Refreshing logs...</span>
          </div>
          <div className="w-full bg-blue-100 rounded-full h-2 overflow-hidden">
            <div className="bg-blue-600 h-full rounded-full animate-pulse" style={{ width: "100%" }} />
          </div>
        </div>
      )}

      {/* Detailed Recipients status logs */}
      <div className="bg-white border border-slate-200 rounded shadow-sm flex-grow flex flex-col">
        {/* Table Filter options */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider border transition-all ${
                statusFilter === "ALL" 
                  ? "bg-slate-800 text-white border-slate-800" 
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-350"
              }`}
            >
              All Logs
            </button>
            <button
              onClick={() => setStatusFilter("FAILED")}
              className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider border transition-all ${
                statusFilter === "FAILED" 
                  ? "bg-red-650 text-white border-red-650" 
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-350"
              }`}
            >
              Failed ({stats?.failedCount || 0})
            </button>
            <button
              onClick={() => setStatusFilter("UNDELIVERED")}
              className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider border transition-all ${
                statusFilter === "UNDELIVERED" 
                  ? "bg-orange-650 text-white border-orange-650" 
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-350"
              }`}
            >
              Undelivered
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search recipient by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 pl-8 pr-3 py-1.5 rounded text-xs focus:outline-none focus:border-blue-600"
            />
            <Search size={12} className="absolute left-2.5 top-2.5 text-slate-400" />
          </div>
        </div>

        {/* Recipients list table */}
        <div className="overflow-x-auto">
          {recipients.length === 0 ? (
            <div className="py-12 text-center text-slate-400 italic text-xs">
              No matching recipient logs found.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-550 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="px-5 py-3">Lead Recipient</th>
                  <th className="px-5 py-3">Contact Details</th>
                  {broadcast.channel !== "EMAIL" && <th className="px-5 py-3">WhatsApp Status</th>}
                  {broadcast.channel !== "WHATSAPP" && <th className="px-5 py-3">Email Status</th>}
                  <th className="px-5 py-3">Dispatched Time</th>
                  <th className="px-5 py-3">Audit Details / Errors</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recipients.map((r) => {
                  const hasError = r.errorMessage;
                  return (
                    <tr key={r.id} className={`hover:bg-slate-50/50 transition-colors ${hasError ? "bg-red-50/10" : ""}`}>
                      <td className="px-5 py-4 font-semibold text-slate-800">
                        {r.lead?.name}
                      </td>
                      <td className="px-5 py-4 space-y-0.5 text-[10px] text-slate-500">
                        {r.lead?.email && <div>{r.lead.email}</div>}
                        {r.lead?.phone && <div>{r.lead.phone}</div>}
                      </td>
                      {broadcast.channel !== "EMAIL" && (
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1 font-bold ${
                            r.whatsappStatus === "SENT" || r.whatsappStatus === "DELIVERED" || r.whatsappStatus === "READ"
                              ? "text-green-600"
                              : r.whatsappStatus === "FAILED"
                              ? "text-red-600"
                              : "text-slate-400"
                          }`}>
                            {r.whatsappStatus || "-"}
                          </span>
                        </td>
                      )}
                      {broadcast.channel !== "WHATSAPP" && (
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1 font-bold ${
                            r.emailStatus === "SENT" || r.emailStatus === "DELIVERED" || r.emailStatus === "OPENED" || r.emailStatus === "CLICKED"
                              ? "text-green-600"
                              : r.emailStatus === "FAILED" || r.emailStatus === "BOUNCED"
                              ? "text-red-600"
                              : "text-slate-400"
                          }`}>
                            {r.emailStatus || "-"}
                          </span>
                        </td>
                      )}
                      <td className="px-5 py-4 text-slate-400 font-mono text-[10px]">
                        {r.whatsappSentAt || r.emailSentAt 
                          ? new Date(r.whatsappSentAt || r.emailSentAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
                          : "-"
                        }
                      </td>
                      <td className="px-5 py-4 max-w-[200px] truncate text-[10px] text-slate-500" title={r.errorMessage || ""}>
                        {r.errorMessage ? (
                          <span className="text-red-600 font-medium flex items-center gap-0.5"><XCircle size={10} className="flex-shrink-0" /> {r.errorMessage}</span>
                        ) : (
                          <span className="text-green-600 font-medium flex items-center gap-0.5"><CheckCircle2 size={10} className="flex-shrink-0" /> Delivery audit passed</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
