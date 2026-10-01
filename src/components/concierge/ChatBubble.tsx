"use client";

import React, { useState } from "react";
import { List as ListIcon } from "lucide-react";

export type ChatOption = { id: string; title: string; description?: string };
export type ChatMessage = {
  id: string;
  direction: "IN" | "OUT" | "SYSTEM";
  author?: string;
  text: string;
  createdAt?: string;
  buttons?: ChatOption[];
  list?: { button: string; rows: ChatOption[] };
};

/** WhatsApp formatting (*bold*, _italic_, links, line breaks) rendered as React nodes — no raw HTML. */
export function WhatsAppText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, li) => (
        <React.Fragment key={li}>
          {line.split(/(https?:\/\/[^\s]+|\*[^*\n]+\*|_[^_\n]+_)/g).map((part, i) => {
            if (!part) return null;
            if (/^https?:\/\//.test(part))
              return (
                <a key={i} href={part} target="_blank" rel="noreferrer" className="underline break-all text-[#027EB5]">
                  {part}
                </a>
              );
            if (/^\*[^*]+\*$/.test(part)) return <strong key={i}>{part.slice(1, -1)}</strong>;
            if (/^_[^_]+_$/.test(part)) return <em key={i}>{part.slice(1, -1)}</em>;
            return <React.Fragment key={i}>{part}</React.Fragment>;
          })}
          {li < lines.length - 1 && <br />}
        </React.Fragment>
      ))}
    </>
  );
}

const time = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "");

/**
 * One chat bubble, WhatsApp-style. Customer messages on the left of the
 * business view (IN), ours on the right (OUT). Pass `onPick` to make buttons
 * and list rows tappable (simulator); leave it off for a read-only transcript.
 */
export function ChatBubble({ m, onPick, perspective = "business" }: { m: ChatMessage; onPick?: (o: ChatOption) => void; perspective?: "business" | "customer" }) {
  const [open, setOpen] = useState(false);
  if (m.direction === "SYSTEM") {
    return (
      <p role="status" className="mx-auto max-w-sm text-center text-[11px] text-[#54656F] bg-[#FFF3C4] rounded-lg px-3 py-1.5 shadow-sm">
        {m.text}
      </p>
    );
  }
  const mine = perspective === "business" ? m.direction === "OUT" : m.direction === "IN";
  const agent = m.author === "agent";
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className="max-w-[85%] sm:max-w-[75%]">
        <div
          className={`rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm whitespace-normal break-words ${
            mine ? "bg-[#D9FDD3] text-[#111B21] rounded-tr-sm" : "bg-white text-[#111B21] rounded-tl-sm"
          }`}
        >
          {agent && <span className="block text-[10px] font-bold uppercase tracking-wider text-[#5B4FE0] mb-0.5">Advisor</span>}
          <WhatsAppText text={m.text} />
          <span className="block text-right text-[10px] text-[#667781] mt-1">{time(m.createdAt)}</span>
        </div>
        {m.buttons && m.buttons.length > 0 && (
          <div className="mt-1 grid gap-1">
            {m.buttons.map((b) => (
              <button
                key={b.id}
                type="button"
                disabled={!onPick}
                onClick={() => onPick?.(b)}
                className="w-full rounded-xl bg-white px-3 py-2 text-[13px] font-semibold text-[#027EB5] shadow-sm enabled:hover:bg-[#F5F6F6] disabled:cursor-default disabled:opacity-60 disabled:text-[#667781]"
              >
                {b.title}
              </button>
            ))}
          </div>
        )}
        {m.list && (
          <div className="mt-1">
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-white px-3 py-2 text-[13px] font-semibold text-[#027EB5] shadow-sm hover:bg-[#F5F6F6]"
            >
              <ListIcon size={14} /> {m.list.button}
            </button>
            {open && (
              <ul className="mt-1 rounded-xl bg-white shadow-sm divide-y divide-[#E9EDEF] overflow-hidden">
                {m.list.rows.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      disabled={!onPick}
                      onClick={() => {
                        setOpen(false);
                        onPick?.(r);
                      }}
                      className="w-full text-left px-3 py-2 enabled:hover:bg-[#F5F6F6] disabled:cursor-default"
                    >
                      <span className="block text-[13px] text-[#111B21]">{r.title}</span>
                      {r.description && <span className="block text-[11px] text-[#667781]">{r.description}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Map a stored ConciergeMessage (payload holds buttons/list) to a ChatMessage. */
export function fromStored(m: { id: string; direction: string; author: string; text: string; createdAt: string; payload: unknown }): ChatMessage {
  const p = (m.payload ?? {}) as { buttons?: ChatOption[]; list?: { button: string; rows: ChatOption[] } };
  return { id: m.id, direction: m.direction as "IN" | "OUT", author: m.author, text: m.text, createdAt: m.createdAt, buttons: p.buttons, list: p.list };
}
