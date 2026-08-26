"use client";

// Contact form for the map detail card. Posts to the EXISTING enquiry endpoint,
// which creates a ListingEnquiry plus a CRM Lead and fires the existing
// automations. Buyer contact stays hidden from the seller until an admin
// releases it — nothing about that flow changes here.

import { useEffect, useState } from "react";
import { X, CheckCircle2 } from "lucide-react";

export default function EnquiryModal({ projectId, projectName, onClose }: { projectId: string; projectName: string; onClose: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [budgetLakh, setBudgetLakh] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [onClose]);

  const submit = async () => {
    setError(null);
    setBusy(true);
    const res = await fetch(`/api/projects/${projectId}/enquiry`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || null,
        message: message.trim() || null,
        budgetLakh: budgetLakh ? Number(budgetLakh) : null,
      }),
    }).catch(() => null);
    setBusy(false);
    if (res?.ok) { setDone(true); return; }
    const d = await res?.json().catch(() => ({}));
    setError(d?.error ?? "Could not send your enquiry. Please try again.");
  };

  const inp: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #E4E4EA",
    fontSize: "0.875rem", color: "#1A1A24", background: "#fff", marginTop: 5,
  };
  const lbl: React.CSSProperties = { fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "#8A8A99" };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "grid", placeItems: "center", padding: 16 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(10,10,16,.5)" }} />
      <div style={{ position: "relative", width: "min(420px, 100%)", background: "#fff", borderRadius: 18, padding: "1.4rem 1.5rem", boxShadow: "0 4px 28px rgba(16,16,26,.35)" }}>
        <button onClick={onClose} aria-label="Close" style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", cursor: "pointer", color: "#8A8A99" }}><X size={17} /></button>

        {done ? (
          <div style={{ textAlign: "center", padding: "1rem 0" }}>
            <CheckCircle2 size={34} style={{ color: "#0F9D58" }} />
            <h3 style={{ fontFamily: "var(--font-jakarta)", fontWeight: 800, fontSize: "1.05rem", color: "#0D0D12", marginTop: 10 }}>Enquiry sent</h3>
            <p style={{ fontSize: "0.8125rem", color: "#5A5A66", marginTop: 6, lineHeight: 1.5 }}>
              Our advisory team will qualify this and get back to you shortly.
            </p>
            <button onClick={onClose} className="uv-btn uv-btn-primary" style={{ marginTop: 16, fontSize: "0.8125rem" }}>Done</button>
          </div>
        ) : (
          <>
            <h3 style={{ fontFamily: "var(--font-jakarta)", fontWeight: 800, fontSize: "1.05rem", color: "#0D0D12", paddingRight: 24 }}>Contact about this property</h3>
            <p style={{ fontSize: "0.75rem", color: "#8A8A99", marginTop: 3, marginBottom: 14 }}>{projectName}</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              <div><label style={lbl}>Your name *</label><input value={name} onChange={(e) => setName(e.target.value)} style={inp} /></div>
              <div><label style={lbl}>Phone *</label><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91…" style={inp} /></div>
              <div><label style={lbl}>Email</label><input value={email} onChange={(e) => setEmail(e.target.value)} type="email" style={inp} /></div>
              <div><label style={lbl}>Budget (₹ Lakh)</label><input value={budgetLakh} onChange={(e) => setBudgetLakh(e.target.value)} type="number" style={inp} /></div>
              <div><label style={lbl}>Message</label><textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="Anything you'd like to ask?" style={{ ...inp, resize: "vertical" }} /></div>
            </div>

            {error && <p style={{ color: "#D93B30", fontSize: "0.8125rem", marginTop: 10 }}>{error}</p>}

            <button
              onClick={submit}
              disabled={busy || !name.trim() || !phone.trim()}
              className="uv-btn uv-btn-primary"
              style={{ width: "100%", justifyContent: "center", marginTop: 16, fontSize: "0.875rem", padding: "11px", opacity: busy || !name.trim() || !phone.trim() ? 0.6 : 1 }}
            >
              {busy ? "Sending…" : "Send enquiry"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
