"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, AlertTriangle, XCircle, MessageSquareWarning } from "lucide-react";

interface SellerListing {
  id: string; name: string; corridor: string; developer: string; listingStatus: string;
  listingScore: number | null; submittedAt: string | null; approvalNumber: string | null;
  approvalStatus: string | null; surveyNumbers: string[]; pinInsideVillage: boolean | null;
  landClassification: string | null; villageId: string | null;
}

const STATUS_TABS = [
  // Drafts are listings the seller started but never submitted. They are not
  // actionable yet, but they must stay reachable — they are deliberately hidden
  // from the public feed and from ADMIN inventory, so this is the only place
  // they surface.
  { key: "DRAFT", label: "Drafts" },
  { key: "PENDING_REVIEW", label: "Pending review" },
  { key: "CHANGES_REQUESTED", label: "Changes requested" },
  { key: "APPROVED", label: "Live" },
  { key: "REJECTED", label: "Rejected" },
];

const CHANGE_TEMPLATES = [
  "Photos are unclear or too few — please add at least 5 clear site photos.",
  "The approval number could not be verified — please recheck and re-enter it.",
  "The map pin appears to be outside the stated village — please correct it.",
  "The price is well above the model range — consider revising, or add justification in the description.",
];

export default function SellerReviewPage() {
  const [status, setStatus] = useState("PENDING_REVIEW");
  const [listings, setListings] = useState<SellerListing[] | null>(null);
  const [active, setActive] = useState<SellerListing | null>(null);

  const load = useCallback(() => {
    setListings(null);
    fetch(`/api/admin/projects?source=SELLER&listingStatus=${status}`)
      .then((r) => r.json())
      .then((d) => setListings(Array.isArray(d) ? d : []))
      .catch(() => setListings([]));
  }, [status]);
  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ padding: "1.5rem", maxWidth: 1100, margin: "0 auto" }}>
      <Link href="/admin/projects" style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: "0.8125rem", color: "#666", marginBottom: 14 }}><ArrowLeft size={14} /> Back to projects</Link>
      <h1 className="font-display" style={{ fontSize: "1.6rem", fontWeight: 800, color: "#1A1A2E" }}>Seller listing review</h1>
      <p style={{ color: "#666", fontSize: "0.875rem", marginTop: 2 }}>Owner &amp; agent listings awaiting review. Approve, request specific changes, or reject.</p>

      <div style={{ display: "flex", gap: 6, margin: "18px 0", flexWrap: "wrap" }}>
        {STATUS_TABS.map((t) => (
          <button key={t.key} onClick={() => { setStatus(t.key); setActive(null); }} style={{ cursor: "pointer", padding: "6px 14px", borderRadius: 999, fontSize: "0.8125rem", fontWeight: 600, border: status === t.key ? "none" : "1px solid #E2E2E8", background: status === t.key ? "#1A1A2E" : "#fff", color: status === t.key ? "#fff" : "#555" }}>{t.label}</button>
        ))}
      </div>

      {!listings ? <div className="uv-skeleton" style={{ height: 200, borderRadius: 12 }} /> : listings.length === 0 ? (
        <p style={{ color: "#888", padding: "2rem 0", fontSize: "0.9375rem" }}>Nothing here right now.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 1fr) minmax(320px, 1.4fr)", gap: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {listings.map((l) => (
              <button key={l.id} onClick={() => setActive(l)} style={{ textAlign: "left", cursor: "pointer", padding: "12px 14px", borderRadius: 10, border: active?.id === l.id ? "2px solid var(--color-saffron)" : "1px solid #E2E2E8", background: "#fff" }}>
                <div style={{ fontWeight: 700, color: "#1A1A2E", fontSize: "0.875rem" }}>{l.name || "Untitled"}</div>
                <div style={{ fontSize: "0.75rem", color: "#888" }}>{l.corridor} · {l.developer}{l.listingScore != null ? ` · Score ${l.listingScore}/100` : ""}</div>
              </button>
            ))}
          </div>
          <div>{active ? <ReviewPanel listing={active} onDone={() => { setActive(null); load(); }} /> : <div style={{ padding: "2rem", color: "#999", textAlign: "center", border: "1px dashed #E2E2E8", borderRadius: 12 }}>Select a listing to review</div>}</div>
        </div>
      )}
    </div>
  );
}

function Check({ ok, children }: { ok: boolean | null; children: React.ReactNode }) {
  // ok=true pass, ok=false warn, ok=null "did not run" — never a green tick for an unrun check
  const color = ok === true ? "#0B7A43" : ok === false ? "#B4291D" : "#8A6D00";
  const Icon = ok === true ? CheckCircle2 : ok === false ? AlertTriangle : AlertTriangle;
  return <div style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: "0.8125rem", color }}><Icon size={14} style={{ flexShrink: 0, marginTop: 1 }} /> <span>{children}</span></div>;
}

function ReviewPanel({ listing, onDone }: { listing: SellerListing; onDone: () => void }) {
  const [mode, setMode] = useState<"idle" | "changes" | "reject">("idle");
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);

  const act = async (path: string, body?: object) => {
    setBusy(true);
    await fetch(`/api/admin/projects/${listing.id}/${path}`, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : { method: "POST" }).catch(() => {});
    setBusy(false);
    onDone();
  };

  return (
    <div className="uv-card" style={{ padding: "1.25rem 1.35rem", background: "#fff" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 700, color: "#1A1A2E" }}>{listing.name || "Untitled"}</div>
          <div style={{ fontSize: "0.75rem", color: "#888" }}>{listing.developer} · submitted {listing.submittedAt ? new Date(listing.submittedAt).toLocaleDateString("en-IN") : "—"}</div>
        </div>
        {listing.listingScore != null && <div className="uv-mono" style={{ fontWeight: 700, color: "#1A1A2E" }}>Score {listing.listingScore}/100</div>}
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: "0.6875rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "#999", fontWeight: 700 }}>Automated checks</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
          <Check ok={listing.surveyNumbers.length > 0}>{listing.surveyNumbers.length > 0 ? `Survey number(s): ${listing.surveyNumbers.join(", ")}` : "No survey number provided"}</Check>
          <Check ok={listing.pinInsideVillage}>{listing.pinInsideVillage === true ? "Map pin inside the village boundary" : listing.pinInsideVillage === false ? "Map pin OUTSIDE the village boundary" : "Boundary check not run — manual verification required"}</Check>
          <Check ok={listing.approvalNumber ? null : false}>{listing.approvalNumber ? `Approval ${listing.approvalNumber} — manual verification required` : "No approval number provided"}</Check>
          <Check ok={null}>Duplicate survey check &amp; land-records lookup — manual verification required</Check>
        </div>
      </div>

      {mode === "idle" && (
        <div style={{ display: "flex", gap: 8, marginTop: 18, flexWrap: "wrap" }}>
          <button disabled={busy} onClick={() => act("approve")} className="crm-btn-primary text-xs" style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><CheckCircle2 size={14} /> Approve</button>
          <button disabled={busy} onClick={() => setMode("changes")} className="crm-btn-secondary text-xs" style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><MessageSquareWarning size={14} /> Request changes</button>
          <button disabled={busy} onClick={() => setMode("reject")} className="crm-btn-ghost text-xs" style={{ display: "inline-flex", gap: 6, alignItems: "center", color: "#B4291D" }}><XCircle size={14} /> Reject</button>
        </div>
      )}

      {mode === "changes" && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#1A1A2E", marginBottom: 8 }}>Specific, actionable feedback for the seller</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
            {CHANGE_TEMPLATES.map((t) => <button key={t} onClick={() => setFeedback((f) => (f ? f + " " : "") + t)} style={{ textAlign: "left", cursor: "pointer", fontSize: "0.75rem", color: "#555", background: "#F4F4F7", border: "none", borderRadius: 8, padding: "6px 10px" }}>+ {t}</button>)}
          </div>
          <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={4} placeholder="Tell the seller exactly what to fix…" style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #E2E2E8", fontSize: "0.875rem" }} />
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button disabled={busy || !feedback.trim()} onClick={() => act("request-changes", { feedback })} className="crm-btn-primary text-xs">Send back to seller</button>
            <button onClick={() => setMode("idle")} className="crm-btn-ghost text-xs">Cancel</button>
          </div>
        </div>
      )}

      {mode === "reject" && (
        <div style={{ marginTop: 16 }}>
          <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={3} placeholder="Reason for rejection…" style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #E2E2E8", fontSize: "0.875rem" }} />
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button disabled={busy || !feedback.trim()} onClick={() => act("reject", { reason: feedback })} className="crm-btn-primary text-xs" style={{ background: "#B4291D" }}>Confirm rejection</button>
            <button onClick={() => setMode("idle")} className="crm-btn-ghost text-xs">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
