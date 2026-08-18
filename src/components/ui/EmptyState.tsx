import React from "react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/** Friendly empty/zero-result state. */
export default function EmptyState({ icon, title, description, action, className = "" }: EmptyStateProps) {
  return (
    <div
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        padding: "3rem 1.5rem",
        border: "1px dashed var(--color-line)",
        borderRadius: "var(--radius-uv-card)",
        background: "var(--color-surface)",
      }}
    >
      {icon && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 56,
            height: 56,
            borderRadius: 999,
            background: "var(--color-saffron-wash)",
            color: "var(--color-saffron-deep)",
            marginBottom: 16,
          }}
        >
          {icon}
        </div>
      )}
      <h3 style={{ fontFamily: "var(--font-jakarta)", fontWeight: 700, fontSize: "1.125rem", color: "var(--color-text-hi)" }}>
        {title}
      </h3>
      {description && (
        <p style={{ marginTop: 6, maxWidth: 420, color: "var(--color-text-mid)", fontSize: "0.9375rem", lineHeight: 1.6 }}>
          {description}
        </p>
      )}
      {action && <div style={{ marginTop: 20 }}>{action}</div>}
    </div>
  );
}
