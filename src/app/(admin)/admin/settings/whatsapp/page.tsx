"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  BellRing,
  CheckCircle2,
  Copy,
  FileText,
  List,
  RefreshCw,
  Send,
  ShieldAlert,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { formatDate, formatPhone } from "@/lib/format";

type ConfigRow = { env: string; set: boolean; required: boolean };
type Overview = {
  provider: {
    name: string;
    label: string;
    dryRun: boolean;
    supportsTemplateManagement: boolean;
    supportsSessionMessages: boolean;
    config: ConfigRow[];
    templateSource: string | null;
    webhookUrl: string;
  };
  providers: Array<{ name: string; label: string; configured: boolean }>;
  account: { wabaId?: string; displayNumber?: string; verifiedName?: string; qualityRating?: string; messagingLimit?: number; messagingLimitLabel?: string } | null;
  lastHealth: { ok: boolean; latencyMs: number | null; detail: string | null; checkedAt: string } | null;
  tier: { used24h: number; limit: number; fromAccount: boolean };
  templates: Array<{
    id: string;
    name: string;
    language: string;
    category: string;
    status: string;
    bodyParamCount: number;
    hasHeaderParam: boolean;
    headerType: string | null;
    buttonCount: number;
    bodyText: string | null;
    lastSyncedAt: string;
    syncedFrom: string;
    rejectionReason: string | null;
    inUse: boolean;
  }>;
  alerts: Array<{ id: string; kind: string; severity: string; message: string; createdAt: string }>;
  spend: {
    since: string;
    byCategory: Array<{ category: string; messages: number; paise: number }>;
    byFeature: Array<{ feature: string; messages: number; paise: number }>;
    service: { conversations: number; freeTier: number; beyondFreeTier: number; paise: number };
    totalPaise: number;
    perConvertedLead: { convertedLeads: number; paise: number; perLeadPaise: number | null };
    rates: Record<string, number>;
  };
  queue: Record<string, number>;
  suppressed: number;
};

const rupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: paise < 10000 ? 2 : 0 })}`;
const n = (v: number) => v.toLocaleString("en-IN");

const FEATURE_LABELS: Record<string, string> = {
  weekly_report: "Weekly report",
  pipeline_trigger: "Pipeline triggers",
  broadcast: "Broadcasts",
  otp: "Phone OTP",
  concierge: "Buyer concierge",
  keyword_reply: "STOP / PAUSE replies",
  test: "Test messages",
  manual: "Manual sends",
  other: "Other",
};

const CATEGORY_LABELS: Record<string, string> = { MARKETING: "Marketing", UTILITY: "Utility", AUTHENTICATION: "Auth", SERVICE: "Service" };

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    APPROVED: "bg-emerald-100 text-emerald-800",
    PENDING: "bg-amber-100 text-amber-800",
    REJECTED: "bg-rose-100 text-rose-800",
    PAUSED: "bg-rose-100 text-rose-800",
    DISABLED: "bg-slate-200 text-slate-600",
  };
  const label = status.charAt(0) + status.slice(1).toLowerCase();
  return <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold ${map[status] ?? "bg-slate-100 text-slate-600"}`}>{label}</span>;
}

function QualityDot({ q }: { q?: string }) {
  const color = q === "GREEN" ? "bg-emerald-500" : q === "YELLOW" ? "bg-amber-400" : q === "RED" ? "bg-rose-500" : "bg-slate-300";
  return <span className={`inline-block w-2 h-2 rounded-full ${color}`} aria-hidden />;
}

export default function WhatsAppSettingsPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"health" | "sync" | null>(null);
  const [showTest, setShowTest] = useState(false);
  const [origin, setOrigin] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/whatsapp/overview", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setData(json);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load WhatsApp settings");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read-once browser value
    setOrigin(window.location.origin);
    void load();
  }, [load]);

  const runHealth = async () => {
    setBusy("health");
    try {
      const res = await fetch("/api/admin/whatsapp/health", { method: "POST" });
      const r = await res.json();
      if (r.ok) toast.success(`${r.provider} is healthy${r.latencyMs ? ` · ${r.latencyMs}ms` : ""}`);
      else toast.error(`Health check failed: ${r.detail ?? "no detail"}`);
      await load();
    } finally {
      setBusy(null);
    }
  };

  const syncNow = async () => {
    setBusy("sync");
    try {
      const res = await fetch("/api/admin/whatsapp/registry/sync", { method: "POST" });
      const r = await res.json();
      if (r.ok) toast.success(`Synced ${r.synced} template${r.synced === 1 ? "" : "s"} from ${r.source}${r.changed?.length ? ` · ${r.changed.length} changed` : ""}`);
      else toast.error(r.error ?? "Sync failed");
      await load();
    } finally {
      setBusy(null);
    }
  };

  const ack = async (id: string) => {
    await fetch(`/api/admin/whatsapp/alerts/${id}`, { method: "PATCH" });
    setData((d) => (d ? { ...d, alerts: d.alerts.filter((a) => a.id !== id) } : d));
  };

  const webhookUrl = `${origin}${data?.provider.webhookUrl ?? "/api/webhooks/whatsapp"}`;
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied");
    } catch {
      toast.error("Copy failed — select and copy it manually");
    }
  };

  if (loadError && !data) {
    return (
      <div className="max-w-5xl mx-auto w-full crm-card p-8 text-sm text-rose-700 flex items-center gap-3">
        <AlertTriangle size={18} /> {loadError}
        <button onClick={load} className="crm-btn-secondary text-xs ml-auto">Retry</button>
      </div>
    );
  }
  if (!data) {
    return <div className="flex items-center justify-center p-16 text-[#8A8A9E] animate-pulse text-xs">Loading WhatsApp settings…</div>;
  }

  const { provider, account, lastHealth, tier, spend } = data;
  const missing = provider.config.filter((c) => c.required && !c.set);
  const tierPct = tier.limit ? Math.min(100, Math.round((tier.used24h / tier.limit) * 100)) : 0;
  const healthState = provider.dryRun ? "dry" : lastHealth ? (lastHealth.ok ? "ok" : "bad") : "unknown";

  return (
    <div className="max-w-6xl mx-auto space-y-6 w-full animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-2 border-b border-[#F0EDFA]">
        <div>
          <span className="text-[11px] text-[#5B4FE0] font-bold uppercase tracking-widest block mb-1">Settings</span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#1A1A2E]">WhatsApp Provider</h1>
          <p className="text-xs text-[#6E6D8A] mt-1">Which provider carries our messages, the templates on our WABA, and what it costs.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/whatsapp/logs" className="crm-btn-secondary text-xs">
            <List size={14} className="text-[#5B4FE0]" /> Message logs
          </Link>
          <button onClick={runHealth} disabled={busy !== null} className="crm-btn-secondary text-xs">
            <Activity size={14} className={`text-[#5B4FE0] ${busy === "health" ? "animate-pulse" : ""}`} /> {busy === "health" ? "Checking…" : "Run health check"}
          </button>
          <button onClick={() => setShowTest(true)} className="crm-btn-primary text-xs">
            <Send size={14} /> Send test message
          </button>
        </div>
      </div>

      {/* Alerts */}
      {data.alerts.length > 0 && (
        <section aria-label="Alerts" className="space-y-2">
          {data.alerts.map((a) => (
            <div
              key={a.id}
              className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-xs ${
                a.severity === "CRITICAL" ? "border-rose-200 bg-rose-50 text-rose-900" : "border-amber-200 bg-amber-50 text-amber-900"
              }`}
            >
              <BellRing size={15} className="shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold leading-relaxed">{a.message}</p>
                <p className="opacity-70 mt-0.5">{formatDate(a.createdAt)} · {a.kind.replace("_", " ").toLowerCase()}</p>
              </div>
              <button onClick={() => ack(a.id)} className="crm-btn-ghost text-[11px] px-3 py-1 shrink-0">Acknowledge</button>
            </div>
          ))}
        </section>
      )}

      {/* Provider */}
      <section className="crm-card p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A8A9E]">Active provider</p>
            <p className="font-display text-xl font-bold text-[#1A1A2E] mt-1">{provider.label}</p>
            <p className="text-[11px] text-[#6E6D8A] mt-1 font-mono">WHATSAPP_PROVIDER={provider.name}</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold">
            {healthState === "ok" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-800 px-3 py-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Healthy{lastHealth?.latencyMs ? ` · ${lastHealth.latencyMs}ms` : ""}
              </span>
            )}
            {healthState === "bad" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 text-rose-800 px-3 py-1.5" title={lastHealth?.detail ?? ""}>
                <span className="w-2 h-2 rounded-full bg-rose-500" /> Unhealthy
              </span>
            )}
            {healthState === "dry" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-800 px-3 py-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" /> Dry run — nothing is sent
              </span>
            )}
            {healthState === "unknown" && <span className="rounded-full bg-slate-100 text-slate-600 px-3 py-1.5">Not checked yet</span>}
          </div>
        </div>

        {provider.dryRun && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900 space-y-2">
            <p className="font-bold flex items-center gap-2"><ShieldAlert size={14} /> Credentials missing — sends are simulated and logged as dry runs.</p>
            <p>Set these environment variables, then redeploy:</p>
            <div className="flex flex-wrap gap-1.5">
              {missing.map((c) => (
                <code key={c.env} className="rounded-full bg-white border border-amber-200 px-2.5 py-0.5 font-mono text-[10px]">{c.env}</code>
              ))}
            </div>
          </div>
        )}

        <dl className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-[#8A8A9E]">WABA</dt>
            <dd className="font-mono text-[#1A1A2E] mt-1 break-all">{account?.wabaId ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-[#8A8A9E]">Number</dt>
            <dd className="text-[#1A1A2E] mt-1">{account?.displayNumber ? formatPhone(account.displayNumber) : "—"}{account?.verifiedName ? <span className="block text-[#8A8A9E]">{account.verifiedName}</span> : null}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-[#8A8A9E]">Quality</dt>
            <dd className="text-[#1A1A2E] mt-1 flex items-center gap-1.5"><QualityDot q={account?.qualityRating} /> {account?.qualityRating ?? "Unknown"}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-[#8A8A9E]">Messaging tier (24h)</dt>
            <dd className="text-[#1A1A2E] mt-1">
              {n(tier.used24h)} / {n(tier.limit)} unique recipients
              <span className="block h-1.5 rounded-full bg-[#EEEDF7] mt-1.5 overflow-hidden" aria-hidden>
                <span className={`block h-full rounded-full ${tierPct >= 80 ? "bg-rose-500" : "bg-[#5B4FE0]"}`} style={{ width: `${tierPct}%` }} />
              </span>
              {!tier.fromAccount && <span className="block text-[10px] text-[#8A8A9E] mt-1">Limit from WA_MESSAGING_TIER_LIMIT</span>}
            </dd>
          </div>
        </dl>

        <div className="rounded-2xl bg-[#F9F8FD] border border-[#F0EDFA] p-4 space-y-2 text-xs">
          <p className="font-bold text-[#1A1A2E]">Webhook URL</p>
          <p className="text-[#6E6D8A]">Point {provider.label}&apos;s webhook here (Meta also needs META_WEBHOOK_VERIFY_TOKEN for the subscribe check).</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 min-w-0 truncate rounded-full bg-white border border-[#E8E5F5] px-4 py-2 font-mono text-[11px] text-[#1A1A2E]">{webhookUrl}</code>
            <button onClick={() => copy(webhookUrl)} className="crm-btn-secondary text-xs p-2.5" aria-label="Copy webhook URL"><Copy size={14} /></button>
          </div>
        </div>

        <details className="text-xs text-[#6E6D8A]">
          <summary className="cursor-pointer font-semibold text-[#5B4FE0]">Switching providers</summary>
          <div className="mt-3 space-y-3">
            <p>
              All four providers send through the same WhatsApp Business Account, so approved templates carry over. To switch: set <code className="font-mono">WHATSAPP_PROVIDER</code> and
              that provider&apos;s credentials, point its webhook at the URL above, and redeploy. Full runbook: <code className="font-mono">docs/whatsapp-provider-migration.md</code>.
            </p>
            <ul className="grid sm:grid-cols-2 gap-2">
              {data.providers.map((p) => (
                <li key={p.name} className="flex items-center justify-between rounded-xl border border-[#F0EDFA] bg-white px-3 py-2">
                  <span className="font-semibold text-[#1A1A2E]">{p.label}{p.name === provider.name ? " · active" : ""}</span>
                  <span className={p.configured ? "text-emerald-700 font-semibold" : "text-[#8A8A9E]"}>{p.configured ? "Credentials set" : "Not configured"}</span>
                </li>
              ))}
            </ul>
          </div>
        </details>
      </section>

      {/* Templates */}
      <section className="crm-card p-0! overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-6 pb-4">
          <div>
            <h2 className="font-display font-bold text-[#1A1A2E] text-base flex items-center gap-2"><FileText size={16} className="text-[#5B4FE0]" /> Templates on this WABA</h2>
            <p className="text-[11px] text-[#6E6D8A] mt-1">
              {provider.templateSource
                ? `Synced from ${provider.templateSource}. Sends are checked against this list before any API call.`
                : provider.supportsTemplateManagement
                  ? `${provider.label} isn't configured yet — templates sync once its credentials are set.`
                  : `${provider.label} has no template API, so templates sync from Meta — set the META_* credentials.`}
            </p>
          </div>
          <button onClick={syncNow} disabled={busy !== null || !provider.templateSource} className="crm-btn-secondary text-xs self-start sm:self-auto">
            <RefreshCw size={14} className={`text-[#5B4FE0] ${busy === "sync" ? "animate-spin" : ""}`} /> {busy === "sync" ? "Syncing…" : "Sync now"}
          </button>
        </div>
        {data.templates.length === 0 ? (
          <p className="text-xs text-[#8A8A9E] px-6 pb-8">
            No templates synced yet. Once Meta credentials are set, <strong>Sync now</strong> pulls every template registered on the WABA, with its approval status and parameter count.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="crm-table text-xs w-full">
              <thead>
                <tr>
                  <th>Template</th>
                  <th>Lang</th>
                  <th>Category</th>
                  <th>Params</th>
                  <th>Status</th>
                  <th>Synced</th>
                </tr>
              </thead>
              <tbody>
                {data.templates.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <span className="font-mono font-semibold text-[#1A1A2E]">{t.name}</span>
                      {t.inUse && <span className="ml-2 rounded-full bg-[#EEEDF7] text-[#5B4FE0] px-2 py-0.5 text-[9px] font-bold uppercase">In use</span>}
                      {t.bodyText && <span className="block text-[10px] text-[#8A8A9E] mt-0.5 max-w-[360px] truncate" title={t.bodyText}>{t.bodyText}</span>}
                    </td>
                    <td className="font-mono">{t.language}</td>
                    <td>{CATEGORY_LABELS[t.category] ?? t.category}</td>
                    <td className="text-[#6E6D8A]">
                      {t.bodyParamCount} body{t.hasHeaderParam ? ` · ${t.headerType ?? "header"}` : ""}{t.buttonCount ? ` · ${t.buttonCount} button` : ""}
                    </td>
                    <td>
                      <StatusPill status={t.status} />
                      {t.rejectionReason && <span className="block text-[10px] text-rose-700 mt-1">{t.rejectionReason}</span>}
                    </td>
                    <td className="text-[#8A8A9E]">{formatDate(t.lastSyncedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Spend */}
      <section className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6">
        <div className="crm-card p-6">
          <h2 className="font-display font-bold text-[#1A1A2E] text-base flex items-center gap-2"><Wallet size={16} className="text-[#5B4FE0]" /> Spend this month</h2>
          <p className="text-[11px] text-[#6E6D8A] mt-1">Estimated from our own logs at Meta&apos;s India rates — the same whichever provider carries the message.</p>
          <table className="w-full text-xs mt-4">
            <tbody>
              {spend.byCategory.map((c) => (
                <tr key={c.category} className="border-b border-[#F5F3FB] last:border-0">
                  <td className="py-2.5 font-semibold text-[#1A1A2E]">{CATEGORY_LABELS[c.category]}</td>
                  <td className="py-2.5 text-[#6E6D8A] text-right">
                    {c.category === "SERVICE"
                      ? `${n(spend.service.conversations)} conv${spend.service.beyondFreeTier ? ` (${n(spend.service.beyondFreeTier)} beyond free tier)` : ` of ${n(spend.service.freeTier)} free`}`
                      : `${n(c.messages)} msgs`}
                  </td>
                  <td className="py-2.5 text-right font-mono font-semibold text-[#1A1A2E] w-28">{rupees(c.paise)}</td>
                </tr>
              ))}
              <tr>
                <td className="pt-3 font-bold text-[#1A1A2E]">Total</td>
                <td />
                <td className="pt-3 text-right font-mono font-bold text-[#1A1A2E] text-sm">{rupees(spend.totalPaise)}</td>
              </tr>
            </tbody>
          </table>
          <p className="text-[10px] text-[#8A8A9E] mt-4">
            Rates (paise): marketing {spend.rates.MARKETING} · utility {spend.rates.UTILITY} · auth {spend.rates.AUTHENTICATION} · service {spend.rates.SERVICE} beyond the free tier.
            Utility costs ~85% less than marketing — keep transactional templates registered as Utility.
          </p>
        </div>

        <div className="crm-card p-6 space-y-5">
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#8A8A9E]">By feature</h3>
            {spend.byFeature.length === 0 ? (
              <p className="text-xs text-[#8A8A9E] mt-2">No billable sends this month.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-xs">
                {spend.byFeature.map((f) => (
                  <li key={f.feature} className="flex items-center justify-between">
                    <span className="text-[#1A1A2E] font-semibold">{FEATURE_LABELS[f.feature] ?? f.feature}</span>
                    <span className="text-[#6E6D8A]">{n(f.messages)} · <span className="font-mono text-[#1A1A2E]">{rupees(f.paise)}</span></span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-2xl bg-[#F9F8FD] border border-[#F0EDFA] p-4">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#8A8A9E]">Cost per converted lead</h3>
            <p className="font-display text-2xl font-bold text-[#1A1A2E] mt-1">
              {spend.perConvertedLead.perLeadPaise === null ? "—" : rupees(spend.perConvertedLead.perLeadPaise)}
            </p>
            <p className="text-[10px] text-[#8A8A9E] mt-1">
              Lifetime WhatsApp spend on {n(spend.perConvertedLead.convertedLeads)} converted lead{spend.perConvertedLead.convertedLeads === 1 ? "" : "s"}.
            </p>
          </div>
          <div className="text-[11px] text-[#6E6D8A] space-y-1">
            <p className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-emerald-600" /> Webhook queue: {n(data.queue.DONE ?? 0)} processed{data.queue.PENDING ? `, ${n(data.queue.PENDING)} pending` : ""}{data.queue.FAILED ? `, ${n(data.queue.FAILED)} failed` : ""}</p>
            <p className="flex items-center gap-1.5"><ShieldAlert size={12} className="text-[#8A8A9E]" /> {n(data.suppressed)} number{data.suppressed === 1 ? "" : "s"} suppressed (invalid, not opted in, or STOP)</p>
          </div>
        </div>
      </section>

      {showTest && <TestMessageModal templates={data.templates} onClose={() => setShowTest(false)} onSent={load} />}
    </div>
  );
}

const inputCls = "w-full bg-[#F9F8FD] border border-[#E8E5F5] rounded-full px-4 py-2.5 text-xs text-[#1A1A2E] focus:outline-none focus:border-[#5B4FE0]";
const labelCls = "block font-bold text-[#8A8A9E] uppercase tracking-wider text-[10px]";

function TestMessageModal({ templates, onClose, onSent }: { templates: Overview["templates"]; onClose: () => void; onSent: () => void }) {
  const approved = templates.filter((t) => t.status === "APPROVED");
  const [mode, setMode] = useState<"template" | "text">(approved.length ? "template" : "text");
  const [to, setTo] = useState("");
  const [template, setTemplate] = useState(approved[0] ? `${approved[0].name}|${approved[0].language}` : "");
  const [customName, setCustomName] = useState("");
  const [params, setParams] = useState("");
  const [button, setButton] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const picked = approved.find((t) => `${t.name}|${t.language}` === template);
  const [name, language] = picked ? [picked.name, picked.language] : [customName.trim(), "en"];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const body =
        mode === "template"
          ? {
              to,
              templateName: name,
              languageCode: language,
              category: picked?.category === "MARKETING" || picked?.category === "AUTHENTICATION" ? picked.category : "UTILITY",
              bodyParams: params.split("|").map((p) => p.trim()).filter(Boolean),
              buttonParams: button.trim() ? [{ subType: "url", index: 0, value: button.trim() }] : undefined,
            }
          : { to, text };
      const res = await fetch("/api/admin/whatsapp/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const r = await res.json();
      if (r.ok) {
        toast.success(r.dryRun ? "Dry run: logged, but nothing was sent (no credentials)" : `Sent · ${r.providerMessageId ?? "accepted"}`);
        onSent();
        onClose();
      } else {
        toast.error(`${r.errorCode ?? "Failed"}: ${r.errorMessage ?? r.error ?? "send failed"}`);
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#1A1A2E]/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs" role="dialog" aria-modal="true" aria-label="Send test message">
      <div className="crm-card bg-white w-full max-w-lg shadow-2xl p-6 space-y-5 animate-scale-in">
        <div className="flex items-center justify-between pb-3 border-b border-[#F0EDFA]">
          <h2 className="font-display font-bold text-[#1A1A2E] text-base">Send test message</h2>
          <button onClick={onClose} aria-label="Close" className="text-[#8A8A9E] hover:text-[#1A1A2E] p-1 rounded-full hover:bg-[#F4F0FF]"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="space-y-4 text-xs">
          <div className="crm-pill-nav w-fit">
            <button type="button" onClick={() => setMode("template")} className={mode === "template" ? "crm-pill-tab crm-pill-tab-active" : "crm-pill-tab"}>Template</button>
            <button type="button" onClick={() => setMode("text")} className={mode === "text" ? "crm-pill-tab crm-pill-tab-active" : "crm-pill-tab"}>Free-form text</button>
          </div>
          <label className="space-y-1.5 block">
            <span className={labelCls}>Send to</span>
            <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="+91 98765 43210 — your own number" className={inputCls} inputMode="tel" required />
          </label>
          {mode === "template" ? (
            <>
              <label className="space-y-1.5 block">
                <span className={labelCls}>Template</span>
                {approved.length ? (
                  <select value={template} onChange={(e) => setTemplate(e.target.value)} className={inputCls}>
                    {approved.map((t) => (
                      <option key={t.id} value={`${t.name}|${t.language}`}>{t.name} ({t.language}) — {t.bodyParamCount} param{t.bodyParamCount === 1 ? "" : "s"}</option>
                    ))}
                  </select>
                ) : (
                  <input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="e.g. hello_world" className={`${inputCls} font-mono`} required />
                )}
              </label>
              <label className="space-y-1.5 block">
                <span className={labelCls}>Body parameters {picked ? `(${picked.bodyParamCount})` : ""}</span>
                <input value={params} onChange={(e) => setParams(e.target.value)} placeholder="Nitesh | Kokapet" className={inputCls} />
                <span className="block text-[10px] text-[#8A8A9E]">Separate with |. The count is checked against the template before sending.</span>
              </label>
              {(picked?.buttonCount ?? 0) > 0 && (
                <label className="space-y-1.5 block">
                  <span className={labelCls}>Button parameter</span>
                  <input value={button} onChange={(e) => setButton(e.target.value)} placeholder="URL suffix or code" className={inputCls} />
                </label>
              )}
            </>
          ) : (
            <label className="space-y-1.5 block">
              <span className={labelCls}>Message</span>
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} required className="w-full bg-[#F9F8FD] border border-[#E8E5F5] rounded-2xl p-4 text-xs text-[#1A1A2E] focus:outline-none focus:border-[#5B4FE0] resize-none" />
              <span className="block text-[10px] text-[#8A8A9E]">Free-form text only delivers if this number messaged you in the last 24 hours.</span>
            </label>
          )}
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="crm-btn-secondary px-5 py-2 text-xs">Cancel</button>
            <button type="submit" disabled={sending} className="crm-btn-primary px-5 py-2 text-xs"><Send size={13} /> {sending ? "Sending…" : "Send"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
