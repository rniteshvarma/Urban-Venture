"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { 
  LayoutDashboard, 
  Users, 
  Kanban, 
  Building2, 
  UserCheck, 
  BarChart3, 
  LogOut, 
  Menu, 
  X,
  Sparkles,
  Compass,
  MessageSquare,
  Megaphone,
  Hammer,
  FileCheck,
  TrendingUp,
  TrendingDown,
  Brain,
  ChevronDown,
  ChevronRight,
  User,
  Zap,
  Plug
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const [newLeadsCount, setNewLeadsCount] = useState(0);
  const [staleLeadsCount, setStaleLeadsCount] = useState(0);
  const [isOpen, setIsOpen] = useState(true);
  const [isMarketOpen, setIsMarketOpen] = useState(true);

  // Poll for new leads count and stale count every 30 seconds
  useEffect(() => {
    async function fetchCounts() {
      try {
        const leadsRes = await fetch("/api/admin/leads?status=NEW&limit=1");
        if (leadsRes.ok) {
          const data = await leadsRes.json();
          setNewLeadsCount(data.pagination?.total || 0);
        }

        const pipelineRes = await fetch("/api/admin/pipeline");
        if (pipelineRes.ok) {
          const data = await pipelineRes.json();
          setStaleLeadsCount(data.staleCount || 0);
        }
      } catch (err) {
        console.error("Failed to fetch counts in sidebar", err);
      }
    }
    
    fetchCounts();
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    {
      name: "Dashboard",
      path: "/admin/dashboard",
      icon: <LayoutDashboard size={17} />,
    },
    {
      name: "Leads",
      path: "/admin/leads",
      icon: <Users size={17} />,
      badge: newLeadsCount > 0 ? newLeadsCount : undefined,
      badgeType: "new"
    },
    {
      name: "Personas",
      path: "/admin/personas",
      icon: <Sparkles size={17} />,
    },
    {
      name: "Matches",
      path: "/admin/matches",
      icon: <Compass size={17} />,
    },
    {
      name: "WhatsApp",
      path: "/admin/whatsapp",
      icon: <MessageSquare size={17} />,
    },
    {
      name: "Integrations",
      path: "/admin/integrations",
      icon: <Plug size={17} />,
    },
    {
      name: "Broadcasts",
      path: "/admin/broadcasts",
      icon: <Megaphone size={17} />,
    },
    {
      name: "Pipeline",
      path: "/admin/pipeline",
      icon: <Kanban size={17} />,
      badge: staleLeadsCount > 0 ? staleLeadsCount : undefined,
      badgeType: "stale"
    },
    {
      name: "Projects",
      path: "/admin/projects",
      icon: <Building2 size={17} />,
    },
    {
      name: "Customers",
      path: "/admin/customers",
      icon: <UserCheck size={17} />,
    },
    {
      name: "Analytics",
      path: "/admin/analytics",
      icon: <BarChart3 size={17} />,
    },
  ];

  const marketItems = [
    {
      name: "Infra Projects",
      path: "/admin/infrastructure/projects",
      icon: <Hammer size={16} />,
    },
    {
      name: "Approvals",
      path: "/admin/infrastructure/approvals",
      icon: <FileCheck size={16} />,
    },
    {
      name: "Price History",
      path: "/admin/infrastructure/appreciation",
      icon: <TrendingUp size={16} />,
    },
    {
      name: "Demand Trends",
      path: "/admin/infrastructure/demand",
      icon: <TrendingDown size={16} />,
    },
    {
      name: "Intelligence Scores",
      path: "/admin/infrastructure/intelligence",
      icon: <Brain size={16} />,
    },
  ];

  const handleLogout = () => {
    signOut({ callbackUrl: "/admin/login" });
  };

  return (
    <>
      {/* Mobile Top Nav */}
      <div className="md:hidden flex items-center justify-between bg-white border-b border-[#E8E5F5] text-[#1A1A2E] px-4 py-3 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#7C6EF5] to-[#5B4FE0] flex items-center justify-center text-white font-bold shadow-md shadow-[#5B4FE0]/30">
            <Zap size={16} />
          </div>
          <span className="font-display text-base font-bold text-[#1A1A2E]">
            Urban<span className="text-[#5B4FE0]">AI</span>
          </span>
        </div>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="text-[#6E6D8A] hover:text-[#1A1A2E] p-1.5 focus:outline-none transition-colors rounded-lg bg-[#F4F0FF]"
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Sidebar Panel */}
      <aside 
        className={`${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 transition-transform duration-300 fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-[#E8E5F5] flex flex-col justify-between pt-16 md:pt-0 pb-6 shadow-[4px_0_24px_rgba(0,0,0,0.02)]`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Brand Logo Section */}
          <div className="hidden md:flex items-center justify-between px-6 py-6 border-b border-[#F0EDFA] shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#7C6EF5] to-[#5B4FE0] flex items-center justify-center text-white shadow-md shadow-[#5B4FE0]/30">
                <Zap size={18} />
              </div>
              <div>
                <span className="font-display text-lg font-bold text-[#1A1A2E] leading-none block">
                  Urban<span className="text-[#5B4FE0]">AI</span>
                </span>
                <span className="text-[10px] font-semibold text-[#8A8A9E] block mt-0.5">Real Estate CRM</span>
              </div>
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100 animate-pulse" title="System Active" />
          </div>

          {/* Navigation Links */}
          <div className="flex-1 overflow-y-auto scrollbar-thin mt-4 px-4 space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#A09EC0] px-3 mb-2">Main Console</div>
            
            <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.path || pathname?.startsWith(`${item.path}/`);
              return (
                <Link
                  key={item.name}
                  href={item.path}
                  className={`flex items-center justify-between px-4 py-2.5 text-xs font-semibold rounded-full transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-[#7C6EF5] to-[#5B4FE0] text-white shadow-md shadow-[#5B4FE0]/30"
                      : "text-[#6E6D8A] hover:bg-[#F4F0FF] hover:text-[#5B4FE0]"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className={isActive ? "text-white" : "text-[#8A8A9E]"}>
                      {item.icon}
                    </span>
                    <span>{item.name}</span>
                  </span>
                  
                  {item.badge !== undefined && (
                    <span className={`${
                      item.badgeType === "stale" 
                        ? "bg-rose-100 text-rose-700 font-bold" 
                        : isActive ? "bg-white/20 text-white" : "bg-[#EEEDF7] text-[#5B4FE0]"
                      } text-[10px] font-bold px-2 py-0.5 rounded-full`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
            </nav>

            {/* Market Data Section */}
            <div className="pt-6 pb-1">
              <button 
                onClick={() => setIsMarketOpen(!isMarketOpen)}
                className="w-full flex items-center justify-between px-3 group"
              >
                <span className="text-[10px] font-bold text-[#A09EC0] uppercase tracking-wider group-hover:text-[#5B4FE0] transition-colors">Market Intelligence</span>
                {isMarketOpen ? (
                  <ChevronDown size={14} className="text-[#A09EC0] group-hover:text-[#5B4FE0] transition-colors" />
                ) : (
                  <ChevronRight size={14} className="text-[#A09EC0] group-hover:text-[#5B4FE0] transition-colors" />
                )}
              </button>
            </div>
            
            <div className={`space-y-1 overflow-hidden transition-all duration-300 ease-in-out ${isMarketOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
              {marketItems.map((item) => {
                const isActive = pathname === item.path || pathname?.startsWith(`${item.path}/`);
                return (
                  <Link
                    key={item.name}
                    href={item.path}
                    className={`flex items-center justify-between px-4 py-2 text-xs font-semibold rounded-full transition-all ${
                      isActive
                        ? "bg-gradient-to-r from-[#7C6EF5] to-[#5B4FE0] text-white shadow-md shadow-[#5B4FE0]/30"
                        : "text-[#6E6D8A] hover:bg-[#F4F0FF] hover:text-[#5B4FE0]"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span className={isActive ? "text-white" : "text-[#8A8A9E]"}>
                        {item.icon}
                      </span>
                      <span>{item.name}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* User Profile & Sign Out Block with Circular Avatar Ring */}
          <div className="shrink-0 px-4 border-t border-[#F0EDFA] pt-4 mt-2">
            <div className="flex items-center gap-3 px-2 py-2 mb-2 bg-[#F9F8FD] rounded-2xl p-2">
              <div className="crm-avatar-ring shrink-0">
                <div className="w-9 h-9 rounded-full bg-[#EBE7F5] flex items-center justify-center text-[#5B4FE0] font-bold text-xs">
                  <User size={18} />
                </div>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-[#1A1A2E] truncate">Admin Executive</span>
                <span className="text-[10px] font-semibold text-[#8A8A9E]">Superadmin Access</span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-[#8A8A9E] hover:text-rose-600 hover:bg-rose-50 rounded-full transition-all border border-[#EBE7F5]"
            >
              <LogOut size={15} className="text-current" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>
      
      {/* Sidebar Overlay (Mobile only) */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="md:hidden fixed inset-0 bg-[#1A1A2E]/40 backdrop-blur-xs z-30"
        />
      )}
    </>
  );
}
