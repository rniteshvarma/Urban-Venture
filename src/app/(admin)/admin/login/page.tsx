"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Wordmark } from "@/components/ui";

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
    <div className="min-h-screen flex bg-surface">
      {/* Left side - Branding/Imagery */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-primary flex-col justify-between p-12 overflow-hidden">
        <div 
          className="absolute inset-0 z-0 opacity-40 bg-cover bg-center"
          style={{ backgroundImage: "url('/images/crm-login-bg.jpg')" }}
        />
        <div className="absolute inset-0 z-0 gradient-hero opacity-90" />
        
        <div className="relative z-10">
          <Wordmark className="font-display text-3xl font-bold tracking-widest text-white" gap="0.2em" />

          <div className="mt-2 text-accent-light text-sm font-medium tracking-wide uppercase">
            Exclusive Real Estate Intelligence
          </div>
        </div>

        <div className="relative z-10 max-w-md animate-fade-in-up">
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-white leading-tight">
            Property Tiger CRM
          </h1>
          <p className="mt-4 text-lg text-white/80 font-sans">
            Streamline your investment pipeline, manage high-value leads, and monitor premium real estate portfolios from a single command center.
          </p>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 animate-fade-in">
        <div className="max-w-md w-full space-y-8">
          
          <div className="text-center lg:text-left">
            <span className="lg:hidden block mb-6">
              <Wordmark className="font-display text-2xl font-bold tracking-widest text-primary" gap="0.2em" />
            </span>
            <h2 className="text-3xl font-bold text-text-primary font-display">
              Welcome back
            </h2>
            <p className="mt-2 text-sm text-text-secondary">
              Please enter your admin credentials to securely access the CRM console.
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
                  Admin Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-premium w-full"
                  placeholder="admin@propertytiger.com"
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
                  Security Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-premium w-full"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="text-sm text-danger font-semibold bg-danger/10 p-3 rounded-[8px] flex items-center gap-2">
                <span className="text-lg">⚠️</span> {errorMsg}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full py-3 text-sm font-bold shadow-glow-cyan"
              >
                {isLoading ? "Authenticating..." : "Sign In to Console"}
              </button>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-luxury text-center">
            <p className="text-xs text-text-tertiary">
              &copy; {new Date().getFullYear()} Property Tiger. Secure Internal Access Only.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
