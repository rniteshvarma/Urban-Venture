import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import prisma from "./prisma";
import bcrypt from "bcryptjs";
import { resolveLeadIdentity } from "./lead-resolution";
import { authSecret } from "./env";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      role: "CLIENT" | "ADMIN";
    };
  }
  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    role: "CLIENT" | "ADMIN";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "CLIENT" | "ADMIN";
  }
}

// ── Providers ──────────────────────────────────────────────────────
// Credentials is shared by BOTH admin (/admin/login) and clients (/login).
// Google is client-only and registers ONLY when creds are present, so the
// admin CRM login is entirely unaffected if Google is not configured.
const providers: NextAuthOptions["providers"] = [
  CredentialsProvider({
    name: "Credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        throw new Error("Missing email or password");
      }

      let user: { id: string; name: string | null; email: string; password: string | null; role: "CLIENT" | "ADMIN"; googleId?: string | null } | null = null;

      try {
        user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
          select: {
            id: true,
            name: true,
            email: true,
            password: true,
            role: true,
            googleId: true,
          },
        });
      } catch (e: any) {
        // Fallback to basic columns if googleId column is not yet pushed to DB
        console.warn("Retrying user lookup with minimal columns due to DB schema mismatch:", e?.message);
        user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
          select: {
            id: true,
            name: true,
            email: true,
            password: true,
            role: true,
          },
        });
      }

      if (!user || !user.password) {
        // Google-only account trying to use a password → friendly redirect on the client.
        if (user && (user as any).googleId) throw new Error("USE_GOOGLE");
        throw new Error("Invalid credentials");
      }

      const isValid = await bcrypt.compare(credentials.password, user.password);
      if (!isValid) throw new Error("Invalid credentials");

      // Hard email-verification gate — OFF unless EMAIL_VERIFICATION_REQUIRED=true.
      // Keep it off until a real verification email is confirmed delivering, or
      // this can lock out email/password users. Google sign-ins are auto-verified.
      if (process.env.EMAIL_VERIFICATION_REQUIRED === "true") {
        const v = await prisma.user
          .findUnique({ where: { id: user.id }, select: { emailVerified: true } })
          .catch(() => null);
        if (v && !v.emailVerified) throw new Error("EMAIL_NOT_VERIFIED");
      }

      // best-effort last-login stamp (never blocks auth)
      prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }).catch(() => {});

      return { id: user.id, name: user.name, email: user.email, role: user.role };
    },
  }),
];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

export const authOptions: NextAuthOptions = {
  providers,
  callbacks: {
    // Google (no DB adapter — we link/create the User ourselves so we stay on JWT).
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google") return true; // credentials handled in authorize()

      const p = profile as { email?: string; name?: string; sub?: string } | undefined;
      const email = (p?.email || user.email || "").toLowerCase().trim();
      if (!email) return false;
      const googleId = p?.sub || account.providerAccountId;
      const name = p?.name || user.name || null;

      try {
        const existing = await prisma.user.findUnique({
          where: { email },
          select: { id: true, email: true, password: true, googleId: true, emailVerified: true },
        }).catch(async () => {
          return await prisma.user.findUnique({
            where: { email },
            select: { id: true, email: true, password: true },
          });
        });

        if (!existing) {
          // App-level uniqueness on googleId: a fresh CLIENT account.
          const created = await prisma.user.create({
            data: {
              email,
              name,
              googleId,
              authProvider: "GOOGLE",
              emailVerified: new Date(),
              role: "CLIENT",
              lastLoginAt: new Date(),
            },
          });
          await resolveLeadIdentity(created).catch((e) => console.error("resolveLeadIdentity(create):", e));
        } else {
          // Link Google to an existing account — never create a duplicate.
          const data: Record<string, unknown> = { lastLoginAt: new Date() };
          if (!(existing as any).googleId) data.googleId = googleId;
          data.authProvider = existing.password ? "BOTH" : "GOOGLE";
          if (!(existing as any).emailVerified) data.emailVerified = new Date();
          await prisma.user.update({ where: { id: existing.id }, data }).catch(() => {});
          await resolveLeadIdentity(existing as any).catch((e) => console.error("resolveLeadIdentity(link):", e));
        }
        return true;
      } catch (e) {
        console.error("Google signIn failed:", e);
        return false;
      }
    },

    async jwt({ token, user, account }) {
      // Credentials sign-in: `user` is our DB user (carries id + role).
      if (user && (user as { role?: string }).role) {
        token.id = (user as { id: string }).id;
        token.role = (user as { role: "CLIENT" | "ADMIN" }).role;
      }
      // Google sign-in: resolve our DB user by email to attach id + role.
      if (account?.provider === "google") {
        const email = (user?.email || token.email || "").toLowerCase();
        if (email) {
          const dbUser = await prisma.user.findUnique({
            where: { email },
            select: { id: true, role: true },
          }).catch(() => null);
          if (dbUser) {
            token.id = dbUser.id;
            token.role = dbUser.role;
          }
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
  // These are the pages NextAuth falls back to on its own — an OAuth error, or
  // any visit to /api/auth/signin without a provider. They must point at the
  // public sign-in page: the CRM is staff-only and is reached by typing /admin,
  // never by being redirected there.
  //
  // They previously pointed at /admin/login, which is why a failing Google
  // sign-in dumped customers on the CRM login screen.
  //
  // /admin/login is unaffected: it calls signIn("credentials", { redirect:
  // false }) directly and renders its own errors, so it never relies on these.
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: authSecret(),
};
