"use client";

import React, { useState } from "react";
import { ArrowRight, MapPin, Wallet, Clock, User } from "lucide-react";

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
  const [step, setStep] = useState(1);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 3) {
      setStep(step + 1);
      return;
    }
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
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in-up">
      {/* Progress Indicator */}
      <div className="flex items-center justify-between relative px-6 py-3 max-w-lg mx-auto">
        <div className="absolute left-10 right-10 top-1/2 -translate-y-1/2 h-1 bg-slate-200 z-0 rounded-full"></div>
        <div 
          className="absolute left-10 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-blue-600 to-indigo-600 z-0 transition-all duration-300 rounded-full"
          style={{ width: `${((step - 1) / 2) * 78}%` }}
        ></div>
        
        {[1, 2, 3].map((num) => (
          <div key={num} className="relative z-10 flex flex-col items-center gap-1.5 bg-[#F4F3FA] px-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
              step >= num 
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 scale-105" 
                : "bg-white border-2 border-slate-200 text-slate-400"
            }`}>
              {num}
            </div>
            <span className={`text-[10px] uppercase tracking-widest font-extrabold ${
              step >= num ? "text-blue-600" : "text-slate-400"
            }`}>
              {num === 1 ? "Location" : num === 2 ? "Parameters" : "Details"}
            </span>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-6">
        
        {/* Step 1: City Selection */}
        {step === 1 && (
          <div className="space-y-8 animate-fade-in">
            <div>
              <h2 className="font-display text-xl font-extrabold text-slate-900 mb-1">Target Location</h2>
              <p className="text-xs text-slate-500">Select your preferred investment destination</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
              {cities.map((c) => (
                <div 
                  key={c}
                  onClick={() => setCity(c)}
                  className={`cursor-pointer rounded-xl border p-4 flex flex-col items-center justify-center gap-2.5 transition-all duration-200 ${
                    city === c 
                      ? "border-blue-600 bg-blue-50/60 text-blue-700 shadow-sm ring-2 ring-blue-600/20 font-bold" 
                      : "border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50 text-slate-600 font-semibold"
                  }`}
                >
                  <MapPin className={`w-5 h-5 ${city === c ? "text-blue-600" : "text-slate-400"}`} />
                  <span className="text-sm">
                    {c}
                  </span>
                </div>
              ))}
            </div>

            {/* Budget Selector */}
            <div className="pt-4 border-t border-slate-100">
              <div className="flex justify-between items-center mb-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Investment Budget
                </label>
                <span className="text-xl font-black text-blue-600 font-display">
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
                  onChange={(e) => setBudget(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                
                <div className="flex justify-between items-center text-xs font-semibold text-slate-400 pt-1">
                  <span>10L</span>
                  <span>50L</span>
                  <span>1Cr</span>
                  <span>3Cr</span>
                  <span>5Cr</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8 animate-fade-in-up">
            <div className="text-center mb-6">
              <h2 className="font-display text-2xl font-bold text-primary mb-2">Investment Horizon</h2>
              <p className="text-sm text-text-secondary">How long do you plan to hold the investment?</p>
            </div>

            {/* Horizon Selector */}
            <div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {horizons.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setHorizon(h)}
                    className={`py-4 px-3 border rounded-[8px] text-sm font-bold uppercase tracking-wider transition-all duration-300 ${
                      horizon === h
                        ? "bg-primary border-primary text-surface shadow-md transform scale-105"
                        : "border-luxury hover:border-accent bg-surface text-text-secondary hover:text-primary"
                    }`}
                  >
                    {h} {h === 1 ? "Year" : "Years"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8 animate-fade-in-up">
            <div className="text-center mb-6">
              <h2 className="font-display text-2xl font-bold text-primary mb-2">Save Report & Updates (Optional)</h2>
              <p className="text-sm text-text-secondary">Enter details to automatically receive curated project listings.</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="Nitesh Varma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-premium w-full text-sm"
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
                  className="input-premium w-full text-sm"
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
                  className="input-premium w-full text-sm"
                />
              </div>
            </div>
          </div>
        )}
      
      {/* Footer Navigation */}
      <div className="mt-8 pt-6 border-t border-luxury flex justify-between gap-4">
        {step > 1 ? (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="btn-secondary w-1/3"
          >
            Back
          </button>
        ) : (
          <div className="w-1/3"></div> // spacer
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary flex-1"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4 text-surface" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Analyzing...
            </span>
          ) : step === 3 ? (
            "Generate Report"
          ) : (
            "Next Step"
          )}
        </button>
      </div>
    </form>
    </div>
  );
}
