import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

if (!process.env.NEXTAUTH_URL) {
  process.env.NEXTAUTH_URL = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : "http://localhost:3000";
}

export default withAuth(
  function middleware(req) {
    const token = req.nextauth?.token;
    const path = req.nextUrl?.pathname || "";

    // ── Admin routes ──────────────────────────────────────────────────
    // Redirect authenticated admin away from login page to dashboard
    if (path === "/admin/login" && token?.role === "ADMIN") {
      return NextResponse.redirect(new URL("/admin/dashboard", req.url));
    }

    // Protect all other admin pages — require ADMIN role
    if (path.startsWith("/admin") && path !== "/admin/login" && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }

    // ── Portal routes ─────────────────────────────────────────────────
    // Redirect authenticated client away from portal login
    if (path === "/portal/login" && token?.id) {
      return NextResponse.redirect(new URL("/portal", req.url));
    }

    // Protect portal pages — require authenticated user
    if (path.startsWith("/portal") && path !== "/portal/login" && !token?.id) {
      return NextResponse.redirect(new URL("/portal/login", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: () => true,
    },
    secret: process.env.NEXTAUTH_SECRET || "urban-venture-fallback-super-secret-key-12345-aura-luxury",
  }
);

export const config = {
  matcher: ["/admin/:path*", "/portal/:path*"],
};
