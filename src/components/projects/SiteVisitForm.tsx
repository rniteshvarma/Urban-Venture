"use client";

/** Book a site visit: a preferred date and time of day; our team confirms by phone. */
import React, { useState } from "react";
import { CalendarCheck } from "lucide-react";
import { SLOTS, type Slot } from "@/lib/buyer/site-visit";

const isoDay = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

export default function SiteVisitForm({ projectId, projectName }: { projectId: string; projectName: string }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState<Slot>("MORNING");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  // The bookable window, fixed when the form first renders.
  const [{ min, max }] = useState(() => {
    const now = Date.now();
    return { min: isoDay(new Date(now + 86_400_000)), max: isoDay(new Date(now + 60 * 86_400_000)) };
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const r = await fetch(`/api/projects/${projectId}/site-visit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, email: email || null, date, slot }),
    });
    setBusy(false);
    if (r.ok) setDone(true);
    else setErr((await r.json().catch(() => ({}))).error ?? "Couldn't book the visit. Please try again.");
  };

  if (done) {
    return (
      <div className="card-premium text-center space-y-2 !p-6">
        <CalendarCheck className="mx-auto text-growth" size={28} />
        <p className="font-bold text-text-primary">Visit requested</p>
        <p className="text-xs text-text-secondary">We&apos;ll call you to confirm your visit to {projectName} on {new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} ({SLOTS[slot]}).</p>
      </div>
    );
  }
  const field = "input-premium w-full text-sm";
  return (
    <form onSubmit={submit} className="card-premium space-y-3 !p-6">
      <h3 className="font-display text-lg font-bold text-text-primary flex items-center gap-2"><CalendarCheck size={18} className="text-saffron-deep" /> Book a site visit</h3>
      <input className={field} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required aria-label="Name" />
      <input className={field} placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} required inputMode="tel" aria-label="Phone" />
      <input className={field} placeholder="Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} type="email" aria-label="Email" />
      <div className="grid grid-cols-2 gap-2">
        <input className={field} type="date" min={min} max={max} value={date} onChange={(e) => setDate(e.target.value)} required aria-label="Preferred date" />
        <select className={field} value={slot} onChange={(e) => setSlot(e.target.value as Slot)} aria-label="Time of day">
          {(Object.keys(SLOTS) as Slot[]).map((s) => <option key={s} value={s}>{SLOTS[s]}</option>)}
        </select>
      </div>
      {err && <p className="text-xs text-alert">{err}</p>}
      <button type="submit" disabled={busy} className="btn-primary w-full text-sm disabled:opacity-60">{busy ? "Booking…" : "Request visit"}</button>
      <p className="text-[10px] text-text-secondary">We confirm every visit by phone before it&apos;s fixed. Your details go to our team, not to the seller.</p>
    </form>
  );
}
