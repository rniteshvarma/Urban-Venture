"use client";

export const dynamic = "force-dynamic";

import React, { use } from "react";
import ListingWizard from "@/components/seller/ListingWizard";

export default function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <div style={{ minHeight: "100vh", background: "var(--color-paper)", padding: "2rem 1.25rem 4rem" }}>
      <div className="max-w-3xl mx-auto">
        <ListingWizard id={id} />
      </div>
    </div>
  );
}
