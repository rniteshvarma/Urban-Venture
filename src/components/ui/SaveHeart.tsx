"use client";

import React, { useState } from "react";
import { Heart } from "lucide-react";

interface SaveHeartProps {
  /** Stable id used for optional localStorage persistence. */
  id?: string;
  initialSaved?: boolean;
  onToggle?: (saved: boolean) => void;
  /** "light" for dark backgrounds (image overlays), "dark" for light cards. */
  theme?: "light" | "dark";
  className?: string;
}

const STORE_KEY = "uv:saved";

function readStore(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
  } catch {
    return {};
  }
}

/** Wishlist heart toggle. Persists to localStorage when an id is provided. */
export default function SaveHeart({ id, initialSaved = false, onToggle, theme = "light", className = "" }: SaveHeartProps) {
  const [saved, setSaved] = useState(initialSaved);

  // hydrate from localStorage after mount (avoids SSR mismatch)
  React.useEffect(() => {
    if (id && readStore()[id]) setSaved(true);
  }, [id]);

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !saved;
    setSaved(next);
    onToggle?.(next);
    if (id) {
      const store = readStore();
      if (next) store[id] = true;
      else delete store[id];
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(store));
      } catch {
        /* ignore quota / privacy-mode errors */
      }
    }
  };

  const idle = theme === "light" ? "rgba(255,255,255,0.92)" : "var(--color-surface)";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved" : "Save"}
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 34,
        height: 34,
        borderRadius: 999,
        border: "none",
        cursor: "pointer",
        background: idle,
        boxShadow: "var(--uv-sh-1)",
        transition: "transform 150ms ease",
      }}
    >
      <Heart
        size={17}
        strokeWidth={2.2}
        style={{
          color: saved ? "var(--color-alert)" : "var(--color-text-mid)",
          fill: saved ? "var(--color-alert)" : "transparent",
          transition: "color 150ms ease, fill 150ms ease",
        }}
      />
    </button>
  );
}
