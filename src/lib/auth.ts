import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "./prisma";
import bcrypt from "bcryptjs";

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

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log("🔐 NextAuth Authorize attempt for email:", credentials?.email);

        if (!credentials?.email || !credentials?.password) {
          console.warn("🔐 NextAuth Authorize failed: Missing email or password");
          throw new Error("Missing email or password");
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });

          if (!user || !user.password) {
            console.warn("🔐 NextAuth Authorize failed: User not found or no password for:", credentials.email);
            throw new Error("Invalid credentials");
          }

          const isValid = await bcrypt.compare(credentials.password, user.password);

          if (!isValid) {
            console.warn("🔐 NextAuth Authorize failed: Password mismatch for:", credentials.email);
            throw new Error("Invalid credentials");
          }

          console.log("✅ NextAuth Authorize successful for:", user.email, "role:", user.role);

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          };
        } catch (error: any) {
          console.error("❌ NextAuth Database Error during authorize:", error?.message || error);
          if (error?.message?.includes("does not exist")) {
            console.error("⚠️ CRITICAL: The database table 'User' does not exist in your target PostgreSQL database. The schema has not been pushed yet!");
          }
          throw error;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
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
  pages: {
    signIn: "/admin/login",
    error: "/admin/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET || "urban-venture-fallback-super-secret-key-12345-aura-luxury",
};
