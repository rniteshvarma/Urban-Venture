"use client";

// /preview/map-3d — design sample of a 3D map with a property "focus" view.
// Not linked from the live site and not indexed (see ../layout.tsx). The live
// map at /explore is unchanged.
//
// MapLibre + deck.gl are heavy and browser-only, so the map loads on the
// client in its own chunk.
import dynamic from "next/dynamic";

const Map3DSample = dynamic(() => import("@/components/explore3d/Map3DSample"), {
  ssr: false,
  loading: () => <div style={{ position: "fixed", inset: 0, background: "#0D0D12", color: "#8E8E9E", display: "grid", placeItems: "center", fontSize: 14 }}>Loading the 3D map…</div>,
});

export default function Map3DPreviewPage() {
  return <Map3DSample />;
}
