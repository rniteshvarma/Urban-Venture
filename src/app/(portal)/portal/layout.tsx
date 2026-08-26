"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { SessionProvider, useSession, signOut } from "next-auth/react";
import { Building2, LogOut, Menu, X } from "lucide-react";

function PortalLayoutContent({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Don't show nav for login page
  const isLoginPage = pathname === "/portal/login";
  if (isLoginPage) {
    return <>{children}</>;
  }

  const navLinks = [
    { label: "Dashboard", href: "/portal" },
    { label: "My Properties", href: "/portal/properties" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              {/* Logo */}
              <Link href="/portal" className="flex items-center gap-2 text-indigo-600">
                <Building2 size={24} />
                <span className="font-display text-xl font-bold tracking-wider">
                  UrbanAI
                </span>
              </Link>
              
              {/* Desktop Nav */}
              <nav className="hidden md:flex gap-6">
                {navLinks.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.label}
                      href={link.href}
                      className={`text-sm font-medium transition-colors ${
                        isActive ? "text-indigo-600" : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Desktop User Menu */}
            <div className="hidden md:flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700">
                {session?.user?.name || "Client"}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: "/portal/login" })}
                className="p-2 text-gray-500 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors"
                title="Sign out"
              >
                <LogOut size={18} />
              </button>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-gray-500 hover:text-gray-900"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3 py-2 rounded-md text-base font-medium ${
                    pathname === link.href
                      ? "text-indigo-600 bg-indigo-50"
                      : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="px-3 py-2 flex items-center justify-between border-t border-gray-100 mt-2 pt-4">
                <span className="text-sm font-medium text-gray-700">
                  {session?.user?.name || "Client"}
                </span>
                <button
                  onClick={() => signOut({ callbackUrl: "/portal/login" })}
                  className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900"
                >
                  <LogOut size={16} /> Sign out
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-indigo-600" />
            <span className="font-semibold text-gray-700">UrbanAI</span>
          </div>
          <p>&copy; {new Date().getFullYear()} Property Tiger. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <PortalLayoutContent>{children}</PortalLayoutContent>
    </SessionProvider>
  );
}
