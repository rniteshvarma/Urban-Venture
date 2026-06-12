import Link from "next/link";
import React from "react";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-luxury-bg">
      {/* Sticky Premium Header */}
      <header className="sticky top-0 z-40 w-full bg-surface border-b border-luxury shadow-sm">
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
                className="text-sm font-medium text-text-primary hover:text-accent transition-colors"
              >
                AI Research Tool
              </Link>
              <Link 
                href="/projects" 
                className="text-sm font-medium text-text-primary hover:text-accent transition-colors"
              >
                Premium Projects
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
                  <Link href="/projects" className="hover:text-surface transition-colors">Corridor Projects</Link>
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
