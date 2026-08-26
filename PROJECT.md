# Property Tiger — Project Documentation

> AI-powered real-estate **investment research** platform for Hyderabad land & property,
> built on verified government infrastructure data. Positioned as *"Not a listing site — a research platform."*

_Last updated: 2026-08-25. This document is generated from the actual codebase (schema, routes, dependencies, env usage), not from assumptions._

---

## 1. What this product is

Property Tiger helps buyers and investors decide **where Hyderabad grows next**. A user gives three inputs (budget, horizon, city) and gets an AI research report backed by real corridor data — infrastructure projects, HMDA/DTCP approvals, price appreciation history, demand trends, and legal-risk flags. On top of that sit a full **CRM** (leads, personas, matching, WhatsApp/email automation), a **client dashboard**, an **owned-property tracker**, a **news feed**, a **brochure-to-project extraction** pipeline, and a **Seller Mode** where owners/agents can list properties.

There are three audiences:
- **Clients / investors** — public research, market data, projects, dashboard, and (new) selling.
- **Admins / advisory team** — a CRM at `/admin/*` for leads, projects, data, and broadcasts.
- **Sellers** — owners/agents/builders listing properties (a *mode* inside the client dashboard).

---

## 2. Tech stack

| Layer | Choice |
|---|---|
| Framework | **Next.js 16.2.7** (App Router, React 19.2, `next dev --webpack`) |
| Language | TypeScript 5 |
| Database | **PostgreSQL** via **Prisma 7.8** (`@prisma/adapter-pg`, `pg` driver) |
| Auth | **NextAuth 4** (Credentials + Google), JWT sessions, bcryptjs |
| AI | **Anthropic Claude** (`@anthropic-ai/sdk`) — research generation, persona/lead scoring, brochure extraction |
| Email | **Resend** (`resend`) |
| WhatsApp | **WATI** (REST API) |
| File storage | Local disk uploads + **Vercel Blob** (`@vercel/blob`) |
| Charts | Recharts |
| Maps | Leaflet (vanilla) |
| PDF | jsPDF |
| UI | Tailwind CSS v4, Radix UI primitives, lucide-react icons, custom `uv-*` design system |
| Phonetics/transliteration | `double-metaphone`, `@indic-transliteration/sanscript` (for the Telugu/English village resolver) |
| Validation | Zod |
| Drag & drop | `@dnd-kit` |
| Deploy target | **Vercel** (`vercel.json`, cron jobs) |

**Build command:** `prisma db push --accept-data-loss && prisma generate && next build`
(Schema is applied via **`prisma db push`** — there are no migration files. Schema changes ship by pushing.)

---

## 3. Architecture at a glance

```
Browser (client / seller)                Admin CRM (/admin/*)
        │                                        │
        ▼                                        ▼
┌─────────────────────── Next.js App Router ───────────────────────┐
│  Route groups:                                                   │
│   (client)  public research + market + projects + news           │
│   dashboard client portal + Seller Mode                          │
│   (auth)    login / signup / forgot-password                     │
│   (admin)   CRM (leads, projects, data, broadcasts, integrations)│
│   (portal)  legacy → redirected to /dashboard                    │
│                                                                  │
│  146 API route handlers under /api/*                             │
│   middleware.ts  → role-gated routing (ADMIN vs client)          │
└───────────────┬──────────────────────────────┬──────────────────┘
                │                               │
     src/lib/* domain logic          External services
     (matching, scoring, geo,        Anthropic · Resend ·
      extraction, news, email,       WATI · Google OAuth ·
      appreciation, whatsapp)        Vercel Blob · News APIs
                │
                ▼
        PostgreSQL (Prisma) — 68 models
```

### Directory map
```
src/
├── app/
│   ├── (client)/        public: research, market/*, projects, news, calculator
│   ├── dashboard/       client portal + selling/* (Seller Mode)
│   ├── (auth)/          login, signup, forgot-password
│   ├── (admin)/admin/   CRM (leads, projects, infrastructure, broadcasts, integrations…)
│   ├── (portal)/        legacy, redirected
│   └── api/             146 route handlers (see §6)
├── lib/                 domain logic (see §5)
├── components/          ui/, client/, admin/, seller/, news/, listings/
└── middleware.ts        auth + role routing
prisma/
├── schema.prisma        68 models, 57 enums
├── seed.ts, seed-upgraded.ts, seed-advanced.ts
scripts/                 etl/, eval/, landiq/, news/ (data loaders + eval harnesses)
```

---

## 4. Feature modules

### A. Client-facing (public + dashboard)
| Module | Route(s) | What it does | Status |
|---|---|---|---|
| **AI Research Report** | `/research` | Budget/horizon/city → Claude-generated corridor research | ✅ (mock generator when no API key) |
| **ROI Calculator** | `/calculator` | Projected appreciation/rental returns per corridor | ✅ |
| **Projects** | `/projects`, `/projects/[id]` | Browse/verify project inventory + detail + enquiry | ✅ |
| **Market Data** | `/market`, `/market/{corridor,compare,forecast,approvals,legal}` | Corridor intelligence, comparison, forecast, approvals, legal risk | ✅ |
| **News / Market Signals** | `/news` | City news + market-signals feed | ✅ mock data; live provider = env swap |
| **Client Dashboard** | `/dashboard` | Adaptive dashboard (Explorer/Active buyer/Owner), saved items, advisor | ✅ |
| **Owned Property Tracker** | dashboard + `/api/portal/properties` | Track owned properties + live appreciation | ✅ |
| **Seller Mode** | `/dashboard` (toggle) + `/dashboard/selling/*` | List properties as owner/agent/builder | ✅ (see §4D) |

### B. Admin / CRM (`/admin/*`)
Leads & pipeline, lead detail, **persona engine**, **lead scoring**, **project↔lead matching**, projects CRUD + **brochure extraction review**, purchases, customers, analytics, **broadcasts** (WhatsApp/email campaigns with templates & history), **integrations** (inbound sources: Gmail, webhooks, field-mapping), infrastructure data admin (projects, approvals, appreciation, demand, intelligence), personas config, WhatsApp console. — ✅ built.

### C. Data & intelligence engines (`src/lib/*`)
| Engine | Purpose | Status |
|---|---|---|
| `matching-engine` | Scores project↔lead fit (budget/horizon/persona/corridor) → `ProjectLeadMatch` | ✅ |
| `persona-engine` | Classifies buyers into personas | ✅ |
| `lead-scorer` | 0–100 lead score + grade | ✅ |
| `appreciation-engine` | Live price-appreciation calc | ✅ |
| `corridor-intelligence` | Corridor scoring (infra/approval/demand/appreciation) | ✅ |
| `roadmap` | Lead nurture roadmap stages | ✅ |
| **`geo`** | TG/AP village resolver (normalise/phonetic/transliterate/similarity) | ✅ engine tested; **data not loaded** |
| **`landiq`** | Village-level scoring (8 pillars) | ✅ engine tested (48 tests); data-gated |
| `analytics` | Validation-lab / thesis testing (bi-temporal) | ✅ Part 1; data-gated |
| **`extraction`** | Brochure/PDF/image → structured Project draft (Claude) | ✅ built |
| **`news`** | News ingest with legal guards; mock + live providers | ✅ mock |
| **`email`** | Resend central sender, verification, report-by-email (PDF) | ✅ built, flag-gated |
| `whatsapp` | WATI triggers, templates, inbound webhook | ✅ |
| **`listings`** | Seller Mode scoring + lifecycle (see §4D) | ✅ built + tested |

### D. Seller Mode (most recent build)
A **mode inside `/dashboard`** (Buying ⇄ Selling toggle), not a separate app. **Seller listings are `Project` records** (extended), reusing the public projects tab, matching engine, CRM leads, and fair-value data. Includes: 3-field onboarding, 4-step post-a-property wizard (autosave), a 0–100 **listing score** (Location/Price/Quality/Trust/Freshness, shown publicly as an A/B/C grade), buyer **enquiries** (contact hidden until an admin releases it), **matched buyers** from `ProjectLeadMatch`, an admin review queue at `/admin/projects/review`, and daily/weekly maintenance crons. — ✅ built, typechecked, unit-tested, browser-verified. Deferred: brochure-autofill into the wizard; a seller-facing notification channel.

---

## 5. `src/lib` modules (domain logic)
```
Top-level:  anon-session, anthropic, appreciation-engine, auth, broadcast-worker,
            calculator, corridor-intelligence, format, lead-resolution, lead-scorer,
            matching-engine, otp-store, persona-engine, prisma, profile-score,
            roadmap, session, toast, user-state
Folders:    analytics/  cache/  email/  extraction/  geo/  inbound/
            landiq/  listings/  news/  whatsapp/
```

---

## 6. API surface (146 routes)

| Group | Notable endpoints |
|---|---|
| `auth` | `[...nextauth]`, `signup`, `verify-email`, `verify-phone`, `forgot-password`, `reset-password`, `merge-anonymous` |
| `research` | report generation, `research/email` |
| `calculator` | `calculate`, `corridors`, `lead` |
| `projects` | list (public, ranked), `[id]`, `[id]/enquiry` |
| `market` | `corridors`, `compare`, `infrastructure`, `approvals`, `legal`, `pulse` |
| `news` | `cities`, `since`, feed |
| `dashboard` | dashboard data, `mark-seen` |
| `portal` | `properties` (owned tracker) |
| `saved` / `watchlist` / `reports` | saved projects, corridor watches, saved reports |
| `seller` | `profile`, `listings/*` (CRUD, submit, pause, refresh, mark-sold, score, performance, media), `enquiries/*`, `matches/*` |
| `listings` | `validate-pin`, `check-survey`, `fair-value`, `villages` (helpers) |
| `geo` | `resolve` (village resolver) |
| `admin` | leads, projects, matching, personas, pipeline, purchases, customers, analytics, broadcasts, integrations, infra-projects, approvals, appreciation, demand, intelligence, extraction, whatsapp, upload, enquiries/release-contact, projects/[id]/{approve,request-changes,reject} |
| `cron` | `ingest-news`, `renew-gmail-watch`, `listings-daily`, `listings-weekly` |
| `webhooks` | `gmail`, `inbound`, `resend`, `whatsapp-inbound` |
| `whatsapp` | `send` |

---

## 7. Database schema (68 models, 57 enums)

Grouped by domain:

**Auth & users**
`User`, `AnonymousSession`, `PasswordResetToken`, `EmailVerificationToken`
(+ enums `Role`, `AuthProvider`)

**CRM — leads & engagement**
`Lead`, `Search`, `LeadRoadmap`, `RoadmapStage`, `ActionItem`, `PersonaConfig`, `ProjectLeadMatch`,
`WhatsAppTemplate`, `WhatsAppLog`, `Broadcast`, `BroadcastRecipient`, `EmailTemplate`
(+ `LeadStatus`, `BuyerPersona`, `ScoreGrade`, `StageKey`, `StageStatus`, `WATrigger`, `WAStatus`, `Direction`, `BroadcastChannel`, `BroadcastStatus`, `GroupType`, `EmailStatus`)

**Inbound integrations**
`InboundSource`, `InboundLog`, `GmailWatchConfig`
(+ `SourceType`, `SourceChannel`, `InboundStatus`)

**Projects & inventory**
`Project`, `ProjectUnitType`, `ProjectMedia`, `ProjectFieldAudit`
(+ `ProjectStatus`, `RiskLevel`, `UnitCategory`, `MediaType`, `AreaUnit`)

**Brochure extraction**
`ExtractionJob`, `ExtractionInput`, `ExtractionPage`
(+ `ReviewState`, `ProjectSource`, `SourceFormat`, `JobStatus`, `QualityVerdict`, `ImageRole`, `ExtractMethod`, `RightsStatus`)

**Seller Mode**
`SellerProfile`, `ListingEnquiry`, `ListingActivity`, `ListingScoreSnapshot`
(+ `ListingSource`, `ListingStatus`, `SellerType`, `EnquiryStatus`)

**Market / infrastructure intelligence**
`CorridorProfile`, `InfraProject`, `InfraMilestone`, `AppreciationHistory`, `DemandTrend`, `ApprovalRecord`, `CorridorIntelligence`, `LegalRisk`, `MarketPulse`
(+ `InfraCategory`, `InfraStatus`, `MilestoneStatus`, `ApprovalType`, `ApprovalAuth`, `ApprovalStatus`, `RiskSeverity`, `LegalCategory`, `HeatRating`, `InvCycle`, `RRRAlignment`, `Sentiment`)

**Owned-property tracker**
`PropertyPurchase`, `PropertyDocument`, `PaymentInstallment`, `SavedProject`, `CorridorWatch`, `SavedReport`, `CompareItem`
(+ `PurchaseStatus`, `PaymentStatus`, `DocumentType`, `CompareType`)

**Geo resolution layer (TG/AP villages)**
`State`, `District`, `Mandal`, `RevenueVillage`, `VillageAlias`, `AdminBoundaryHistory`, `ResolutionQueue`, `GoldenTestCase`, `ResolverEvalRun`, `CorridorVillage`
(+ `GeomQuality`, `MatchMethod`, `QueueStatus`)

**LandIQ village scoring + validation lab**
`PriceObservation`, `RegistrationStat`, `InfraStatusHistory`, `VillageInfraProximity`, `VillageFeature`, `VillageRiskFlag`, `VillageScore`, `ScoringWeightProfile`
(+ `PriceType`, `EntryWindow`)

**News**
`NewsArticle`, `NewsCity`, `NewsSource`, `NewsIngestRun`
(+ `NewsCategory`, `NewsSentiment`)

> Seed data: `prisma/seed.ts` + `seed-upgraded.ts` (run via `prisma db seed`), plus `seed-advanced.ts` and admin seed routes.

---

## 8. Dependencies

**Runtime:** `next@16.2.7`, `react@19.2.4`, `@prisma/client@7.8` + `@prisma/adapter-pg` + `pg`, `next-auth@4`, `@anthropic-ai/sdk`, `resend`, `@vercel/blob`, `bcryptjs`, `zod`, `recharts`, `leaflet`, `jspdf`, `lucide-react`, Radix UI (`dialog`, `dropdown-menu`, `select`, `slider`, `tabs`), `@dnd-kit/*`, `double-metaphone`, `@indic-transliteration/sanscript`, `clsx`, `tailwind-merge`, `class-variance-authority`.

**Dev:** `prisma@7.8`, `typescript@5`, `tailwindcss@4` (+ `@tailwindcss/postcss`), `eslint@9` + `eslint-config-next`, `tsx`, `@types/*`.

**Scripts:** `dev`, `build`, `start`, `lint`, `test:geo`, `test:analytics`, `etl:lgd`, `etl:boundaries`, `eval:resolver`, `golden:import/export`, `landiq:seed-weights`, `news:seed`.

---

## 9. Environment variables — **what you need to provide**

> Values live in `.env.local` (git-ignored). A template exists at **`.env.example`**.
> **Never commit real secrets.** Below, "in .env.local" means the key is present locally — you should confirm the value is real/valid.

### ✅ Already present in your `.env.local` (verify the values are real, not placeholders)
| Key | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection (currently localhost dev DB) |
| `NEXTAUTH_SECRET`, `NEXTAUTH_URL` | NextAuth session signing + base URL |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth login |
| `ANTHROPIC_API_KEY` | Claude — research, extraction, persona/lead scoring |
| `RESEND_API_KEY` | Email sending |
| `NEXT_PUBLIC_APP_URL` | Public base URL for links in emails/portal |
| `ADMIN_EMAIL` | Admin identity / notifications |

### ⚠️ Referenced in code but **NOT yet in your `.env.local`** — add these when you turn the feature on
| Key | Needed for | Notes |
|---|---|---|
| `RESEND_FROM_EMAIL` | Email delivery | **Must be a domain you verified in Resend**, or mail only reaches your own Resend account address |
| `RESEND_REPLY_TO` | Email reply-to | Optional |
| `EMAIL_SEND_IN_DEV` | Email testing | `"false"` = log instead of send in dev; `"true"` to actually send |
| `EMAIL_VERIFICATION_REQUIRED` | Signup gate | Keep `"false"` until a real verification email confirms delivery, or you can lock users out |
| `CRON_SECRET` | Cron auth | Bearer token protecting `/api/cron/*` (news + seller maintenance). Set the same value in Vercel |
| `BLOB_READ_WRITE_TOKEN` | File uploads | Vercel Blob storage (brochures, media). Local disk works without it |
| `ENCRYPTION_KEY` | Integrations | Encrypts stored inbound-source credentials |
| `NEWS_PROVIDER` | News feed | Which live provider to use; currently mock. Set to switch on live news |
| `NEWSDATA_API_KEY` / `MEDIASTACK_API_KEY` | Live news | API key for the chosen news provider |
| `WATI_API_ENDPOINT`, `WATI_API_KEY`, `WATI_API_TOKEN` | WhatsApp | WATI account for broadcasts, triggers, inbound |
| `ADMIN_EMAIL_DOMAIN` | Admin gating | Optional domain check for admin accounts |
| `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING` | Prod DB | Vercel Postgres conventions (used in production; local uses `DATABASE_URL`) |

### `.env.example` also lists (optional/alternate)
`UPLOADTHING_SECRET`, `UPLOADTHING_APP_ID` — alternate to local disk / Vercel Blob for uploads.

---

## 10. External accounts / services to set up (your action items)

1. **Google OAuth** — Google Cloud console: create OAuth credentials, add authorized redirect URIs (`{NEXTAUTH_URL}/api/auth/callback/google`). Keys are in `.env.local` — confirm they're live and the redirect URIs match your deploy URL.
2. **Anthropic (Claude) API key** — present; without it the app falls back to a **local mock generator** in dev, so research/extraction work but aren't "real". Provide a funded key for production quality.
3. **Resend** — verify a sending **domain** and set `RESEND_FROM_EMAIL` to it; then flip `EMAIL_SEND_IN_DEV`/`EMAIL_VERIFICATION_REQUIRED` when ready.
4. **WATI (WhatsApp)** — account + `WATI_API_*`; required for broadcasts, lead WhatsApp triggers, and inbound.
5. **News provider** — Newsdata or Mediastack key + `NEWS_PROVIDER`; the feed runs on mock data until then.
6. **Vercel Blob** — `BLOB_READ_WRITE_TOKEN` for durable file storage in production.
7. **CRON_SECRET** — generate a random secret; set it in Vercel and `.env` so scheduled jobs authenticate.
8. **Production PostgreSQL** — provision (e.g. Vercel Postgres / Neon / Supabase) and set the `POSTGRES_*` / `DATABASE_URL` vars. The build runs `prisma db push` automatically.

---

## 11. Data you still need to load (not code — datasets)

These engines are **built and tested but data-gated** — they degrade gracefully until data lands:

- **Geo resolution layer** — the `RevenueVillage` table is **empty**. LGD codes + boundary shapefiles need loading (`scripts/etl/load-lgd.ts`, `load-boundaries.ts`). Until then, village typeahead is empty and Seller Mode uses **corridor** as the geographic unit.
- **PostGIS** — not installed; boundary checks use a JS point-in-polygon fallback on `boundaryGeoJSON` (also empty), so pin-validation returns "not verified" rather than a false pass/fail.
- **LandIQ village scoring** — needs the geo data above plus price/registration/infra observations.
- **Validation Lab** — thesis tests are gated on historical data.
- **News** — real articles require a live provider key (see §9/§10).

---

## 12. Status summary

**Built & working:** research, calculator, projects, market data, news (mock), client dashboard, owned-property tracker, full admin CRM (leads/personas/matching/scoring/roadmap/pipeline), broadcasts (WhatsApp+email), inbound integrations, brochure extraction, email system (flag-gated), and **Seller Mode** (schema + scoring + APIs + UI + crons, verified).

**Uncommitted work in the tree (as of this writing):** email system, brochure extraction, and Seller Mode are present as working changes not yet committed to git.

**Deferred / next up:**
- Seller Mode: brochure-autofill into the wizard; a seller-facing notification channel (currently logs activity events).
- Geo/LandIQ/Validation Lab: load the real datasets to activate.
- News, WhatsApp, Email, Blob storage: provide the external keys above to go live.

---

## 13. Running locally

```bash
# 1. install
npm install

# 2. configure — copy the template and fill values
cp .env.example .env.local   # then edit

# 3. database — apply schema + seed
npx prisma db push
npx prisma db seed

# 4. run
npm run dev                  # http://localhost:3000

# tests
npm run test:geo             # geo + landiq + news + extraction + listings unit tests
```

> Note: `prisma.config.ts` loads `.env` (not `.env.local`) for Prisma CLI commands; pass `--url` or export `DATABASE_URL` when running `prisma db push` against the local DB if needed.
