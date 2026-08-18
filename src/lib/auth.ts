import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import prisma from "./prisma";
import bcrypt from "bcryptjs";
import { resolveLeadIdentity } from "./lead-resolution";

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

      const user = await prisma.user.findUnique({
        where: { email: credentials.email.toLowerCase().trim() },
      });

      if (!user || !user.password) {
        // Google-only account trying to use a password → friendly redirect on the client.
        if (user && user.googleId) throw new Error("USE_GOOGLE");
        throw new Error("Invalid credentials");
      }

      const isValid = await bcrypt.compare(credentials.password, user.password);
      if (!isValid) throw new Error("Invalid credentials");

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
        const existing = await prisma.user.findUnique({ where: { email } });
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
          if (!existing.googleId) data.googleId = googleId;
          data.authProvider = existing.password ? "BOTH" : "GOOGLE";
          if (!existing.emailVerified) data.emailVerified = new Date();
          await prisma.user.update({ where: { id: existing.id }, data });
          await resolveLeadIdentity(existing).catch((e) => console.error("resolveLeadIdentity(link):", e));
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
          const dbUser = await prisma.user.findUnique({ where: { email } });
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
  // Admin default sign-in page. Clients call signIn() with an explicit
  // callbackUrl from /login, and client-route protection is handled by
  // middleware redirecting to /login — so this default never sends a client
  // to the admin page in normal flows.
  pages: {
    signIn: "/admin/login",
    error: "/admin/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET || "urban-venture-fallback-super-secret-key-12345-aura-luxury",
};
