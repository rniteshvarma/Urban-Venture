"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { ArrowRight } from "lucide-react";
import AuthShell from "@/components/client/auth/AuthShell";
import GoogleButton from "@/components/client/auth/GoogleButton";
import PasswordField, { passwordStrength } from "@/components/client/auth/PasswordField";
import OtpBoxes from "@/components/client/auth/OtpBoxes";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[6-9]\d{9}$/;

function Divider() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "18px 0", color: "var(--color-text-lo)", fontSize: "0.75rem" }}>
      <span style={{ flex: 1, height: 1, background: "var(--color-line)" }} /> or <span style={{ flex: 1, height: 1, background: "var(--color-line)" }} />
    </div>
  );
}
function ErrorBox({ children }: { children: React.ReactNode }) {
  return <div style={{ background: "var(--color-alert-wash)", color: "var(--color-alert)", padding: "10px 12px", borderRadius: 10, fontSize: "0.8125rem" }}>{children}</div>;
}

function SignupInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";

  const [step, setStep] = useState<"identity" | "phone" | "otp">("identity");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsappOptIn, setWhatsappOptIn] = useState(true);
  const [error, setError] = useState<React.ReactNode>("");
  const [loading, setLoading] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const nextStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError("Enter your name.");
    if (!EMAIL_RE.test(email)) return setError("Enter a valid email address.");
    if (passwordStrength(password).score < 1) return setError("Password must be at least 8 characters.");
    setError("");
    setStep("phone");
  };

  // Create the account + sign in + merge. Returns true on success.
  const createAccount = async (): Promise<boolean> => {
    const phone10 = phone.replace(/\D/g, "").slice(-10);
    if (!PHONE_RE.test(phone10)) { setError("Enter a valid Indian mobile number."); return false; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, phone: phone10, whatsappOptIn }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "EXISTS") setError(<>An account with this email exists. <Link href="/login" style={{ color: "var(--color-saffron-deep)", fontWeight: 600 }}>Sign in →</Link></>);
        else if (data.code === "USE_GOOGLE") setError(<>This email is registered with Google. <button type="button" onClick={() => signIn("google", { callbackUrl: next })} style={{ color: "var(--color-saffron-deep)", fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: 0 }}>Continue with Google →</button></>);
        else setError(data.error || "Could not create account.");
        setLoading(false); return false;
      }
      await signIn("credentials", { email: email.toLowerCase().trim(), password, redirect: false });
      await fetch("/api/auth/merge-anonymous", { method: "POST" }).catch(() => {});
      return true;
    } catch {
      setError("Could not create account. Please try again."); setLoading(false); return false;
    }
  };

  const finish = () => { router.push(next); router.refresh(); };

  const createThenVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(await createAccount())) return;
    // send OTP and move to verify step
    const r = await fetch("/api/auth/verify-phone/send", { method: "POST" }).then((x) => x.json()).catch(() => null);
    setDevCode(r?.devCode ?? null);
    setResendIn(30);
    setLoading(false);
    setStep("otp");
  };

  const createThenSkip = async () => {
    if (await createAccount()) finish();
  };

  const confirmOtp = async (code: string) => {
    setLoading(true); setError("");
    const res = await fetch("/api/auth/verify-phone/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Incorrect code."); setLoading(false); return; }
    finish();
  };

  const resend = async () => {
    if (resendIn > 0) return;
    const r = await fetch("/api/auth/verify-phone/send", { method: "POST" }).then((x) => x.json()).catch(() => null);
    setDevCode(r?.devCode ?? null);
    setResendIn(30);
  };

  // ── Identity ──
  if (step === "identity") {
    return (
      <div>
        <h1 style={{ fontFamily: "var(--font-jakarta)", fontWeight: 800, fontSize: "1.75rem", color: "var(--color-text-hi)", letterSpacing: "-0.01em" }}>Create your account</h1>
        <p style={{ color: "var(--color-text-mid)", fontSize: "0.875rem", marginTop: 4, marginBottom: 24 }}>
          Already have one? <Link href="/login" style={{ color: "var(--color-saffron-deep)", fontWeight: 600 }}>Sign in →</Link>
        </p>
        <GoogleButton callbackUrl={next} label="Continue with Google" />
        <Divider />
        <form onSubmit={nextStep1} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <input className="input-premium w-full" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          <input type="email" className="input-premium w-full" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          <PasswordField value={password} onChange={setPassword} showStrength autoComplete="new-password" />
          {error && <ErrorBox>{error}</ErrorBox>}
          <button type="submit" className="uv-btn uv-btn-primary" style={{ height: 48 }}>Continue <ArrowRight size={16} /></button>
          <p style={{ fontSize: "0.6875rem", color: "var(--color-text-lo)", textAlign: "center" }}>
            By continuing you agree to our Terms and Privacy Policy.
          </p>
        </form>
      </div>
    );
  }

  // ── Phone ──
  if (step === "phone") {
    return (
      <div>
        <div style={{ display: "flex", gap: 5, marginBottom: 20 }}>
          <span style={{ flex: 1, height: 4, borderRadius: 999, background: "var(--color-saffron)" }} />
          <span style={{ flex: 1, height: 4, borderRadius: 999, background: "var(--color-saffron)" }} />
          <span style={{ fontSize: "0.6875rem", color: "var(--color-text-lo)", marginLeft: 6 }}>Step 2 of 2</span>
        </div>
        <h1 style={{ fontFamily: "var(--font-jakarta)", fontWeight: 800, fontSize: "1.75rem", color: "var(--color-text-hi)" }}>One last thing</h1>
        <p style={{ color: "var(--color-text-mid)", fontSize: "0.875rem", marginTop: 4, marginBottom: 22 }}>
          We&apos;ll send your AI reports and project updates to WhatsApp.
        </p>
        <form onSubmit={createThenVerify} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-mid)" }}>Mobile number</label>
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <span className="input-premium" style={{ width: 68, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, color: "var(--color-text-mid)" }}>🇮🇳 +91</span>
              <input className="input-premium" style={{ flex: 1 }} inputMode="numeric" placeholder="98765 43210" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel-national" />
            </div>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.8125rem", color: "var(--color-text-mid)", cursor: "pointer" }}>
            <input type="checkbox" checked={whatsappOptIn} onChange={(e) => setWhatsappOptIn(e.target.checked)} style={{ accentColor: "var(--color-saffron)", width: 16, height: 16 }} />
            Send me reports and updates on WhatsApp
          </label>
          {error && <ErrorBox>{error}</ErrorBox>}
          <button type="submit" disabled={loading} className="uv-btn uv-btn-primary" style={{ height: 48 }}>
            {loading ? "Creating…" : <>Create Account <ArrowRight size={16} /></>}
          </button>
          <button type="button" onClick={createThenSkip} disabled={loading} style={{ background: "none", border: "none", color: "var(--color-text-lo)", fontSize: "0.8125rem", cursor: "pointer" }}>
            Verify later
          </button>
        </form>
      </div>
    );
  }

  // ── OTP ──
  return (
    <div>
      <h1 style={{ fontFamily: "var(--font-jakarta)", fontWeight: 800, fontSize: "1.75rem", color: "var(--color-text-hi)" }}>Verify your number</h1>
      <p style={{ color: "var(--color-text-mid)", fontSize: "0.875rem", marginTop: 4, marginBottom: 20 }}>
        Enter the 6-digit code sent to +91 {phone.replace(/\D/g, "").slice(-10)}.
      </p>
      <OtpBoxes onComplete={confirmOtp} disabled={loading} />
      {devCode && <p style={{ marginTop: 12, fontSize: "0.75rem", color: "var(--color-caution)", fontFamily: "var(--font-mono)" }}>Dev stub — WATI not configured. Code: {devCode}</p>}
      {error && <div style={{ marginTop: 12 }}><ErrorBox>{error}</ErrorBox></div>}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 18 }}>
        <button type="button" onClick={resend} disabled={resendIn > 0} style={{ background: "none", border: "none", color: resendIn > 0 ? "var(--color-text-lo)" : "var(--color-saffron-deep)", fontSize: "0.8125rem", fontWeight: 600, cursor: resendIn > 0 ? "default" : "pointer" }}>
          {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
        </button>
        <button type="button" onClick={finish} style={{ background: "none", border: "none", color: "var(--color-text-lo)", fontSize: "0.8125rem", cursor: "pointer" }}>Skip for now</button>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <AuthShell>
      <Suspense fallback={<div style={{ color: "var(--color-text-lo)" }}>Loading…</div>}>
        <SignupInner />
      </Suspense>
    </AuthShell>
  );
}
