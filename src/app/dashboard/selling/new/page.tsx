"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import SellerOnboarding from "@/components/seller/SellerOnboarding";

export default function NewListingPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<"checking" | "onboard" | "creating">("checking");
  const [name, setName] = useState("");

  const createDraft = useCallback(async () => {
    setPhase("creating");
    const res = await fetch("/api/seller/listings", { method: "POST" });
    if (res.ok) {
      const d = await res.json();
      router.replace(`/dashboard/selling/${d.id}/edit`);
    } else {
      router.replace("/dashboard");
    }
  }, [router]);

  useEffect(() => {
    fetch("/api/seller/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setName(d?.name ?? "");
        if (d?.profile) createDraft();
        else setPhase("onboard");
      })
      .catch(() => setPhase("onboard"));
  }, [createDraft]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-paper)", padding: "2.5rem 1.25rem" }}>
      <div className="max-w-3xl mx-auto">
        {phase === "onboard" ? (
          <SellerOnboarding defaultName={name} onDone={createDraft} />
        ) : (
          <p style={{ textAlign: "center", color: "var(--color-text-mid)", paddingTop: "3rem" }}>Setting up your listing…</p>
        )}
      </div>
    </div>
  );
}
