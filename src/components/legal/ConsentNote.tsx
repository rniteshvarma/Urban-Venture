// The short notice shown where a form collects personal data (DPDP Act:
// notice at the point of collection). `share` says who else will see it.

import Link from "next/link";

export default function ConsentNote({ action = "submitting", share, className = "", tone = "light" }: { action?: string; share?: string; className?: string; tone?: "light" | "dark" }) {
  const color = tone === "dark" ? "rgba(255,255,255,0.6)" : "var(--color-text-lo)";
  return (
    <p className={className} style={{ fontSize: "0.72rem", lineHeight: 1.5, color }}>
      By {action} you agree to our{" "}
      <Link href="/legal/terms" target="_blank" style={{ textDecoration: "underline", color: "inherit" }}>Terms</Link> and{" "}
      <Link href="/legal/privacy" target="_blank" style={{ textDecoration: "underline", color: "inherit" }}>Privacy Policy</Link>.
      {share ? ` ${share}` : ""}
    </p>
  );
}
