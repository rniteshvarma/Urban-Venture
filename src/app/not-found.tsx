import Link from "next/link";
import React from "react";
import { ArrowRight, Compass, LineChart, Map, Newspaper } from "lucide-react";
import { Wordmark } from "@/components/ui";

const LINKS = [
  { href: "/projects", label: "Browse projects", icon: Compass },
  { href: "/market", label: "Corridor intelligence", icon: LineChart },
  { href: "/explore", label: "Explore the map", icon: Map },
  { href: "/news", label: "Market news", icon: Newspaper },
];

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col" style={{ background: "var(--color-ink)", color: "#fff" }}>
      <header className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Link href="/" aria-label="Property Tiger home">
          <Wordmark className="text-xl font-extrabold text-text-invert" style={{ fontFamily: "var(--font-jakarta)" }} />
        </Link>
      </header>
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 pb-20">
        <p className="uv-overline" style={{ color: "var(--color-saffron)", fontFamily: "var(--font-mono)", letterSpacing: "0.14em", fontSize: "0.75rem" }}>
          ERROR 404
        </p>
        <h1 className="mt-3 font-extrabold" style={{ fontFamily: "var(--font-jakarta)", fontSize: "clamp(2rem, 5vw, 3.25rem)", lineHeight: 1.08 }}>
          This page isn&rsquo;t on the map.
        </h1>
        <p className="mt-4 text-text-invert-mid" style={{ maxWidth: 460, lineHeight: 1.6 }}>
          The link may be broken, or the page has moved. Here are some good places to pick up from.
        </p>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full" style={{ maxWidth: 520 }}>
          {LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors"
              style={{ background: "var(--color-ink-soft)", border: "1px solid var(--color-ink-line)" }}
            >
              <Icon className="w-4 h-4 shrink-0" style={{ color: "var(--color-saffron)" }} />
              <span className="text-sm font-semibold flex-1">{label}</span>
              <ArrowRight className="w-4 h-4 text-text-invert-mid" />
            </Link>
          ))}
        </div>
        <Link href="/" className="uv-btn uv-btn-primary mt-8" style={{ padding: "11px 22px" }}>
          Back to home <ArrowRight className="w-4 h-4" />
        </Link>
      </section>
    </main>
  );
}
