"use client";

export const dynamic = "force-dynamic";

import Sidebar from "@/components/admin/Sidebar";
import { usePathname } from "next/navigation";
import Link from "next/link";
import React, { useEffect, useState } from "react";
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

            <NewLeadsBell />
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

/** Header bell: new (uncontacted) leads. The dot only shows when there are some. */
function NewLeadsBell() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const load = () =>
      fetch("/api/admin/leads?status=NEW&limit=1")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => !cancelled && setCount(d?.pagination?.total || 0))
        .catch(() => {});
    load();
    const t = setInterval(load, 60000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);
  const label = count > 0 ? `${count} new lead${count === 1 ? "" : "s"}` : "No new leads";
  return (
    <Link
      href="/admin/leads?status=NEW"
      aria-label={label}
      title={label}
      className="w-9 h-9 rounded-full bg-[#F4F0FF] text-[#5B4FE0] flex items-center justify-center hover:bg-[#EBE5FB] transition-colors relative"
    >
      <Bell size={16} />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
