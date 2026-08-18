-- ═══════════════════════════════════════════════════════════════════
-- PostGIS setup for the geographic foundation module (AGENTS.md geo spec).
--
-- Run AFTER `prisma db push` has created the geo tables:
--     psql "$DATABASE_URL" -f prisma/sql/postgis-setup.sql
--
-- Idempotent — safe to run repeatedly. Requires the postgis extension to be
-- available on the server (Homebrew: `brew install postgis`, then reconnect).
-- ═══════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS postgis;

-- Boundary geometry is managed HERE, not by Prisma. Prisma's Unsupported()
-- columns cause `db push` drift, so the geometry column and its spatial index
-- live outside the Prisma model. MultiPolygon in WGS84 (SRID 4326).
ALTER TABLE "RevenueVillage"
  ADD COLUMN IF NOT EXISTS boundary geometry(MultiPolygon, 4326);

-- Spatial index — powers resolver Tier 2 (point-in-polygon) and bbox queries.
CREATE INDEX IF NOT EXISTS idx_village_boundary
  ON "RevenueVillage" USING GIST (boundary);
