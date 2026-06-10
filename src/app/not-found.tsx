"use client";

import Link from "next/link";
import React from "react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-luxury-bg text-center px-4">
      <span className="text-4xl mb-4">🔍</span>
      <h1 className="font-display text-3xl font-bold text-primary mb-2">
        Page Not Found
      </h1>
      <p className="text-sm text-text-secondary mb-6 max-w-sm leading-relaxed">
        The link you followed may be broken, or the page may have been removed.
      </p>
      <Link
        href="/"
        className="px-6 py-3 bg-primary text-surface text-xs font-semibold uppercase tracking-widest rounded-tag shadow-sm hover:bg-primary-light transition-colors"
      >
        Back to Portal Home
      </Link>
    </div>
  );
}
