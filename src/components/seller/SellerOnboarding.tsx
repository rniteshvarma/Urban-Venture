"use client";

import React, { useState } from "react";
import { ArrowRight } from "lucide-react";

const TYPES = [
  { key: "OWNER", label: "Owner", sub: "Selling my own property" },
  { key: "AGENT", label: "Agent / Broker", sub: "Listing on behalf of owners" },
  { key: "BUILDER", label: "Builder", sub: "Selling my own project inventory" },
];

/** Three-field seller onboarding (Part 6). Phone is already verified at signup. */
export default function SellerOnboarding({ defaultName = "", onDone }: { defaultName?: string; onDone: () => void }) {
  const [sellerType, setSellerType] = useState("");
  const [displayName, setDisplayName] = useState(defaultName);
  const [firmName, setFirmName] = useState("");
  const [reraAgentNumber, setReraAgentNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const needsFirm = sellerType === "AGENT" || sellerType === "BUILDER";

  const submit = async () => {
    setError(null);
    setSaving(true);
    const res = await fetch("/api/seller/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sellerType, displayName, firmName: firmName || null, reraAgentNumber: reraAgentNumber || null }),
    });
    setSaving(false);
    if (res.ok) { onDone(); return; }
    const d = await res.json().catch(() => ({}));
    setError(d.error ?? "Something went wrong. Please try again.");
  };

  return (
    <div className="uv-card" style={{ maxWidth: 560, margin: "0 auto", padding: "1.75rem" }}>
      <h1 style={{ fontFamily: "var(--font-jakarta)", fontWeight: 800, fontSize: "1.4rem", color: "var(--color-text-hi)" }}>List a property</h1>
      <p style={{ color: "var(--color-text-mid)", fontSize: "0.875rem", marginTop: 4 }}>Three quick details and you&apos;re in. We&apos;ll ask for documents later, at review.</p>

      <div style={{ marginTop: 20 }}>
        <label style={labelStyle}>I am a…</label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: 10, marginTop: 8 }}>
          {TYPES.map((t) => {
            const active = sellerType === t.key;
            return (
              <button key={t.key} onClick={() => setSellerType(t.key)} type="button"
                style={{ textAlign: "left", cursor: "pointer", padding: "12px 14px", borderRadius: 12, border: active ? "2px solid var(--color-saffron)" : "1px solid var(--color-line)", background: active ? "var(--color-saffron-wash)" : "var(--color-surface)" }}>
                <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--color-text-hi)" }}>{t.label}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--color-text-mid)", marginTop: 2 }}>{t.sub}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <label style={labelStyle}>Display name</label>
        <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Shown to buyers" style={inputStyle} />
      </div>

      {needsFirm && (
        <>
          <div style={{ marginTop: 14 }}>
            <label style={labelStyle}>Firm name</label>
            <input value={firmName} onChange={(e) => setFirmName(e.target.value)} placeholder="Your agency / company" style={inputStyle} />
          </div>
          <div style={{ marginTop: 14 }}>
            <label style={labelStyle}>RERA agent number <span style={{ color: "var(--color-alert)" }}>*</span></label>
            <input value={reraAgentNumber} onChange={(e) => setReraAgentNumber(e.target.value)} placeholder="Required for agents & builders" style={inputStyle} />
          </div>
        </>
      )}

      {error && <p style={{ color: "var(--color-alert)", fontSize: "0.8125rem", marginTop: 12 }}>{error}</p>}

      <button onClick={submit} disabled={saving || !sellerType || !displayName.trim() || (needsFirm && !reraAgentNumber.trim())}
        className="uv-btn uv-btn-primary" style={{ marginTop: 20, width: "100%", justifyContent: "center", opacity: saving ? 0.7 : 1 }}>
        {saving ? "Saving…" : <>Continue to your first listing <ArrowRight size={16} /></>}
      </button>
    </div>
  );
}

const labelStyle: React.CSSProperties = { fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--color-text-mid)" };
const inputStyle: React.CSSProperties = { width: "100%", marginTop: 6, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--color-line)", background: "var(--color-surface)", fontSize: "0.9375rem", color: "var(--color-text-hi)" };
