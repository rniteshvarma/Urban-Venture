"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("Please enter both email and password.");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setErrorMsg("Invalid email or password.");
      } else {
        router.push("/admin/dashboard");
      }
    } catch (err) {
      setErrorMsg("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-luxury-bg py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-surface border border-luxury p-8 rounded-card shadow-luxury-soft">
        
        {/* Header Branding */}
        <div className="text-center">
          <span className="font-display text-4xl font-bold tracking-widest text-primary">
            A U R A
          </span>
          <h2 className="mt-6 text-xl font-bold text-primary uppercase tracking-wider">
            CRM Portal Login
          </h2>
          <p className="mt-2 text-xs text-text-secondary">
            Authorized admin credentials required to access investment lead logs.
          </p>
        </div>

        {/* Login Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1">
                Admin Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-luxury-bg border border-luxury px-3.5 py-2.5 rounded-input text-sm text-text-primary focus:outline-none focus:border-accent"
                placeholder="admin@realestate.com"
              />
            </div>
            
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1">
                Security Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-luxury-bg border border-luxury px-3.5 py-2.5 rounded-input text-sm text-text-primary focus:outline-none focus:border-accent"
                placeholder="••••••••"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="text-xs text-red-600 font-semibold text-center">
              ⚠️ {errorMsg}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 bg-primary hover:bg-primary-light text-surface text-xs font-bold uppercase tracking-widest rounded-[4px] shadow-luxury transition-all disabled:opacity-50"
            >
              {isLoading ? "Authenticating..." : "Sign In to Console"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
