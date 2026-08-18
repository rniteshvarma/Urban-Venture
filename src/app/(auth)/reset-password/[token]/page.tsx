"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import AuthShell from "@/components/client/auth/AuthShell";
import PasswordField from "@/components/client/auth/PasswordField";

export default function ResetPasswordPage() {
  const params = useParams();
  const router = useRouter();
  const token = String(params?.token || "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords don't match.");
    setLoading(true); setError("");
    const res = await fetch("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Could not reset password."); setLoading(false); return; }
    setDone(true);
    setTimeout(() => router.push("/login"), 1600);
  };

  return (
    <AuthShell>
      {done ? (
        <div>
          <h1 style={{ fontFamily: "var(--font-jakarta)", fontWeight: 800, fontSize: "1.5rem", color: "var(--color-text-hi)" }}>Password updated ✓</h1>
          <p style={{ color: "var(--color-text-mid)", fontSize: "0.9375rem", marginTop: 8 }}>Redirecting you to sign in…</p>
        </div>
      ) : (
        <div>
          <h1 style={{ fontFamily: "var(--font-jakarta)", fontWeight: 800, fontSize: "1.75rem", color: "var(--color-text-hi)" }}>Set a new password</h1>
          <p style={{ color: "var(--color-text-mid)", fontSize: "0.875rem", marginTop: 4, marginBottom: 24 }}>Choose a strong password you don&apos;t use elsewhere.</p>
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <PasswordField value={password} onChange={setPassword} placeholder="New password" showStrength autoComplete="new-password" />
            <PasswordField value={confirm} onChange={setConfirm} placeholder="Confirm new password" autoComplete="new-password" />
            {error && <div style={{ background: "var(--color-alert-wash)", color: "var(--color-alert)", padding: "10px 12px", borderRadius: 10, fontSize: "0.8125rem" }}>{error}</div>}
            <button type="submit" disabled={loading} className="uv-btn uv-btn-primary" style={{ height: 48 }}>
              {loading ? "Updating…" : <>Update password <ArrowRight size={16} /></>}
            </button>
          </form>
          <Link href="/login" style={{ display: "inline-block", marginTop: 20, color: "var(--color-text-mid)", fontSize: "0.875rem" }}>← Back to sign in</Link>
        </div>
      )}
    </AuthShell>
  );
}
