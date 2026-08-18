"use client";

import React, { useState } from "react";
import { useSearchParams } from "next/navigation";
import { MapPin } from "lucide-react";

interface ResearchFormProps {
  onSubmit: (data: { budget: number; horizon: number; city: string; name?: string; email?: string; phone?: string }) => void;
  isLoading: boolean;
}

// Maps budget in Lakhs (10..500) to slider percentage position (0..100)
function budgetToSlider(val: number): number {
  if (val <= 10) return 0;
  if (val <= 50) return ((val - 10) / 40) * 25;
  if (val <= 100) return 25 + ((val - 50) / 50) * 25;
  if (val <= 300) return 50 + ((val - 100) / 200) * 25;
  if (val < 500) return 75 + ((val - 300) / 200) * 25;
  return 100;
}

// Maps slider percentage position (0..100) back to budget in Lakhs
function sliderToBudget(pos: number): number {
  if (pos <= 0) return 10;
  if (pos <= 25) {
    const raw = 10 + (pos / 25) * 40;
    return Math.round(raw / 5) * 5;
  }
  if (pos <= 50) {
    const raw = 50 + ((pos - 25) / 25) * 50;
    return Math.round(raw / 5) * 5;
  }
  if (pos <= 75) {
    const raw = 100 + ((pos - 50) / 25) * 200;
    return Math.round(raw / 10) * 10;
  }
  const raw = 300 + ((pos - 75) / 25) * 200;
  return Math.min(500, Math.round(raw / 25) * 25);
}

export default function ResearchForm({ onSubmit, isLoading }: ResearchFormProps) {
  const searchParams = useSearchParams();
  const initialBudgetParam = searchParams.get("budget");
  const initialHorizonParam = searchParams.get("horizon");
  const initialCityParam = searchParams.get("city");

  const [step, setStep] = useState(1);
  const [budget, setBudget] = useState<number>(() => {
    if (initialBudgetParam) {
      const parsed = parseFloat(initialBudgetParam);
      if (!isNaN(parsed) && parsed >= 10 && parsed <= 500) return parsed;
    }
    return 50;
  });
  const [horizon, setHorizon] = useState<number>(() => {
    if (initialHorizonParam) {
      const parsed = parseInt(initialHorizonParam);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return 5;
  });
  const [city, setCity] = useState<string>(() => {
    if (initialCityParam) return initialCityParam;
    return "Hyderabad";
  });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const formatBudgetDisplay = (val: number) => {
    if (val < 100) return `₹${val} Lakhs`;
    const cr = val / 100;
    return Number.isInteger(cr) ? `₹${cr} Crore${cr > 1 ? "s" : ""}` : `₹${cr.toFixed(2)} Crores`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 3) {
      setStep(step + 1);
      return;
    }
    onSubmit({ budget, horizon, city, name: name || undefined, email: email || undefined, phone: phone || undefined });
  };

  const horizons = [1, 2, 3, 5, 7, 10];
  const cities = ["Hyderabad", "Bengaluru", "Chennai", "Mumbai", "Pune"];

  const sliderPos = budgetToSlider(budget);

  return (
    <div className="max-w-2xl mx-auto animate-fade-in-up" style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Progress */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", maxWidth: 460, margin: "0 auto", width: "100%", padding: "0 12px" }}>
        <div style={{ position: "absolute", left: 34, right: 34, top: 20, height: 3, background: "var(--color-line)", borderRadius: 999, zIndex: 0 }} />
        <div style={{ position: "absolute", left: 34, top: 20, height: 3, background: "var(--color-saffron)", borderRadius: 999, zIndex: 0, transition: "width 300ms ease", width: `${((step - 1) / 2) * 78}%` }} />
        {[1, 2, 3].map((num) => (
          <div key={num} style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, background: "var(--color-paper)", padding: "0 8px" }}>
            <div style={{ width: 40, height: 40, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.875rem", fontFamily: "var(--font-mono)", transition: "all 300ms ease", background: step >= num ? "var(--color-saffron)" : "var(--color-surface)", color: step >= num ? "var(--color-ink)" : "var(--color-text-lo)", border: step >= num ? "none" : "2px solid var(--color-line)" }}>
              {num}
            </div>
            <span style={{ fontSize: "0.625rem", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800, color: step >= num ? "var(--color-saffron-deep)" : "var(--color-text-lo)" }}>
              {num === 1 ? "Location" : num === 2 ? "Parameters" : "Details"}
            </span>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="uv-card" style={{ padding: "clamp(1.5rem, 4vw, 2rem)", display: "flex", flexDirection: "column", gap: 24 }}>
        {step === 1 && (
          <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            <div>
              <h2 style={{ fontFamily: "var(--font-jakarta)", fontWeight: 800, fontSize: "1.25rem", color: "var(--color-text-hi)" }}>Target Location</h2>
              <p style={{ fontSize: "0.8125rem", color: "var(--color-text-mid)", marginTop: 2 }}>Select your preferred investment destination</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14 }}>
              {cities.map((c) => {
                const active = city === c;
                return (
                  <div key={c} onClick={() => setCity(c)} style={{ cursor: "pointer", borderRadius: 14, padding: "1.1rem", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, transition: "all 150ms ease", border: `1px solid ${active ? "var(--color-saffron)" : "var(--color-line)"}`, background: active ? "var(--color-saffron-wash)" : "var(--color-surface)", boxShadow: active ? "0 0 0 3px rgba(255,180,0,0.15)" : "none" }}>
                    <MapPin size={20} style={{ color: active ? "var(--color-saffron-deep)" : "var(--color-text-lo)" }} />
                    <span style={{ fontSize: "0.875rem", fontWeight: active ? 700 : 600, color: active ? "var(--color-saffron-deep)" : "var(--color-text-mid)" }}>{c}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ paddingTop: 16, borderTop: "1px solid var(--color-line)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <label style={{ fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-text-mid)" }}>Investment Budget</label>
                <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "1.25rem", color: "var(--color-saffron-deep)" }}>{formatBudgetDisplay(budget)}</span>
              </div>
              <input 
                type="range" 
                min={0} 
                max={100} 
                step={0.5} 
                value={sliderPos} 
                onChange={(e) => setBudget(sliderToBudget(parseFloat(e.target.value)))} 
                className="uv-range" 
                style={{ width: "100%" }} 
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.6875rem", fontWeight: 600, color: "var(--color-text-lo)", marginTop: 6, fontFamily: "var(--font-mono)" }}>
                <span>10L</span><span>50L</span><span>1Cr</span><span>3Cr</span><span>5Cr</span>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-in-up" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ textAlign: "center" }}>
              <h2 style={{ fontFamily: "var(--font-jakarta)", fontWeight: 800, fontSize: "1.5rem", color: "var(--color-text-hi)" }}>Investment Horizon</h2>
              <p style={{ fontSize: "0.875rem", color: "var(--color-text-mid)", marginTop: 4 }}>How long do you plan to hold the investment?</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12 }}>
              {horizons.map((h) => {
                const active = horizon === h;
                return (
                  <button key={h} type="button" onClick={() => setHorizon(h)} style={{ padding: "16px 12px", borderRadius: 12, fontSize: "0.875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", cursor: "pointer", transition: "all 150ms ease", background: active ? "var(--color-ink)" : "var(--color-surface)", color: active ? "#fff" : "var(--color-text-mid)", border: `1px solid ${active ? "var(--color-ink)" : "var(--color-line)"}` }}>
                    {h} {h === 1 ? "Year" : "Years"}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-fade-in-up" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ textAlign: "center" }}>
              <h2 style={{ fontFamily: "var(--font-jakarta)", fontWeight: 800, fontSize: "1.5rem", color: "var(--color-text-hi)" }}>Save Report & Updates</h2>
              <p style={{ fontSize: "0.875rem", color: "var(--color-text-mid)", marginTop: 4 }}>Optional — enter details to receive curated project listings.</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { label: "Full Name", el: <input type="text" placeholder="Nitesh Varma" value={name} onChange={(e) => setName(e.target.value)} className="input-premium w-full text-sm" /> },
                { label: "Email Address", el: <input type="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="input-premium w-full text-sm" /> },
                { label: "Phone Number", el: <input type="tel" placeholder="+91 99999 99999" value={phone} onChange={(e) => setPhone(e.target.value)} className="input-premium w-full text-sm" /> },
              ].map((f) => (
                <div key={f.label}>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 500, color: "var(--color-text-mid)", marginBottom: 6 }}>{f.label}</label>
                  {f.el}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer nav */}
        <div style={{ marginTop: 8, paddingTop: 20, borderTop: "1px solid var(--color-line)", display: "flex", justifyContent: "space-between", gap: 16 }}>
          {step > 1 ? (
            <button type="button" onClick={() => setStep(step - 1)} className="uv-btn uv-btn-ghost" style={{ width: "33%" }}>Back</button>
          ) : (
            <div style={{ width: "33%" }} />
          )}
          <button type="submit" disabled={isLoading} className="uv-btn uv-btn-primary" style={{ flex: 1 }}>
            {isLoading ? "Analyzing…" : step === 3 ? "Generate Report" : "Next Step"}
          </button>
        </div>
      </form>
    </div>
  );
}
