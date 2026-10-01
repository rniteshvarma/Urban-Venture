"use client";

import React, { useState } from "react";
import { Heart } from "lucide-react";

interface SaveHeartProps {
  /** Stable id used for optional localStorage persistence. */
  id?: string;
  /**
   * When set, the heart is backed by the account: it saves via
   * /api/saved/projects (signed in → the user's dashboard; signed out → the
   * anonymous session, merged into the account at login).
   */
  projectId?: string;
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

function writeStore(id: string, saved: boolean) {
  const store = readStore();
  if (saved) store[id] = true;
  else delete store[id];
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

/**
 * One request per page for every heart: the saved project ids for the current
 * user (or anonymous session). Hearts that were only ever stored in this
 * browser (before hearts were account-backed) are pushed to the account once.
 */
let savedIdsPromise: Promise<Set<string>> | null = null;

function loadSavedIds(): Promise<Set<string>> {
  if (!savedIdsPromise) {
    savedIdsPromise = (async () => {
      try {
        const res = await fetch("/api/saved/projects?ids=1", { cache: "no-store" });
        if (!res.ok) return new Set<string>();
        const body = (await res.json()) as { authenticated: boolean; projectIds: string[] };
        const ids = new Set(body.projectIds ?? []);
        const localOnly = Object.keys(readStore()).filter((id) => !ids.has(id));
        for (const projectId of localOnly) {
          const r = await fetch("/api/saved/projects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ projectId }),
          });
          if (r.ok) ids.add(projectId);
          else if (r.status === 404) writeStore(projectId, false); // project no longer exists
        }
        return ids;
      } catch {
        return new Set<string>();
      }
    })();
  }
  return savedIdsPromise;
}

/** Wishlist heart toggle. Account-backed when `projectId` is set; otherwise localStorage when `id` is set. */
export default function SaveHeart({ id, projectId, initialSaved = false, onToggle, theme = "light", className = "" }: SaveHeartProps) {
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState(false);
  const localId = projectId ?? id;

  // Hydrate after mount (avoids SSR mismatch): from the account when synced, else from localStorage.
  React.useEffect(() => {
    let cancelled = false;
    if (projectId) {
      loadSavedIds().then((ids) => {
        if (!cancelled) setSaved(ids.has(projectId));
      });
    } else if (id) {
      const timer = setTimeout(() => {
        if (!cancelled && readStore()[id]) setSaved(true);
      }, 0);
      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    }
    return () => {
      cancelled = true;
    };
  }, [id, projectId]);

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    const next = !saved;
    setSaved(next); // optimistic
    onToggle?.(next);
    if (localId) writeStore(localId, next);
    if (!projectId) return;

    setBusy(true);
    try {
      const res = next
        ? await fetch("/api/saved/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId }) })
        : await fetch(`/api/saved/projects/${encodeURIComponent(projectId)}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const ids = await loadSavedIds();
      if (next) ids.add(projectId);
      else ids.delete(projectId);
    } catch {
      // The server didn't take it — don't pretend it's saved.
      setSaved(!next);
      onToggle?.(!next);
      writeStore(projectId, !next);
    } finally {
      setBusy(false);
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
