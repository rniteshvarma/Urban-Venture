"use client";

import React from "react";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export default function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="uv-btn uv-btn-ghost"
      style={{ padding: "9px 16px", fontSize: "0.8125rem" }}
    >
      <LogOut size={15} /> Sign out
    </button>
  );
}
