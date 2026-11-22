"use client";

// Bottom-left detail card (Part 5); a three-snap bottom sheet on mobile.
//
// Constraint 7: no phone number, email, or document URL is ever rendered here.
// "Contact Agent" goes through the existing enquiry flow, which creates a
// ListingEnquiry + CRM Lead exactly as elsewhere in the app.

import { useCallback, useEffect, useState } from "react";
import { X, Bookmark, Share2, Navigation, ExternalLink, ChevronLeft, ChevronRight, BadgeCheck, Building2, Orbit } from "lucide-react";
import { formatLakh, formatINRFull } from "@/lib/format";
import EnquiryModal from "./EnquiryModal";
import { areaLabel } from "@/lib/explore/query";
import AccessibilityPanel, { type AccessibilityView } from "@/components/accessibility/AccessibilityPanel";
import { X as T, iconBtn } from "./theme";
import type { useFocus3D } from "./useFocus3D";

type Focus3D = ReturnType<typeof useFocus3D>;

interface Detail {
  id: string;
  ref: string;
  name: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  priceLakh: number;
  priceFrom?: boolean;
  areaValue: number | null;
  areaUnit: string | null;
  rateValue: number | null;
  rateUnit: string | null;
  propertyTypeLabel: string;
  images: string[];
  attributes: {
    approachRoad: string | null;
    facing: string | null;
    approvalStatus: string | null;
    approvalVerified: boolean;
    ownershipType: string | null;
    plotsAvailable: string | null;
  };
  isVerified: boolean;
  source: "ADMIN" | "SELLER";
  scoreGrade: string | null;
  corridor: { slug: string; name: string; score: number | null } | null;
  /** separate from the rating; null until the OpenStreetMap job has scored it */
  accessibility: AccessibilityView | null;
  url: string;
}

export default function PropertyDetailCard({ id, onClose, isMobile, onShowNearby, left = 16, focus3d }: {
  id: string;
  onClose: () => void;
  isMobile: boolean;
  onShowNearby?: () => void;
  /** desktop: distance from the left edge (beside an open list) */
  left?: number | string;
  /** the 3D focus view of this listing on the map */
  focus3d?: Focus3D;
}) {
  const [d, setD] = useState<Detail | null>(null);
  const [img, setImg] = useState(0);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [enquiry, setEnquiry] = useState(false);
  /** mobile sheet snap: 0 peek · 1 half · 2 full */
  const [snap, setSnap] = useState(1);

  useEffect(() => {
    setD(null); setImg(0);
    let live = true;
    fetch(`/api/explore/properties/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((j) => { if (live) setD(j); })
      .catch(() => { if (live) setD(null); });
    return () => { live = false; };
  }, [id]);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [onClose]);

  const shortlist = useCallback(async () => {
    // Reuses the existing saved-projects API (handles anonymous via cookie).
    const res = await fetch("/api/saved/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: id }),
    }).catch(() => null);
    if (res?.ok) setSaved(true);
    else if (res?.status === 401) window.location.href = `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
  }, [id]);

  const share = useCallback(async () => {
    // The link carries map position + selection, so the recipient opens the
    // same view.
    const url = window.location.href;
    if (navigator.share && isMobile) {
      await navigator.share({ title: d?.name ?? "Property", url }).catch(() => {});
      return;
    }
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }, [d, isMobile]);

  const height = isMobile ? (snap === 0 ? 140 : snap === 1 ? "52vh" : "88vh") : "auto";
  const shell: React.CSSProperties = isMobile
    ? { position: "absolute", left: 0, right: 0, bottom: 0, height, borderRadius: "20px 20px 0 0", maxHeight: "88vh" }
    : { position: "absolute", left, bottom: 20, width: 380, borderRadius: 20, maxHeight: "calc(100% - 110px)" };
  const f3 = focus3d?.focus && focus3d.focus.id === id ? focus3d : null;

  return (
    <>
      <div style={{
        ...shell, background: T.panel, border: `1px solid ${T.line}`, color: T.text, backdropFilter: T.blur, zIndex: 35, boxShadow: T.shadow,
        display: "flex", flexDirection: "column", overflow: "hidden", pointerEvents: "auto",
        animation: "uv-cardin 240ms cubic-bezier(.2,.8,.2,1)",
      }}>
        <style>{`@keyframes uv-cardin { from { transform: translateY(16px); opacity: 0 } to { transform: none; opacity: 1 } }`}</style>

        {isMobile && (
          <div onClick={() => setSnap((s) => (s + 1) % 3)} style={{ padding: "8px 0 4px", display: "grid", placeItems: "center", cursor: "grab", flexShrink: 0 }}>
            <span style={{ width: 38, height: 4, borderRadius: 999, background: T.lineStrong }} />
          </div>
        )}

        {!d ? (
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="uv-skeleton" style={{ height: 18, width: "60%", borderRadius: 6 }} />
            <div className="uv-skeleton" style={{ height: 14, width: "45%", borderRadius: 6 }} />
            <div className="uv-skeleton" style={{ height: 120, borderRadius: 12 }} />
          </div>
        ) : (
          <>
            <div style={{ padding: "12px 16px 10px", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontFamily: "var(--font-jakarta)", fontWeight: 800, fontSize: "1.05rem", color: T.text }}>
                      {d.areaValue ? areaLabel(d.areaValue, d.areaUnit) : d.name}
                    </span>
                    {d.isVerified && <BadgeCheck size={16} style={{ color: T.good, flexShrink: 0 }} />}
                    {d.scoreGrade && <span style={{ fontSize: "0.625rem", fontWeight: 800, color: "#0D0D12", background: T.saffron, borderRadius: 999, padding: "2px 7px" }}>{d.scoreGrade}</span>}
                  </div>
                  {d.areaValue && <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: T.textMid, marginTop: 1 }}>{d.name}</div>}
                  <div style={{ fontSize: "0.75rem", color: T.textLo, marginTop: 2 }}>📍 {d.location || "Location not specified"}</div>
                  <div style={{ marginTop: 6 }}>
                    {d.rateValue && (
                      <span className="uv-mono" style={{ fontWeight: 700, fontSize: "0.9375rem", color: T.text }}>
                        {formatINRFull(d.rateValue)}<span style={{ color: T.textLo, fontWeight: 400 }}> / {d.rateUnit}</span>
                      </span>
                    )}
                    {d.priceLakh > 0 && (
                      <span className="uv-mono" style={{ marginLeft: d.rateValue ? 8 : 0, fontWeight: 800, fontSize: "0.9375rem", color: T.saffronText }}>
                        {d.rateValue ? "(Total " : d.priceFrom ? "from " : ""}{formatLakh(d.priceLakh)}{d.rateValue ? ")" : ""}
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={onClose} aria-label="Close" style={{ ...iconBtn, flexShrink: 0, width: 30, height: 30, borderRadius: 999, border: `1px solid ${T.line}` }}><X size={16} /></button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto" }}>
              {d.images.length > 0 && (
                <div style={{ position: "relative", margin: "0 16px", borderRadius: 12, overflow: "hidden", background: "#1F1F29" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={d.images[img]} alt={d.name} style={{ width: "100%", height: 168, objectFit: "cover", display: "block" }} />
                  {d.images.length > 1 && (
                    <>
                      <Arrow side="left" onClick={() => setImg((i) => (i - 1 + d.images.length) % d.images.length)} />
                      <Arrow side="right" onClick={() => setImg((i) => (i + 1) % d.images.length)} />
                      <div style={{ position: "absolute", bottom: 8, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 5 }}>
                        {d.images.map((_, i) => (
                          <span key={i} style={{ width: 6, height: 6, borderRadius: 999, background: i === img ? "#fff" : "rgba(255,255,255,.45)" }} />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-around", padding: "12px 8px", borderBottom: `1px solid ${T.line}`, margin: "12px 0 0" }}>
                <Action icon={<Bookmark size={16} fill={saved ? T.saffron : "none"} />} label={saved ? "Saved" : "Shortlist"} onClick={shortlist} active={saved} />
                <Action icon={<Share2 size={16} />} label={copied ? "Copied" : "Share"} onClick={share} active={copied} />
                <Action
                  icon={<Navigation size={16} />}
                  label="Directions"
                  disabled={d.latitude == null || d.longitude == null}
                  onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${d.latitude},${d.longitude}`, "_blank", "noopener")}
                />
                <Action icon={<ExternalLink size={16} />} label="Open" onClick={() => window.open(d.url, "_blank", "noopener")} />
              </div>

              {f3 && (
                <div style={{ padding: "12px 16px 2px", display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    {f3.focus!.tigerScore != null && (
                      <span style={{ display: "inline-flex", alignItems: "baseline", gap: 5, border: `1px solid ${T.line}`, background: T.raised, borderRadius: 10, padding: "6px 10px" }}>
                        <b className="uv-mono" style={{ fontSize: "1rem", color: T.text }}>{f3.focus!.tigerScore.toFixed(1)}</b>
                        <span style={{ fontSize: "0.625rem", letterSpacing: "0.06em", textTransform: "uppercase", color: T.textLo }}>Tiger Score /10</span>
                      </span>
                    )}
                    <label style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.75rem", color: T.textMid, cursor: "pointer" }}>
                      <input type="checkbox" checked={f3.orbit} onChange={(e) => f3.setOrbit(e.target.checked)} style={{ accentColor: T.saffron }} />
                      <Orbit size={13} aria-hidden /> Orbit
                    </label>
                  </div>
                  {f3.shapeNote && (
                    <div style={{ display: "flex", gap: 7, alignItems: "flex-start", fontSize: "0.75rem", lineHeight: 1.45, color: T.textMid, padding: "8px 10px", borderRadius: 10, background: "rgba(255,180,0,.07)", border: "1px solid rgba(255,180,0,.22)" }}>
                      <Building2 size={14} aria-hidden style={{ flexShrink: 0, marginTop: 1, color: T.saffron }} /> {f3.shapeNote}
                    </div>
                  )}
                </div>
              )}

              <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 7 }}>
                <Attr label="Location" value={d.location || null} />
                <Attr label="Type" value={d.propertyTypeLabel} />
                <Attr label="Approach" value={d.attributes.approachRoad} />
                <Attr label="Facing" value={d.attributes.facing} />
                <Attr
                  label="Approval"
                  value={d.attributes.approvalStatus ? d.attributes.approvalStatus.replace(/_/g, " ") : null}
                  suffix={d.attributes.approvalStatus ? (d.attributes.approvalVerified ? "✓ verified" : "unverified") : undefined}
                  suffixTone={d.attributes.approvalVerified ? "good" : "warn"}
                />
                <Attr label="Ownership" value={d.attributes.ownershipType} />
                <Attr label="Plots" value={d.attributes.plotsAvailable} />
                {d.corridor && <Attr label="Corridor" value={`${d.corridor.name}${d.corridor.score != null ? ` · score ${d.corridor.score}` : ""}`} />}
              </div>

              <div style={{ padding: "14px 16px 16px", borderTop: `1px solid ${T.line}` }}>
                {d.accessibility ? (
                  <AccessibilityPanel a={d.accessibility} onShowNearby={onShowNearby} dark
                    onPickNearest={f3 ? f3.pickNearest : undefined} activeNearest={f3?.activeKind ?? null} pickable={f3?.mappedKinds ?? []} />
                ) : (
                  <div style={{ fontSize: "0.75rem", color: T.textLo }}>Accessibility hasn&rsquo;t been scored for this location yet.</div>
                )}
              </div>
            </div>

            <div style={{ padding: "10px 16px 14px", flexShrink: 0, borderTop: `1px solid ${T.line}` }}>
              <button onClick={() => setEnquiry(true)} className="uv-btn uv-btn-primary" style={{ width: "100%", justifyContent: "center", fontSize: "0.875rem", padding: "11px" }}>
                Contact Agent
              </button>
            </div>
          </>
        )}
      </div>

      {enquiry && d && <EnquiryModal projectId={d.id} projectName={d.name} onClose={() => setEnquiry(false)} />}
    </>
  );
}

function Arrow({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label={side === "left" ? "Previous image" : "Next image"} style={{
      position: "absolute", top: "50%", transform: "translateY(-50%)", [side]: 8,
      width: 28, height: 28, borderRadius: 999, border: "none", cursor: "pointer",
      background: "rgba(13,13,18,.75)", display: "grid", placeItems: "center", color: "#F2F2F6",
    } as React.CSSProperties}>
      {side === "left" ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
    </button>
  );
}

function Action({ icon, label, onClick, active, disabled }: { icon: React.ReactNode; label: string; onClick: () => void; active?: boolean; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none",
      cursor: disabled ? "not-allowed" : "pointer", color: active ? T.saffronText : disabled ? T.textFaint : T.textMid,
      fontSize: "0.625rem", fontWeight: 600, padding: "2px 8px",
    }}>
      {icon}{label}
    </button>
  );
}

function Attr({ label, value, suffix, suffixTone }: { label: string; value: string | null; suffix?: string; suffixTone?: "good" | "warn" }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", gap: 10, fontSize: "0.75rem" }}>
      <span style={{ width: 78, color: T.textLo, flexShrink: 0 }}>{label}</span>
      <span style={{ flex: 1, color: T.text }}>
        {value}
        {suffix && <span style={{ marginLeft: 6, color: suffixTone === "good" ? T.good : T.saffronText, fontWeight: 600 }}>{suffix}</span>}
      </span>
    </div>
  );
}
