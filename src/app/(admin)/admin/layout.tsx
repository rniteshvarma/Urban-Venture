"use client";

export const dynamic = "force-dynamic";

import Sidebar from "@/components/admin/Sidebar";
import { usePathname } from "next/navigation";
import Link from "next/link";
import React, { useState } from "react";
import { Sparkles, Search, Bell, SlidersHorizontal, MessageSquare, Compass, X } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/admin/login";
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiQuery, setAiQuery] = useState("");

  if (isLoginPage) {
    return <div className="min-h-screen bg-[#F0EEFA]">{children}</div>;
  }

  const topNavTabs = [
    { label: "Overview", href: "/admin/dashboard" },
    { label: "Leads", href: "/admin/leads" },
    { label: "Projects", href: "/admin/projects" },
    { label: "Pipeline", href: "/admin/pipeline" },
    { label: "Analytics", href: "/admin/analytics" },
  ];

  return (
    <div className="min-h-screen bg-[#F0EEFA] text-[#1A1A2E] flex flex-col md:flex-row">
      {/* Sidebar Panel */}
      <Sidebar />
      
      {/* Content Area */}
      <main className="flex-grow min-w-0 md:pl-64 flex flex-col min-h-screen">
        {/* LoopAI Top Pill Header */}
        <header className="h-16 border-b border-[#E8E5F5] bg-white/80 backdrop-blur-md flex items-center justify-between px-6 lg:px-8 shrink-0 sticky top-0 z-20 hidden md:flex">
          {/* Left: Top Navigation Pill Bar */}
          <div className="flex items-center gap-6">
            <div className="crm-pill-nav">
              {topNavTabs.map((tab) => {
                const isActive = pathname === tab.href || pathname?.startsWith(`${tab.href}/`);
                return (
                  <Link
                    key={tab.label}
                    href={tab.href}
                    className={isActive ? "crm-pill-tab crm-pill-tab-active" : "crm-pill-tab"}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right: AI Quick Launcher & Notifications */}
          <div className="flex items-center gap-3">
            {/* Search / AI Companion Trigger */}
            <div className="relative">
              <input
                type="text"
                placeholder="Ask AI Companion..."
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                onFocus={() => setShowAiModal(true)}
                className="w-56 lg:w-64 bg-[#F4F0FF] border border-[#E4DCFF] rounded-full py-1.5 pl-9 pr-8 text-xs text-[#1A1A2E] placeholder-[#8A8A9E] focus:outline-none focus:ring-2 focus:ring-[#5B4FE0]/30 focus:border-[#5B4FE0] transition-all"
              />
              <Sparkles className="w-3.5 h-3.5 text-[#5B4FE0] absolute left-3.5 top-1/2 -translate-y-1/2" />
              {aiQuery && (
                <button 
                  onClick={() => setAiQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A8A9E] hover:text-[#1A1A2E]"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Quick Action Pill Button */}
            <Link
              href="/admin/broadcasts/new"
              className="crm-btn-primary text-xs py-1.5 px-4 flex items-center gap-1.5 shadow-sm"
            >
              <Sparkles size={14} /> New Campaign
            </Link>

            <button className="w-9 h-9 rounded-full bg-[#F4F0FF] text-[#5B4FE0] flex items-center justify-center hover:bg-[#EBE5FB] transition-colors relative">
              <Bell size={16} />
              <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-2 right-2 border-2 border-white" />
            </button>
          </div>
        </header>

        {/* Page Content Canvas */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 animate-fade-in space-y-6">
          {children}
        </div>

        {/* Persistent AI Companion Floating Trigger (Bottom Right) */}
        <div className="fixed bottom-6 right-6 z-30 hidden lg:block">
          <button
            onClick={() => setShowAiModal(!showAiModal)}
            className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-[#7C6EF5] to-[#5B4FE0] text-white font-bold text-xs rounded-full shadow-lg shadow-[#5B4FE0]/40 hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span>LoopAI Companion</span>
          </button>
        </div>

        {/* Embedded AI Assistant Companion Drawer / Modal */}
        {showAiModal && (
          <div className="fixed bottom-20 right-6 z-40 w-96 crm-card p-6 border border-[#E0D7FF] shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0EDFA]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#7C6EF5] to-[#5B4FE0] text-white flex items-center justify-center">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h4 className="font-display font-bold text-sm text-[#1A1A2E]">How can I help you?</h4>
                  <span className="text-[10px] text-[#8A8A9E]">Persistent Real Estate AI Companion</span>
                </div>
              </div>
              <button 
                onClick={() => setShowAiModal(false)}
                className="text-[#8A8A9E] hover:text-[#1A1A2E] p-1 rounded-full hover:bg-[#F4F0FF]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button className="p-3 rounded-xl bg-[#F4F0FF] text-[#5B4FE0] font-semibold text-left hover:bg-[#EBE5FB] transition-colors space-y-1">
                <div className="text-[10px] uppercase text-[#8A8A9E]">Leads</div>
                <div>Filter Hot Leads</div>
              </button>
              <button className="p-3 rounded-xl bg-[#F4F0FF] text-[#5B4FE0] font-semibold text-left hover:bg-[#EBE5FB] transition-colors space-y-1">
                <div className="text-[10px] uppercase text-[#8A8A9E]">Market</div>
                <div>Analyze Corridors</div>
              </button>
              <button className="p-3 rounded-xl bg-[#F4F0FF] text-[#5B4FE0] font-semibold text-left hover:bg-[#EBE5FB] transition-colors space-y-1">
                <div className="text-[10px] uppercase text-[#8A8A9E]">Campaigns</div>
                <div>Draft WhatsApp</div>
              </button>
              <button className="p-3 rounded-xl bg-[#F4F0FF] text-[#5B4FE0] font-semibold text-left hover:bg-[#EBE5FB] transition-colors space-y-1">
                <div className="text-[10px] uppercase text-[#8A8A9E]">Pipeline</div>
                <div>Resolve Stale Leads</div>
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Ask something about leads or projects..."
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                className="w-full bg-[#F9F8FD] border border-[#E8E5F5] rounded-full py-2.5 pl-4 pr-10 text-xs text-[#1A1A2E] placeholder-[#8A8A9E] focus:outline-none focus:border-[#5B4FE0]"
              />
              <button className="w-7 h-7 rounded-full bg-gradient-to-r from-[#7C6EF5] to-[#5B4FE0] text-white flex items-center justify-center absolute right-1.5 top-1/2 -translate-y-1/2 shadow-xs">
                <Sparkles size={14} />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
