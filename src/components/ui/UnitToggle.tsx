"use client";

import React from "react";
import { AREA_UNITS, type AreaUnit } from "@/lib/format";

interface UnitToggleProps {
  units?: AreaUnit[];
  value: AreaUnit;
  onChange: (u: AreaUnit) => void;
  size?: "sm" | "md";
  className?: string;
}

/** Pill segmented control for switching land-area units (sq.yd ↔ sq.ft ↔ acre …). */
export default function UnitToggle({
  units = ["sqyd", "sqft", "acre", "guntha"],
  value,
  onChange,
  size = "md",
  className = "",
}: UnitToggleProps) {
  const pad = size === "sm" ? "5px 10px" : "7px 14px";
  const fs = size === "sm" ? "0.6875rem" : "0.75rem";
  return (
    <div
      role="group"
      aria-label="Area unit"
      className={className}
      style={{
        display: "inline-flex",
        gap: 3,
        padding: 3,
        background: "var(--color-navy-wash)",
        borderRadius: 999,
      }}
    >
      {units.map((u) => {
        const active = u === value;
        return (
          <button
            key={u}
            type="button"
            onClick={() => onChange(u)}
            aria-pressed={active}
            title={AREA_UNITS[u].full}
            style={{
              padding: pad,
              fontSize: fs,
              fontWeight: 600,
              borderRadius: 999,
              border: "none",
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "background 150ms ease, color 150ms ease",
              background: active ? "var(--color-saffron)" : "transparent",
              color: active ? "var(--color-ink)" : "var(--color-text-mid)",
            }}
          >
            {AREA_UNITS[u].label}
          </button>
        );
      })}
    </div>
  );
}
