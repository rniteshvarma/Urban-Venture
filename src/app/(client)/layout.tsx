"use client";

import Link from "next/link";
import React from "react";
import { usePathname } from "next/navigation";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isResearchActive = pathname?.startsWith("/research");
  const isMarketActive = pathname?.startsWith("/market");
  const isProjectsActive = pathname?.startsWith("/projects");
  const isCalculatorActive = pathname?.startsWith("/calculator");

  return (
    <div className="flex flex-col min-h-screen bg-luxury-bg">
      {/* Sticky Premium Header */}
      <header className="sticky top-0 z-[100] w-full bg-surface border-b border-luxury shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <span className="font-display text-2xl font-bold tracking-widest text-primary">
                URBAN VENTURES
              </span>
              <span className="text-xs font-semibold text-accent uppercase tracking-wider border-l border-luxury pl-2">
                Advisory
              </span>
            </Link>
            
            <nav className="hidden md:flex items-center gap-6">
              <Link 
                href="/research" 
                className={`text-sm font-medium transition-colors ${
                  isResearchActive 
                    ? "text-primary font-bold border-b-2 border-primary py-4 mt-[2px]" 
                    : "text-text-primary hover:text-accent"
                }`}
              >
                AI Research Tool
              </Link>
              
              {/* Market Intelligence Hover Dropdown */}
              <div className="relative group py-2 z-50">
                <button className={`text-sm font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                  isMarketActive 
                    ? "text-primary font-bold border-b-2 border-primary py-4 mt-[2px]" 
                    : "text-text-primary hover:text-accent"
                }`}>
                  Market Intelligence
                  <svg className="w-3 h-3 transition-transform group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </button>
                <div className="absolute left-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-[4px] shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 py-1.5 z-50 text-slate-800">
                  <Link href="/market" className="block px-4 py-2 text-xs font-bold hover:bg-slate-100 hover:text-blue-650 transition-colors">Corridor Overview</Link>
                  <Link href="/market" className="block px-4 py-2 text-xs font-bold hover:bg-slate-100 hover:text-blue-650 transition-colors">Infrastructure Map</Link>
                  <Link href="/market/approvals" className="block px-4 py-2 text-xs font-bold hover:bg-slate-100 hover:text-blue-650 transition-colors">Approval Records</Link>
                  <Link href="/market/compare" className="block px-4 py-2 text-xs font-bold hover:bg-slate-100 hover:text-blue-650 transition-colors">Compare Corridors</Link>
                </div>
              </div>

              <Link 
                href="/projects" 
                className={`text-sm font-medium transition-colors ${
                  isProjectsActive 
                    ? "text-primary font-bold border-b-2 border-primary py-4 mt-[2px]" 
                    : "text-text-primary hover:text-accent"
                }`}
              >
                Premium Projects
              </Link>
              <Link 
                href="/calculator" 
                className={`text-sm font-medium transition-colors ${
                  isCalculatorActive 
                    ? "text-primary font-bold border-b-2 border-primary py-4 mt-[2px]" 
                    : "text-text-primary hover:text-accent"
                }`}
              >
                ROI Calculator
              </Link>
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            <Link 
              href="/research" 
              className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-xs font-semibold uppercase tracking-wider text-surface bg-primary hover:bg-blue-700 transition-all rounded-[4px]"
            >
              Start Analysis
            </Link>
            <Link 
              href="/admin/dashboard" 
              className="text-xs font-medium text-text-secondary hover:text-primary transition-colors border border-luxury px-3 py-1.5 rounded-[4px]"
            >
              CRM Login
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow flex flex-col">{children}</main>

      {/* Premium Footer */}
      <footer className="bg-primary text-surface border-t border-primary-light py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <span className="font-display text-2xl font-bold tracking-widest text-white">
                URBAN VENTURES
              </span>
              <p className="mt-4 text-sm text-blue-100 max-w-md">
                Next-generation, AI-driven real estate investment advisory for Hyderabad's fastest-growing micro-markets. Providing institutional-grade data to retail investors.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-widest text-white">Quick Links</h4>
              <ul className="mt-4 space-y-2 text-sm text-blue-100">
                <li>
                  <Link href="/research" className="hover:text-surface transition-colors">AI Investment Analysis</Link>
                </li>
                <li>
                  <Link href="/market" className="hover:text-surface transition-colors">Market Intelligence Hub</Link>
                </li>
                <li>
                  <Link href="/market/approvals" className="hover:text-surface transition-colors">Layout Approvals Database</Link>
                </li>
                <li>
                  <Link href="/projects" className="hover:text-surface transition-colors">Corridor Projects</Link>
                </li>
                <li>
                  <Link href="/calculator" className="hover:text-surface transition-colors">ROI Calculator</Link>
                </li>
                <li>
                  <Link href="/admin/login" className="hover:text-surface transition-colors">Partner/CRM Access</Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-widest text-white">Disclaimer</h4>
              <p className="mt-4 text-xs text-blue-100/90 leading-relaxed">
                All recommendations are generated using AI-assisted calculations based on historical market trends and infrastructure plans. Past performance does not guarantee future results. Please perform independent legal due diligence before making investments.
              </p>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-primary-light text-center text-xs text-blue-200 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p>&copy; {new Date().getFullYear()} Urban Ventures Real Estate Advisory. All rights reserved.</p>
            <p className="tracking-wide">Hyderabad · Telangana</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
