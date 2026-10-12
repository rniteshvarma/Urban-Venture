// Shared layout for /legal pages: title, last-updated line, a contents list
// and consistent section styling (matches /legal/content-policy).

import React from "react";
import Link from "next/link";

export const H2: React.CSSProperties = { fontSize: "1.05rem", fontWeight: 700, color: "var(--color-text-hi)", margin: "32px 0 8px", scrollMarginTop: 90 };
export const P: React.CSSProperties = { margin: "0 0 10px", lineHeight: 1.7, color: "var(--color-text-mid)", fontSize: "0.92rem" };
export const UL: React.CSSProperties = { ...P, paddingLeft: 20, listStyle: "disc" };
export const A: React.CSSProperties = { color: "var(--color-text-hi)", fontWeight: 600, textDecoration: "underline" };

export function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 id={id} style={H2}>{title}</h2>
      {children}
    </section>
  );
}

export default function LegalPage({
  title,
  intro,
  updated,
  sections,
  children,
}: {
  title: string;
  intro: string;
  updated: string;
  sections: { id: string; title: string }[];
  children: React.ReactNode;
}) {
  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "36px 20px 80px" }}>
      <h1 style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 800, fontSize: "1.8rem", color: "var(--color-text-hi)", margin: 0 }}>{title}</h1>
      <p style={{ ...P, marginTop: 8, color: "var(--color-text-lo)" }}>Last updated {updated}</p>
      <p style={P}>{intro}</p>
      <nav aria-label="Contents" style={{ margin: "18px 0 8px", padding: "14px 16px", border: "1px solid var(--color-line)", borderRadius: 10 }}>
        <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-text-lo)", marginBottom: 6 }}>Contents</div>
        <ol style={{ margin: 0, paddingLeft: 18, columns: 2, columnGap: 24, fontSize: "0.85rem", lineHeight: 1.8 }}>
          {sections.map((s) => (
            <li key={s.id}><a href={`#${s.id}`} style={{ color: "var(--color-text-mid)" }}>{s.title}</a></li>
          ))}
        </ol>
      </nav>
      {children}
      <p style={{ ...P, marginTop: 36, fontSize: "0.82rem", color: "var(--color-text-lo)" }}>
        See also: <Link href="/legal/privacy" style={A}>Privacy Policy</Link> · <Link href="/legal/terms" style={A}>Terms of Use</Link> · <Link href="/legal/content-policy" style={A}>Content policy</Link>
      </p>
    </div>
  );
}
