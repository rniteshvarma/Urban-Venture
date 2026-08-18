# Client Auth & User Dashboard — Implementation Plan

Status: **PLAN — awaiting approval before any code or migration.**
Locked decisions (from review): **extend NextAuth v4 additively** (do not migrate to v5),
**replace `/portal` with `/dashboard`**, **new models are additive only**, **CRM/admin untouched**.

---

## 0. Guardrails

- **Never touch the CRM auth path.** `src/lib/auth.ts` (`authOptions`), `/admin/*`, and the
  admin `authorize()` that reads `user.password` + JWT sessions stay exactly as they are.
- **No migration runs until the target DB is confirmed.** Repo has `.env.production.local`;
  migrations will target the **local/dev** database only, and only after explicit go-ahead.
  Plan uses `prisma migrate dev` on dev; production is a separate, later, deliberate step.
- **Every scoped API query filters by `session.user.id`.** No client-supplied userId, ever.
  Verify ownership of any `purchaseId`/`documentId` before returning it.
- **v2 tokens + `lib/format.ts` everywhere** (₹ Lakh/Cr, sq.yd, Indian grouping, mono numerals).

---

## 1. Spec ↔ reality reconciliation (must resolve before building)

The models the dashboard *reads* all exist. These are the gaps between the spec and the
current schema — each needs a decision:

| # | Spec expects | Reality | Plan |
|---|---|---|---|
| R1 | `User.passwordHash` | `User.password` exists (admin uses it) | **Reuse `user.password`.** No rename (would break admin). |
| R2 | "Add `Lead.userId`" | `Lead.userId` already exists | Nothing to add. Use as-is. |
| R3 | NextAuth `Session`/`VerificationToken` + database sessions | v4 JWT sessions | **Keep JWT.** No Session/VerificationToken tables. Password reset uses a small `PasswordResetToken` model instead. |
| R4 | Google via PrismaAdapter `Account` | none | **Manual linking** in the NextAuth `signIn` callback via `User.googleId` — no adapter tables. (Add `Account` only if you later want multi-provider history.) |
| R5 | `PropertyDocument.isVisibleToClient`, category, size, `uploadedBy` | only `type`, `name`, `url`, `uploadedAt` | **Additive fields** on `PropertyDocument`: `isVisibleToClient Boolean @default(true)`, `sizeBytes Int?`, `uploadedBy String?`. Category derives from existing `type` (DocumentType). |
| R6 | Advisor = `Lead.assignedTo` → `User` (AGENT role) | `Role` = `CLIENT \| ADMIN` only; `assignedTo` is a `String?` | **Open question (Q1 below).** Likely resolve `assignedTo` → `User.id`; add `AGENT` to `Role` if advisors are real users, else generic advisor card. |
| R7 | `calculatePropertyAppreciation()` | fn is `calculateAppreciation()` in `src/lib/appreciation-engine.ts` (already used by portal API) | Use existing `calculateAppreciation` / `calculateBatchAppreciation`. |
| R8 | OTP via WATI | existing `src/lib/whatsapp/*` | Reuse existing WhatsApp sender for OTP; stub if creds absent. |
| R9 | `InfraMilestone.affectedCorridorSlugs` for "what changed" | to verify field name | Verify during build; fall back to corridor relation. |

---

## 2. Schema changes (additive migration `add_client_portal`)

**`User`** — add columns (all nullable/defaulted, safe on existing rows):
```prisma
googleId             String?     @unique
emailVerified        DateTime?
phoneVerified        Boolean     @default(false)
authProvider         AuthProvider @default(EMAIL)
budget               Float?
horizon              Int?
preferredCity        String?     @default("Hyderabad")
riskAppetite         RiskLevel?
profileScore         Int         @default(0)
lastLoginAt          DateTime?
lastDashboardVisitAt DateTime?
updatedAt            DateTime    @updatedAt          // backfill default on migrate
// relations: savedProjects, watchlist, savedReports, compareItems
```
Keep existing `password`, `phone`, `role`, `leads`, `searches`, `purchases`.

**New enums:** `AuthProvider { EMAIL GOOGLE BOTH }`, `CompareType { PROJECT CORRIDOR }`.

**New models:** `AnonymousSession`, `SavedProject`, `CorridorWatch`, `SavedReport`,
`CompareItem`, `PasswordResetToken` (all exactly per spec; `SavedReport.search` →
existing `Search`, `CorridorWatch` snapshots `priceAtWatchSqYd` + `scoreAtWatch`).

**`PropertyDocument`** — add `isVisibleToClient Boolean @default(true)`, `sizeBytes Int?`,
`uploadedBy String?` (R5).

**`Role`** — add `AGENT` only if Q1 resolves that way.

Migration: `prisma migrate dev --name add_client_portal` on **dev** → `prisma generate`.
All additive; no data loss; existing rows get defaults.

---

## 3. Auth wiring (extend v4)

`src/lib/auth.ts` — add to the existing `authOptions.providers`:
- `GoogleProvider({ clientId, clientSecret })`
- keep the existing `CredentialsProvider` (admin + client share it; client login = same email/password check)

Callbacks (extend, don't replace):
- `signIn`: if Google → find user by email. If none, create `CLIENT` with `googleId`,
  `authProvider: GOOGLE`, `emailVerified: now`. If exists with password → link
  (`googleId`, `authProvider: BOTH`). Never duplicate. Then run
  `resolveLeadIdentity(user)` + `mergeAnonymousSession`.
- `jwt`/`session`: already carry `id` + `role`; add nothing sensitive.
- Keep `pages.signIn` for admin at `/admin/login`; **client** pages pass their own
  `callbackUrl`/`signIn("credentials", {...})` from `/login`, so no global page change.

**Middleware** (`src/middleware.ts`): replace the `/portal` block with a `/dashboard` block —
unauthenticated `/dashboard/*` → `/login?next=<path>`; authed on `/login`|`/signup` →
`/dashboard`. Keep the `/admin` block byte-for-byte. Add `/dashboard` to `matcher`, keep
`/portal` temporarily to 308-redirect → `/dashboard`.

**Password reset:** `PasswordResetToken { token, userId, expiresAt, usedAt }`, 1h expiry,
single use; email via existing `src/lib/email/*` (Resend).

Env to add (you provide): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`
(a real one — the current fallback string is insecure), `NEXTAUTH_URL`.

---

## 4. Anonymous session + merge + lead resolution

- `lib/anon-session.ts`: read/create `anon_sid` httpOnly cookie (90d, SameSite=Lax) on
  public pages (via a lightweight route or server action, since middleware can't set
  cookies cleanly for all cases). Anonymous save/watch/report writes push ids into the
  `AnonymousSession` arrays. Toast: `Saved. Create an account to keep these →`.
- `mergeAnonymousSession(userId, token)`: reassign `Search.userId`, upsert `SavedProject`
  + `CorridorWatch` (dedupe), auto-create `SavedReport` per merged search, set
  `mergedIntoUserId`/`mergedAt`, clear cookie. Land on `/dashboard` with confirmation toast.
- `resolveLeadIdentity(user)`: match `Lead.email` (ci) → else `Lead.phone` last-10 → link
  all matches (recent first), set `Lead.userId`, backfill missing `User.budget/horizon/
  preferredCity` (never overwrite user-set), append note "Client created a portal account".
  No match → create `Lead` (`source: "portal_signup"`, `sourceChannel: WEBSITE_FORM`,
  `status: NEW`) which fires existing CRM automations unchanged. Duplicate guard: phone
  matches but email differs → link + note `needsMergeReview: true`; never silent-merge.

---

## 5. API routes (all new, under `/api/*`; scoped by session)

Auth: `POST /api/auth/signup`, `/verify-phone/send`, `/verify-phone/confirm`,
`/forgot-password`, `/reset-password`, `/merge-anonymous`.
Dashboard: `GET /api/dashboard` (state + all blocks, one payload), `/dashboard/whats-changed`,
`POST /dashboard/mark-seen`.
User: `GET|PUT /api/user/profile`, `GET /api/user/profile-score`.
Saving: `/api/saved/projects` (GET/POST/DELETE/PUT note), `/api/watchlist`
(GET/POST snapshot/DELETE + `/growth`), `/api/reports` (GET/POST/DELETE/PUT pin/POST rerun).
Compare: `/api/compare` (GET/POST/DELETE/clear).
Portfolio: `/api/portfolio` (+`/[purchaseId]`, `/benchmark`, `/documents`, `/payments`).
Journey: `/api/journey` (allowlist-serialized). Advisor: `/api/advisor`.

**Journey allowlist serializer** (Part 5 rule): explicit field pick — never spread the
Prisma object. Strip `probability`, `estimatedValue`, `leadScore`, `persona`, agent notes,
internal stage notes, SKIPPED-for-internal stages. Map keys → client labels
(`NEEDS_ASSESSMENT → "Understanding your requirements"`, etc.).

---

## 6. Dashboard — one adaptive route

`resolveUserState(user)`: `OWNER` if purchases>0; else `ACTIVE_BUYER` if roadmap current
stage index ≥ 2 (SITE_VISIT+); else `EXPLORER`. OWNER may also render the active-buyer
journey block after owner blocks.

Blocks map to data as follows (build in this order):

| Block | State(s) | Primary source |
|---|---|---|
| A Greeting + resume | all | `User.lastLoginAt/VisitAt`, latest `SavedReport`/`Search` |
| C Next best action | all | priority ladder over payments/verify/docs/visit/profile/reports/watch |
| D Advisor | all | `Lead.assignedTo` → User (R6/Q1) |
| E Saved & Watching (tabs) | all | `SavedProject`, `CorridorWatch`, `SavedReport` |
| B What changed | all | deltas vs `CorridorWatch` snapshot + `lastDashboardVisitAt` |
| F Corridor growth | all | `CorridorWatch` snapshot vs `CorridorProfile` + `AppreciationHistory` sparkline |
| G Portfolio header | OWNER | `calculateBatchAppreciation(purchases)` |
| H My properties | OWNER | `PropertyPurchase` + `calculateAppreciation` + Recharts |
| I Benchmark | OWNER | calculator benchmark rates over holding period |
| J My Journey | ACTIVE_BUYER/OWNER | `/api/journey` allowlist projection |
| K Documents | OWNER | `PropertyDocument` where `isVisibleToClient` |
| L Payments | OWNER | `PaymentInstallment` (computed DUE_SOON/OVERDUE) |

Block order per state exactly per spec §2.2. **Blocks that don't apply do not render**
(no zero-state OWNER blocks for EXPLORERs). Skeleton per block, single `/api/dashboard`
fetch. `lastDashboardVisitAt` updated **after** render.

Compare tray = persistent bottom bar when `CompareItem` ≥ 1; `/compare?type=&ids=` table.

---

## 7. Pages

`/signup` (2-step, split dark/paper, phone required, verify-later), `/login`,
`/forgot-password`, `/reset-password/[token]`, `/dashboard`, `/dashboard/saved`,
`/dashboard/properties/[purchaseId]`, `/dashboard/documents`, `/dashboard/journey`,
`/dashboard/profile`, `/dashboard/settings`, `/compare`. All reuse the v2 `@/components/ui`
library. `/portal/*` → redirect to `/dashboard` equivalents.

---

## 8. Build sequence (this maps the spec's 14 steps to our v4-extend approach)

1. **Schema + migration (dev)** — §2. Gate: you confirm DB target.
2. **Auth extend** — Google provider + signIn linking + password reset + middleware swap. Gate: you provide Google creds + `NEXTAUTH_SECRET` (else Google is scaffolded but inert).
3. **`/signup` + `/login` + recovery pages.**
4. **Anon session + merge + `resolveLeadIdentity` + duplicate guard.**
5. **`/api/dashboard` aggregate + `resolveUserState`.**
6. **Dashboard shell + Blocks A, C, D.**
7. **Saving system (SavedProject/CorridorWatch/SavedReport) + Block E.**
8. **Compare tray + `/compare`.**
9. **Block B (what changed).**
10. **Block F + sparklines.**
11. **Owner Blocks G, H, I.**
12. **Blocks J, K, L.**
13. **Profile + settings + progressive profiling.**
14. **Empty states, skeletons, mobile pass, security audit.**

---

## 9. What I need from you (blockers)

- **Q1 (advisor):** Are advisors real `User` rows? If yes, may I add `AGENT` to `Role` and
  treat `Lead.assignedTo` as a `User.id`? Or keep a generic "Talk to an advisor" card for now?
- **Q2 (DB target):** Confirm migrations run against the **local/dev** database only. Which
  `DATABASE_URL` is dev? (I will not touch production.)
- **Q3 (credentials):** Google OAuth client id/secret, a real `NEXTAUTH_SECRET`, and WATI/
  WhatsApp OTP creds. Until provided, I'll scaffold Google + OTP as inert stubs so
  email/password signup still works end-to-end.
- **Q4 (docs vault):** OK to add `isVisibleToClient`/`sizeBytes`/`uploadedBy` to
  `PropertyDocument` (R5)? Client uploads for "pending from you" need a storage target —
  is there an existing upload/S3 setup, or should uploads be deferred to a later pass?

Once Q1–Q4 are answered (or you say "use your recommended defaults"), I'll start at Step 1.
