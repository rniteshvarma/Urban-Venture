import React from "react";

/**
 * The Property Tiger wordmark: the word "PROPERTY" (as text, inheriting the
 * surrounding font/size/colour) followed by the tiger logo image in place of
 * the word "TIGER". The logo height is tied to the text via `em`, so it scales
 * with whatever font-size the parent sets — one component, correct everywhere.
 *
 * The image lives at /public/tiger-logo.png (transparent PNG, ~286×256).
 */
export default function Wordmark({
  className = "",
  style,
  /** logo height relative to the wordmark's font-size — matched to the cap height of the word */
  logoHeight = "1.2em",
  /** the leading word; kept a prop so callers can pass "Property" vs "PROPERTY" */
  word = "PROPERTY",
  gap = "0.32em",
}: {
  className?: string;
  style?: React.CSSProperties;
  logoHeight?: string;
  word?: string;
  gap?: string;
}) {
  return (
    <span className={className} style={{ display: "inline-flex", alignItems: "center", whiteSpace: "nowrap", lineHeight: 1, ...style }}>
      {word}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/tiger-logo.png"
        alt="Property Tiger"
        style={{ height: logoHeight, width: "auto", marginLeft: gap, display: "block", flexShrink: 0 }}
      />
    </span>
  );
}
