/**
 * What we import from OpenStreetMap, and how each category is stored and drawn.
 *
 * Coverage around Hyderabad was checked before choosing these (Oct 2026):
 * hospitals, parks, stations, ORR exits, power lines and lakes are well mapped;
 * schools are badly under-mapped, so they never pull a score down; resorts,
 * SEZ boundaries and government land are not usable from OpenStreetMap and are
 * left out. Data © OpenStreetMap contributors (ODbL).
 */

/** The import area: every listing's pin plus a margin for its 5 km ring. */
export const OSM_REGION = { south: 16.8, west: 77.75, north: 18.0, east: 79.1 } as const;

/**
 * How a category's elements come back from Overpass and are kept:
 * - `point`: centre only.
 * - `area`: full outline fetched to measure size (`areaHa`), then only the centre kept.
 * - `shape`: outline kept, because distance is measured to its edge.
 */
export type OsmShape = "point" | "area" | "shape";

export interface OsmCategoryDef {
  label: string;
  /** Overpass statements; `{{bbox}}` is replaced with the import area. */
  selectors: string[];
  shape: OsmShape;
  /** `area` categories: drop unnamed areas smaller than this. */
  minAreaHa?: number;
  /** Drawn as a "Nearby" layer on the Explore map. */
  nearby?: { color: string; order: number };
}

export const OSM_CATEGORIES = {
  hospital: {
    label: "Hospitals",
    selectors: ['nwr["amenity"="hospital"]{{bbox}}', 'nwr["healthcare"="hospital"]{{bbox}}'],
    shape: "point",
    nearby: { color: "#E5484D", order: 1 },
  },
  transit: {
    label: "Metro & rail stations",
    selectors: ['nwr["railway"="station"]{{bbox}}', 'nwr["railway"="halt"]{{bbox}}'],
    shape: "point",
    nearby: { color: "#0090FF", order: 2 },
  },
  orr_exit: {
    label: "ORR & expressway exits",
    selectors: ['node["highway"="motorway_junction"]{{bbox}}'],
    shape: "point",
    nearby: { color: "#1C2024", order: 3 },
  },
  school: {
    label: "Schools",
    selectors: ['nwr["amenity"="school"]{{bbox}}'],
    shape: "point",
    nearby: { color: "#3E63DD", order: 4 },
  },
  college: {
    label: "Colleges & universities",
    selectors: ['nwr["amenity"="college"]{{bbox}}', 'nwr["amenity"="university"]{{bbox}}'],
    shape: "point",
    nearby: { color: "#8E4EC6", order: 5 },
  },
  mall: {
    label: "Malls",
    selectors: ['nwr["shop"="mall"]{{bbox}}'],
    shape: "point",
    nearby: { color: "#F76B15", order: 6 },
  },
  job_hub: {
    label: "IT parks, SEZs & industry",
    selectors: [
      'wr["landuse"~"^(commercial|industrial)$"]{{bbox}}',
      // Not roads or car parks that merely carry an SEZ / IT park's name.
      'wr["name"~"SEZ|Special Economic Zone|IT Park|Tech Park|Technology Park|Industrial Park|Industrial Area|Industrial Estate",i][!"highway"][!"parking"]["amenity"!="parking"]{{bbox}}',
    ],
    shape: "area",
    minAreaHa: 20,
    nearby: { color: "#A35829", order: 7 },
  },
  park: {
    label: "Parks",
    selectors: ['wr["leisure"="park"]{{bbox}}', 'node["leisure"="park"]{{bbox}}'],
    shape: "area",
    nearby: { color: "#30A46C", order: 8 },
  },
  lake: {
    label: "Lakes",
    selectors: ['wr["water"~"^(lake|reservoir)$"]{{bbox}}'],
    shape: "shape",
    nearby: { color: "#0D74CE", order: 9 },
  },
  bus_station: {
    label: "Bus stations",
    selectors: ['nwr["amenity"="bus_station"]{{bbox}}'],
    shape: "point",
    nearby: { color: "#12A594", order: 10 },
  },
  airport: {
    label: "Airports",
    // Passenger airports only. Begumpet (BPM) and the air-force fields carry
    // IATA codes too but have no scheduled flights, so they'd mislead the
    // connectivity score — RGIA (HYD) is the region's only commercial airport.
    selectors: ['nwr["aeroway"="aerodrome"]["iata"="HYD"]{{bbox}}'],
    shape: "point",
  },
  power_line: {
    label: "High-tension power lines",
    selectors: ['way["power"="line"]{{bbox}}'],
    shape: "shape",
  },
  landfill: {
    label: "Landfills",
    selectors: ['nwr["landuse"="landfill"]{{bbox}}'],
    shape: "point",
  },
  quarry: {
    label: "Quarries",
    selectors: ['nwr["landuse"="quarry"]{{bbox}}'],
    shape: "point",
  },
  sewage: {
    label: "Sewage treatment plants",
    selectors: ['nwr["man_made"="wastewater_plant"]{{bbox}}'],
    shape: "point",
  },
} satisfies Record<string, OsmCategoryDef>;

export type OsmCategory = keyof typeof OSM_CATEGORIES;
/** Names that mark a commercial / industrial area as a real employment hub. */
export const JOB_HUB_NAME = /SEZ|Special Economic Zone|IT Park|Tech Park|Technology Park|Industrial Park|Industrial Area|Industrial Estate/i;
/** Named office parks are dense employers even on a small footprint; an industrial estate has to be big to count as major. */
export const OFFICE_PARK_NAME = /SEZ|Special Economic Zone|IT Park|Tech Park|Technology Park/i;

export const OSM_CATEGORY_KEYS = Object.keys(OSM_CATEGORIES) as OsmCategory[];

/** Categories the Explore map can draw as "Nearby" layers, in menu order. */
export const NEARBY_CATEGORIES = OSM_CATEGORY_KEYS
  .filter((k) => "nearby" in OSM_CATEGORIES[k])
  .sort((a, b) => (OSM_CATEGORIES[a] as OsmCategoryDef).nearby!.order - (OSM_CATEGORIES[b] as OsmCategoryDef).nearby!.order);

export const OSM_ATTRIBUTION = "© OpenStreetMap contributors";
export const OSM_COPYRIGHT_URL = "https://www.openstreetmap.org/copyright";
