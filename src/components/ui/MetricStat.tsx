"use client";

import React from "react";
import { useCountUp } from "./hooks";

interface MetricStatProps {
  /** Numeric value to count up to. Formatting is applied via `format`. */
  value: number;
  /** Formatter for the counted value; defaults to Indian grouping. */
  format?: (n: number) => string;
  prefix?: string;
  suffix?: string;
  label: string;
  sub?: string;
  /** Render on a dark band (Live Market Pulse) vs light. */
  theme?: "dark" | "light";
  /** Disable count-up (e.g. non-numeric display). */
  animate?: boolean;
  className?: string;
}

/** Big mono metric with scroll-triggered count-up. Used in the Live Market Pulse band. */
export default function MetricStat({
  value,
  format = (n) => Math.round(n).toLocaleString("en-IN"),
  prefix = "",
  suffix = "",
  label,
  sub,
  theme = "dark",
  animate = true,
  className = "",
}: MetricStatProps) {
  const [ref, current] = useCountUp(value);
  const shown = animate ? current : value;
  const numColor = "var(--color-saffron)";
  const labelColor = theme === "dark" ? "var(--color-text-invert-mid)" : "var(--color-text-mid)";
  const subColor = theme === "dark" ? "var(--color-text-invert-mid)" : "var(--color-text-lo)";

  return (
    <div ref={ref as React.RefObject<HTMLDivElement>} className={className} style={{ textAlign: "center" }}>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontWeight: 600,
          fontSize: "clamp(1.5rem, 2.5vw, 2.25rem)",
          color: numColor,
          lineHeight: 1.05,
          whiteSpace: "nowrap",
        }}
      >
        {prefix}
        {format(shown)}
        {suffix}
      </div>
      <div
        style={{
          marginTop: 8,
          fontSize: "0.6875rem",
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: labelColor,
        }}
      >
        {label}
      </div>
      {sub && <div style={{ marginTop: 3, fontSize: "0.6875rem", color: subColor }}>{sub}</div>}
    </div>
  );
}
