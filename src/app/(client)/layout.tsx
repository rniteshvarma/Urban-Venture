"use client";

import Link from "next/link";
import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Menu, X, Globe, ExternalLink, Share2, Link2, ChevronDown } from "lucide-react";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isResearchActive = pathname?.startsWith("/research");
  const isMarketActive = pathname?.startsWith("/market");
  const isProjectsActive = pathname?.startsWith("/projects");
  const isCalculatorActive = pathname?.startsWith("/calculator");

  return (
    <div className="flex flex-col min-h-screen bg-luxury-bg">
      {/* Sticky Dark Glass Header */}
      <header 
        className={`sticky top-0 z-[100] w-full transition-all duration-300 ${
          isScrolled 
            ? "glass-header-scrolled" 
            : "glass-header"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <Link href="/" className="flex items-center gap-1 group">
              <span className="font-display text-2xl font-bold tracking-tight text-white">
                URBAN VENTURES<span className="text-[#00B4D8]">.</span>
              </span>
              <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest ml-2 border-l border-white/20 pl-2">
                Advisory
              </span>
            </Link>
            
            <nav className="hidden lg:flex items-center gap-8">
              <Link 
                href="/research" 
                className={`text-sm font-medium transition-all duration-200 hover:text-[#00B4D8] relative py-1 ${
                  isResearchActive 
                    ? "text-[#00B4D8] font-bold after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#00B4D8] after:rounded-full" 
                    : "text-white/80"
                }`}
              >
                AI Research Tool
              </Link>
              
              {/* Market Intelligence Hover Dropdown */}
              <div className="relative group py-6 z-50">
                <button className={`text-sm font-medium transition-all duration-200 hover:text-[#00B4D8] flex items-center gap-1.5 cursor-pointer ${
                  isMarketActive 
                    ? "text-[#00B4D8] font-bold" 
                    : "text-white/80"
                }`}>
                  Market Intelligence
                  <ChevronDown className="w-3.5 h-3.5 transition-transform duration-200 group-hover:rotate-180 opacity-70" />
                </button>
                <div className="absolute left-0 top-full w-60 bg-[#0B1D3A]/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 overflow-hidden flex flex-col p-2">
                  <Link href="/market" className="px-4 py-2.5 text-xs font-semibold text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors">Corridor Overview</Link>
                  <Link href="/market" className="px-4 py-2.5 text-xs font-semibold text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors">Infrastructure Map</Link>
                  <Link href="/market/approvals" className="px-4 py-2.5 text-xs font-semibold text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors">Approval Records</Link>
                  <Link href="/market/compare" className="px-4 py-2.5 text-xs font-semibold text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors">Compare Corridors</Link>
                </div>
              </div>

              <Link 
                href="/projects" 
                className={`text-sm font-medium transition-all duration-200 hover:text-[#00B4D8] relative py-1 ${
                  isProjectsActive 
                    ? "text-[#00B4D8] font-bold after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#00B4D8] after:rounded-full" 
                    : "text-white/80"
                }`}
              >
                Premium Projects
              </Link>
              <Link 
                href="/calculator" 
                className={`text-sm font-medium transition-all duration-200 hover:text-[#00B4D8] relative py-1 ${
                  isCalculatorActive 
                    ? "text-[#00B4D8] font-bold after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#00B4D8] after:rounded-full" 
                    : "text-white/80"
                }`}
              >
                ROI Calculator
              </Link>
            </nav>
          </div>
          
          <div className="hidden lg:flex items-center gap-3">
            <Link 
              href="/admin/dashboard" 
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-5 py-2.5 rounded-full text-xs font-bold transition-all backdrop-blur-xs"
            >
              CRM Login
            </Link>
            <Link 
              href="/research" 
              className="bg-gradient-to-r from-[#00B4D8] to-[#0090AD] hover:from-[#00C4E8] hover:to-[#00A0BD] text-white shadow-lg shadow-[#00B4D8]/20 px-5 py-2.5 rounded-full text-xs font-bold transition-all"
            >
              Start Analysis
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden flex items-center">
            <button
              type="button"
              className="p-2 text-white/80 hover:text-white transition-colors"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[200] lg:hidden">
          {/* Dark overlay backdrop */}
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm animate-fade-in transition-opacity" 
            onClick={() => setMobileMenuOpen(false)}
          ></div>
          
          {/* Slide-in drawer */}
          <div className="fixed inset-y-0 right-0 w-[80%] max-w-sm bg-[#0B1D3A] text-white shadow-2xl flex flex-col animate-slide-in-right border-l border-white/10">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <span className="font-display text-lg font-bold text-white">Menu</span>
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-white/60 hover:text-white rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-6">
              <nav className="flex flex-col gap-4">
                <Link href="/research" onClick={() => setMobileMenuOpen(false)} className={`text-base font-medium ${isResearchActive ? "text-[#00B4D8]" : "text-white/80"}`}>AI Research Tool</Link>
                <div className="py-2">
                  <p className="text-base font-medium text-white mb-3">Market Intelligence</p>
                  <div className="flex flex-col gap-3 pl-4 border-l-2 border-white/10">
                    <Link href="/market" onClick={() => setMobileMenuOpen(false)} className="text-sm text-white/70 hover:text-white">Corridor Overview</Link>
                    <Link href="/market" onClick={() => setMobileMenuOpen(false)} className="text-sm text-white/70 hover:text-white">Infrastructure Map</Link>
                    <Link href="/market/approvals" onClick={() => setMobileMenuOpen(false)} className="text-sm text-white/70 hover:text-white">Approval Records</Link>
                    <Link href="/market/compare" onClick={() => setMobileMenuOpen(false)} className="text-sm text-white/70 hover:text-white">Compare Corridors</Link>
                  </div>
                </div>
                <Link href="/projects" onClick={() => setMobileMenuOpen(false)} className={`text-base font-medium ${isProjectsActive ? "text-[#00B4D8]" : "text-white/80"}`}>Premium Projects</Link>
                <Link href="/calculator" onClick={() => setMobileMenuOpen(false)} className={`text-base font-medium ${isCalculatorActive ? "text-[#00B4D8]" : "text-white/80"}`}>ROI Calculator</Link>
              </nav>
              
              <div className="mt-auto pt-6 border-t border-white/10 flex flex-col gap-3">
                <Link href="/research" onClick={() => setMobileMenuOpen(false)} className="bg-gradient-to-r from-[#00B4D8] to-[#0090AD] text-white w-full text-center justify-center py-3 rounded-full font-bold text-xs shadow-lg shadow-[#00B4D8]/20">Start Analysis</Link>
                <Link href="/admin/dashboard" onClick={() => setMobileMenuOpen(false)} className="bg-white/10 text-white border border-white/20 w-full text-center justify-center py-3 rounded-full font-bold text-xs">CRM Login</Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-grow flex flex-col">{children}</main>

      {/* Premium Footer */}
      <footer className="gradient-dark-footer py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
            {/* Column 1: About */}
            <div className="flex flex-col gap-6 text-text-inverse">
              <div>
                <span className="font-display text-2xl font-bold tracking-tight text-text-inverse">
                  URBAN VENTURES<span className="text-[#00B4D8]">.</span>
                </span>
                <p className="mt-4 text-sm text-text-inverse/70 opacity-70 leading-relaxed">
                  Next-generation, AI-driven real estate investment advisory for Hyderabad's fastest-growing micro-markets. Providing institutional-grade data to retail investors.
                </p>
              </div>
              <div className="flex gap-4 items-center">
                <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-accent/20 hover:text-accent transition-colors text-text-inverse/70 opacity-70">
                  <Globe className="w-4 h-4" />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-accent/20 hover:text-accent transition-colors text-text-inverse/70 opacity-70">
                  <ExternalLink className="w-4 h-4" />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-accent/20 hover:text-accent transition-colors text-text-inverse/70 opacity-70">
                  <Share2 className="w-4 h-4" />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-accent/20 hover:text-accent transition-colors text-text-inverse/70 opacity-70">
                  <Link2 className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Column 2: Quick Links */}
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-text-inverse mb-6">Quick Links</h4>
              <ul className="space-y-3 text-sm text-text-inverse/70 opacity-70">
                <li>
                  <Link href="/research" className="hover:text-[#00B4D8] transition-colors">AI Investment Analysis</Link>
                </li>
                <li>
                  <Link href="/projects" className="hover:text-[#00B4D8] transition-colors">Premium Projects</Link>
                </li>
                <li>
                  <Link href="/calculator" className="hover:text-[#00B4D8] transition-colors">ROI Calculator</Link>
                </li>
                <li>
                  <Link href="/admin/login" className="hover:text-[#00B4D8] transition-colors">Partner/CRM Access</Link>
                </li>
              </ul>
            </div>

            {/* Column 3: Market Intelligence */}
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-text-inverse mb-6">Market Intelligence</h4>
              <ul className="space-y-3 text-sm text-text-inverse/70 opacity-70">
                <li>
                  <Link href="/market" className="hover:text-[#00B4D8] transition-colors">Market Intelligence Hub</Link>
                </li>
                <li>
                  <Link href="/market" className="hover:text-[#00B4D8] transition-colors">Corridor Overview</Link>
                </li>
                <li>
                  <Link href="/market/approvals" className="hover:text-[#00B4D8] transition-colors">Layout Approvals Database</Link>
                </li>
                <li>
                  <Link href="/market/compare" className="hover:text-[#00B4D8] transition-colors">Compare Corridors</Link>
                </li>
              </ul>
            </div>

            {/* Column 4: Contact */}
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-text-inverse mb-6">Contact</h4>
              <ul className="space-y-3 text-sm text-text-inverse/70 opacity-70">
                <li>Hyderabad, Telangana</li>
                <li>info@urbanventures.com</li>
                <li>+91 98765 43210</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-16 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="badge badge-premium bg-white/10 border-white/20 text-white/90 text-[10px]">
                Powered by AI Intelligence
              </div>
            </div>
            
            <p className="text-xs text-text-inverse/50 opacity-50 text-center md:text-left max-w-2xl leading-relaxed">
              <strong>Disclaimer:</strong> All recommendations are generated using AI-assisted calculations based on historical market trends and infrastructure plans. Past performance does not guarantee future results. Please perform independent legal due diligence before making investments.
            </p>
            
            <p className="text-xs text-text-inverse/60 opacity-60">
              &copy; {new Date().getFullYear()} Urban Ventures. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
