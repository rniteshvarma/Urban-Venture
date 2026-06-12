"use client";

import React, { useEffect } from "react";

export default function GlobalErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Runtime application error captured:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-luxury-bg text-center px-4">
      <span className="text-4xl mb-4">⚠️</span>
      <h1 className="font-display text-3xl font-bold text-primary mb-2">
        An Error Occurred
      </h1>
      <p className="text-sm text-text-secondary mb-6 max-w-sm leading-relaxed">
        We encountered a problem loading this application view. Click below to try reloading the page.
      </p>
      <button
        onClick={() => reset()}
        className="px-6 py-3 bg-primary text-surface text-xs font-semibold uppercase tracking-widest rounded-tag shadow-sm hover:bg-blue-700 transition-colors"
      >
        Reload Page
      </button>
    </div>
  );
}
