import React from "react";

interface SectionHeaderProps {
  eyebrow?: string;              // Instrument Serif italic accent, e.g. "Not a listing site."
  title: string;
  subtitle?: string;
  action?: React.ReactNode;      // right-aligned link/button
  className?: string;
}

/** Standard section heading: editorial eyebrow + display H2 + optional right-aligned action. */
export default function SectionHeader({ eyebrow, title, subtitle, action, className = "" }: SectionHeaderProps) {
  return (
    <div
      className={className}
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: "1.5rem",
        flexWrap: "wrap",
        marginBottom: "1.75rem",
      }}
    >
      <div style={{ maxWidth: 640 }}>
        {eyebrow && <div className="uv-eyebrow" style={{ marginBottom: 6 }}>{eyebrow}</div>}
        <h2 className="uv-h2">{title}</h2>
        {subtitle && (
          <p style={{ marginTop: 8, color: "var(--color-text-mid)", fontSize: "0.9375rem", lineHeight: 1.6 }}>
            {subtitle}
          </p>
        )}
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  );
}
