import Link from "next/link";
import React from "react";
import { CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";

export const metadata = { title: "Unsubscribed | Property Tiger", robots: { index: false } };

export default async function UnsubscribedPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const invalid = status === "invalid";
  return (
    <div className="max-w-xl mx-auto px-4 py-20 text-center">
      <div className="mx-auto mb-5 flex items-center justify-center rounded-full" style={{ width: 56, height: 56, background: invalid ? "var(--color-alert-wash)" : "var(--color-growth-wash)" }}>
        {invalid ? <AlertTriangle className="w-6 h-6" style={{ color: "var(--color-alert)" }} /> : <CheckCircle2 className="w-6 h-6" style={{ color: "var(--color-growth)" }} />}
      </div>
      <h1 className="text-3xl font-extrabold" style={{ fontFamily: "var(--font-jakarta)", color: "var(--color-text-hi)" }}>
        {invalid ? "This link has expired" : "You're unsubscribed"}
      </h1>
      <p className="mt-3" style={{ color: "var(--color-text-mid)", lineHeight: 1.6 }}>
        {invalid
          ? "We couldn't find a subscription for this link. You can manage your report settings from your dashboard."
          : "You won't receive the weekly land report any more. Changed your mind? You can switch it back on any time."}
      </p>
      <div className="mt-8 flex flex-wrap gap-3 justify-center">
        <Link href="/dashboard/settings/reports" className="uv-btn uv-btn-primary" style={{ padding: "11px 20px" }}>
          Report settings <ArrowRight className="w-4 h-4" />
        </Link>
        <Link href="/" className="uv-btn uv-btn-ghost" style={{ padding: "11px 20px" }}>Back to home</Link>
      </div>
    </div>
  );
}
