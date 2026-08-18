"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, MailCheck } from "lucide-react";
import AuthShell from "@/components/client/auth/AuthShell";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) }).catch(() => {});
    setSent(true);
    setLoading(false);
  };

  return (
    <AuthShell>
      {sent ? (
        <div>
          <div style={{ width: 48, height: 48, borderRadius: 999, background: "var(--color-growth-wash)", color: "var(--color-growth)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <MailCheck size={22} />
          </div>
          <h1 style={{ fontFamily: "var(--font-jakarta)", fontWeight: 800, fontSize: "1.5rem", color: "var(--color-text-hi)" }}>Check your inbox</h1>
          <p style={{ color: "var(--color-text-mid)", fontSize: "0.9375rem", marginTop: 8, lineHeight: 1.6 }}>
            If an account exists for <strong>{email}</strong>, we&apos;ve sent a password reset link. It&apos;s valid for one hour.
          </p>
          <Link href="/login" style={{ display: "inline-block", marginTop: 24, color: "var(--color-saffron-deep)", fontWeight: 600, fontSize: "0.875rem" }}>← Back to sign in</Link>
        </div>
      ) : (
        <div>
          <h1 style={{ fontFamily: "var(--font-jakarta)", fontWeight: 800, fontSize: "1.75rem", color: "var(--color-text-hi)" }}>Reset your password</h1>
          <p style={{ color: "var(--color-text-mid)", fontSize: "0.875rem", marginTop: 4, marginBottom: 24 }}>
            Enter your email and we&apos;ll send you a reset link.
          </p>
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <input type="email" required className="input-premium w-full" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            <button type="submit" disabled={loading} className="uv-btn uv-btn-primary" style={{ height: 48 }}>
              {loading ? "Sending…" : <>Send reset link <ArrowRight size={16} /></>}
            </button>
          </form>
          <Link href="/login" style={{ display: "inline-block", marginTop: 20, color: "var(--color-text-mid)", fontSize: "0.875rem" }}>← Back to sign in</Link>
        </div>
      )}
    </AuthShell>
  );
}
