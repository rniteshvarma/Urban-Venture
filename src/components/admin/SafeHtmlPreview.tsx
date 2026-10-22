"use client";

/**
 * Shows email HTML inside a sandboxed frame: no scripts, no forms, no access
 * to the CRM page or its session — so markup in an email body (or in a lead's
 * name merged into it) can't run as the admin.
 */
export default function SafeHtmlPreview({ html, className = "", empty }: { html: string; className?: string; empty?: string }) {
  if (!html) return <div className={className}><span className="text-slate-400 italic">{empty ?? "No body content."}</span></div>;
  return (
    <iframe
      title="Email preview"
      sandbox=""
      referrerPolicy="no-referrer"
      srcDoc={`<!doctype html><meta charset="utf-8"><base target="_blank"><style>body{font:12px/1.5 system-ui,sans-serif;margin:8px;color:#1A1A2E}</style>${html}`}
      className={className}
      style={{ width: "100%", border: 0, background: "#fff" }}
    />
  );
}
