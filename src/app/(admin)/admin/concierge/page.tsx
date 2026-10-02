"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Bot, ExternalLink, Hand, MessageCircle, RefreshCw, Search, Send, UserRound } from "lucide-react";
import { toast } from "@/lib/toast";
import { LISTING_TYPE_LABELS, PURPOSE_LABELS, personaMeta } from "@/lib/personas";
import { ChatBubble, fromStored, withTapLabels } from "@/components/concierge/ChatBubble";

type Row = {
  id: string;
  phone: string;
  channel: string;
  state: string;
  step: string | null;
  name: string | null;
  answered: number;
  handoffReason: string | null;
  lead: { id: string; name: string; persona: string | null; leadScore: number | null } | null;
  lastMessage: { text: string; direction: string; author: string; createdAt: string } | null;
  updatedAt: string;
};

type Detail = {
  id: string;
  phone: string;
  channel: string;
  state: string;
  step: string | null;
  senderName: string | null;
  slots: {
    name?: string;
    purpose?: "INVESTMENT" | "OWN_USE" | "BOTH";
    types?: string[];
    budgetMinLakh?: number | null;
    budgetMaxLakh?: number | null;
    horizonYears?: number | null;
    timeline?: string | null;
    requirements?: string | null;
    done?: string[];
  };
  handoffReason: string | null;
  reportUrl: string | null;
  weeklyOptIn: boolean | null;
  areaNames: string[];
  windowOpen: boolean;
  lead: { id: string; name: string; persona: string | null; personaReason: string | null; leadScore: number | null; leadScoreGrade: string | null; status: string } | null;
  messages: Array<{ id: string; direction: string; author: string; text: string; createdAt: string; payload: unknown }>;
};

const STATE_STYLE: Record<string, string> = {
  ACTIVE: "bg-blue-50 text-blue-700",
  PROCESSING: "bg-blue-50 text-blue-700",
  HANDOFF: "bg-amber-100 text-amber-800",
  COMPLETED: "bg-emerald-50 text-emerald-700",
  ABANDONED: "bg-slate-100 text-slate-600",
};
const STATE_LABEL: Record<string, string> = {
  ACTIVE: "Answering",
  PROCESSING: "Matching",
  HANDOFF: "Needs a person",
  COMPLETED: "Matches sent",
  ABANDONED: "Dropped off",
};
const FILTERS: Array<[string, string]> = [
  ["", "All"],
  ["HANDOFF", "Needs a person"],
  ["ACTIVE", "Answering"],
  ["COMPLETED", "Matches sent"],
  ["ABANDONED", "Dropped off"],
];
const FUNNEL_LABEL: Record<string, string> = {
  STARTED: "Started",
  PURPOSE: "Purpose",
  TYPE: "Type",
  AREA: "Area",
  BUDGET: "Budget",
  HORIZON: "Horizon",
  EXTRAS: "Extras",
  COMPLETED: "Matched",
};

const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h}h` : `${Math.round(h / 24)}d`;
};
const lakh = (v: number) => (v >= 100 ? `₹${+(v / 100).toFixed(2)} Cr` : `₹${Math.round(v)}L`);

function Inbox() {
  const router = useRouter();
  const params = useSearchParams();
  const selected = params.get("c");
  const [rows, setRows] = useState<Row[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [funnel, setFunnel] = useState<Array<{ step: string; count: number }>>([]);
  const [filter, setFilter] = useState("");
  const [q, setQ] = useState("");
  const [channel, setChannel] = useState<"WHATSAPP" | "SIMULATOR">("WHATSAPP");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);
  const [live, setLive] = useState<{ ok: boolean; reason?: string } | null>(null);

  useEffect(() => {
    const sp = new URLSearchParams({ channel });
    if (filter) sp.set("state", filter);
    if (q.trim()) sp.set("q", q.trim());
    let cancelled = false;
    fetch(`/api/admin/concierge/conversations?${sp}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setRows(d.conversations ?? []);
        setCounts(d.counts ?? {});
        setFunnel(d.funnel ?? []);
        setLive(d.whatsapp ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [filter, q, channel, tick]);

  const loadDetail = useCallback(async (id: string) => {
    const r = await fetch(`/api/admin/concierge/conversations/${id}`, { cache: "no-store" });
    if (r.ok) {
      const d: Detail = await r.json();
      setDetail(d);
      setChannel(d.channel === "SIMULATOR" ? "SIMULATOR" : "WHATSAPP");
    }
  }, []);

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    fetch(`/api/admin/concierge/conversations/${selected}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Detail | null) => {
        if (cancelled || !d) return;
        setDetail(d);
        setChannel(d.channel === "SIMULATOR" ? "SIMULATOR" : "WHATSAPP");
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [selected, tick]);

  const act = async (action: "takeover" | "handback" | "reply") => {
    if (!detail) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/concierge/conversations/${detail.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, text: reply }),
      });
      const d = await r.json();
      if (!r.ok) {
        toast.error(d.error ?? "Action failed");
        return;
      }
      if (action === "reply") setReply("");
      toast.success(action === "takeover" ? "You've taken over — the bot is paused" : action === "handback" ? "Handed back to the bot" : "Sent");
      await loadDetail(detail.id);
      setTick((t) => t + 1);
    } finally {
      setBusy(false);
    }
  };

  const started = funnel[0]?.count ?? 0;
  const s = detail?.slots ?? {};
  const persona = personaMeta(detail?.lead?.persona);

  return (
    <div className="max-w-7xl mx-auto w-full space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 pb-2 border-b border-[#F0EDFA]">
        <div>
          <span className="text-[11px] text-[#5B4FE0] font-bold uppercase tracking-widest block mb-1">WhatsApp</span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#1A1A2E]">Buyer Concierge</h1>
          <p className="text-xs text-[#6E6D8A] mt-1">Every buyer who messages us: their answers, matches sent, and anyone waiting for a person.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/concierge/simulator" className="crm-btn-primary text-xs">
            <Bot size={14} /> Try the simulator
          </Link>
          <button onClick={() => setTick((t) => t + 1)} className="crm-btn-secondary text-xs p-2.5" aria-label="Refresh">
            <RefreshCw size={14} className="text-[#5B4FE0]" />
          </button>
        </div>
      </div>

      {live && !live.ok && (
        <p role="status" className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          <strong>The concierge is off for WhatsApp:</strong> {live.reason} Inbound messages are still saved to leads. The simulator keeps working.
        </p>
      )}

      {/* Funnel */}
      <section className={`crm-card p-5 ${selected ? "hidden lg:block" : ""}`} aria-label="Question funnel, last 30 days">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[10px] font-bold uppercase tracking-wider text-[#8A8A9E]">Where people stop · last 30 days ({channel === "SIMULATOR" ? "simulator" : "WhatsApp"})</h2>
          {(counts.HANDOFF ?? 0) > 0 && (
            <button onClick={() => setFilter("HANDOFF")} className="text-[11px] font-bold text-amber-800 bg-amber-100 rounded-full px-2.5 py-1">
              {counts.HANDOFF} waiting for a person
            </button>
          )}
        </div>
        {started === 0 ? (
          <p className="text-xs text-[#8A8A9E]">No conversations yet. Once buyers message your WhatsApp number — or you try the simulator — you&apos;ll see how many answer each question.</p>
        ) : (
          <ol className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {funnel.map((f) => {
              const pct = Math.round((f.count / started) * 100);
              return (
                <li key={f.step} className="text-center">
                  <div className="h-16 flex items-end rounded-lg bg-[#F5F3FB] overflow-hidden" aria-hidden>
                    <div className="w-full bg-[#7C6EF5] rounded-t" style={{ height: `${Math.max(pct, 4)}%` }} />
                  </div>
                  <p className="text-[11px] font-semibold text-[#1A1A2E] mt-1.5">{FUNNEL_LABEL[f.step] ?? f.step}</p>
                  <p className="text-[10px] text-[#8A8A9E]">
                    {f.count} · {pct}%
                  </p>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-5">
        {/* List */}
        <section className={`crm-card p-0! overflow-hidden flex flex-col ${selected ? "hidden lg:flex" : ""}`} aria-label="Conversations">
          <div className="p-4 space-y-3 border-b border-[#F0EDFA]">
            <div className="crm-pill-nav w-full">
              {(["WHATSAPP", "SIMULATOR"] as const).map((c) => (
                <button key={c} onClick={() => setChannel(c)} className={`${channel === c ? "crm-pill-tab crm-pill-tab-active" : "crm-pill-tab"} flex-1`}>
                  {c === "WHATSAPP" ? "WhatsApp" : "Simulator"}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8A9E]" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or number" aria-label="Search conversations" className="w-full bg-white border border-[#E8E5F5] rounded-full pl-8 pr-3 py-2 text-xs focus:outline-none focus:border-[#5B4FE0]" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {FILTERS.map(([v, label]) => (
                <button key={v || "all"} onClick={() => setFilter(v)} className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${filter === v ? "bg-[#5B4FE0] text-white" : "bg-[#F5F3FB] text-[#6E6D8A] hover:text-[#1A1A2E]"}`}>
                  {label}
                  {v && counts[v] ? ` · ${counts[v]}` : ""}
                </button>
              ))}
            </div>
          </div>
          <ul className="divide-y divide-[#F5F3FB] overflow-y-auto max-h-[70vh]">
            {rows.length === 0 && <li className="p-6 text-xs text-[#8A8A9E] text-center">No conversations here.</li>}
            {rows.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => router.push(`/admin/concierge?c=${r.id}`, { scroll: false })}
                  aria-current={selected === r.id}
                  className={`w-full text-left px-4 py-3 hover:bg-[#FAF9FE] ${selected === r.id ? "bg-[#F4F0FF]" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-[13px] text-[#1A1A2E] truncate">{r.name || r.phone}</span>
                    <span className="text-[10px] text-[#8A8A9E] shrink-0">{ago(r.updatedAt)}</span>
                  </div>
                  <p className="text-[11px] text-[#6E6D8A] truncate mt-0.5">
                    {r.lastMessage ? `${r.lastMessage.direction === "IN" ? "" : r.lastMessage.author === "agent" ? "You: " : "Bot: "}${r.lastMessage.text}` : "—"}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATE_STYLE[r.state] ?? "bg-slate-100"}`}>{STATE_LABEL[r.state] ?? r.state}</span>
                    {r.state === "ACTIVE" && <span className="text-[10px] text-[#8A8A9E]">{r.answered} answered</span>}
                    {r.lead?.persona && <span className="text-[10px] text-[#8A8A9E]">· {personaMeta(r.lead.persona)?.short}</span>}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </section>

        {/* Detail */}
        <section className={`crm-card p-0! overflow-hidden flex flex-col min-h-[60vh] ${selected ? "" : "hidden lg:flex"}`} aria-label="Conversation">
          {!detail || detail.id !== selected ? (
            <div className="flex-1 grid place-items-center p-10 text-center text-xs text-[#8A8A9E]">
              <div>
                <MessageCircle size={28} className="mx-auto mb-2 text-[#C9C3EC]" />
                Pick a conversation to see the chat, the buyer&apos;s answers and their matches.
              </div>
            </div>
          ) : (
            <>
              <header className="p-4 sm:p-5 border-b border-[#F0EDFA] space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link href="/admin/concierge" className="lg:hidden text-[11px] text-[#5B4FE0] font-semibold inline-flex items-center gap-1 mb-1">
                      <ArrowLeft size={12} /> All conversations
                    </Link>
                    <h2 className="font-display text-lg font-bold text-[#1A1A2E]">{s.name || detail.senderName || detail.phone}</h2>
                    <p className="text-[11px] text-[#6E6D8A] font-mono">
                      {detail.phone}
                      {detail.channel === "SIMULATOR" ? " · simulator" : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${STATE_STYLE[detail.state] ?? ""}`}>{STATE_LABEL[detail.state] ?? detail.state}</span>
                    {detail.state === "HANDOFF" ? (
                      <button onClick={() => act("handback")} disabled={busy} className="crm-btn-secondary text-xs">
                        <Bot size={13} className="text-[#5B4FE0]" /> Hand back to bot
                      </button>
                    ) : (
                      <button onClick={() => act("takeover")} disabled={busy} className="crm-btn-secondary text-xs">
                        <Hand size={13} className="text-[#5B4FE0]" /> Take over
                      </button>
                    )}
                    {detail.lead && (
                      <Link href={`/admin/leads/${detail.lead.id}`} className="crm-btn-secondary text-xs">
                        <UserRound size={13} className="text-[#5B4FE0]" /> Lead
                      </Link>
                    )}
                  </div>
                </div>
                {detail.handoffReason && detail.state === "HANDOFF" && (
                  <p className="text-[11px] rounded-xl bg-amber-50 text-amber-900 px-3 py-2">Waiting for a person — {detail.handoffReason}.</p>
                )}
                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-[11px]">
                  <div>
                    <dt className="text-[#8A8A9E] uppercase text-[9px] font-bold tracking-wider">Purpose</dt>
                    <dd className="font-semibold text-[#1A1A2E]">{s.purpose ? PURPOSE_LABELS[s.purpose] : "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-[#8A8A9E] uppercase text-[9px] font-bold tracking-wider">Looking for</dt>
                    <dd className="font-semibold text-[#1A1A2E]">
                      {s.types?.length ? s.types.map((t) => LISTING_TYPE_LABELS[t as keyof typeof LISTING_TYPE_LABELS] ?? t).join(", ") : s.done?.includes("TYPE") ? "Not sure yet" : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#8A8A9E] uppercase text-[9px] font-bold tracking-wider">Area</dt>
                    <dd className="font-semibold text-[#1A1A2E]">{detail.areaNames.length ? detail.areaNames.join(", ") : s.done?.includes("AREA") ? "Suggest for me" : "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-[#8A8A9E] uppercase text-[9px] font-bold tracking-wider">Budget</dt>
                    <dd className="font-semibold text-[#1A1A2E]">
                      {s.budgetMaxLakh || s.budgetMinLakh ? `${s.budgetMinLakh ? lakh(s.budgetMinLakh) : ""}${s.budgetMinLakh && s.budgetMaxLakh ? "–" : ""}${s.budgetMaxLakh ? lakh(s.budgetMaxLakh) : "+"}` : "—"}
                    </dd>
                  </div>
                  {s.requirements && (
                    <div className="col-span-2 sm:col-span-4">
                      <dt className="text-[#8A8A9E] uppercase text-[9px] font-bold tracking-wider">Other needs</dt>
                      <dd className="font-semibold text-[#1A1A2E]">{s.requirements}</dd>
                    </div>
                  )}
                </dl>
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  {persona && (
                    <span className={`rounded-full border px-2.5 py-1 font-semibold ${persona.tw.bg} ${persona.tw.text} ${persona.tw.border}`} title={detail.lead?.personaReason ?? ""}>
                      {persona.icon} {persona.label}
                    </span>
                  )}
                  {detail.lead?.leadScoreGrade && <span className="rounded-full bg-[#F5F3FB] px-2.5 py-1 font-semibold text-[#5B4FE0]">Lead grade {detail.lead.leadScoreGrade}</span>}
                  {detail.weeklyOptIn && <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">Weekly report on</span>}
                  {detail.reportUrl && (
                    <a href={detail.reportUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-[#5B4FE0] hover:underline">
                      Report sent <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              </header>

              <div className="flex-1 overflow-y-auto bg-[#EFEAE2] px-3 sm:px-5 py-4 space-y-2.5 max-h-[60vh]">
                {withTapLabels(detail.messages.map(fromStored)).map((m) => (
                  <ChatBubble key={m.id} m={m} />
                ))}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (reply.trim()) void act("reply");
                }}
                className="border-t border-[#F0EDFA] p-3 space-y-1.5"
              >
                {detail.channel === "WHATSAPP" && !detail.windowOpen && (
                  <p className="text-[11px] text-amber-800">It&apos;s been over 24 hours since their last message — WhatsApp will only deliver an approved template now.</p>
                )}
                <div className="flex items-center gap-2">
                  <input
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder={detail.state === "HANDOFF" ? "Reply as an advisor…" : "Replying takes over from the bot…"}
                    aria-label="Reply"
                    className="flex-1 bg-[#F9F8FD] border border-[#E8E5F5] rounded-full px-4 py-2.5 text-xs focus:outline-none focus:border-[#5B4FE0]"
                  />
                  <button type="submit" disabled={busy || !reply.trim()} className="crm-btn-primary text-xs">
                    <Send size={13} /> Send
                  </button>
                </div>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export default function ConciergeInboxPage() {
  return (
    <Suspense fallback={<div className="p-16 text-center text-xs text-[#8A8A9E] animate-pulse">Loading conversations…</div>}>
      <Inbox />
    </Suspense>
  );
}
