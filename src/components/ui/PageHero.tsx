import React from "react";

interface PageHeroProps {
  /** Small uppercase eyebrow pill above the title. */
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Optional right-aligned actions (buttons/links). */
  actions?: React.ReactNode;
  /** Optional content rendered below the copy (e.g. a stats row). */
  children?: React.ReactNode;
  align?: "left" | "center";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const TITLE_SIZE = {
  sm: "clamp(1.75rem, 3.5vw, 2.5rem)",
  md: "clamp(2rem, 4.5vw, 3.25rem)",
  lg: "clamp(2.25rem, 6vw, 4rem)",
};

/** Standard dark-ink page header for internal client pages (v2). */
export default function PageHero({ eyebrow, title, subtitle, actions, children, align = "center", size = "md", className = "" }: PageHeroProps) {
  const centered = align === "center";
  return (
    <section style={{ background: "var(--color-ink)", position: "relative" }} className={className}>
      <div
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
        style={{ paddingTop: "clamp(2.5rem, 5vw, 4rem)", paddingBottom: "clamp(2.5rem, 5vw, 4rem)" }}
      >
        <div style={{ maxWidth: centered ? 820 : 760, margin: centered ? "0 auto" : undefined, textAlign: centered ? "center" : "left" }}>
          {eyebrow && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "var(--color-ink-soft)",
                border: "1px solid var(--color-ink-line)",
                color: "var(--color-saffron)",
                padding: "5px 13px",
                borderRadius: 999,
                fontSize: "0.6875rem",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                fontFamily: "var(--font-mono)",
              }}
            >
              {eyebrow}
            </span>
          )}
          <h1
            style={{
              fontFamily: "var(--font-jakarta)",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              lineHeight: 1.05,
              color: "#fff",
              fontSize: TITLE_SIZE[size],
              marginTop: eyebrow ? 18 : 0,
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <p style={{ color: "var(--color-text-invert-mid)", fontSize: "clamp(0.95rem, 1.4vw, 1.125rem)", lineHeight: 1.6, marginTop: 16, maxWidth: centered ? 680 : 620, marginLeft: centered ? "auto" : undefined, marginRight: centered ? "auto" : undefined }}>
              {subtitle}
            </p>
          )}
          {actions && <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: centered ? "center" : "flex-start", marginTop: 26 }}>{actions}</div>}
        </div>
        {children}
      </div>
    </section>
  );
}
