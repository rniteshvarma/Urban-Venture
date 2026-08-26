import Link from "next/link";
import React from "react";
import { Check } from "lucide-react";
import { Wordmark } from "@/components/ui";

const BENEFITS = [
  "Save AI research reports and re-run them anytime",
  "Watch corridors and get alerted when prices move",
  "Track appreciation on properties you own",
];

/** Split-screen auth layout: dark ink value panel (desktop) + paper form panel. */
export default function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "var(--color-paper)" }}>
      {/* Left — dark value panel (desktop only) */}
      <div
        className="hidden lg:flex"
        style={{
          width: "45%",
          background: "var(--color-ink)",
          color: "#fff",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "3rem",
        }}
      >
        <Link href="/" className="text-xl font-extrabold" style={{ fontFamily: "var(--font-jakarta)", color: "#fff", textDecoration: "none" }}>
          <Wordmark />
        </Link>

        <div style={{ maxWidth: 420 }}>
          <h1 style={{ fontFamily: "var(--font-jakarta)", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.08, fontSize: "clamp(2rem, 3vw, 2.75rem)" }}>
            Track your investment.
            <br />
            <span style={{ color: "var(--color-text-invert-mid)" }}>Not just your enquiry.</span>
          </h1>
          <ul style={{ listStyle: "none", margin: "2rem 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 16 }}>
            {BENEFITS.map((b) => (
              <li key={b} style={{ display: "flex", alignItems: "flex-start", gap: 12, fontSize: "0.9375rem", color: "var(--color-text-invert-mid)" }}>
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: 999, background: "var(--color-saffron)", color: "var(--color-ink)", flexShrink: 0, marginTop: 1 }}>
                  <Check size={14} strokeWidth={3} />
                </span>
                {b}
              </li>
            ))}
          </ul>
        </div>

        <p style={{ fontSize: "0.75rem", color: "var(--color-text-invert-mid)" }}>
          Not a listing site. A research platform.
        </p>
      </div>

      {/* Right — form panel */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem 1.25rem" }}>
        <div style={{ width: "100%", maxWidth: 400 }}>
          {/* Mobile logo */}
          <Link href="/" className="lg:hidden" style={{ display: "inline-block", marginBottom: "1.75rem", fontFamily: "var(--font-jakarta)", fontWeight: 800, fontSize: "1.25rem", color: "var(--color-text-hi)", textDecoration: "none" }}>
            <Wordmark />
          </Link>
          {children}
        </div>
      </div>
    </div>
  );
}
