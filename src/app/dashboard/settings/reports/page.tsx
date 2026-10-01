"use client";

/**
 * /dashboard/settings/reports — the weekly land report's preferences
 * (areas, budget, property types, frequency/pause, channels, delivery time).
 * Linked from every report ("Edit preferences", "Change frequency", "Pause").
 * Saves through PUT /api/reports/preferences.
 */
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Loader2, Mail, MessageCircle } from "lucide-react";
import { Wordmark } from "@/components/ui";
import { toast } from "@/lib/toast";

interface Corridor {
  corridor: string;
  name: string;
  shortName?: string | null;
}

interface Pref {
  budgetMinLakh: number | null;
  budgetMaxLakh: number | null;
  areaSlugs: string[];
  propertyTypes: string[];
  frequency: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "PAUSED";
  channelEmail: boolean;
  channelWhatsApp: boolean;
  preferredDay: number;
  preferredHour: number;
  unsubscribedAt?: string | null;
}

const TYPES: [string, string][] = [
  ["PLOT", "Plots"],
  ["FARM_PLOT", "Farm plots"],
  ["AGRICULTURAL_LAND", "Agricultural land"],
  ["APARTMENT", "Apartments"],
  ["VILLA", "Villas"],
  ["INDEPENDENT_HOUSE", "Independent houses"],
  ["COMMERCIAL", "Commercial"],
  ["INDUSTRIAL_LAND", "Industrial land"],
];
const FREQUENCIES: [Pref["frequency"], string, string][] = [
  ["WEEKLY", "Weekly", "Every week"],
  ["FORTNIGHTLY", "Fortnightly", "Every two weeks"],
  ["MONTHLY", "Monthly", "Once a month"],
  ["PAUSED", "Paused", "No reports for now"],
];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MAX_AREAS = 5;

const DEFAULTS: Pref = {
  budgetMinLakh: null,
  budgetMaxLakh: null,
  areaSlugs: [],
  propertyTypes: [],
  frequency: "WEEKLY",
  channelEmail: true,
  channelWhatsApp: true,
  preferredDay: 6,
  preferredHour: 9,
};

const card: React.CSSProperties = { background: "var(--color-surface)", border: "1px solid var(--color-line)", borderRadius: 16, padding: "1.25rem 1.25rem 1.4rem" };
const label: React.CSSProperties = { fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--color-text-lo)" };

function Pill({ on, children, onClick, disabled }: { on: boolean; children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={on}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        minHeight: 36,
        padding: "7px 14px",
        borderRadius: 999,
        border: `1px solid ${on ? "var(--color-saffron)" : "var(--color-line)"}`,
        background: on ? "var(--color-saffron-wash)" : "var(--color-surface)",
        color: on ? "var(--color-text-hi)" : "var(--color-text-mid)",
        fontSize: "0.8125rem",
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {on && <Check size={14} />}
      {children}
    </button>
  );
}

export default function ReportSettingsPage() {
  const [pref, setPref] = useState<Pref>(DEFAULTS);
  const [corridors, setCorridors] = useState<Corridor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [unsubscribed, setUnsubscribed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/reports/preferences").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/market/corridors").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([p, c]) => {
        if (cancelled) return;
        const saved = p?.preference as Pref | null;
        if (saved) {
          setPref({ ...DEFAULTS, ...saved });
          setUnsubscribed(!!saved.unsubscribedAt);
        } else if (p?.prefill) {
          setPref((d) => ({ ...d, budgetMaxLakh: p.prefill.budgetMaxLakh ?? null }));
        }
        setCorridors(Array.isArray(c) ? c : []);
      })
      .catch(() => toast.error("Couldn't load your report settings."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const set = <K extends keyof Pref>(k: K, v: Pref[K]) => setPref((p) => ({ ...p, [k]: v }));
  const toggle = (k: "areaSlugs" | "propertyTypes", v: string) =>
    setPref((p) => ({ ...p, [k]: p[k].includes(v) ? p[k].filter((x) => x !== v) : [...p[k], v] }));

  async function save() {
    if (pref.frequency !== "PAUSED" && pref.areaSlugs.length === 0) {
      toast.error("Pick at least one area to watch, or pause the report.");
      return;
    }
    if (pref.frequency !== "PAUSED" && !pref.channelEmail && !pref.channelWhatsApp) {
      toast.error("Choose email or WhatsApp — or pause the report.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/reports/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...pref, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Save failed");
      setUnsubscribed(!!body.preference?.unsubscribedAt);
      toast.success(pref.frequency === "PAUSED" ? "Report paused. You can resume it any time." : "Report settings saved.");
    } catch (e) {
      toast.error(e instanceof Error ? `Couldn't save: ${e.message}` : "Couldn't save your settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-paper)" }}>
      <header style={{ background: "var(--color-ink)", padding: "0 1.25rem", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ fontFamily: "var(--font-jakarta)", fontWeight: 800, color: "#fff", textDecoration: "none", fontSize: "1.05rem" }}>
          <Wordmark />
        </Link>
        <Link href="/dashboard" style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.8125rem", display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
          <ArrowLeft size={15} /> Dashboard
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6" style={{ paddingTop: "2rem", paddingBottom: "4rem", display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-jakarta)", fontWeight: 800, fontSize: "1.75rem", color: "var(--color-text-hi)", margin: 0 }}>Weekly land report</h1>
          <p style={{ color: "var(--color-text-mid)", marginTop: 6 }}>Choose what the report watches and how often it reaches you.</p>
        </div>

        {unsubscribed && (
          <div style={{ ...card, background: "var(--color-saffron-wash)", borderColor: "var(--color-saffron)" }}>
            <strong>You&rsquo;re currently unsubscribed.</strong> Pick a frequency below and save to start receiving the report again.
          </div>
        )}

        {loading ? (
          <div className="uv-skeleton" style={{ height: 420, borderRadius: 16 }} />
        ) : (
          <>
            <section style={card} id="frequency">
              <div style={label}>How often</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginTop: 12 }}>
                {FREQUENCIES.map(([v, title, sub]) => {
                  const on = pref.frequency === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => set("frequency", v)}
                      aria-pressed={on}
                      style={{ textAlign: "left", padding: "12px 14px", borderRadius: 12, cursor: "pointer", border: `1.5px solid ${on ? "var(--color-saffron)" : "var(--color-line)"}`, background: on ? "var(--color-saffron-wash)" : "var(--color-surface)" }}
                    >
                      <div style={{ fontWeight: 700, color: "var(--color-text-hi)", fontSize: "0.9375rem" }}>{title}</div>
                      <div style={{ color: "var(--color-text-lo)", fontSize: "0.8125rem", marginTop: 2 }}>{sub}</div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                <div style={label}>Areas to watch</div>
                <span style={{ fontSize: "0.75rem", color: "var(--color-text-lo)" }}>{pref.areaSlugs.length}/{MAX_AREAS}</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                {corridors.map((c) => {
                  const on = pref.areaSlugs.includes(c.corridor);
                  return (
                    <Pill key={c.corridor} on={on} disabled={!on && pref.areaSlugs.length >= MAX_AREAS} onClick={() => toggle("areaSlugs", c.corridor)}>
                      {c.shortName || c.name}
                    </Pill>
                  );
                })}
              </div>
            </section>

            <section style={card}>
              <div style={label}>Budget (₹ Lakh)</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
                {(["budgetMinLakh", "budgetMaxLakh"] as const).map((k) => (
                  <label key={k} style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: "0.8125rem", color: "var(--color-text-mid)" }}>
                    {k === "budgetMinLakh" ? "From" : "Up to"}
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={5}
                      value={pref[k] ?? ""}
                      placeholder={k === "budgetMinLakh" ? "e.g. 20" : "e.g. 80"}
                      onChange={(e) => set(k, e.target.value === "" ? null : Number(e.target.value))}
                      className="input-premium"
                      style={{ padding: "10px 12px" }}
                    />
                  </label>
                ))}
              </div>
            </section>

            <section style={card}>
              <div style={label}>Property types</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                {TYPES.map(([v, t]) => (
                  <Pill key={v} on={pref.propertyTypes.includes(v)} onClick={() => toggle("propertyTypes", v)}>
                    {t}
                  </Pill>
                ))}
              </div>
              <p style={{ fontSize: "0.75rem", color: "var(--color-text-lo)", marginTop: 10 }}>Leave all unselected to include every type.</p>
            </section>

            <section style={card}>
              <div style={label}>Where and when</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                <Pill on={pref.channelEmail} onClick={() => set("channelEmail", !pref.channelEmail)}>
                  <Mail size={14} /> Email
                </Pill>
                <Pill on={pref.channelWhatsApp} onClick={() => set("channelWhatsApp", !pref.channelWhatsApp)}>
                  <MessageCircle size={14} /> WhatsApp
                </Pill>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: "0.8125rem", color: "var(--color-text-mid)" }}>
                  Day
                  <select value={pref.preferredDay} onChange={(e) => set("preferredDay", Number(e.target.value))} className="input-premium" style={{ padding: "10px 12px" }}>
                    {DAYS.map((d, i) => (
                      <option key={d} value={i}>{d}</option>
                    ))}
                  </select>
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: "0.8125rem", color: "var(--color-text-mid)" }}>
                  Time
                  <select value={pref.preferredHour} onChange={(e) => set("preferredHour", Number(e.target.value))} className="input-premium" style={{ padding: "10px 12px" }}>
                    {Array.from({ length: 24 }, (_, h) => (
                      <option key={h} value={h}>{`${((h + 11) % 12) + 1}:00 ${h < 12 ? "AM" : "PM"}`}</option>
                    ))}
                  </select>
                </label>
              </div>
            </section>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
              <Link href="/dashboard" className="uv-btn uv-btn-ghost" style={{ padding: "11px 20px" }}>Cancel</Link>
              <button type="button" onClick={save} disabled={saving} className="uv-btn uv-btn-primary" style={{ padding: "11px 22px" }}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Save settings
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
