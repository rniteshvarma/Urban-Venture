"use client";

import React, { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { ArrowRight } from "lucide-react";
import AuthShell from "@/components/client/auth/AuthShell";
import GoogleButton from "@/components/client/auth/GoogleButton";
import PasswordField from "@/components/client/auth/PasswordField";

function Divider() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "18px 0", color: "var(--color-text-lo)", fontSize: "0.75rem" }}>
      <span style={{ flex: 1, height: 1, background: "var(--color-line)" }} /> or <span style={{ flex: 1, height: 1, background: "var(--color-line)" }} />
    </div>
  );
}

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<React.ReactNode>("");
  const [loading, setLoading] = useState(false);

  // NextAuth redirects here with ?error=... when a provider flow fails (this is
  // its configured error page). Without surfacing it the user lands back on a
  // blank sign-in form with no idea why, which is how a broken Google sign-in
  // looked like the page had simply reloaded.
  const authError = params.get("error");
  useEffect(() => {
    if (!authError) return;
    setError(
      authError === "OAuthAccountNotLinked"
        ? "That email is already registered with a password. Sign in with your password instead."
        : "Sign-in with Google could not be completed. Use your email and password, or try again."
    );
  }, [authError]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return setError("Enter your email and password.");
    setLoading(true);
    setError("");
    try {
      const res = await signIn("credentials", { email: email.toLowerCase().trim(), password, redirect: false });
      if (res?.error) {
        if (res.error.includes("USE_GOOGLE")) {
          setError(<>This email is registered with Google. <button type="button" onClick={() => signIn("google", { callbackUrl: next })} style={{ color: "var(--color-saffron-deep)", fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: 0 }}>Continue with Google →</button></>);
        } else {
          setError("Invalid email or password.");
        }
        setLoading(false);
        return;
      }
      // merge any anonymous activity, then land on the dashboard
      await fetch("/api/auth/merge-anonymous", { method: "POST" }).catch(() => {});
      router.push(next);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 style={{ fontFamily: "var(--font-jakarta)", fontWeight: 800, fontSize: "1.75rem", color: "var(--color-text-hi)", letterSpacing: "-0.01em" }}>Welcome back</h1>
      <p style={{ color: "var(--color-text-mid)", fontSize: "0.875rem", marginTop: 4, marginBottom: 24 }}>
        New here?{" "}
        <Link href={`/signup${next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : ""}`} style={{ color: "var(--color-saffron-deep)", fontWeight: 600 }}>Create an account</Link>
      </p>

      <GoogleButton callbackUrl={next} divider={<Divider />} />

      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <input type="email" className="input-premium w-full" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        <PasswordField value={password} onChange={setPassword} autoComplete="current-password" />
        <div style={{ textAlign: "right", marginTop: -4 }}>
          <Link href="/forgot-password" style={{ fontSize: "0.8125rem", color: "var(--color-text-mid)" }}>Forgot password?</Link>
        </div>
        {error && <div style={{ background: "var(--color-alert-wash)", color: "var(--color-alert)", padding: "10px 12px", borderRadius: 10, fontSize: "0.8125rem" }}>{error}</div>}
        <button type="submit" disabled={loading} className="uv-btn uv-btn-primary" style={{ height: 48 }}>
          {loading ? "Signing in…" : <>Sign in <ArrowRight size={16} /></>}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <AuthShell>
      <Suspense fallback={<div style={{ color: "var(--color-text-lo)" }}>Loading…</div>}>
        <LoginInner />
      </Suspense>
    </AuthShell>
  );
}
