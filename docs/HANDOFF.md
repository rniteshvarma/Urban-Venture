# Property Tiger — session handoff (11 Nov 2026)

Read this instead of re-exploring the repo. Open code files only when a task needs them.

## 1. The product

**Property Tiger** is an independent property research site for Hyderabad buyers: flats, villas, open plots and farm land. The product used to be called Urban Ventures. The DB name `urban_venture`, the CSS `uv-` prefix, the admin login `uv@gmail.com` and the folder name were deliberately left unrenamed.

Its promise is **facts with sources, never made-up numbers**:

- TG-RERA numbers on projects
- builders' delivery records (delays, RERA orders)
- area prices in ₹/sq.ft and ₹/sq.yd
- tracked government infrastructure (metro, the RRR — Regional Ring Road)
- a "last checked" date on every listing
- the true cost of buying: 7.5% Telangana duties plus GST

There are three parts:

- **Client app** in `src/app/(client)/`: homepage, /projects, project pages, /market area pages, /developers, /explore map, /calculator, /research free shortlist, /news, and the dashboard.
- **Admin CRM.**
- **WhatsApp concierge**, currently dry-run because there are no credentials.

## 2. Stack and environment

- Next.js **16.4.2** App Router. AGENTS.md says APIs differ from training data, so read `node_modules/next/dist/docs/` before writing Next-specific code.
- React 19, Tailwind v4, NextAuth (JWT), Prisma 7.10.1 (`prisma db push` + generate, no migrations), Vercel Hobby.
- **Local DB:** `postgresql://localhost:5432/urban_venture` (from `.env.local`).
- **Prod DB:** Supabase project `xdjwwkadkouygetrruji` (Tokyo). Corridors, inventory and news self-seed during the Vercel build.
- **Dev server:** port 3000 is often taken by the user's other project, Meridian. Use the launch config **`urban-venture-dev-3005`**, which serves http://localhost:3005.
- **Restart the dev server after any `prisma db push`.** A stale Prisma client returns wrong counts.
- Inventory has 2,555 listings: 977 RERA projects, 1,578 land listings within 20 km of the RRR, and 485 builders. Sources are Housiey, RoofandFloor, Homes247 and 1acre.

Per-feature detail lives in the memory files under `~/.claude/projects/-Users-niteshvarma-Documents-Urban-Venture/memory/`; MEMORY.md is the index.

## 3. Hard rules (non-negotiable)

**Data and claims**
- No fabricated data, numbers or marketing claims. Every figure comes from the DB or a cited source. No AI-written prose presented as research.
- MagicBricks data is internal cross-check only and is never republished.
- NoBroker: publish derived figures only.
- Never use Housiey, Homes247 or 1acre images (watermarks or private screenshots).
- RERA orders: never store or show complainants' names. Respondents are organisations only.
- Never bypass CAPTCHAs or forge TG-RERA tokens.

**Database**
- Never run `prisma/seed.ts`, `seed-market-data.ts` or `seed-upgraded.ts` against prod.

**Git and deploys**
- Never commit secrets or `.env` files.
- Commit or push **only when the user asks**.
- Don't push while a prod build is importing.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- PR descriptions end with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

**Working style**
- Plan before big builds.
- Show a sample before changing the live site.
- Test credentials only on localhost, and never echo passwords.

**Env vars the user will add later:** RESEND_WEBHOOK_SECRET, GMAIL_PUSH_*, LEGAL_* / GRIEVANCE_*, the Resend From domain, and the Anthropic API key.

## 4. Where we are (updated 11 Nov 2026)

**Committed on `main`, not pushed (4 commits ahead of origin):**
- `404838e` — piece A below (projects paging, freshness, weekly re-check).
- `84b65dd` — removed unsourced/false claims (site + CRM).
- `16405d3` — lead flow: one lead per phone, nullable budget/horizon, team alert email, WhatsApp button (needs `NEXT_PUBLIC_WHATSAPP_NUMBER`, `LEAD_ALERT_EMAIL`).
- `51a0dd1` — SEO: main pages server-rendered, titles/canonicals everywhere, developers paginated.

**Still uncommitted:** piece B below (the `/preview/home` sample), this file, and `.claude/launch.json`. The user said on 11 Nov **not** to replace the live homepage.

The original notes on the two pieces follow.

### A. "Projects page fast on phones" + "show when data was last checked" (done and verified)

- **Schema** (`prisma/schema.prisma`; pushed to the local DB only, prod gets it on deploy):
  - Project gains `sourceCheckedAt`, `sourceState` (enum LIVE/GONE), `sourceGoneSince`.
  - New `ProjectPriceChange` model.
  - New `RecentView` model.
  - `User.homePrefs`.
  - `SiteVisit.mode` and `SiteVisit.timeZone`.
- **`src/lib/inventory/freshness.ts`:** the "Last checked …" label. Listings go stale after 30 days for land and 90 for projects. A GONE listing reads "May be sold" (land) or "Listing removed" (project). 10 tests.
- **`src/lib/inventory/recheck.ts` + `scripts/inventory/recheck.ts`:**
  - A polite re-crawler that respects each site's crawl delay.
  - Only a clear 404/410 or removed page marks a listing GONE; 5xx errors and timeouts never do.
  - A price move updates the price and logs a ProjectPriceChange.
- **`.github/workflows/recheck-listings.yml`:** runs weekly and needs a `DATABASE_URL` GitHub secret. The job is registered in `src/lib/ops/schedule.ts`.
- **`src/lib/projects/price-change.ts`:** badge text such as "₹4 L lower since 3 Oct".
- **`/api/projects`:**
  - Paged mode (`page`, `pageSize`).
  - Cards carry freshness and the price badge.
  - Public responses are CDN-cached.
  - The public filter hides gone land, using a positive OR to handle NULL `sourceState`.
- **`/projects` page:**
  - Filters live in the URL.
  - Loads 24 at a time with infinite scroll.
  - On phones, filters open in a bottom sheet.
- **`src/lib/i18n.tsx`:** English-only stub (`useT(en, te)`). There is no Telugu toggle yet.

### B. Homepage redesign: SAMPLE at `/preview/home` (noindex, not linked)

**What the user asked for:** a customer-first homepage for Indian buyers, using squareyards.com as the reference for being "more informative and catchy", with the phone-app mockup moved out of the hero.

**User feedback, 29 Oct:** they like the **new layout** but want the **old colours**. The sample has been recoloured to the live palette:
- ink `#0d0d12` for the header, hero, dark bands and footer
- saffron `#ffb400` for fills, always with **ink text on saffron**
- paper `#faf9f6` for the page background
- `#8f5e00` for saffron-family text on light backgrounds

**Files:**
- `src/app/preview/{layout.tsx, v3.css, home/page.tsx}`
- `src/components/home-v3/{V3Header, HeroSearch, PicksRail, ListingTile, CostTeaser, Skyline}.tsx`
- `src/lib/home/v3-data.ts`: `loadHome()`; every number comes from the DB.

**CSS gotchas:**
- `v3.css` must stay inside `@layer components`, or it overrides Tailwind's `hidden`/`md:*`.
- `.v3-dark` makes a section ink.
- Tokens are `--v3-accent*` and `--v3-night*`.
- `.uv-btn` in globals.css is unlayered, so a `md:hidden` on it fails; wrap the button in a div.

**Sections, top to bottom:**
1. Search-first hero: tabs for Flats / Villas / Plots / Farm land / Area prices, locality and budget fields, popular-locality chips, a dusk Charminar + HITEC skyline SVG, and floating stat cards.
2. Proof strip with 5 stats, overlapping the bottom of the hero.
3. "What can I buy for…" budget tiles with counts.
4. Picks rail: Top rated / Ready / Under ₹1 Cr / Plots / Farm land.
5. Area price table.
6. Infrastructure cards, sorted by stage.
7. Builder delivery-record table with a search box.
8. Interactive real-cost and EMI band.
9. Free shortlist and NRI "Buying from abroad?" cards.
10. **The phone-app mockup, moved here**, as a "Hear about it first when a price drops" band.
11. News.
12. FAQ.
13. New footer.

Phones get an app-style bottom tab bar.

**Verified:** desktop (1366) and mobile (375) with no horizontal overflow. tsc and eslint are clean, and 440 tests pass.

## 5. Next steps (waiting on the user)

1. **SUPERSEDED 11 Nov 2026: the user said "Don't replace the existing home page."** The live homepage stays; `/preview/home` remains a sample only. The original step was: user approval of the recoloured sample, then replace the live homepage `src/app/(client)/page.tsx` with it. Note that the client layout `src/app/(client)/layout.tsx` has its own dark nav and footer: either adopt V3Header and the footer there, or drop them from the page, so there aren't two headers.
2. **Roll the same layout style out to other pages,** in this order: /projects, project detail, /market area pages, dashboard.
3. **Open questions to the user:**
   - Is a native app planned? The phone band currently only says "Create a free account".
   - Do the claims "checked before you pay" and site visits "we confirm" match how the team actually operates?
4. **Commit when the user asks.** Suggested split: (a) freshness and recheck plus projects paging, (b) the homepage redesign. Add the `DATABASE_URL` GitHub secret for the weekly re-check.
5. **Polish backlog the user approved earlier, not built yet:**
   - Telugu toggle and NRI currency
   - photo-less placeholders on the live cards
   - synced compare using the existing `CompareItem` model
   - recently viewed
   - price badges on the live cards
   - first-visit setup questions
   - accessibility fixes: the live "Market Data" menu is hover-only
   - video site visits

**Known issues on the live homepage that the redesign fixes:**
- On phones the hero headline doesn't show.
- The nav wraps at 800px.
- The "Why us" table still claims "AI investment recommendations".
- The footer still says "AI Research Tool".
