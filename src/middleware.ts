import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Redirect authenticated admin away from login page to dashboard
    if (path === "/admin/login" && token?.role === "ADMIN") {
      return NextResponse.redirect(new URL("/admin/dashboard", req.url));
    }

    // Protect all other admin pages
    if (path.startsWith("/admin") && path !== "/admin/login" && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      // Let it pass through to the middleware function where we handle checks manually
      authorized: () => true,
    },
    secret: process.env.NEXTAUTH_SECRET || "urban-venture-fallback-super-secret-key-12345-aura-luxury",
  }
);

export const config = {
  matcher: ["/admin/:path*"],
};
