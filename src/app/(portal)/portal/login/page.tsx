"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";

export default function PortalLoginPage() {
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
        callbackUrl: "/portal",
      });

      if (res?.error) {
        setErrorMsg("Invalid email or password.");
      } else if (res?.ok) {
        router.push("/portal");
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
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-indigo-600 to-violet-600 flex-col justify-between p-12 overflow-hidden">
        <div className="relative z-10 flex items-center gap-2 text-white">
          <Building2 size={32} />
          <span className="font-display text-3xl font-bold tracking-wider">
            UrbanAI
          </span>
        </div>

        <div className="relative z-10 max-w-md animate-fade-in-up">
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-white leading-tight">
            Your Premium Real Estate Portfolio
          </h1>
          <p className="mt-4 text-lg text-white/80 font-sans">
            Track investments, monitor property appreciation, and stay updated with your exclusive real estate assets seamlessly.
          </p>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 animate-fade-in">
        <div className="max-w-md w-full space-y-8">
          
          <div className="text-center lg:text-left">
            <div className="lg:hidden flex items-center justify-center lg:justify-start gap-2 text-indigo-600 mb-6">
              <Building2 size={28} />
              <span className="font-display text-2xl font-bold tracking-wider">
                UrbanAI
              </span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 font-display">
              Welcome back
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Access your property portfolio
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="client@example.com"
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="text-sm text-red-600 font-semibold bg-red-50 p-3 rounded-lg flex items-center gap-2 border border-red-100">
                <span className="text-lg">⚠️</span> {errorMsg}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? "Authenticating..." : "Sign In"}
              </button>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">
              &copy; {new Date().getFullYear()} Property Tiger. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
