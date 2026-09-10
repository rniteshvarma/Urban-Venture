/**
 * Copy MapLibre's worker bundle into public/ so the browser can load it.
 *
 * MapLibre 6 ships its worker as a separate ES module and resolves it with
 * `new URL('./maplibre-gl-worker.mjs', import.meta.url)`. Under Next's bundler
 * `import.meta.url` is the emitted chunk, so that resolves to
 * /_next/static/chunks/maplibre-gl-worker.mjs — which does not exist. The
 * request 404s, returns HTML, and the browser refuses it ("non-JavaScript MIME
 * type"). The worker never starts, so GeoJSON sources are never tiled and no
 * property markers ever render, while raster basemaps keep working because they
 * need no worker.
 *
 * Copying both files (the worker imports ./maplibre-gl-shared.mjs relatively,
 * so they must stay side by side) and pointing maplibregl.setWorkerUrl() at the
 * copy fixes it. Generated on predev/prebuild rather than committed, so the
 * copies can never drift from the installed maplibre-gl version.
 */
import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const from = join(root, "node_modules", "maplibre-gl", "dist");
const to = join(root, "public", "maplibre");

const FILES = ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"];

if (!existsSync(from)) {
  console.error("[maplibre] node_modules/maplibre-gl/dist not found — run npm install first.");
  process.exit(1);
}

mkdirSync(to, { recursive: true });

for (const f of FILES) {
  const src = join(from, f);
  if (!existsSync(src)) {
    console.error(`[maplibre] expected ${f} in maplibre-gl/dist but it is missing.`);
    console.error("[maplibre] The worker layout changed — check the installed version before shipping.");
    process.exit(1);
  }
  copyFileSync(src, join(to, f));
}

console.log(`[maplibre] worker bundle copied to public/maplibre/ (${FILES.join(", ")})`);
