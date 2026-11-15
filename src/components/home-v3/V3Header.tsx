"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { ChevronDown, Menu, X, Home, Search, Map, Heart, User } from "lucide-react";
import { Wordmark } from "@/components/ui";

type Item = { label: string; href: string; note?: string };
const NAV: { label: string; href: string; items?: Item[] }[] = [
  {
    label: "Buy", href: "/projects", items: [
      { label: "Flats", href: "/projects?type=Apartment", note: "RERA-registered apartments" },
      { label: "Villas", href: "/projects?type=Villa", note: "Gated villa communities" },
      { label: "Open plots", href: "/projects?type=Plots", note: "HMDA / DTCP layouts" },
      { label: "Farm land", href: "/projects?type=Land", note: "Verified listings near the RRR" },
      { label: "All listings", href: "/projects" },
    ],
  },
  {
    label: "Prices", href: "/market", items: [
      { label: "Area prices", href: "/market", note: "₹/sq.ft and ₹/sq.yd, area by area" },
      { label: "Compare areas", href: "/market/compare" },
      { label: "Approvals", href: "/market/approvals", note: "HMDA, RERA, layouts" },
      { label: "Price outlook", href: "/market/forecast" },
    ],
  },
  { label: "Builders", href: "/developers" },
  { label: "Map", href: "/explore" },
  {
    label: "Tools", href: "/calculator", items: [
      { label: "Total cost & EMI", href: "/calculator", note: "Stamp duty, GST, loan" },
      { label: "Free area shortlist", href: "/research", note: "Budget + horizon → areas" },
      { label: "Legal checklist", href: "/market/legal", note: "What to check before paying" },
      { label: "Compare homes", href: "/projects/compare" },
    ],
  },
  { label: "News", href: "/news" },
];

export default function V3Header() {
  const { data: session } = useSession();
  const authed = !!session?.user;
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header className="v3-dark" style={{ position: "sticky", top: 0, zIndex: 85, borderBottom: `1px solid ${scrolled ? "var(--v3-night-line)" : "transparent"}`, transition: "border-color 150ms" }}>
        <div className="v3-wrap" style={{ display: "flex", alignItems: "center", height: 64, gap: 28 }}>
          <Link href="/preview/home" aria-label="Property Tiger home" style={{ flexShrink: 0 }}>
            <Wordmark className="v3-display" style={{ fontWeight: 800, fontSize: "1.25rem", color: "#fff" }} />
          </Link>
          <nav aria-label="Main" className="hidden lg:flex" style={{ alignItems: "center", gap: 4 }}>
            {NAV.map((n) =>
              n.items ? (
                <div key={n.label} className="v3-menu">
                  <Link href={n.href} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "10px 12px", fontWeight: 600, fontSize: "0.9375rem", color: "var(--v3-on-night-mid)" }}>
                    {n.label} <ChevronDown size={15} aria-hidden style={{ opacity: 0.6 }} />
                  </Link>
                  <div className="v3-menu-panel">
                    {n.items.map((i) => (
                      <Link key={i.href + i.label} href={i.href}>
                        {i.label}
                        {i.note && <small>{i.note}</small>}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <Link key={n.label} href={n.href} style={{ padding: "10px 12px", fontWeight: 600, fontSize: "0.9375rem", color: "var(--v3-on-night-mid)" }}>{n.label}</Link>
              ),
            )}
          </nav>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
            {authed ? (
              <Link href="/dashboard" className="v3-btn v3-btn-outline-light hidden sm:inline-flex" style={{ padding: "9px 16px", fontSize: "0.875rem" }}>
                <User size={16} aria-hidden /> My account
              </Link>
            ) : (
              <Link href="/login" className="hidden sm:inline-flex" style={{ fontWeight: 600, fontSize: "0.9375rem", padding: "8px 10px" }}>Log in</Link>
            )}
            <Link href="/research" className="v3-btn v3-btn-primary hidden md:inline-flex" style={{ padding: "10px 18px", fontSize: "0.875rem" }}>Free shortlist</Link>
            <button type="button" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open} style={{ background: "none", border: 0, padding: 8, cursor: "pointer", color: "#fff" }}>
              <Menu size={24} />
            </button>
          </div>
        </div>
      </header>

      {open && (
        <div role="dialog" aria-modal="true" aria-label="Menu" style={{ position: "fixed", inset: 0, zIndex: 120, background: "var(--v3-bg)", display: "flex", flexDirection: "column" }}>
          <div className="v3-wrap" style={{ display: "flex", alignItems: "center", height: 64, width: "100%" }}>
            <Wordmark style={{ fontWeight: 800, fontSize: "1.2rem" }} />
            <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" style={{ marginLeft: "auto", background: "none", border: 0, padding: 8, cursor: "pointer" }}>
              <X size={24} />
            </button>
          </div>
          <div className="v3-wrap" style={{ overflowY: "auto", flex: 1, width: "100%", paddingBottom: 24 }}>
            {NAV.map((n) => (
              <div key={n.label} style={{ borderBottom: "1px solid var(--v3-line)", padding: "14px 0" }}>
                <Link href={n.href} onClick={() => setOpen(false)} style={{ fontWeight: 800, fontSize: "1.0625rem" }}>{n.label}</Link>
                {n.items && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                    {n.items.map((i) => (
                      <Link key={i.href + i.label} href={i.href} onClick={() => setOpen(false)} className="v3-chip v3-chip-line" style={{ fontSize: "0.8125rem", padding: "8px 12px" }}>{i.label}</Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              {authed ? (
                <Link href="/dashboard" className="v3-btn v3-btn-ghost" style={{ flex: 1 }}>My account</Link>
              ) : (
                <>
                  <Link href="/login" className="v3-btn v3-btn-ghost" style={{ flex: 1 }}>Log in</Link>
                  <Link href="/signup" className="v3-btn v3-btn-dark" style={{ flex: 1 }}>Sign up free</Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Phone tab bar: the five things buyers come back for. */}
      <nav aria-label="Quick" className="v3-tabbar">
        <Link href="/preview/home" aria-current="page"><Home size={20} aria-hidden />Home</Link>
        <Link href="/projects"><Search size={20} aria-hidden />Search</Link>
        <Link href="/explore"><Map size={20} aria-hidden />Map</Link>
        <Link href={authed ? "/dashboard" : "/login?next=/dashboard"}><Heart size={20} aria-hidden />Saved</Link>
        <Link href={authed ? "/dashboard" : "/login"}><User size={20} aria-hidden />{authed ? "Account" : "Log in"}</Link>
      </nav>
    </>
  );
}
