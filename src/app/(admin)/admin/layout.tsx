"use client";

import Sidebar from "@/components/admin/Sidebar";
import { usePathname } from "next/navigation";
import React from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/admin/login";

  if (isLoginPage) {
    return <div className="min-h-screen bg-luxury-bg">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-luxury-bg flex flex-col md:flex-row">
      {/* Sidebar Panel */}
      <Sidebar />
      
      {/* Content Area */}
      <main className="flex-grow min-w-0 p-4 sm:p-6 md:py-8 md:pr-8 md:pl-72 flex flex-col">
        {children}
      </main>
    </div>
  );
}
