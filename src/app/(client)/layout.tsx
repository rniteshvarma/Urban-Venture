"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Menu, X, ChevronDown, ArrowRight, LogIn, LayoutDashboard } from "lucide-react";
import { Wordmark } from "@/components/ui";

interface NavChild {
  label: string;
  href: string;
}

const MARKET_MENU: NavChild[] = [
  { label: "Corridor Intelligence", href: "/market" },
  { label: "Approvals Database", href: "/market/approvals" },
  { label: "Compare Corridors", href: "/market/compare" },
  { label: "2026–35 Forecast", href: "/market/forecast" },
  { label: "Legal Guide", href: "/market/legal" },
];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAuthed = !!session?.user;
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const linkCls = (active: boolean) =>
    `text-sm font-medium transition-colors ${active ? "text-text-invert" : "text-text-invert-mid hover:text-text-invert"}`;

  return (
    <div className="uv-client flex flex-col min-h-screen" style={{ background: "var(--color-paper)" }}>
      {/* ── Sticky dark nav (v2) ── */}
      <header
        className="sticky top-0 z-[100] w-full"
        style={{
          background: "var(--color-ink)",
          borderBottom: isScrolled ? "1px solid var(--color-ink-line)" : "1px solid transparent",
          transition: "border-color 200ms ease",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between" style={{ height: 68 }}>
          <div className="flex items-center gap-9">
            <Link href="/" className="flex items-center gap-1">
              <Wordmark className="text-xl font-extrabold tracking-tight text-text-invert" style={{ fontFamily: "var(--font-jakarta)" }} />
            </Link>

            <nav className="hidden lg:flex items-center gap-7">
              {/* Research goes straight to the AI research tool — a menu holding
                  a single destination is a hover to reach a click. */}
              <Link href="/research" className={linkCls(pathname?.startsWith("/research"))}>Research</Link>

              {/* Market Data dropdown */}
              <div className="relative group py-5">
                <button className={`${linkCls(pathname?.startsWith("/market"))} flex items-center gap-1.5`}>
                  Market Data <ChevronDown className="w-3.5 h-3.5 opacity-70 group-hover:rotate-180 transition-transform" />
                </button>
                <div className="absolute left-0 top-full w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50"
                  style={{ background: "var(--color-ink-soft)", border: "1px solid var(--color-ink-line)", borderRadius: 14, padding: 8 }}>
                  {MARKET_MENU.map((c) => (
                    <Link key={c.href} href={c.href} className="block px-3 py-2 text-xs font-semibold rounded-lg text-text-invert-mid hover:text-text-invert" style={{ transition: "color 150ms" }}>
                      {c.label}
                    </Link>
                  ))}
                </div>
              </div>

              <Link href="/explore" className={linkCls(pathname?.startsWith("/explore"))}>Explore Map</Link>
              <Link href="/projects" className={linkCls(pathname?.startsWith("/projects"))}>Projects</Link>
              <Link href="/news" className={linkCls(pathname?.startsWith("/news"))}>News</Link>
              <Link href="/calculator" className={linkCls(pathname?.startsWith("/calculator"))}>ROI Calculator</Link>
            </nav>
          </div>

          <div className="hidden lg:flex items-center gap-4">
            {isAuthed ? (
              <Link href="/dashboard" className="uv-btn uv-btn-primary" style={{ padding: "9px 18px", fontSize: "0.8125rem" }}>
                <LayoutDashboard className="w-4 h-4" /> My Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium text-text-invert-mid hover:text-text-invert transition-colors flex items-center gap-1.5">
                  <LogIn className="w-4 h-4" /> Log in
                </Link>
                <Link href="/signup" className="text-sm font-semibold transition-colors" style={{ color: "var(--color-saffron)" }}>
                  Sign up
                </Link>
                <Link href="/research" className="uv-btn uv-btn-primary" style={{ padding: "9px 18px", fontSize: "0.8125rem" }}>
                  Get Free Report <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>

          <button type="button" className="lg:hidden p-2 text-text-invert" onClick={() => setMobileMenuOpen(true)} aria-label="Open menu">
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* ── Mobile drawer ── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[200] lg:hidden">
          <div className="fixed inset-0 animate-fade-in" style={{ background: "rgba(0,0,0,0.6)" }} onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed inset-0 flex flex-col animate-slide-in-right" style={{ background: "var(--color-ink)", color: "#fff" }}>
            <div className="flex items-center justify-between px-5" style={{ height: 68, borderBottom: "1px solid var(--color-ink-line)" }}>
              <Wordmark className="text-lg font-extrabold" style={{ fontFamily: "var(--font-jakarta)" }} />
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-text-invert-mid" aria-label="Close menu"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-6">
              <Link href="/research" className="text-base font-medium">Research</Link>
              <div>
                <p className="text-xs uppercase tracking-wider text-text-invert-mid mb-3">Market Data</p>
                <div className="flex flex-col gap-3 pl-3" style={{ borderLeft: "2px solid var(--color-ink-line)" }}>
                  {MARKET_MENU.map((c) => <Link key={c.href} href={c.href} className="text-sm text-text-invert-mid hover:text-text-invert">{c.label}</Link>)}
                </div>
              </div>
              <Link href="/explore" className="text-base font-medium">Explore Map</Link>
              <Link href="/projects" className="text-base font-medium">Projects</Link>
              <Link href="/news" className="text-base font-medium">News</Link>
              <Link href="/calculator" className="text-base font-medium">ROI Calculator</Link>
              <div className="flex gap-3" style={{ marginTop: 8, paddingTop: 16, borderTop: "1px solid var(--color-ink-line)" }}>
                {isAuthed ? (
                  <Link href="/dashboard" className="uv-btn uv-btn-primary flex-1">My Dashboard</Link>
                ) : (
                  <>
                    <Link href="/login" className="uv-btn uv-btn-dark flex-1" style={{ background: "var(--color-ink-soft)", border: "1px solid var(--color-ink-line)" }}>Log in</Link>
                    <Link href="/signup" className="uv-btn uv-btn-primary flex-1">Sign up</Link>
                  </>
                )}
              </div>
            </div>
            {/* sticky bottom bar */}
            <div className="p-4 flex gap-3" style={{ borderTop: "1px solid var(--color-ink-line)" }}>
              <Link href="/market" className="uv-btn uv-btn-dark flex-1" style={{ background: "var(--color-ink-soft)", border: "1px solid var(--color-ink-line)" }}>Explore</Link>
              <Link href="/research" className="uv-btn uv-btn-primary flex-1">Get Free Report</Link>
            </div>
          </div>
        </div>
      )}

      <main className="flex-grow flex flex-col">{children}</main>

      {/* ── Footer (v2 dark) ── */}
      <footer style={{ background: "var(--color-ink)" }} className="pt-16 pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-10">
            <div className="col-span-2">
              <Wordmark className="text-2xl font-extrabold text-text-invert" style={{ fontFamily: "var(--font-jakarta)" }} />
              <p className="mt-4 text-sm leading-relaxed text-text-invert-mid" style={{ maxWidth: 360 }}>
                Not a listing site. A research platform. AI-powered investment research for Hyderabad land and property, built on verified government infrastructure data.
              </p>
              {/* Newsletter capture */}
              <form className="mt-6 flex gap-2" style={{ maxWidth: 360 }} onSubmit={(e) => e.preventDefault()}>
                <input type="email" placeholder="Your email for the weekly brief" className="flex-1 text-sm"
                  style={{ background: "var(--color-ink-soft)", border: "1px solid var(--color-ink-line)", borderRadius: 999, padding: "10px 16px", color: "#fff" }} />
                <button type="submit" className="uv-btn uv-btn-primary" style={{ padding: "10px 16px" }} aria-label="Subscribe"><ArrowRight className="w-4 h-4" /></button>
              </form>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-text-invert mb-5">Research</h4>
              <ul className="space-y-3 text-sm text-text-invert-mid">
                <li><Link href="/research" className="hover:text-text-invert transition-colors">AI Research Tool</Link></li>
                <li><Link href="/market" className="hover:text-text-invert transition-colors">Corridor Intelligence</Link></li>
                <li><Link href="/projects" className="hover:text-text-invert transition-colors">Projects</Link></li>
                <li><Link href="/calculator" className="hover:text-text-invert transition-colors">Calculators</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-text-invert mb-5">Market Data</h4>
              <ul className="space-y-3 text-sm text-text-invert-mid">
                <li><Link href="/market/approvals" className="hover:text-text-invert transition-colors">Approvals</Link></li>
                <li><Link href="/market/compare" className="hover:text-text-invert transition-colors">Compare Corridors</Link></li>
                <li><Link href="/market/forecast" className="hover:text-text-invert transition-colors">2026–35 Forecast</Link></li>
                <li><Link href="/market/legal" className="hover:text-text-invert transition-colors">Legal Guide</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-text-invert mb-5">Official Portals</h4>
              <ul className="space-y-3 text-sm text-text-invert-mid">
                <li><a href="https://hmda.gov.in" target="_blank" rel="noopener noreferrer" className="hover:text-text-invert transition-colors">HMDA</a></li>
                <li><a href="https://rera.telangana.gov.in" target="_blank" rel="noopener noreferrer" className="hover:text-text-invert transition-colors">TG-RERA</a></li>
                <li><a href="https://dharani.telangana.gov.in" target="_blank" rel="noopener noreferrer" className="hover:text-text-invert transition-colors">Bhu Bharati / Dharani</a></li>
              </ul>
            </div>
          </div>

          <div className="mt-14 pt-8 flex flex-col md:flex-row justify-between items-start gap-6" style={{ borderTop: "1px solid var(--color-ink-line)" }}>
            <p className="text-xs leading-relaxed text-text-invert-mid" style={{ maxWidth: 640 }}>
              <strong className="text-text-invert">Disclaimer:</strong> Recommendations are generated using AI-assisted calculations based on historical trends and published infrastructure plans. Past performance does not guarantee future results. Perform independent legal due diligence before investing.
            </p>
            <p className="text-xs text-text-invert-mid whitespace-nowrap">© {new Date().getFullYear()} Property Tiger</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
