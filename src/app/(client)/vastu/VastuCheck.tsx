"use client";

/**
 * Vastu check. Two ways in: upload a floor plan (read by AI when it's
 * switched on — the buyer still confirms every room) or mark the rooms on a
 * compass grid by hand. The report is built in the browser from
 * src/lib/vastu/rules.ts.
 */
import React, { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Circle, Compass, Info, Upload, X } from "lucide-react";
import {
  MULTI, ROOM_LABEL, ZONE_NAME, cellZone, sideDirections, vastuReport,
  type Dir8, type Placement, type RoomType, type Side, type Zone,
} from "@/lib/vastu/rules";
import type { PlanReadResult } from "@/lib/vastu/read-plan";

const ROOM_TYPES = Object.keys(ROOM_LABEL) as RoomType[];
const DIRS: Dir8[] = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
// The grid is always drawn north-up.
const GRID: Zone[][] = [["NW", "N", "NE"], ["W", "C", "E"], ["SW", "S", "SE"]];

const VERDICT = {
  follows: { label: "Follows", fg: "#0B6B3A", bg: "#E3F4EA", Icon: CheckCircle2 },
  acceptable: { label: "Fits", fg: "#1F4E8C", bg: "#E5EEFA", Icon: Circle },
  attention: { label: "Worth a look", fg: "#8A4B00", bg: "#FDEBD3", Icon: AlertTriangle },
  neutral: { label: "No strong rule", fg: "#5A5A66", bg: "#F1F1F4", Icon: Circle },
} as const;

export default function VastuCheck({ aiEnabled, initialFacing = null }: { aiEnabled: boolean; initialFacing?: Dir8 | null }) {
  const [facing, setFacing] = useState<Dir8 | null>(initialFacing);
  const [rooms, setRooms] = useState<Placement[]>([]);
  const [active, setActive] = useState<RoomType>("kitchen");
  const [reading, setReading] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);
  const [read, setRead] = useState<PlanReadResult | null>(null);
  const [northSide, setNorthSide] = useState<Side | null>(null);

  const report = useMemo(() => vastuReport(facing, rooms), [facing, rooms]);

  const place = (zone: Zone) => {
    setRooms((prev) => {
      // Single rooms move; rooms that can repeat (bedrooms, toilets, balconies) add another.
      if (!MULTI.includes(active)) return [...prev.filter((r) => r.type !== active), { type: active, zone }];
      return [...prev, { type: active, zone }];
    });
  };
  const removeAt = (i: number) => setRooms((prev) => prev.filter((_, j) => j !== i));

  // Apply an AI reading once we know which side of the drawing north is on.
  const applyRead = (plan: PlanReadResult, north: Side) => {
    setRooms(plan.rooms.map((r) => ({ type: r.type, zone: cellZone(r.row, r.col, north) })));
    if (plan.entranceSide) setFacing(sideDirections(north)[plan.entranceSide]);
  };

  const upload = async (file: File) => {
    setReading(true);
    setReadError(null);
    setRead(null);
    try {
      const body = new FormData();
      body.append("plan", file);
      const res = await fetch("/api/vastu/read", { method: "POST", body });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "We couldn't read this plan.");
      const plan = d.plan as PlanReadResult;
      if (!plan.isFloorPlan) throw new Error("That doesn't look like a floor plan. Try another file, or mark the rooms yourself.");
      setRead(plan);
      if (plan.northSide) {
        setNorthSide(plan.northSide);
        applyRead(plan, plan.northSide);
      } else {
        setNorthSide(null);
      }
    } catch (e) {
      setReadError(e instanceof Error ? e.message : "We couldn't read this plan.");
    } finally {
      setReading(false);
    }
  };

  const chip = (on: boolean) => ({
    cursor: "pointer", border: "1px solid var(--color-line)",
    background: on ? "var(--color-saffron)" : "var(--color-surface)", color: on ? "var(--color-ink)" : "var(--color-text-mid)",
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-6 space-y-6">
        {aiEnabled && (
          <section className="card-premium !p-6 space-y-3" aria-labelledby="upload-h">
            <h2 id="upload-h" className="text-sm font-bold text-text-primary flex items-center gap-2"><Upload size={16} /> Upload your floor plan</h2>
            <p className="text-xs text-text-secondary">A PNG, JPG or PDF up to 5 MB — the builder&apos;s brochure page works. We read the rooms for you to check; you can correct anything.</p>
            <label className="uv-btn uv-btn-primary cursor-pointer inline-flex" style={{ fontSize: "0.8125rem" }}>
              {reading ? "Reading the plan…" : "Choose a file"}
              <input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" className="sr-only" disabled={reading}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
            </label>
            {readError && <p className="text-xs font-semibold text-alert" role="alert">{readError}</p>}
            {read && (
              <div className="space-y-3 text-xs">
                {read.readQuality === "poor" && (
                  <p className="rounded-lg p-3" style={{ background: "#FDEBD3", color: "#8A4B00" }} role="status">
                    <strong>Hard to read.</strong> {read.qualityNote || "The scan made this plan hard to read."} A sharper scan, or a PDF from the builder, usually helps. Check the rooms below carefully.
                  </p>
                )}
                {!read.northSide && (
                  <div className="space-y-2" role="group" aria-label="Which side of the plan is north">
                    <p className="font-semibold text-text-primary">The plan has no north arrow. Which side of the drawing faces north?</p>
                    <div className="flex flex-wrap gap-2">
                      {(["top", "right", "bottom", "left"] as Side[]).map((s) => (
                        <button key={s} type="button" className="uv-chip" style={chip(northSide === s)} aria-pressed={northSide === s}
                          onClick={() => { setNorthSide(s); applyRead(read, s); }}>
                          {s[0].toUpperCase() + s.slice(1)} of the page
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {northSide && <p className="text-text-secondary">We placed {read.rooms.length} room{read.rooms.length === 1 ? "" : "s"}. Check them on the grid below and fix anything that&apos;s off.</p>}
              </div>
            )}
            <p className="text-[10px] text-text-secondary">Your plan is sent to Anthropic, our AI provider, only to read the rooms. We don&apos;t keep it. <Link href="/legal/privacy" className="underline">Privacy</Link></p>
          </section>
        )}

        <section className="card-premium !p-6 space-y-3" aria-labelledby="door-h">
          <h2 id="door-h" className="text-sm font-bold text-text-primary flex items-center gap-2"><Compass size={16} /> Which way does the main door face?</h2>
          <p className="text-xs text-text-secondary">Stand inside at the main door and look out. That&apos;s the direction it faces — the way the home is usually described (&ldquo;East-facing&rdquo;).</p>
          <div className="flex flex-wrap gap-2">
            {DIRS.map((d) => (
              <button key={d} type="button" className="uv-chip" style={chip(facing === d)} aria-pressed={facing === d} onClick={() => setFacing(d)}>{ZONE_NAME[d]}</button>
            ))}
          </div>
        </section>

        <section className="card-premium !p-6 space-y-4" aria-labelledby="rooms-h">
          <h2 id="rooms-h" className="text-sm font-bold text-text-primary">Where is each room?</h2>
          <p className="text-xs text-text-secondary">Pick a room, then tap where it sits in the home. North is at the top. Tap a room in the list to remove it.</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Room to place">
            {ROOM_TYPES.map((t) => (
              <button key={t} type="button" className="uv-chip" style={chip(active === t)} aria-pressed={active === t} onClick={() => setActive(t)}>{ROOM_LABEL[t]}</button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-1.5 max-w-sm mx-auto" role="grid" aria-label="Home divided into nine zones, north at the top">
            {GRID.flat().map((z) => {
              const here = rooms.filter((r) => r.zone === z);
              return (
                <button key={z} type="button" onClick={() => place(z)} className="rounded-lg text-left p-2 min-h-[84px] transition-colors"
                  style={{ border: "1px solid var(--color-line)", background: z === "C" ? "#FAF5EA" : "var(--color-surface)" }}
                  aria-label={`Place ${ROOM_LABEL[active]} in the ${ZONE_NAME[z]}`}>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary">{z === "C" ? "Centre" : ZONE_NAME[z]}</span>
                  {here.map((r, i) => <span key={i} className="block text-[11px] font-semibold text-text-primary leading-tight mt-0.5">{ROOM_LABEL[r.type]}</span>)}
                </button>
              );
            })}
          </div>
          {rooms.length > 0 && (
            <ul className="flex flex-wrap gap-2" aria-label="Rooms placed">
              {rooms.map((r, i) => (
                <li key={i}>
                  <button type="button" onClick={() => removeAt(i)} className="uv-chip inline-flex items-center gap-1" style={chip(false)} aria-label={`Remove ${ROOM_LABEL[r.type]} in the ${ZONE_NAME[r.zone]}`}>
                    {ROOM_LABEL[r.type]} · {r.zone === "C" ? "Centre" : r.zone} <X size={12} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="lg:col-span-6 card-premium !p-6 space-y-4 self-start lg:sticky lg:top-24" aria-labelledby="report-h" aria-live="polite">
        <div className="flex items-start justify-between gap-3">
          <h2 id="report-h" className="text-lg font-bold text-text-primary">Your Vastu report</h2>
          <span className="text-[10px] font-bold rounded-full px-2.5 py-1" style={{ background: "#E3F4EA", color: "#0B6B3A" }}>Free</span>
        </div>
        <p className="text-sm text-text-primary">{report.summary}</p>
        {(report.entrance || report.findings.length > 0) && (
          <div className="flex gap-3 text-xs">
            <span style={{ color: VERDICT.follows.fg }}><strong>{report.follows}</strong> follow</span>
            <span style={{ color: VERDICT.acceptable.fg }}><strong>{report.acceptable}</strong> fit</span>
            <span style={{ color: VERDICT.attention.fg }}><strong>{report.attention}</strong> worth a look</span>
          </div>
        )}
        <ul className="space-y-2.5">
          {[...(report.entrance ? [report.entrance] : []), ...report.findings].map((f, i) => {
            const v = VERDICT[f.verdict];
            return (
              <li key={i} className="rounded-lg p-3" style={{ background: v.bg }}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-text-primary">{f.label}</span>
                  <span className="text-[10px] font-bold inline-flex items-center gap-1" style={{ color: v.fg }}><v.Icon size={12} /> {v.label}</span>
                </div>
                <p className="text-xs mt-1" style={{ color: "#33333D" }}>{f.text}</p>
              </li>
            );
          })}
        </ul>
        <p className="text-[11px] text-text-secondary flex gap-1.5">
          <Info size={12} className="shrink-0 mt-0.5" />
          <span>Vastu is a traditional practice. This report compares the plan with the placements most commonly recommended for Indian homes; practitioners differ, and it says nothing about a home&apos;s structure, legality or value. For remedies, consult a Vastu practitioner.</span>
        </p>
        <Link href="/buying-help" className="uv-btn uv-btn-primary w-full justify-center" style={{ fontSize: "0.8125rem" }}>Talk to our team about this home</Link>
      </section>
    </div>
  );
}
