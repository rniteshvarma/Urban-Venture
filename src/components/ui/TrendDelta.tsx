import React from "react";
import { formatPct, trendDirection, type TrendDir } from "@/lib/format";

interface TrendDeltaProps {
  value: number;                 // percentage, e.g. 18.4 or -2.1
  direction?: TrendDir;          // optional override; inferred from sign otherwise
  since?: string;                // e.g. "2020" → appends "since 2020"
  showSign?: boolean;            // "+340%" style
  size?: "sm" | "md";
  className?: string;
}

/** Directional percentage. Green ▲ for up, red ▼ for down. Mono figure. */
export default function TrendDelta({ value, direction, since, showSign = true, size = "md", className = "" }: TrendDeltaProps) {
  const dir = direction ?? trendDirection(value);
  const color =
    dir === "up" ? "var(--color-growth)" : dir === "down" ? "var(--color-alert)" : "var(--color-text-mid)";
  const fs = size === "sm" ? "0.75rem" : "0.875rem";
  return (
    <span className={className} style={{ display: "inline-flex", alignItems: "baseline", gap: 5, color }}>
      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: fs }}>
        {formatPct(value, { sign: showSign })}
      </span>
      {since && <span style={{ fontSize: "0.6875rem", color: "var(--color-text-lo)", fontWeight: 500 }}>since {since}</span>}
    </span>
  );
}
