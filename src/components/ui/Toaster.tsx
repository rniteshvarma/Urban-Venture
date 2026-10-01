"use client";

/** Renders toasts dispatched through `toast` (src/lib/toast.ts). Mounted once in the root layout. */
import React, { useEffect, useState } from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { TOAST_EVENT, type ToastEventDetail } from "@/lib/toast";

const DURATION: Record<ToastEventDetail["tone"], number> = { success: 3500, info: 4500, error: 7000 };

const TONE = {
  success: { icon: CheckCircle2, color: "#16A34A" },
  error: { icon: XCircle, color: "#DC2626" },
  info: { icon: Info, color: "#D69200" },
} as const;

export default function Toaster() {
  const [items, setItems] = useState<ToastEventDetail[]>([]);

  useEffect(() => {
    const onToast = (e: Event) => {
      const t = (e as CustomEvent<ToastEventDetail>).detail;
      setItems((prev) => [...prev.slice(-3), t]); // at most 4 on screen
      window.setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== t.id)), DURATION[t.tone]);
    };
    window.addEventListener(TOAST_EVENT, onToast);
    return () => window.removeEventListener(TOAST_EVENT, onToast);
  }, []);

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      style={{
        position: "fixed",
        zIndex: 9999,
        bottom: 20,
        right: 20,
        left: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        width: "min(380px, calc(100vw - 32px))",
        pointerEvents: "none",
      }}
    >
      {items.map((t) => {
        const { icon: Icon, color } = TONE[t.tone];
        return (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            style={{
              pointerEvents: "auto",
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              background: "#0F1115",
              color: "#F5F5F4",
              border: "1px solid rgba(255,255,255,0.08)",
              borderLeft: `3px solid ${color}`,
              borderRadius: 12,
              padding: "12px 12px 12px 14px",
              boxShadow: "0 12px 32px rgba(0,0,0,0.28)",
              fontSize: "0.875rem",
              lineHeight: 1.45,
              animation: "uv-toast-in 180ms ease-out",
            }}
          >
            <Icon size={18} style={{ color, flexShrink: 0, marginTop: 1 }} />
            <span style={{ flex: 1, wordBreak: "break-word" }}>{t.message}</span>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => setItems((prev) => prev.filter((x) => x.id !== t.id))}
              style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.55)", cursor: "pointer", padding: 2, display: "flex" }}
            >
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
