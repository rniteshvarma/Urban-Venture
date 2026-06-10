# Aura Real Estate AI Research Portal & CRM

A production-ready, full-stack Next.js 14+ application designed for an Indian real estate investment advisory business in Hyderabad, Telangana. The platform is divided into a public-facing **Client Portal** and a secure **Admin CRM**.

## 🌟 Tech Stack
- **Frontend/Backend:** Next.js 16 (App Router), TypeScript, Tailwind CSS v4
- **Database:** PostgreSQL via Prisma ORM v7
- **AI Core:** Anthropic Claude API (`claude-sonnet-4-20250514`) with intelligent local mock fallback
- **Authentication:** NextAuth.js (Credentials Provider with role-based client/admin access)
- **Visuals/Analytics:** Recharts
- **File Uploads:** Local uploads saved directly to `/public/uploads` (supports Supabase/UploadThing in production)

---

## 🔒 Default Credentials
For accessing the Admin CRM:
- **Email:** `admin@realestate.com`
- **Password:** `Admin@123`
- **Dashboard URL:** `/admin/dashboard` (unauthenticated requests are redirected to `/admin/login`)

---

## 🚀 Setup & Local Execution Guide

### 1. Pre-requisites
- Node.js v20+
- PostgreSQL server (running locally or remotely)

### 2. Install Dependencies
Clone/navigate to the project directory and install the packages:
```bash
npm install --legacy-peer-deps
```

### 3. Environment Configuration
Create a `.env` file in the root directory and copy the contents of `.env.example`:
```bash
cp .env.example .env
```
Ensure your `DATABASE_URL` matches your PostgreSQL database credentials.

### 4. Database Setup & Seeding
Prisma v7 delegates database connection parameters to `prisma.config.ts`. Run the following command to push the schema tables to your PostgreSQL instance:
```bash
npx prisma db push
```

Next, populate the database with the Admin account and 8 Hyderabad corridors:
```bash
npx prisma db seed
```

### 5. Running the Application
Launch the Next.js local development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the portal.

---

## 📂 Project Architecture

```
/
├── app/
│   ├── (client)/
│   │   ├── page.tsx                  # Landing Page
│   │   ├── research/page.tsx         # AI Research Tool Page
│   │   └── projects/
│   │       ├── page.tsx              # Public project grid listings
│   │       └── [id]/page.tsx         # Project detail & Express Interest form
│   ├── (admin)/
│   │   └── admin/
│   │       ├── login/page.tsx        # CRM Login
│   │       ├── dashboard/page.tsx    # CRM overview dashboard
│   │       ├── leads/page.tsx        # Leads timeline & updates CRM
│   │       ├── projects/page.tsx     # Admin projects listings
│   │       ├── projects/new/page.tsx # Create project editor
│   │       ├── projects/[id]/page.tsx# Modify project details
│   │       ├── customers/page.tsx    # Customer searches directory
│   │       └── analytics/page.tsx    # Detailed conversion charts
│   └── api/                          # Next.js API Routes (Zod validated)
│       ├── research/route.ts
│       ├── projects/route.ts
│       └── admin/
│           ├── leads/route.ts
│           ├── projects/route.ts
│           ├── customers/route.ts
│           └── analytics/route.ts
├── components/
│   ├── client/                       # Client Portal components
│   ├── admin/                        # Admin CRM components & charts
│   └── Providers.tsx                 # NextAuth Provider wrapper
├── lib/
│   ├── prisma.ts                     # PrismaPg Client instance
│   ├── anthropic.ts                  # Claude recommendations API helper
│   └── auth.ts                       # NextAuth credentials settings
└── prisma/
    ├── schema.prisma                 # Database models
    └── seed.ts                       # Database seeding code
```

---

## 🛠️ Verification Checklist
- **Rate Limiting:** Optional rate limits can be applied to `/api/research` using cloud middleware or custom Upstash Redis wrappers in production.
- **Client PDF Generation:** Inside the report page, click **Print / Download PDF** to save the custom-styled PDF document (headers/footers/CTAs are styled to be hidden automatically).
- **Leads Export:** Go to `/admin/leads` or `/admin/customers` and click **Export CSV** to download lead directories.
