import React from "react";
import { scoreColor } from "./enums";

interface ScoreRingProps {
  value: number;              // 0-100
  size?: "sm" | "md" | "lg";
  /** Small caption under the number, e.g. "/100". */
  caption?: string;
  /** Override the ring colour; defaults to the score→heat mapping. */
  color?: string;
  className?: string;
}

const DIMS = {
  sm: { box: 56, stroke: 5, num: "0.95rem", cap: "0.5rem" },
  md: { box: 84, stroke: 7, num: "1.5rem", cap: "0.6rem" },
  lg: { box: 132, stroke: 10, num: "2.5rem", cap: "0.7rem" },
};

/** Radial progress ring for corridor / intelligence scores. Static SVG (server-safe). */
export default function ScoreRing({ value, size = "md", caption = "/100", color, className = "" }: ScoreRingProps) {
  const d = DIMS[size];
  const clamped = Math.max(0, Math.min(100, value));
  const r = (d.box - d.stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (clamped / 100) * c;
  const ring = color ?? scoreColor(clamped);

  return (
    <div
      className={className}
      style={{ position: "relative", width: d.box, height: d.box, flexShrink: 0 }}
      role="img"
      aria-label={`Score ${clamped} out of 100`}
    >
      <svg width={d.box} height={d.box} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={d.box / 2} cy={d.box / 2} r={r} fill="none" stroke="var(--color-line)" strokeWidth={d.stroke} />
        <circle
          cx={d.box / 2}
          cy={d.box / 2}
          r={r}
          fill="none"
          stroke={ring}
          strokeWidth={d.stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-mono)",
        }}
      >
        <span style={{ fontSize: d.num, fontWeight: 600, color: "var(--color-text-hi)", lineHeight: 1 }}>
          {Math.round(clamped)}
        </span>
        {caption && <span style={{ fontSize: d.cap, color: "var(--color-text-lo)", marginTop: 2 }}>{caption}</span>}
      </div>
    </div>
  );
}
