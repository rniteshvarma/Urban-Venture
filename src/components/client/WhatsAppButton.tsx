"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { whatsappLink } from "@/lib/contact-links";

const GREEN = "#128C7E"; // WhatsApp's darker brand green — white text passes contrast on it

/** "Chat on WhatsApp" button for a listing. Renders nothing until a WhatsApp number is configured. */
export function WhatsAppInline({ text, className = "" }: { text: string; className?: string }) {
  const href = whatsappLink(text);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-bold ${className}`}
      style={{ background: GREEN, color: "#fff" }}
    >
      <MessageCircle size={17} /> Chat on WhatsApp
    </a>
  );
}

/**
 * Site-wide floating button. Hidden on the map (it would cover the controls)
 * and on listing pages, which have their own button beside the enquiry form.
 */
export default function WhatsAppFloat() {
  const pathname = usePathname() ?? "/";
  if (pathname.startsWith("/explore") || /^\/projects\/(?!compare$)[^/]+$/.test(pathname)) return null;
  const href = whatsappLink("Hi Property Tiger, I'm looking for property in Hyderabad.");
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed z-[90] flex items-center gap-2 rounded-full shadow-lg"
      style={{ right: 16, bottom: 16, background: GREEN, color: "#fff", padding: "12px 16px", fontSize: "0.875rem", fontWeight: 700 }}
    >
      <MessageCircle size={20} />
      <span className="hidden sm:inline">WhatsApp us</span>
    </a>
  );
}
