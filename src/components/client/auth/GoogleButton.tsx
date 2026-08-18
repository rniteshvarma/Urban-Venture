"use client";

import React, { useEffect, useState } from "react";
import { signIn } from "next-auth/react";

/** "Continue with Google" — visually dominant, full width. */
export default function GoogleButton({ callbackUrl = "/dashboard", label = "Continue with Google" }: { callbackUrl?: string; label?: string }) {
  const [loading, setLoading] = useState(false);

  // Reset the spinner if the user returns via the browser Back button
  // (bfcache restores component state, otherwise the button stays "Connecting…").
  useEffect(() => {
    const reset = () => setLoading(false);
    window.addEventListener("pageshow", reset);
    window.addEventListener("focus", reset);
    return () => {
      window.removeEventListener("pageshow", reset);
      window.removeEventListener("focus", reset);
    };
  }, []);
  return (
    <button
      type="button"
      onClick={() => {
        setLoading(true);
        signIn("google", { callbackUrl });
      }}
      disabled={loading}
      style={{
        width: "100%",
        height: 48,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        background: "#fff",
        border: "1px solid var(--color-line)",
        borderRadius: 999,
        fontWeight: 600,
        fontSize: "0.9375rem",
        color: "var(--color-text-hi)",
        cursor: loading ? "wait" : "pointer",
        boxShadow: "var(--uv-sh-1)",
        transition: "border-color 150ms ease, background 150ms ease",
      }}
    >
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
        <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62z" />
        <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.02-3.7H.96v2.33A9 9 0 0 0 9 18z" />
        <path fill="#FBBC05" d="M3.98 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.02-2.33z" />
        <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.02 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
      </svg>
      {loading ? "Connecting…" : label}
    </button>
  );
}
