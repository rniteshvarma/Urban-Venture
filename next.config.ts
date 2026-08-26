import type { NextConfig } from "next";

if (!process.env.NEXTAUTH_URL) {
  process.env.NEXTAUTH_URL = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : "http://localhost:3000";
}

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.8", "localhost:3000"],
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || "http://localhost:3000",
  },
};

export default nextConfig;
