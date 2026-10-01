"use client";

import Link from "next/link";
import React, { useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { Wordmark } from "@/components/ui";

export default function GlobalErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Runtime application error captured:", error);
  }, [error]);

  return (
    <main className="min-h-screen flex flex-col" style={{ background: "var(--color-ink)", color: "#fff" }}>
      <header className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Link href="/" aria-label="Property Tiger home">
          <Wordmark className="text-xl font-extrabold text-text-invert" style={{ fontFamily: "var(--font-jakarta)" }} />
        </Link>
      </header>
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 pb-20">
        <p style={{ color: "var(--color-saffron)", fontFamily: "var(--font-mono)", letterSpacing: "0.14em", fontSize: "0.75rem" }}>SOMETHING WENT WRONG</p>
        <h1 className="mt-3 font-extrabold" style={{ fontFamily: "var(--font-jakarta)", fontSize: "clamp(1.8rem, 4.5vw, 2.75rem)", lineHeight: 1.1 }}>
          We couldn&rsquo;t load this page.
        </h1>
        <p className="mt-4 text-text-invert-mid" style={{ maxWidth: 440, lineHeight: 1.6 }}>
          It&rsquo;s on our side, not yours. Try again — if it keeps happening, head back home and come back in a minute.
        </p>
        {error.digest && <p className="mt-2 text-xs text-text-invert-mid" style={{ fontFamily: "var(--font-mono)" }}>Reference: {error.digest}</p>}
        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          <button type="button" onClick={() => reset()} className="uv-btn uv-btn-primary" style={{ padding: "11px 22px" }}>
            <RefreshCw className="w-4 h-4" /> Try again
          </button>
          <Link href="/" className="uv-btn" style={{ padding: "11px 22px", background: "var(--color-ink-soft)", border: "1px solid var(--color-ink-line)", color: "#fff" }}>
            Back to home
          </Link>
        </div>
      </section>
    </main>
  );
}
