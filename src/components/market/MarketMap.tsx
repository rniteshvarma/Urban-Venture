"use client";

import React, { useEffect, useRef } from "react";
import L from "leaflet";

// Map leaflet CSS
const LEAFLET_CSS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";

// Approximate coordinates for corridors
const CORRIDOR_COORDS: Record<string, [number, number]> = {
  "Shadnagar": [17.06, 78.20],
  "Pharma City": [17.05, 78.60],
  "Sangareddy": [17.62, 78.09],
  "Kokapet": [17.40, 78.33],
  "Shamshabad": [17.24, 78.43],
  "Yadadri": [17.52, 78.90],
  "Kompally": [17.54, 78.47],
  "Adibatla": [17.23, 78.58],
};

interface MarketMapProps {
  projects: any[];
}

export default function MarketMap({ projects }: MarketMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    // Inject Leaflet CSS
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = LEAFLET_CSS_URL;
      document.head.appendChild(link);
    }

    if (!mapContainerRef.current) return;

    // Center around Hyderabad center
    const centerLatLng: [number, number] = [17.3850, 78.4867];

    // Initialize Map
    const map = L.map(mapContainerRef.current, {
      center: centerLatLng,
      zoom: 10,
      zoomControl: true,
    });
    mapRef.current = map;

    // Tile Layer (Sleek Dark Map tile style)
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    // Render ORR (Outer Ring Road) - radius ~24km
    L.circle(centerLatLng, {
      color: "#1e3a8a", // Navy
      fillColor: "#1e3a8a",
      fillOpacity: 0.03,
      weight: 2,
      radius: 24000
    }).addTo(map).bindPopup("<b>Outer Ring Road (ORR)</b><br/>24km radius expressway surrounding Hyderabad.");

    // Render RRR (Regional Ring Road) - radius ~45km
    L.circle(centerLatLng, {
      color: "#9a3412", // Rust orange / red
      fillColor: "none",
      dashArray: "6, 8",
      weight: 2,
      radius: 45000
    }).addTo(map).bindPopup("<b>Regional Ring Road (RRR)</b><br/>45km radius proposed ring expressway ( Northern & Southern Corridors ).");

    // Render Corridor Boundaries (transparent circles for visualization)
    Object.entries(CORRIDOR_COORDS).forEach(([name, coords]) => {
      L.circle(coords, {
        color: "#d97706", // Gold/Amber
        fillColor: "#d97706",
        fillOpacity: 0.08,
        weight: 1,
        radius: 4000
      }).addTo(map).bindPopup(`<b>${name} Corridor Zone</b>`);
    });

    // Plot Infrastructure projects
    projects.forEach(proj => {
      // Fallback coordinate if missing
      const lat = proj.latitude || CORRIDOR_COORDS[proj.affectedCorridors[0]]?.[0] || 17.3850;
      const lng = proj.longitude || CORRIDOR_COORDS[proj.affectedCorridors[0]]?.[1] || 78.4867;

      // Color mapping
      let color = "#ef4444"; // default red
      if (proj.category === "ROAD_HIGHWAY") color = "#2563eb"; // blue
      else if (proj.category === "METRO_RAIL") color = "#8b5cf6"; // purple
      else if (proj.category === "INDUSTRIAL_ZONE") color = "#f97316"; // orange
      else if (proj.category === "PHARMA_BIOTECH") color = "#10b981"; // green

      // Size scaled by reImpactScore (1-10)
      const markerSize = Math.max(5, proj.reImpactScore * 2.5);

      // Custom circle marker
      const marker = L.circleMarker([lat, lng], {
        color: color,
        fillColor: color,
        fillOpacity: 0.75,
        weight: 1.5,
        radius: markerSize
      }).addTo(map);

      // Create milestone list HTML
      const msHtml = proj.milestones?.length > 0 
        ? `<div style="margin-top: 8px; border-top: 1px solid #e2e8f0; pt-2"><b style="font-size: 10px;">Milestones:</b><ul style="margin: 4px 0 0 0; padding-left: 12px; font-size: 9px; color: #475569;">` +
          proj.milestones.slice(0, 3).map((m: any) => `<li>${m.status === 'COMPLETED' ? '✅' : '🔨'} ${m.title}</li>`).join("") +
          `</ul></div>`
        : "";

      // Popup
      marker.bindPopup(`
        <div style="font-family: sans-serif; width: 200px;">
          <div style="font-weight: bold; font-size: 12px; color: #0f172a; margin-bottom: 2px;">${proj.name}</div>
          <div style="font-size: 10px; font-weight: 600; color: #2563eb; text-transform: uppercase; margin-bottom: 6px;">${proj.category.replace("_", " ")}</div>
          <div style="font-size: 10px; color: #334155; margin-bottom: 4px;"><b>Status:</b> ${proj.status.replace("_", " ")} (${proj.completionPct}%)</div>
          <div style="font-size: 10px; color: #334155; margin-bottom: 4px;"><b>Impact Score:</b> <span style="font-weight: bold; color: #d97706;">${proj.reImpactScore}/10</span></div>
          <div style="font-size: 10px; color: #334155; margin-bottom: 4px;"><b>Radius:</b> ${proj.impactRadius} km</div>
          <div style="font-size: 10px; color: #334155; margin-bottom: 4px;"><b>Impacts:</b> ${proj.affectedCorridors.join(", ")}</div>
          ${msHtml}
        </div>
      `);
    });

    return () => {
      map.remove();
    };
  }, [projects]);

  return (
    <div 
      ref={mapContainerRef} 
      className="w-full h-full min-h-[350px] md:min-h-[450px] rounded border border-slate-200 shadow-inner z-10"
      style={{ overflow: "hidden" }}
    />
  );
}
