import React from "react";

type ChipVariant = "navy" | "saffron" | "growth" | "alert" | "caution" | "ghost";

interface InfoChipProps {
  variant?: ChipVariant;
  children: React.ReactNode;
  className?: string;
  title?: string;
}

/** Small uppercase metadata chip. e.g. <InfoChip variant="navy">HMDA ✓</InfoChip> */
export default function InfoChip({ variant = "navy", children, className = "", title }: InfoChipProps) {
  return (
    <span className={`uv-chip uv-chip-${variant} ${className}`} title={title}>
      {children}
    </span>
  );
}
