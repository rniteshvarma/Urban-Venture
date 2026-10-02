"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, RotateCcw, Send } from "lucide-react";
import { toast } from "@/lib/toast";
import { ChatBubble, fromStored, withTapLabels, type ChatMessage, type ChatOption } from "@/components/concierge/ChatBubble";

const STORE = "uv:concierge-sim";

function randomTestPhone() {
  return `+91 99900 ${String(Math.floor(20000 + Math.random() * 79999))}`;
}

function load(): { phone: string; name: string; conversationId: string | null } | null {
  try {
    const raw = localStorage.getItem(STORE);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function save(v: { phone: string; name: string; conversationId: string | null }) {
  try {
    localStorage.setItem(STORE, JSON.stringify(v));
  } catch {
    /* private mode — the simulator still works, it just won't remember */
  }
}

export default function ConciergeSimulatorPage() {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("Asha Reddy");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [meta, setMeta] = useState<{ state?: string; leadId?: string | null; reportUrl?: string | null }>({});
  const scroller = useRef<HTMLDivElement>(null);

  // Restore the last simulator session (browser-only).
  useEffect(() => {
    const s = load();
    const next = s ?? { phone: randomTestPhone(), name: "Asha Reddy", conversationId: null };
    /* eslint-disable react-hooks/set-state-in-effect -- one-time restore from localStorage */
    setPhone(next.phone);
    setName(next.name);
    setConversationId(next.conversationId);
    /* eslint-enable react-hooks/set-state-in-effect */
    if (next.conversationId) {
      fetch(`/api/admin/concierge/conversations/${next.conversationId}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((c) => {
          if (!c) return;
          setMessages(withTapLabels(c.messages.map(fromStored)));
          setMeta({ state: c.state, leadId: c.leadId, reportUrl: c.reportUrl });
        })
        .catch(() => {});
    }
  }, []);

  // While a person owns the chat, pick up their replies from the CRM as they arrive.
  useEffect(() => {
    if (!conversationId || meta.state !== "HANDOFF") return;
    const id = setInterval(() => {
      fetch(`/api/admin/concierge/conversations/${conversationId}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((c) => {
          if (!c) return;
          setMessages((prev) => (c.messages.length > prev.filter((m) => m.direction !== "SYSTEM").length ? withTapLabels(c.messages.map(fromStored)) : prev));
          setMeta((m) => (m.state === c.state ? m : { ...m, state: c.state }));
        })
        .catch(() => {});
    }, 4000);
    return () => clearInterval(id);
  }, [conversationId, meta.state]);

  // Scroll the chat pane only — never the page.
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length, busy]);

  const send = async (input: { text?: string; optionId?: string; label?: string }) => {
    if (busy) return;
    const shown = input.label ?? input.text ?? "";
    setMessages((m) => [...m, { id: `local-${Date.now()}`, direction: "IN", text: shown, createdAt: new Date().toISOString() }]);
    setText("");
    setBusy(true);
    try {
      const res = await fetch("/api/admin/concierge/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // A tap carries the option's title as its text, exactly like a WhatsApp interactive reply.
        body: JSON.stringify({ phone, name, text: input.text ?? input.label, optionId: input.optionId }),
      });
      const r = await res.json();
      if (!res.ok) {
        toast.error(r.error ?? "The concierge couldn't reply");
        return;
      }
      setConversationId(r.conversationId);
      save({ phone, name, conversationId: r.conversationId });
      setMeta({ state: r.state, leadId: r.leadId, reportUrl: r.reportUrl });
      const now = new Date().toISOString();
      const silent =
        r.replies.length === 0 && r.state === "HANDOFF"
          ? [{ id: `sys-${Date.now()}`, direction: "SYSTEM" as const, text: "🙋 An advisor owns this chat now, so the bot stays quiet. Reply from the Concierge inbox, or hand it back to the bot there." }]
          : [];
      setMessages((m) => [
        ...m,
        ...silent,
        ...(r.replies as Array<{ text: string; buttons?: ChatOption[]; list?: { button: string; rows: ChatOption[] } }>).map((rep, i) => ({
          id: `r-${Date.now()}-${i}`,
          direction: "OUT" as const,
          text: rep.text,
          buttons: rep.buttons,
          list: rep.list,
          createdAt: now,
        })),
      ]);
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    await fetch(`/api/admin/concierge/simulate?phone=${encodeURIComponent(phone)}`, { method: "DELETE" });
    const fresh = { phone: randomTestPhone(), name, conversationId: null };
    setPhone(fresh.phone);
    setConversationId(null);
    setMessages([]);
    setMeta({});
    save(fresh);
    toast.info("New simulator customer — say hi 👋");
  };

  const lastOut = [...messages].reverse().find((m) => m.direction === "OUT");

  return (
    <div className="max-w-6xl mx-auto w-full space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 pb-2 border-b border-[#F0EDFA]">
        <div>
          <Link href="/admin/concierge" className="text-[11px] text-[#5B4FE0] font-bold uppercase tracking-widest inline-flex items-center gap-1 mb-1 py-1">
            <ArrowLeft size={12} /> Concierge
          </Link>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#1A1A2E]">Chat simulator</h1>
          <p className="text-xs text-[#6E6D8A] mt-1">Talk to the WhatsApp concierge as a customer would — same engine, no WhatsApp needed.</p>
        </div>
        <button onClick={reset} className="crm-btn-secondary text-xs self-start sm:self-auto">
          <RotateCcw size={14} className="text-[#5B4FE0]" /> New customer
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
        <aside className="crm-card p-5 space-y-4 text-xs h-fit order-last lg:order-first">
          <label className="block space-y-1.5">
            <span className="block font-bold text-[#8A8A9E] uppercase tracking-wider text-[10px]">Customer WhatsApp name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} disabled={!!conversationId} className="w-full bg-[#F9F8FD] border border-[#E8E5F5] rounded-full px-4 py-2.5 text-xs disabled:opacity-60" />
          </label>
          <label className="block space-y-1.5">
            <span className="block font-bold text-[#8A8A9E] uppercase tracking-wider text-[10px]">Customer number</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!!conversationId} className="w-full bg-[#F9F8FD] border border-[#E8E5F5] rounded-full px-4 py-2.5 text-xs font-mono disabled:opacity-60" />
            <span className="block text-[10px] text-[#8A8A9E]">Use a non-+91 number to try the NRI path.</span>
          </label>
          <div className="rounded-2xl bg-[#F9F8FD] border border-[#F0EDFA] p-3 space-y-1.5 text-[11px] text-[#6E6D8A]">
            <p>
              <strong className="text-[#1A1A2E]">State:</strong> {meta.state ? meta.state.toLowerCase() : "not started"}
            </p>
            {meta.leadId && (
              <Link href={`/admin/leads/${meta.leadId}`} className="flex items-center gap-1 font-semibold text-[#5B4FE0] hover:underline">
                Open the CRM lead <ExternalLink size={11} />
              </Link>
            )}
            {meta.reportUrl && (
              <a href={meta.reportUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-semibold text-[#5B4FE0] hover:underline">
                Open their report <ExternalLink size={11} />
              </a>
            )}
          </div>
          <p className="text-[10px] text-[#8A8A9E] leading-relaxed">
            This runs the real concierge: it creates a CRM lead (source <code>concierge-simulator</code>), a report, and sends the new-interest email marked <em>[Simulator]</em>. Nothing is sent on WhatsApp.
          </p>
        </aside>

        <section className="rounded-[20px] overflow-hidden border border-[#EBE7F5] flex flex-col h-[70vh] min-h-[480px] bg-[#EFEAE2]" aria-label="Simulated WhatsApp chat">
          <header className="bg-[#008069] text-white px-4 py-3 flex items-center gap-3">
            <span className="w-9 h-9 rounded-full bg-white/20 grid place-items-center font-bold" aria-hidden>
              PT
            </span>
            <div>
              <p className="text-sm font-semibold leading-tight">Property Tiger</p>
              <p className="text-[11px] opacity-80">{busy ? "typing…" : "business account"}</p>
            </div>
          </header>
          <div ref={scroller} className="flex-1 overflow-y-auto px-3 sm:px-5 py-4 space-y-2.5">
            {messages.length === 0 && (
              <div className="text-center text-[12px] text-[#54656F] bg-white/70 rounded-xl px-4 py-3 mx-auto max-w-sm">
                Say <strong>hi</strong>, or try a detailed opener like <em>“villa plot in Kokapet under 80 lakhs for investment”</em>.
              </div>
            )}
            {messages.map((m) => (
              <ChatBubble
                key={m.id}
                m={m}
                perspective="customer"
                onPick={m === lastOut && !busy ? (o) => send({ optionId: o.id, label: o.title }) : undefined}
              />
            ))}
            {busy && <p className="text-[11px] text-[#54656F] italic px-1">Property Tiger is typing…</p>}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (text.trim()) void send({ text: text.trim() });
            }}
            className="bg-[#F0F2F5] px-3 py-2.5 flex items-center gap-2"
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type a message"
              aria-label="Message"
              className="flex-1 rounded-full bg-white px-4 py-2.5 text-sm text-[#111B21] focus:outline-none"
            />
            <button type="submit" disabled={busy || !text.trim()} className="w-10 h-10 rounded-full bg-[#008069] text-white grid place-items-center disabled:opacity-50" aria-label="Send">
              <Send size={16} />
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
