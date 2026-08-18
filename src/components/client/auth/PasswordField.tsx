"use client";

import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export function passwordStrength(pw: string): { score: number; label: string; color: string } {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  const score = Math.min(4, s);
  const map = [
    { label: "Too short", color: "var(--color-alert)" },
    { label: "Weak", color: "var(--color-alert)" },
    { label: "Fair", color: "var(--color-caution)" },
    { label: "Good", color: "var(--color-caution)" },
    { label: "Strong", color: "var(--color-growth)" },
  ];
  return { score, ...map[score] };
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  showStrength?: boolean;
  autoComplete?: string;
}

export default function PasswordField({ value, onChange, placeholder = "Password", showStrength = false, autoComplete }: Props) {
  const [show, setShow] = useState(false);
  const st = passwordStrength(value);
  return (
    <div>
      <div style={{ position: "relative" }}>
        <input
          type={show ? "text" : "password"}
          className="input-premium w-full"
          style={{ paddingRight: 40 }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--color-text-lo)", display: "flex" }}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {showStrength && value.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
          <div style={{ flex: 1, display: "flex", gap: 4 }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{ flex: 1, height: 4, borderRadius: 999, background: i < st.score ? st.color : "var(--color-line)" }} />
            ))}
          </div>
          <span style={{ fontSize: "0.6875rem", fontWeight: 600, color: st.color, minWidth: 52, textAlign: "right" }}>{st.label}</span>
        </div>
      )}
    </div>
  );
}
