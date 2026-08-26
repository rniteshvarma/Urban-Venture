"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import * as Slider from "@radix-ui/react-slider";
import { Bot, Building2, BarChart3, Calculator, ArrowRight, ChevronDown } from "lucide-react";
import { formatLakh } from "@/lib/format";

type TabKey = "ai" | "projects" | "corridor" | "calc";

interface CorridorOption {
  slug: string;
  name: string;
}

interface SearchCommandBarProps {
  /** Live corridor list for the Corridor Data + Calculate tabs. */
  corridors?: CorridorOption[];
  /** Quick chips under the controls. */
  quickChips?: { label: string; href: string }[];
  className?: string;
}

const TABS: { key: TabKey; label: string; icon: React.ComponentType<{ size?: number }>; badge?: string }[] = [
  { key: "ai", label: "AI Research", icon: Bot, badge: "NEW" },
  { key: "projects", label: "Projects", icon: Building2 },
  { key: "corridor", label: "Corridor Data", icon: BarChart3 },
  { key: "calc", label: "Calculate", icon: Calculator, badge: "FREE" },
];

const BUDGET_PRESETS = [10, 25, 50, 100, 200]; // in Lakh
const HORIZONS = [3, 5, 7, 10];

/** Lightweight click-outside popover. */
function Popover({ label, value, children }: { label: string; value: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: 2,
          padding: "9px 14px",
          background: "var(--color-surface)",
          border: "1px solid var(--color-line)",
          borderRadius: 12,
          cursor: "pointer",
          minWidth: 130,
        }}
      >
        <span style={{ fontSize: "0.625rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-text-lo)", fontWeight: 600 }}>
          {label}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text-hi)" }}>
          {value} <ChevronDown size={14} />
        </span>
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            zIndex: 30,
            minWidth: 260,
            background: "var(--color-surface)",
            border: "1px solid var(--color-line)",
            borderRadius: 14,
            boxShadow: "var(--uv-sh-lift)",
            padding: "1rem",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export default function SearchCommandBar({ corridors = [], quickChips = [], className = "" }: SearchCommandBarProps) {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("ai");

  // AI Research state
  const [budget, setBudget] = useState(25); // Lakh
  const [horizon, setHorizon] = useState(5);
  const [city, setCity] = useState("Hyderabad");

  // Other tabs
  const [location, setLocation] = useState("");
  const [propType, setPropType] = useState("");
  const [corridorSlug, setCorridorSlug] = useState(corridors[0]?.slug ?? "");
  const [calcAmount, setCalcAmount] = useState(25);

  const go = (path: string) => router.push(path);

  return (
    <div
      className={className}
      style={{
        background: "var(--color-surface)",
        borderRadius: "var(--radius-uv-lg)",
        boxShadow: "var(--uv-sh-lift)",
        border: "1px solid var(--color-line)",
        // NOTE: must stay `visible` so the Budget/Horizon/City popovers can
        // float outside the card instead of being clipped.
        overflow: "visible",
      }}
    >
      {/* Tab row */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--color-line)", overflowX: "auto", borderTopLeftRadius: "var(--radius-uv-lg)", borderTopRightRadius: "var(--radius-uv-lg)" }}>
        {TABS.map((t) => {
          const active = t.key === tab;
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              aria-selected={active}
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "14px 18px",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                whiteSpace: "nowrap",
                fontSize: "0.875rem",
                fontWeight: active ? 700 : 500,
                color: active ? "var(--color-text-hi)" : "var(--color-text-mid)",
                flexShrink: 0,
              }}
            >
              <Icon size={16} />
              {t.label}
              {t.badge && (
                <span
                  style={{
                    fontSize: "0.5625rem",
                    fontWeight: 700,
                    letterSpacing: "0.05em",
                    background: "var(--color-saffron-wash)",
                    color: "var(--color-saffron-deep)",
                    padding: "2px 5px",
                    borderRadius: 999,
                  }}
                >
                  {t.badge}
                </span>
              )}
              {active && (
                <span style={{ position: "absolute", left: 12, right: 12, bottom: -1, height: 3, background: "var(--color-saffron)", borderRadius: 3 }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Panel */}
      <div style={{ padding: "1.15rem 1.25rem" }}>
        {tab === "ai" && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
            <Popover label="Budget" value={formatLakh(budget)}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                {BUDGET_PRESETS.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBudget(b)}
                    className="uv-chip"
                    style={{
                      cursor: "pointer",
                      background: budget === b ? "var(--color-saffron)" : "var(--color-navy-wash)",
                      color: budget === b ? "var(--color-ink)" : "var(--color-navy-ink)",
                      border: "none",
                    }}
                  >
                    {b >= 100 ? `₹${b / 100} Cr${b === 200 ? "+" : ""}` : `₹${b}L`}
                  </button>
                ))}
              </div>
              <Slider.Root
                min={5}
                max={500}
                step={5}
                value={[budget]}
                onValueChange={([v]) => setBudget(v)}
                style={{ position: "relative", display: "flex", alignItems: "center", height: 20, userSelect: "none" }}
              >
                <Slider.Track style={{ position: "relative", flexGrow: 1, height: 4, background: "var(--color-line)", borderRadius: 999 }}>
                  <Slider.Range style={{ position: "absolute", height: "100%", background: "var(--color-saffron)", borderRadius: 999 }} />
                </Slider.Track>
                <Slider.Thumb
                  aria-label="Budget"
                  style={{ display: "block", width: 18, height: 18, background: "#fff", border: "2px solid var(--color-saffron)", borderRadius: 999, boxShadow: "var(--uv-sh-1)" }}
                />
              </Slider.Root>
              <div style={{ marginTop: 8, fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "var(--color-text-hi)", textAlign: "center" }}>
                {formatLakh(budget)}
              </div>
            </Popover>

            <Popover label="Horizon" value={`${horizon} years`}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {HORIZONS.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setHorizon(h)}
                    className="uv-chip"
                    style={{
                      cursor: "pointer",
                      background: horizon === h ? "var(--color-saffron)" : "var(--color-navy-wash)",
                      color: horizon === h ? "var(--color-ink)" : "var(--color-navy-ink)",
                      border: "none",
                    }}
                  >
                    {h} yr
                  </button>
                ))}
              </div>
            </Popover>

            <Popover label="City" value={city}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {["Hyderabad"].map((ct) => (
                  <button
                    key={ct}
                    type="button"
                    onClick={() => setCity(ct)}
                    style={{
                      textAlign: "left",
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: "none",
                      cursor: "pointer",
                      background: city === ct ? "var(--color-saffron-wash)" : "transparent",
                      color: "var(--color-text-hi)",
                      fontWeight: city === ct ? 600 : 500,
                      fontSize: "0.875rem",
                    }}
                  >
                    {ct}
                  </button>
                ))}
              </div>
            </Popover>

            <button
              type="button"
              className="uv-btn uv-btn-primary"
              onClick={() => go(`/research?budget=${budget}&horizon=${horizon}&city=${encodeURIComponent(city)}`)}
              style={{ marginLeft: "auto" }}
            >
              Generate Free Report <ArrowRight size={16} />
            </button>
          </div>
        )}

        {tab === "projects" && (
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <input className="input-premium" placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} style={{ flex: 1, minWidth: 160 }} />
            <select className="input-premium" value={propType} onChange={(e) => setPropType(e.target.value)} style={{ minWidth: 150 }}>
              <option value="">All types</option>
              <option value="Plots">Plots</option>
              <option value="Apartment">Apartment</option>
              <option value="Villa">Villa</option>
            </select>
            <button
              type="button"
              className="uv-btn uv-btn-primary"
              onClick={() => {
                const params = new URLSearchParams();
                if (location) params.set("q", location);
                if (propType) params.set("type", propType);
                go(`/projects${params.toString() ? `?${params}` : ""}`);
              }}
            >
              Search <ArrowRight size={16} />
            </button>
          </div>
        )}

        {tab === "corridor" && (
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            {corridors.length > 0 ? (
              <select className="input-premium" value={corridorSlug} onChange={(e) => setCorridorSlug(e.target.value)} style={{ flex: 1, minWidth: 220 }}>
                {corridors.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            ) : (
              <input className="input-premium" placeholder="Corridor name" value={corridorSlug} onChange={(e) => setCorridorSlug(e.target.value)} style={{ flex: 1, minWidth: 220 }} />
            )}
            <button type="button" className="uv-btn uv-btn-primary" disabled={!corridorSlug} onClick={() => go(`/market/${corridorSlug}`)}>
              View Intelligence Report <ArrowRight size={16} />
            </button>
          </div>
        )}

        {tab === "calc" && (
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
            <Popover label="Amount" value={formatLakh(calcAmount)}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {BUDGET_PRESETS.map((b) => (
                  <button key={b} type="button" onClick={() => setCalcAmount(b)} className="uv-chip" style={{ cursor: "pointer", background: calcAmount === b ? "var(--color-saffron)" : "var(--color-navy-wash)", color: calcAmount === b ? "var(--color-ink)" : "var(--color-navy-ink)", border: "none" }}>
                    {b >= 100 ? `₹${b / 100} Cr` : `₹${b}L`}
                  </button>
                ))}
              </div>
            </Popover>
            {corridors.length > 0 && (
              <select className="input-premium" value={corridorSlug} onChange={(e) => setCorridorSlug(e.target.value)} style={{ minWidth: 180 }}>
                {corridors.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              className="uv-btn uv-btn-primary"
              onClick={() => go(`/calculator?amount=${calcAmount}${corridorSlug ? `&corridor=${corridorSlug}` : ""}`)}
              style={{ marginLeft: "auto" }}
            >
              Calculate Returns <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* Quick chips */}
        {quickChips.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--color-text-lo)", fontWeight: 600 }}>Popular:</span>
            {quickChips.map((c) => (
              <button key={c.href} type="button" onClick={() => go(c.href)} className="uv-chip uv-chip-ghost" style={{ cursor: "pointer" }}>
                {c.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
