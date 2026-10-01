"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, RefreshCw, Search } from "lucide-react";
import { PROVIDER_NAMES as PROVIDERS } from "@/lib/whatsapp/types";

type Log = {
  id: string;
  message: string;
  status: string;
  provider: string;
  category: string;
  feature: string | null;
  templateName: string | null;
  languageCode: string | null;
  toPhone: string | null;
  normalisedError: string | null;
  errorMessage: string | null;
  estimatedCostPaise: number | null;
  attemptCount: number;
  dryRun: boolean;
  providerMessageId: string | null;
  createdAt: string;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  lead: { id: string; name: string; phone: string } | null;
  template: { name: string } | null;
};

const CATEGORIES = ["MARKETING", "UTILITY", "AUTHENTICATION", "SERVICE"];
const STATUSES = ["PENDING", "SENT", "DELIVERED", "READ", "FAILED"];
const FEATURES: Record<string, string> = {
  weekly_report: "Weekly report",
  pipeline_trigger: "Pipeline trigger",
  broadcast: "Broadcast",
  otp: "Phone OTP",
  concierge: "Buyer concierge",
  keyword_reply: "STOP/PAUSE reply",
  test: "Test",
  manual: "Manual",
};
const ERRORS = [
  "INVALID_NUMBER", "NOT_OPTED_IN", "TEMPLATE_NOT_FOUND", "TEMPLATE_NOT_APPROVED", "TEMPLATE_PARAM_MISMATCH", "OUTSIDE_SESSION_WINDOW",
  "RATE_LIMITED", "QUOTA_EXCEEDED", "AUTH_FAILED", "INSUFFICIENT_BALANCE", "MEDIA_ERROR", "PROVIDER_UNAVAILABLE", "UNSUPPORTED_OPERATION", "UNKNOWN",
];

const STATUS_CLS: Record<string, string> = {
  READ: "bg-emerald-100 text-emerald-800",
  DELIVERED: "bg-blue-100 text-blue-800",
  SENT: "bg-slate-100 text-slate-700",
  FAILED: "bg-rose-100 text-rose-800",
  PENDING: "bg-amber-100 text-amber-800",
};

const selectCls = "bg-white border border-[#E8E5F5] rounded-full px-3 py-2 text-xs text-[#1A1A2E] focus:outline-none focus:border-[#5B4FE0]";
const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

type Filters = { provider: string; category: string; status: string; error: string; feature: string; q: string };
const EMPTY: Filters = { provider: "", category: "", status: "", error: "", feature: "", q: "" };
const LIMIT = 50;

export default function WhatsAppLogsPage() {
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [logs, setLogs] = useState<Log[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);

  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ limit: String(LIMIT), page: String(page) });
    for (const [k, v] of Object.entries(filters)) if (v) params.set(k, v);
    fetch(`/api/admin/whatsapp/logs?${params}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setLogs(data.logs ?? []);
        setTotal(data.total ?? 0);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filters, page, reloadTick]);

  // Every change that triggers a fetch shows the spinner first.
  const updateFilters = (fn: (f: Filters) => Filters) => {
    setLoading(true);
    setPage(1);
    setFilters(fn);
  };
  const goTo = (p: number) => {
    setLoading(true);
    setPage(p);
  };
  const set = (k: keyof Filters) => (e: React.ChangeEvent<HTMLSelectElement>) => updateFilters((f) => ({ ...f, [k]: e.target.value }));
  const pages = Math.max(1, Math.ceil(total / LIMIT));
  const filtered = Object.values(filters).some(Boolean);

  return (
    <div className="max-w-7xl mx-auto space-y-5 w-full animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-2 border-b border-[#F0EDFA]">
        <div>
          <Link href="/admin/whatsapp" className="text-[11px] text-[#5B4FE0] font-bold uppercase tracking-widest inline-flex items-center gap-1 mb-1 py-1">
            <ArrowLeft size={12} /> WhatsApp
          </Link>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#1A1A2E]">Message logs</h1>
          <p className="text-xs text-[#6E6D8A] mt-1">Every send, from every provider, with its normalised outcome and estimated cost.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/settings/whatsapp" className="crm-btn-secondary text-xs">Provider &amp; spend</Link>
          <button onClick={() => { setLoading(true); setReloadTick((t) => t + 1); }} className="crm-btn-secondary text-xs p-2.5" aria-label="Refresh logs">
            <RefreshCw size={14} className={`text-[#5B4FE0] ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="crm-card p-4 flex flex-wrap items-center gap-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateFilters((f) => ({ ...f, q: query.trim() }));
          }}
          className="relative flex-1 min-w-[200px]"
        >
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8A9E]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Phone, lead, template or text"
            aria-label="Search logs"
            className="w-full bg-white border border-[#E8E5F5] rounded-full pl-8 pr-3 py-2 text-xs text-[#1A1A2E] focus:outline-none focus:border-[#5B4FE0]"
          />
        </form>
        <select value={filters.provider} onChange={set("provider")} className={selectCls} aria-label="Provider">
          <option value="">All providers</option>
          {PROVIDERS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={filters.category} onChange={set("category")} className={selectCls} aria-label="Category">
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>)}
        </select>
        <select value={filters.status} onChange={set("status")} className={selectCls} aria-label="Status">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
        </select>
        <select value={filters.feature} onChange={set("feature")} className={selectCls} aria-label="Feature">
          <option value="">All features</option>
          {Object.entries(FEATURES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filters.error} onChange={set("error")} className={selectCls} aria-label="Error">
          <option value="">Any outcome</option>
          <option value="any">Any error</option>
          {ERRORS.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
        {filtered && (
          <button
            onClick={() => {
              setQuery("");
              updateFilters(() => EMPTY);
            }}
            className="crm-btn-ghost text-xs px-3 py-2"
          >
            Clear
          </button>
        )}
      </div>

      <div className="crm-card p-0! overflow-x-auto">
        {!loading && logs.length === 0 ? (
          <p className="text-xs text-[#8A8A9E] py-12 text-center">{filtered ? "No messages match these filters." : "No WhatsApp messages have been sent yet."}</p>
        ) : (
          <table className="crm-table text-xs w-full">
            <thead>
              <tr>
                <th>When</th>
                <th>Recipient</th>
                <th>Message</th>
                <th>Provider · category</th>
                <th>Status</th>
                <th className="text-right">Cost</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <React.Fragment key={log.id}>
                  <tr className="cursor-pointer" onClick={() => setOpen(open === log.id ? null : log.id)} aria-expanded={open === log.id}>
                    <td className="text-[#8A8A9E] whitespace-nowrap">{when(log.createdAt)}</td>
                    <td className="font-semibold text-[#1A1A2E]">
                      {log.lead ? (
                        <Link href={`/admin/leads/${log.lead.id}`} onClick={(e) => e.stopPropagation()} className="hover:text-[#5B4FE0]">{log.lead.name}</Link>
                      ) : (
                        "—"
                      )}
                      <span className="block text-[10px] text-[#8A8A9E] font-normal font-mono">{log.toPhone ?? log.lead?.phone}</span>
                    </td>
                    <td className="max-w-[280px]">
                      <span className="block font-semibold text-[#1A1A2E] truncate">
                        {log.templateName ? <code className="font-mono">{log.templateName}</code> : log.template?.name ?? "Free-form text"}
                      </span>
                      <span className="block text-[10px] text-[#6E6D8A] truncate" title={log.message}>{log.message}</span>
                    </td>
                    <td className="text-[#6E6D8A] whitespace-nowrap">
                      {log.provider} · {log.category.toLowerCase()}
                      {log.feature && <span className="block text-[10px] text-[#8A8A9E]">{FEATURES[log.feature] ?? log.feature}</span>}
                    </td>
                    <td>
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold ${STATUS_CLS[log.status] ?? "bg-slate-100"}`}>{log.status}</span>
                      {log.normalisedError && <span className="block mt-1 text-[9px] font-bold text-rose-700">{log.normalisedError}</span>}
                      {log.dryRun && <span className="block mt-1 text-[9px] font-bold text-amber-700">DRY RUN</span>}
                    </td>
                    <td className="text-right font-mono text-[#1A1A2E]">{log.estimatedCostPaise ? `₹${(log.estimatedCostPaise / 100).toFixed(2)}` : "—"}</td>
                  </tr>
                  {open === log.id && (
                    <tr className="bg-[#FCFBFF]">
                      <td colSpan={6} className="text-[11px] text-[#6E6D8A]">
                        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-1 py-1">
                          <span>Provider message id: <code className="font-mono text-[#1A1A2E] break-all">{log.providerMessageId ?? "—"}</code></span>
                          <span>Attempts: {log.attemptCount}</span>
                          <span>Sent: {log.sentAt ? when(log.sentAt) : "—"}</span>
                          <span>Delivered: {log.deliveredAt ? when(log.deliveredAt) : "—"} · Read: {log.readAt ? when(log.readAt) : "—"}</span>
                          {log.errorMessage && <span className="sm:col-span-2 text-rose-700">Error: {log.errorMessage}</span>}
                          <span className="sm:col-span-2 whitespace-pre-line text-[#1A1A2E]">{log.message}</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {total > LIMIT && (
        <div className="flex items-center justify-between text-xs text-[#6E6D8A]">
          <span>{total.toLocaleString("en-IN")} messages</span>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => goTo(page - 1)} className="crm-btn-secondary text-xs p-2" aria-label="Previous page"><ChevronLeft size={14} /></button>
            <span>Page {page} of {pages}</span>
            <button disabled={page >= pages} onClick={() => goTo(page + 1)} className="crm-btn-secondary text-xs p-2" aria-label="Next page"><ChevronRight size={14} /></button>
          </div>
        </div>
      )}
    </div>
  );
}
