import React from "react";
import { HEAT, type HeatRating } from "./enums";

interface HeatPillProps {
  rating: HeatRating;
  /** Optional score (0-100) rendered in mono to the right of the label. */
  score?: number;
  size?: "sm" | "md";
  className?: string;
}

/** Filled heat badge — the signature corridor indicator. Text-on-saffron/alert is AA-safe. */
export default function HeatPill({ rating, score, size = "md", className = "" }: HeatPillProps) {
  const tone = HEAT[rating] ?? HEAT.WARM;
  const pad = size === "sm" ? "3px 8px" : "4px 11px";
  const fs = size === "sm" ? "0.625rem" : "0.6875rem";
  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        background: tone.bg,
        color: tone.fg,
        padding: pad,
        borderRadius: 999,
        fontSize: fs,
        fontWeight: 700,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        lineHeight: 1.1,
        whiteSpace: "nowrap",
      }}
    >
      {tone.emoji && <span aria-hidden>{tone.emoji}</span>}
      {tone.label}
      {score != null && (
        <span style={{ fontFamily: "var(--font-mono)", opacity: 0.9 }}>· {score}</span>
      )}
    </span>
  );
}
