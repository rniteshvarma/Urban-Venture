"use client";

import React, { useState, useEffect } from "react";

interface ResearchFormProps {
  onSubmit: (data: {
    budget: number;
    horizon: number;
    city: string;
    name?: string;
    email?: string;
    phone?: string;
  }) => void;
  isLoading: boolean;
}

export default function ResearchForm({ onSubmit, isLoading }: ResearchFormProps) {
  const [budget, setBudget] = useState<number>(50); // Default 50 Lakhs
  const [horizon, setHorizon] = useState<number>(5); // Default 5 years
  const [city, setCity] = useState<string>("Hyderabad");
  
  // Lead info
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const formatBudgetDisplay = (val: number) => {
    if (val < 100) {
      return `₹${val} Lakhs`;
    } else {
      const crVal = (val / 100).toFixed(2);
      return `₹${crVal} Crores`;
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBudget(Number(e.target.value));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    if (val >= 10 && val <= 500) {
      setBudget(val);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      budget,
      horizon,
      city,
      name: name || undefined,
      email: email || undefined,
      phone: phone || undefined,
    });
  };

  const horizons = [1, 2, 3, 5, 7, 10];
  const cities = ["Hyderabad", "Bengaluru", "Chennai", "Mumbai", "Pune"];

  return (
    <form 
      onSubmit={handleSubmit} 
      className="bg-surface border border-luxury p-6 sm:p-8 rounded-card shadow-luxury-soft max-w-2xl w-full mx-auto"
    >
      <div className="space-y-8">
        {/* City Selector */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-3">
            Preferred Target City
          </label>
          <div className="relative">
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full bg-luxury-bg border border-luxury px-4 py-3 rounded-input text-text-primary focus:outline-none focus:border-accent text-sm appearance-none transition-colors"
            >
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-text-secondary">
              ▼
            </div>
          </div>
        </div>

        {/* Budget Selector */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Investment Budget (Lakhs)
            </label>
            <span className="text-sm font-bold text-accent font-display">
              {formatBudgetDisplay(budget)}
            </span>
          </div>
          
          <div className="space-y-4">
            <input
              type="range"
              min="10"
              max="500"
              step="5"
              value={budget}
              onChange={handleSliderChange}
              className="w-full h-1 bg-luxury-border rounded-lg appearance-none cursor-pointer accent-accent"
            />
            
            <div className="flex items-center gap-3">
              <span className="text-xs text-text-secondary">Or enter manually (₹Lakhs):</span>
              <input
                type="number"
                min="10"
                max="500"
                value={budget}
                onChange={handleInputChange}
                className="w-24 bg-luxury-bg border border-luxury px-3 py-1.5 rounded-input text-text-primary font-bold text-sm focus:outline-none focus:border-accent text-center"
              />
              <span className="text-xs text-text-secondary">Min: 10L · Max: 5Cr</span>
            </div>
          </div>
        </div>

        {/* Horizon Selector */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-3">
            Investment Horizon
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {horizons.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setHorizon(h)}
                className={`py-2 px-3 border rounded-tag text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
                  horizon === h
                    ? "bg-primary border-primary text-surface shadow-sm"
                    : "border-luxury hover:border-accent bg-surface text-text-secondary hover:text-accent"
                }`}
              >
                {h} {h === 1 ? "Year" : "Years"}
              </button>
            ))}
          </div>
        </div>

        {/* Separator */}
        <div className="border-t border-luxury my-6 pt-6">
          <h4 className="text-xs font-bold uppercase tracking-widest text-accent mb-2">
            Save Report & Updates (Optional)
          </h4>
          <p className="text-xs text-text-secondary mb-4">
            Enter your details to automatically receive curated project listings matching your parameters.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                placeholder="Nitesh Varma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-luxury-bg border border-luxury px-3 py-2 rounded-input text-sm text-text-primary focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-luxury-bg border border-luxury px-3 py-2 rounded-input text-sm text-text-primary focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Phone Number
              </label>
              <input
                type="tel"
                placeholder="+91 99999 99999"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-luxury-bg border border-luxury px-3 py-2 rounded-input text-sm text-text-primary focus:outline-none focus:border-accent"
              />
            </div>
          </div>
        </div>
        
        {/* Submit */}
        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center py-4 bg-primary hover:bg-primary-light text-surface text-sm font-semibold uppercase tracking-widest rounded-[4px] shadow-luxury disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-surface" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Analyzing {city} Market Data...
              </span>
            ) : (
              "Generate My Investment Report"
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
