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
  Megaphone
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const [newLeadsCount, setNewLeadsCount] = useState(0);
  const [staleLeadsCount, setStaleLeadsCount] = useState(0);
  const [isOpen, setIsOpen] = useState(true);

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
      icon: <LayoutDashboard size={16} />,
    },
    {
      name: "Leads",
      path: "/admin/leads",
      icon: <Users size={16} />,
      badge: newLeadsCount > 0 ? newLeadsCount : undefined,
      badgeType: "new"
    },
    {
      name: "Personas",
      path: "/admin/personas",
      icon: <Sparkles size={16} />,
    },
    {
      name: "Matches",
      path: "/admin/matches",
      icon: <Compass size={16} />,
    },
    {
      name: "WhatsApp",
      path: "/admin/whatsapp",
      icon: <MessageSquare size={16} />,
    },
    {
      name: "Broadcasts",
      path: "/admin/broadcasts",
      icon: <Megaphone size={16} />,
    },
    {
      name: "Pipeline",
      path: "/admin/pipeline",
      icon: <Kanban size={16} />,
      badge: staleLeadsCount > 0 ? staleLeadsCount : undefined,
      badgeType: "stale"
    },
    {
      name: "Projects",
      path: "/admin/projects",
      icon: <Building2 size={16} />,
    },
    {
      name: "Customers",
      path: "/admin/customers",
      icon: <UserCheck size={16} />,
    },
    {
      name: "Analytics",
      path: "/admin/analytics",
      icon: <BarChart3 size={16} />,
    },
  ];

  const handleLogout = () => {
    signOut({ callbackUrl: "/admin/login" });
  };

  return (
    <>
      {/* Mobile Top Nav (visible only on mobile) */}
      <div className="md:hidden flex items-center justify-between bg-white border-b border-slate-200 text-slate-900 px-4 py-3 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <span className="font-sans text-sm font-bold tracking-wider text-blue-650">URBAN VENTURES</span>
          <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">CRM</span>
        </div>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="text-slate-600 hover:text-slate-900 p-1 focus:outline-none"
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Sidebar Panel */}
      <aside 
        className={`${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 transition-transform duration-300 fixed inset-y-0 left-0 z-40 w-64 bg-slate-50/90 text-slate-900 border-r border-slate-200 flex flex-col justify-between pt-16 md:pt-0 pb-6`}
      >
        <div>
          {/* Logo Section */}
          <div className="hidden md:flex items-center gap-2 px-6 py-6 border-b border-slate-200/60">
            <span className="font-sans text-sm font-bold tracking-wider text-blue-650">
              URBAN VENTURES
            </span>
            <span className="text-[9px] font-bold text-slate-500 bg-slate-200/60 px-1.5 py-0.5 rounded uppercase tracking-wider ml-1">
              CRM
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="mt-6 px-3 space-y-0.5">
            {navItems.map((item) => {
              const isActive = pathname === item.path || pathname?.startsWith(`${item.path}/`);
              return (
                <Link
                  key={item.name}
                  href={item.path}
                  className={`flex items-center justify-between px-3 py-2 text-xs font-semibold rounded transition-all ${
                    isActive
                      ? "bg-slate-200/60 text-slate-900 font-bold border-l-2 border-blue-600 pl-2"
                      : "text-slate-600 hover:bg-slate-200/30 hover:text-slate-900"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <span className={isActive ? "text-blue-600" : "text-slate-400"}>
                      {item.icon}
                    </span>
                    <span>{item.name}</span>
                  </span>
                  
                  {item.badge !== undefined && (
                    <span className={`${
                      item.badgeType === "stale" 
                        ? "bg-red-100 text-red-600 border border-red-200 animate-pulse" 
                        : "bg-blue-100 text-blue-600 border border-blue-200"
                      } text-[9px] font-bold px-1.5 py-0.2 rounded`}
                    >
                      {item.badge} {item.badgeType === "stale" ? "stale" : "new"}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User / Sign Out Profile block */}
        <div className="px-3 border-t border-slate-200/60 pt-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors border border-transparent hover:border-red-100"
          >
            <LogOut size={16} className="text-slate-400" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
      
      {/* Sidebar Overlay (Mobile only) */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="md:hidden fixed inset-0 bg-black/20 z-30"
        />
      )}
    </>
  );
}
