"use client";

export const dynamic = "force-dynamic";

import React, { use } from "react";
import SellerListingDetail from "@/components/seller/SellerListingDetail";

export default function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <div style={{ minHeight: "100vh", background: "var(--color-paper)", padding: "2rem 1.25rem 4rem" }}>
      <div className="max-w-3xl mx-auto">
        <SellerListingDetail id={id} />
      </div>
    </div>
  );
}
