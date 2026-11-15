"use client";

import React, { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { JOURNEY } from "@/lib/buyer/journey";
import ConsentNote from "@/components/legal/ConsentNote";
import { WhatsAppInline } from "@/components/client/WhatsAppButton";

export default function RequestForm() {
  const [steps, setSteps] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const toggle = (id: string) => setSteps((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/buying-help", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email: email || null, message: message || null, steps }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Something went wrong. Please try again.");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="text-center py-6 space-y-2" role="status">
        <CheckCircle2 className="mx-auto text-growth" size={36} />
        <p className="font-bold text-text-primary">Thanks — we&apos;ve got your request.</p>
        <p className="text-sm text-text-secondary">Our team will call you on the number you gave.</p>
      </div>
    );
  }
  const field = "input-premium w-full";
  return (
    <form onSubmit={submit} className="space-y-4">
      <fieldset>
        <legend className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">What would you like help with?</legend>
        <div className="flex flex-wrap gap-2">
          {JOURNEY.map((s) => (
            <button key={s.id} type="button" onClick={() => toggle(s.id)} aria-pressed={steps.includes(s.id)} className="uv-chip"
              style={{ cursor: "pointer", border: "1px solid var(--color-line)", background: steps.includes(s.id) ? "var(--color-saffron)" : "var(--color-surface)", color: steps.includes(s.id) ? "var(--color-ink)" : "var(--color-text-mid)" }}>
              {s.n}. {s.title}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block"><span className="text-xs font-semibold text-text-secondary">Your name</span><input className={field} value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" /></label>
        <label className="block"><span className="text-xs font-semibold text-text-secondary">Mobile number</span><input className={field} value={phone} onChange={(e) => setPhone(e.target.value)} required type="tel" inputMode="tel" autoComplete="tel" placeholder="10-digit mobile number" /></label>
      </div>
      <label className="block"><span className="text-xs font-semibold text-text-secondary">Email (optional)</span><input className={field} value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" /></label>
      <label className="block"><span className="text-xs font-semibold text-text-secondary">Anything we should know? (optional)</span><textarea className={`${field} resize-none`} rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Budget, areas you like, when you want to move…" /></label>
      {error && <p className="text-xs font-semibold text-alert" role="alert">{error}</p>}
      <button type="submit" disabled={busy} className="btn-primary w-full py-3">{busy ? "Sending…" : "Request a call back"}</button>
      <WhatsAppInline text="Hi Property Tiger, I'd like help buying a home in Hyderabad." />
      <ConsentNote className="text-center" share="Our team uses your details to call you about buying help." />
    </form>
  );
}
