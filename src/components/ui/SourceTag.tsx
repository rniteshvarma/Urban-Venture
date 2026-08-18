import React from "react";

interface SourceTagProps {
  children: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}

/** Data provenance line — mono 11px, muted. e.g. <SourceTag>Knight Frank · Dec 2025</SourceTag> */
export default function SourceTag({ children, align = "left", className = "" }: SourceTagProps) {
  return (
    <p
      className={className}
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "0.6875rem",
        color: "var(--color-text-lo)",
        textAlign: align,
        letterSpacing: "0.01em",
      }}
    >
      Source: {children}
    </p>
  );
}
