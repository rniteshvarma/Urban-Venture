import React from "react";
import { ShieldCheck } from "lucide-react";

type Authority = "RERA" | "HMDA" | "DTCP";

interface VerifiedBadgeProps {
  type: Authority;
  className?: string;
}

/** Green verified pill for approval authorities. */
export default function VerifiedBadge({ type, className = "" }: VerifiedBadgeProps) {
  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        background: "var(--color-growth-wash)",
        color: "var(--color-growth)",
        padding: "3px 9px",
        borderRadius: 999,
        fontSize: "0.6875rem",
        fontWeight: 700,
        letterSpacing: "0.03em",
        whiteSpace: "nowrap",
      }}
    >
      <ShieldCheck size={12} strokeWidth={2.5} />
      {type} ✓
    </span>
  );
}
