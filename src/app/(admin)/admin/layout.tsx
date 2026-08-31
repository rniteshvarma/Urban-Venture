"use client";

export const dynamic = "force-dynamic";

import Sidebar from "@/components/admin/Sidebar";
import { usePathname } from "next/navigation";
import Link from "next/link";
import React from "react";
import { Sparkles, Bell } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/admin/login";

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
        {/* Top pill header */}
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

          {/* Right: Quick actions & notifications */}
          <div className="flex items-center gap-3">
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

      </main>
    </div>
  );
}
