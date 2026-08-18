import React from "react";
import { formatINR, formatPerUnit, formatEMI, type AreaUnit } from "@/lib/format";

interface PriceTagProps {
  amount: number;                 // rupees
  mode?: "total" | "perUnit";     // total → compact ₹; perUnit → "₹27,000 / sq.yd"
  unit?: AreaUnit;                // required when mode === "perUnit"
  showEMI?: boolean;              // secondary EMI line computed from `amount`
  size?: "sm" | "md" | "lg";
  className?: string;
}

const NUM_SIZE = { sm: "1rem", md: "1.375rem", lg: "clamp(1.5rem, 2.5vw, 2.25rem)" };

/** Primary price display with optional per-unit rate and EMI secondary line. */
export default function PriceTag({ amount, mode = "total", unit = "sqyd", showEMI = false, size = "md", className = "" }: PriceTagProps) {
  const primary = mode === "perUnit" ? formatPerUnit(amount, unit) : formatINR(amount);
  return (
    <div className={className}>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontWeight: 600,
          fontSize: NUM_SIZE[size],
          color: "var(--color-text-hi)",
          lineHeight: 1.1,
        }}
      >
        {primary}
      </div>
      {showEMI && (
        <div style={{ fontSize: "0.75rem", color: "var(--color-text-lo)", marginTop: 2, fontFamily: "var(--font-mono)" }}>
          {formatEMI(amount)}
        </div>
      )}
    </div>
  );
}
