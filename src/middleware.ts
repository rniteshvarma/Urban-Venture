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

    // ── Legacy portal → new client dashboard ─────────────────────────
    if (path === "/portal/login") {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (path === "/portal" || path.startsWith("/portal/")) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // ── Client dashboard routes (separate from CRM) ──────────────────
    // Signed-in clients shouldn't sit on the auth pages.
    if ((path === "/login" || path === "/signup") && token?.id) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    // Protect the dashboard — any authenticated user; unauth → /login?next=
    if (path.startsWith("/dashboard") && !token?.id) {
      const url = new URL("/login", req.url);
      url.searchParams.set("next", path);
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: () => true,
    },
    secret: process.env.NEXTAUTH_SECRET || "property-tiger-fallback-super-secret-key-12345-aura-luxury",
  }
);

export const config = {
  matcher: ["/admin/:path*", "/portal/:path*", "/dashboard/:path*", "/login", "/signup"],
};
