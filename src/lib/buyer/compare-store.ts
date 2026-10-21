"use client";
/**
 * The buyer's compare list (up to 4 project ids), kept in this browser only.
 * Storage can be unavailable (private mode), so every access is guarded and
 * the list just starts empty.
 */
import { useSyncExternalStore } from "react";

const KEY = "pt.compare";
const EVENT = "pt-compare";
export const COMPARE_MAX = 4;

function read(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, COMPARE_MAX) : [];
  } catch {
    return [];
  }
}
let cache = "[]";
function snapshot(): string {
  const next = JSON.stringify(read());
  if (next !== cache) cache = next;
  return cache;
}
function write(ids: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids.slice(0, COMPARE_MAX)));
  } catch {
    /* storage unavailable */
  }
  window.dispatchEvent(new Event(EVENT));
}
function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function useCompare() {
  const ids: string[] = JSON.parse(useSyncExternalStore(subscribe, snapshot, () => "[]"));
  return {
    ids,
    has: (id: string) => ids.includes(id),
    full: ids.length >= COMPARE_MAX,
    toggle: (id: string) => write(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]),
    clear: () => write([]),
  };
}
