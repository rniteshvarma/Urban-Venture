"use client";

import React, { useRef, useState } from "react";

/** 6-box OTP input: auto-advance, backspace-back, paste, auto-submit on 6th. */
export default function OtpBoxes({ onComplete, disabled }: { onComplete: (code: string) => void; disabled?: boolean }) {
  const [vals, setVals] = useState<string[]>(["", "", "", "", "", ""]);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const set = (i: number, v: string) => {
    const d = v.replace(/\D/g, "").slice(-1);
    const next = [...vals];
    next[i] = d;
    setVals(next);
    if (d && i < 5) refs.current[i + 1]?.focus();
    if (next.every((x) => x !== "")) onComplete(next.join(""));
  };

  const onKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !vals[i] && i > 0) refs.current[i - 1]?.focus();
  };

  const onPaste = (e: React.ClipboardEvent) => {
    const p = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!p) return;
    e.preventDefault();
    const arr = (p + "      ").slice(0, 6).split("").map((c) => (c === " " ? "" : c));
    setVals(arr);
    refs.current[Math.min(p.length, 5)]?.focus();
    if (p.length === 6) onComplete(p);
  };

  return (
    <div style={{ display: "flex", gap: 8 }} onPaste={onPaste}>
      {vals.map((v, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          value={v}
          disabled={disabled}
          onChange={(e) => set(i, e.target.value)}
          onKeyDown={(e) => onKey(i, e)}
          inputMode="numeric"
          maxLength={1}
          aria-label={`Digit ${i + 1}`}
          style={{ width: 44, height: 52, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: "1.25rem", fontWeight: 600, border: "1px solid var(--color-line)", borderRadius: 12, background: "var(--color-surface)", color: "var(--color-text-hi)", outline: "none" }}
        />
      ))}
    </div>
  );
}
