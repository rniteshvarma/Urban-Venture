"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, X, Plus, Upload, MapPin, ArrowLeft, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { formatINRFull } from "@/lib/format";

const PROPERTY_TYPES = ["Plots", "Land", "Apartment", "Villa", "Commercial"];
const APPROVALS = ["HMDA_APPROVED", "DTCP_APPROVED", "GHMC_APPROVED", "PANCHAYAT", "UNAPPROVED"];
const OWNERSHIP = ["Freehold", "Leasehold", "Patta", "GPA"];

interface Listing {
  id: string; name: string; corridor: string; city: string; propertyType: string; description: string;
  minBudgetLakhs: number; maxBudgetLakhs: number; villageId: string | null;
  surveyNumbers: string[]; latitude: number | null; longitude: number | null; pinInsideVillage: boolean | null;
  totalAreaSqYd: number | null; totalPlots: number | null; availablePlots: number | null;
  plotSizesSqYd: number[]; facingOptions: string[]; roadWidthFeet: number | null;
  ownershipType: string | null; landClassification: string | null; approvalStatus: string | null;
  approvalNumber: string | null; reraNumber: string | null; imageUrls: string[]; listingStatus: string;
}
interface Media { id: string; fileUrl: string; mediaType: string; isPublic: boolean }
interface Corridor { name: string; shortName: string }
interface FairValue { corridorName: string | null; p10PerSqYd: number | null; p50PerSqYd: number | null; p90PerSqYd: number | null }

const STEPS = ["Property & location", "Details", "Pricing & description", "Media & submit"];

export default function ListingWizard({ id }: { id: string }) {
  const router = useRouter();
  const [f, setF] = useState<Listing | null>(null);
  const [media, setMedia] = useState<Media[]>([]);
  const [corridors, setCorridors] = useState<Corridor[]>([]);
  const [fairValue, setFairValue] = useState<FairValue | null>(null);
  const [step, setStep] = useState(0);
  const [saved, setSaved] = useState<"idle" | "saving" | "saved">("idle");
  const [score, setScore] = useState<number | null>(null);
  const [blockers, setBlockers] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const dirty = useRef(false);

  // Initial step from ?step= (used by improvement deep-links)
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("step");
    if (p) setStep(Math.max(0, Math.min(3, Number(p) - 1)));
  }, []);

  const load = useCallback(async () => {
    const [lj, cj] = await Promise.all([
      fetch(`/api/seller/listings/${id}`).then((r) => r.json()),
      fetch(`/api/calculator/corridors`).then((r) => r.json()).catch(() => ({ corridors: [] })),
    ]);
    if (lj.listing) {
      setF(lj.listing);
      setMedia((lj.listing.media as Media[]) ?? []);
    }
    setCorridors(cj.corridors ?? []);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Fair value whenever corridor/village changes
  useEffect(() => {
    if (!f) return;
    const params = new URLSearchParams();
    if (f.villageId) params.set("villageId", f.villageId);
    if (f.corridor) params.set("corridor", f.corridor);
    if (![...params].length) { setFairValue(null); return; }
    fetch(`/api/listings/fair-value?${params}`).then((r) => r.json()).then(setFairValue).catch(() => setFairValue(null));
  }, [f?.corridor, f?.villageId]); // eslint-disable-line react-hooks/exhaustive-deps

  const patch = useCallback(async (partial: Partial<Listing>) => {
    setSaved("saving");
    await fetch(`/api/seller/listings/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(partial) }).catch(() => {});
    setSaved("saved");
    dirty.current = false;
    // refresh live score (best-effort)
    fetch(`/api/seller/listings/${id}/score`).then((r) => r.json()).then((s) => setScore(s.breakdown?.total ?? null)).catch(() => {});
  }, [id]);

  // Autosave every 8s if dirty
  useEffect(() => {
    const t = setInterval(() => { if (dirty.current && f) patch(fieldsOf(f)); }, 8000);
    return () => clearInterval(t);
  }, [f, patch]);

  if (!f) return <div className="uv-skeleton" style={{ height: 400, borderRadius: 16 }} />;

  const set = (partial: Partial<Listing>) => { setF({ ...f, ...partial }); dirty.current = true; };
  const blur = () => { if (dirty.current) patch(fieldsOf({ ...f })); };

  const submit = async () => {
    setSubmitting(true);
    await patch(fieldsOf(f));
    const res = await fetch(`/api/seller/listings/${id}/submit`, { method: "POST" });
    setSubmitting(false);
    if (res.ok) { router.push("/dashboard"); return; }
    const d = await res.json().catch(() => ({}));
    setBlockers(d.blockers ?? [d.error ?? "Could not submit."]);
    setStep(3);
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <Link href="/dashboard" className="uv-btn uv-btn-ghost" style={{ fontSize: "0.8125rem" }}><ArrowLeft size={14} /> Back to dashboard</Link>
        <div style={{ fontSize: "0.75rem", color: saved === "saved" ? "var(--color-growth)" : "var(--color-text-lo)" }}>
          {saved === "saving" ? <><Loader2 size={12} className="animate-spin" style={{ verticalAlign: "-2px" }} /> Saving…</> : saved === "saved" ? "All changes saved" : "Autosaves as you type"}
        </div>
      </div>

      {/* Stepper */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {STEPS.map((label, i) => (
          <button key={label} onClick={() => { blur(); setStep(i); }} style={{ flex: 1, minWidth: 130, cursor: "pointer", textAlign: "left", padding: "10px 12px", borderRadius: 10, border: step === i ? "2px solid var(--color-saffron)" : "1px solid var(--color-line)", background: step === i ? "var(--color-saffron-wash)" : "var(--color-surface)" }}>
            <div className="uv-mono" style={{ fontSize: "0.6875rem", color: "var(--color-text-lo)" }}>Step {i + 1}</div>
            <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-text-hi)" }}>{label}</div>
          </button>
        ))}
      </div>

      <div className="uv-card" style={{ padding: "1.5rem" }}>
        {step === 0 && <Step1 f={f} set={set} blur={blur} corridors={corridors} id={id} />}
        {step === 1 && <Step2 f={f} set={set} blur={blur} />}
        {step === 2 && <Step3 f={f} set={set} blur={blur} fairValue={fairValue} />}
        {step === 3 && <Step4 f={f} id={id} media={media} reloadMedia={() => fetch(`/api/seller/listings/${id}`).then((r) => r.json()).then((d) => setMedia(d.listing?.media ?? []))} score={score} blockers={blockers} submit={submit} submitting={submitting} />}
      </div>

      {/* Footer nav */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
        <button disabled={step === 0} onClick={() => { blur(); setStep(step - 1); }} className="uv-btn uv-btn-ghost" style={{ fontSize: "0.8125rem", opacity: step === 0 ? 0.4 : 1 }}>Back</button>
        {step < 3 ? (
          <button onClick={() => { blur(); setStep(step + 1); }} className="uv-btn uv-btn-primary" style={{ fontSize: "0.8125rem" }}>Continue</button>
        ) : (
          <button onClick={submit} disabled={submitting} className="uv-btn uv-btn-primary" style={{ fontSize: "0.8125rem" }}>{submitting ? "Submitting…" : "Submit for review"}</button>
        )}
      </div>
    </div>
  );
}

function fieldsOf(f: Listing): Partial<Listing> {
  const { id, listingStatus, imageUrls, pinInsideVillage, ...rest } = f; // eslint-disable-line @typescript-eslint/no-unused-vars
  return rest;
}

// ── Step 1 ──
function Step1({ f, set, blur, corridors, id }: { f: Listing; set: (p: Partial<Listing>) => void; blur: () => void; corridors: Corridor[]; id: string }) {
  const [surveyInput, setSurveyInput] = useState("");
  const [pinStatus, setPinStatus] = useState<string | null>(null);

  const addSurvey = () => { const v = surveyInput.trim(); if (v && !f.surveyNumbers.includes(v)) { set({ surveyNumbers: [...f.surveyNumbers, v] }); setSurveyInput(""); } };
  const checkPin = async () => {
    if (f.latitude == null || f.longitude == null) { setPinStatus("Enter a latitude and longitude first."); return; }
    if (!f.villageId) { setPinStatus("Location saved. Village boundary data isn't available yet, so we can't auto-verify the pin — our reviewer will confirm it."); return; }
    const r = await fetch("/api/listings/validate-pin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ villageId: f.villageId, latitude: f.latitude, longitude: f.longitude }) }).then((x) => x.json());
    setPinStatus(r.verified ? (r.pinInsideVillage ? "✓ Pin is inside the village boundary." : "⚠ Pin is outside the village boundary — move it before submitting.") : "Boundary data unavailable — our reviewer will verify manually.");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Field label="Listing title"><input value={f.name} onChange={(e) => set({ name: e.target.value })} onBlur={blur} placeholder="e.g. 267 sq.yd Residential Plot in Kadthal" style={inp} /></Field>

      <div>
        <Label>Property type</Label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px,1fr))", gap: 8, marginTop: 8 }}>
          {PROPERTY_TYPES.map((t) => (
            <button key={t} onClick={() => { set({ propertyType: t }); blur(); }} style={{ cursor: "pointer", padding: "10px", borderRadius: 10, fontSize: "0.8125rem", fontWeight: 600, border: f.propertyType === t ? "2px solid var(--color-saffron)" : "1px solid var(--color-line)", background: f.propertyType === t ? "var(--color-saffron-wash)" : "var(--color-surface)", color: "var(--color-text-hi)" }}>{t}</button>
          ))}
        </div>
      </div>

      <Field label="Corridor"><select value={f.corridor} onChange={(e) => { set({ corridor: e.target.value }); blur(); }} style={inp}>
        <option value="">Select a corridor…</option>
        {corridors.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
      </select></Field>

      <div>
        <Label>Survey number(s)</Label>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <input value={surveyInput} onChange={(e) => setSurveyInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSurvey())} placeholder="e.g. 142/A" style={inp} />
          <button onClick={addSurvey} className="uv-btn uv-btn-ghost" style={{ fontSize: "0.8125rem" }}><Plus size={14} /></button>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
          {f.surveyNumbers.map((s) => (
            <span key={s} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "var(--color-navy-wash)", color: "var(--color-navy-ink)", padding: "3px 8px", borderRadius: 999, fontSize: "0.75rem", fontWeight: 600 }}>
              {s} <X size={12} style={{ cursor: "pointer" }} onClick={() => { set({ surveyNumbers: f.surveyNumbers.filter((x) => x !== s) }); blur(); }} />
            </span>
          ))}
        </div>
      </div>

      <div>
        <Label>Location pin</Label>
        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          <input type="number" step="0.000001" value={f.latitude ?? ""} onChange={(e) => set({ latitude: e.target.value === "" ? null : Number(e.target.value) })} onBlur={blur} placeholder="Latitude" style={{ ...inp, maxWidth: 180 }} />
          <input type="number" step="0.000001" value={f.longitude ?? ""} onChange={(e) => set({ longitude: e.target.value === "" ? null : Number(e.target.value) })} onBlur={blur} placeholder="Longitude" style={{ ...inp, maxWidth: 180 }} />
          <button onClick={checkPin} className="uv-btn uv-btn-ghost" style={{ fontSize: "0.8125rem" }}><MapPin size={14} /> Check location</button>
        </div>
        {pinStatus && <p style={{ fontSize: "0.8125rem", color: "var(--color-text-mid)", marginTop: 8 }}>{pinStatus}</p>}
      </div>
    </div>
  );
}

// ── Step 2 ──
function Step2({ f, set, blur }: { f: Listing; set: (p: Partial<Listing>) => void; blur: () => void }) {
  const isPlot = /plot/i.test(f.propertyType);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))", gap: 16 }}>
      <Field label="Total area (sq.yd)"><input type="number" value={f.totalAreaSqYd ?? ""} onChange={(e) => set({ totalAreaSqYd: e.target.value === "" ? null : Number(e.target.value) })} onBlur={blur} style={inp} /></Field>
      {isPlot && <>
        <Field label="Total plots"><input type="number" value={f.totalPlots ?? ""} onChange={(e) => set({ totalPlots: e.target.value === "" ? null : Number(e.target.value) })} onBlur={blur} style={inp} /></Field>
        <Field label="Available plots"><input type="number" value={f.availablePlots ?? ""} onChange={(e) => set({ availablePlots: e.target.value === "" ? null : Number(e.target.value) })} onBlur={blur} style={inp} /></Field>
        <Field label="Plot sizes (comma sep, sq.yd)"><input value={f.plotSizesSqYd.join(", ")} onChange={(e) => set({ plotSizesSqYd: e.target.value.split(",").map((x) => Number(x.trim())).filter((n) => !Number.isNaN(n)) })} onBlur={blur} style={inp} /></Field>
        <Field label="Facing options (comma sep)"><input value={f.facingOptions.join(", ")} onChange={(e) => set({ facingOptions: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} onBlur={blur} style={inp} /></Field>
        <Field label="Road width (feet)"><input type="number" value={f.roadWidthFeet ?? ""} onChange={(e) => set({ roadWidthFeet: e.target.value === "" ? null : Number(e.target.value) })} onBlur={blur} style={inp} /></Field>
      </>}
      <Field label="Ownership type"><select value={f.ownershipType ?? ""} onChange={(e) => { set({ ownershipType: e.target.value || null }); blur(); }} style={inp}><option value="">Select…</option>{OWNERSHIP.map((o) => <option key={o}>{o}</option>)}</select></Field>
      <Field label="Land classification"><input value={f.landClassification ?? ""} onChange={(e) => set({ landClassification: e.target.value || null })} onBlur={blur} placeholder="e.g. Non-agricultural" style={inp} /></Field>
      <Field label="Approval status (required)"><select value={f.approvalStatus ?? ""} onChange={(e) => { set({ approvalStatus: e.target.value || null }); blur(); }} style={inp}><option value="">Select…</option>{APPROVALS.map((a) => <option key={a} value={a}>{a.replace(/_/g, " ")}</option>)}</select></Field>
      <Field label="Approval number"><input value={f.approvalNumber ?? ""} onChange={(e) => set({ approvalNumber: e.target.value || null })} onBlur={blur} placeholder="e.g. HMDA LP 2456/2025" style={inp} /></Field>
      <Field label="RERA number (if applicable)"><input value={f.reraNumber ?? ""} onChange={(e) => set({ reraNumber: e.target.value || null })} onBlur={blur} style={inp} /></Field>
    </div>
  );
}

// ── Step 3 ──
function Step3({ f, set, blur, fairValue }: { f: Listing; set: (p: Partial<Listing>) => void; blur: () => void; fairValue: FairValue | null }) {
  const price = f.maxBudgetLakhs || f.minBudgetLakhs || 0;
  const rate = f.totalAreaSqYd && f.totalAreaSqYd > 0 && price > 0 ? Math.round((price * 100000) / f.totalAreaSqYd) : null;
  const p50 = fairValue?.p50PerSqYd ?? null;
  const gapPct = rate && p50 ? Math.round(((rate - p50) / p50) * 100) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))", gap: 16 }}>
        <Field label="Total price (₹ Lakh)"><input type="number" value={f.maxBudgetLakhs || ""} onChange={(e) => { const v = e.target.value === "" ? 0 : Number(e.target.value); set({ minBudgetLakhs: v, maxBudgetLakhs: v }); }} onBlur={blur} style={inp} /></Field>
        {rate && <div style={{ alignSelf: "end", fontSize: "0.8125rem", color: "var(--color-text-mid)" }}>Rate: <b className="uv-mono">{formatINRFull(rate)}/sq.yd</b></div>}
      </div>

      {fairValue && (p50 != null) && (
        <div style={{ background: "var(--color-surface-dim)", borderRadius: 12, padding: "14px 16px" }}>
          <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--color-text-lo)" }}>Model range for {fairValue.corridorName}</div>
          <div className="uv-mono" style={{ fontSize: "1rem", fontWeight: 700, color: "var(--color-text-hi)", marginTop: 4 }}>
            {fairValue.p10PerSqYd ? formatINRFull(fairValue.p10PerSqYd) : "—"} – {fairValue.p90PerSqYd ? formatINRFull(fairValue.p90PerSqYd) : "—"}<span style={{ fontSize: "0.75rem", color: "var(--color-text-lo)", fontWeight: 400 }}>/sq.yd</span>
          </div>
          {gapPct != null && (
            <div style={{ marginTop: 8, fontSize: "0.8125rem", color: gapPct > 5 ? "#8A5A00" : "var(--color-growth)" }}>
              Your price {formatINRFull(rate!)} {gapPct > 0 ? `▲ ${gapPct}% above` : gapPct < 0 ? `▼ ${Math.abs(gapPct)}% below` : "at"} the model mid.
              {gapPct > 5 && " This costs you points on your listing score — but you can price as you wish; this is guidance."}
            </div>
          )}
        </div>
      )}

      <Field label="Description (200+ characters encouraged)">
        <textarea value={f.description} onChange={(e) => set({ description: e.target.value })} onBlur={blur} rows={6} placeholder="Describe the plot, location advantages, approvals, and what makes it a good buy." style={{ ...inp, resize: "vertical" }} />
        <div style={{ fontSize: "0.75rem", color: f.description.length >= 200 ? "var(--color-growth)" : "var(--color-text-lo)", marginTop: 4 }}>{f.description.length} characters</div>
      </Field>
    </div>
  );
}

// ── Step 4 ──
function Step4({ f, id, media, reloadMedia, score, blockers, submit, submitting }: { f: Listing; id: string; media: Media[]; reloadMedia: () => void; score: number | null; blockers: string[]; submit: () => void; submitting: boolean }) {
  const [uploading, setUploading] = useState(false);
  const photos = media.filter((m) => m.isPublic && !/MASTER_PLAN|FLOOR_PLAN|UNIT_PLAN/.test(m.mediaType));
  const plans = media.filter((m) => /MASTER_PLAN|FLOOR_PLAN|UNIT_PLAN/.test(m.mediaType));
  const docs = media.filter((m) => !m.isPublic);

  const upload = async (role: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const fd = new FormData();
    fd.set("role", role);
    Array.from(files).forEach((file) => fd.append("files", file));
    await fetch(`/api/seller/listings/${id}/media`, { method: "POST", body: fd }).catch(() => {});
    setUploading(false);
    reloadMedia();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <UploadRow label="Site photos (min 5)" count={photos.length} role="PHOTO" onUpload={upload} accept="image/*" uploading={uploading} />
      <UploadRow label="Layout / floor plan (required)" count={plans.length} role="LAYOUT" onUpload={upload} accept="image/*,application/pdf" uploading={uploading} />
      <UploadRow label="Documents (private — verification only)" count={docs.length} role="DOCUMENT" onUpload={upload} accept="image/*,application/pdf" uploading={uploading} />

      <div style={{ background: "var(--color-ink)", color: "#fff", borderRadius: 12, padding: "16px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: "0.75rem", color: "var(--color-text-invert-mid)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Live score preview</div>
          <div style={{ fontFamily: "var(--font-jakarta)", fontWeight: 800, fontSize: "1.5rem" }} className="uv-mono">{score != null ? `${score}/100` : "—"}</div>
        </div>
        <div style={{ fontSize: "0.8125rem", color: "var(--color-text-invert-mid)", maxWidth: 280 }}>Approved listings show buyers a letter grade, never the raw number.</div>
      </div>

      {blockers.length > 0 && (
        <div style={{ background: "#FBE0DC", border: "1px solid var(--color-alert)", borderRadius: 12, padding: "14px 16px" }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center", fontWeight: 700, color: "#B4291D", fontSize: "0.875rem" }}><AlertTriangle size={15} /> A few things before you can submit</div>
          <ul style={{ marginTop: 8, paddingLeft: 18, fontSize: "0.8125rem", color: "#8A2015" }}>{blockers.map((b, i) => <li key={i}>{b}</li>)}</ul>
        </div>
      )}

      <button onClick={submit} disabled={submitting} className="uv-btn uv-btn-primary" style={{ justifyContent: "center", fontSize: "0.9375rem", padding: "12px" }}>
        {submitting ? "Submitting…" : <><CheckCircle2 size={16} /> Submit for review</>}
      </button>
    </div>
  );
}

function UploadRow({ label, count, role, onUpload, accept, uploading }: { label: string; count: number; role: string; onUpload: (r: string, files: FileList | null) => void; accept: string; uploading: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, border: "1px dashed var(--color-line)", borderRadius: 12, padding: "14px 16px", flexWrap: "wrap" }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--color-text-hi)" }}>{label}</div>
        <div style={{ fontSize: "0.75rem", color: count > 0 ? "var(--color-growth)" : "var(--color-text-lo)" }}>{count > 0 ? `${count} uploaded ${count === 1 ? "" : ""}` : "None yet"}{count > 0 && <Check size={12} style={{ verticalAlign: "-1px", marginLeft: 4 }} />}</div>
      </div>
      <input ref={ref} type="file" accept={accept} multiple hidden onChange={(e) => onUpload(role, e.target.files)} />
      <button onClick={() => ref.current?.click()} disabled={uploading} className="uv-btn uv-btn-ghost" style={{ fontSize: "0.8125rem" }}><Upload size={14} /> Upload</button>
    </div>
  );
}

// ── shared bits ──
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label>{label}</Label><div style={{ marginTop: 6 }}>{children}</div></div>;
}
function Label({ children }: { children: React.ReactNode }) {
  return <label style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--color-text-mid)" }}>{children}</label>;
}
const inp: React.CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--color-line)", background: "var(--color-surface)", fontSize: "0.9375rem", color: "var(--color-text-hi)" };
