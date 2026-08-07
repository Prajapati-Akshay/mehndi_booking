# Mehndi By Dhara — Booking & Appointment Platform

A production-ready booking website for **Mehndi By Dhara** (Instagram [@mehndibydhara](https://instagram.com/mehndibydhara), WhatsApp +91 6358290268).

## 1. Overview

Customers can browse services and pricing, book an appointment through a guided multi-step flow, and contact the
artist directly via WhatsApp or Instagram. The owner manages everything — bookings, services, pricing,
availability, and customers — through a protected admin dashboard.

## 2. Architecture

Monorepo (npm workspaces):

```
/apps
  /web   -> Next.js 14 (App Router, TypeScript, Tailwind CSS) — public site + admin UI
  /api   -> NestJS (TypeScript) — REST API, Swagger, Prisma ORM
/packages
  /shared -> Shared constants/types (business info, enums)
```

Data flows: Next.js Server Components call the NestJS REST API (`NEXT_PUBLIC_API_URL`) for all business data —
no database access happens in the frontend. All pricing, booking, and business logic lives in NestJS.

## 3. Tech Stack

- **Frontend:** Next.js 14, TypeScript, Tailwind CSS, Lucide icons, custom shadcn-style UI primitives
- **Backend:** NestJS, TypeScript, class-validator DTOs, Swagger/OpenAPI, JWT auth, Helmet, rate limiting
- **Database:** Prisma ORM, SQLite dialect everywhere. Locally it's a plain file
  (`DATABASE_URL="file:./dev.db"`, zero-install). In production, `PrismaService` connects through a
  libsql driver adapter — pointed at the same local file on a host with persistent disk (Render,
  Railway, a VPS), or at **Turso** (a hosted, SQLite-wire-compatible database) when deploying the
  API itself to Vercel, whose serverless functions have no persistent filesystem. See §9.

## 4. Folder Structure

```
apps/api/src
  admin/ auth/ availability/ bookings/ common/ contact/ customers/
  gallery/ payments/ pricing/ prisma/ services/ testimonials/
  app.module.ts  main.ts
apps/api/prisma
  schema.prisma  seed.ts  migrations/
apps/web/src
  app/            -> all routes (public + /admin/*)
  components/     -> Header, Footer, WhatsApp button, UI primitives, AdminShell
  lib/            -> api client, types, whatsapp helper, admin auth helper
```

## 5. Environment Variables

**apps/api/.env**
```
DATABASE_URL="file:./dev.db"      # local SQLite file — always set this, even in production
TURSO_DATABASE_URL=""             # production on Vercel only — see §9. Leave blank locally.
TURSO_AUTH_TOKEN=""               # production on Vercel only. Leave blank locally.
JWT_SECRET="change-this"
JWT_EXPIRES_IN="7d"
PORT=4000
SEED_ADMIN_EMAIL="admin@mehndibydhara.com"
SEED_ADMIN_PASSWORD="ChangeMe123!"
CORS_ORIGIN="http://localhost:3000"
SMS_PROVIDER=msg91
MSG91_AUTH_KEY=
MSG91_SENDER_ID=
MSG91_TEMPLATE_ID=
```

**apps/web/.env.local**
```
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_WHATSAPP_NUMBER=916358290268
NEXT_PUBLIC_INSTAGRAM_URL=https://instagram.com/mehndibydhara
```

## 6. Getting Started (Local)

Requires Node.js 18+, npm, Git. No local PostgreSQL install needed.

```bash
npm install                       # installs all workspaces
npm run prisma:generate           # generate Prisma client
npx prisma db push --accept-data-loss --schema apps/api/prisma/schema.prisma   # create dev.db (first run)
npm run prisma:seed               # seed categories, pricing, admin user, availability

npm run dev:api                   # http://localhost:4000/api  (Swagger at /api/docs)
npm run dev:web                   # http://localhost:3000
```

Admin login: `admin@mehndibydhara.com` / `ChangeMe123!` (from `.env`) at `/admin/login`.

## 7. Database Schema (Prisma)

`User, Customer, ServiceCategory, Service, ServicePricing, Availability, TimeSlot, Booking,
BookingStatusHistory, Payment, Gallery, Testimonial, ContactMessage` — all UUID-keyed with
`createdAt`/`updatedAt`. Relations: `ServiceCategory → Service → ServicePricing → Booking`,
`Customer → Booking`, `Booking → Payment`, `Booking → BookingStatusHistory`.

Double-booking is prevented with a Prisma transaction: the selected `TimeSlot` is re-checked and
marked `isBooked` atomically inside the same transaction that creates the `Booking`.

## 8. API Reference

Swagger UI: `http://localhost:4000/api/docs`. All responses use the shape
`{ success, message, data }`. Key endpoints:

```
POST   /api/auth/login              POST /api/auth/register (bootstrap-only)
GET    /api/services/categories     GET/POST/PATCH/DELETE /api/services(/:id)
GET/POST/PATCH/DELETE /api/pricing(/:id)
POST   /api/bookings                GET  /api/bookings (admin)
GET    /api/bookings/:id            PATCH /api/bookings/:id/status (admin)
PATCH  /api/bookings/:id (admin)    DELETE /api/bookings/:id (admin)
GET/POST/PATCH/DELETE /api/availability(/:id)
GET    /api/customers (admin)       GET /api/customers/:id (admin)
GET/POST/PATCH/DELETE /api/gallery(/:id)
GET/POST/PATCH/DELETE /api/testimonials(/:id)
POST   /api/contact                 GET /api/contact (admin)
GET    /api/admin/dashboard (admin)
```

## 9. Deploying Everything to Vercel

Both `apps/web` and `apps/api` deploy to Vercel as **two separate Vercel projects from the same
GitHub repo** (Vercel's "Root Directory" project setting points each one at its own app folder).
The frontend needs nothing special. The backend needs a real database it can reach over the network
— Vercel serverless functions get a brand-new, effectively-read-only filesystem on every invocation,
so a local `file:./dev.db` can't hold real data there. **Turso** solves this: it's SQLite-wire
compatible, so the schema, Prisma models, and every query in this codebase are unchanged — only the
connection in `apps/api/src/prisma/prisma.service.ts` switches from a local file to Turso's network
protocol when `TURSO_DATABASE_URL` is set.

### 9.1 Create the Turso database (one-time)

1. Install the Turso CLI and sign in: see https://docs.turso.tech/cli/installation (`turso auth login`).
2. Create the database and grab its URL + a token:
   ```bash
   turso db create mehndi-by-dhara
   turso db show mehndi-by-dhara --url          # -> TURSO_DATABASE_URL (starts with libsql://)
   turso db tokens create mehndi-by-dhara       # -> TURSO_AUTH_TOKEN
   ```
3. Apply the schema to Turso. The Prisma CLI's own migration engine doesn't speak the libsql wire
   protocol, so the schema is applied via the Turso CLI instead, using the same migration SQL already
   committed at `apps/api/prisma/migrations/00000000000000_init/migration.sql`:
   ```bash
   turso db shell mehndi-by-dhara < apps/api/prisma/migrations/00000000000000_init/migration.sql
   ```
4. Seed it. `prisma/seed.ts` uses `PrismaClient` directly (no adapter), so point it at Turso for one
   run by exporting the same two values as env vars, then run the seed script — because
   `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN` are only read by `PrismaService` (the app), not by the seed
   script, the simplest one-time approach is: temporarily set `DATABASE_URL` to a libsql-scheme URL
   Prisma's client can open directly:
   ```bash
   cd apps/api
   DATABASE_URL="libsql://<your-db>.turso.io?authToken=<your-token>" npx ts-node prisma/seed.ts
   ```
   (On Windows PowerShell: `$env:DATABASE_URL="libsql://..."; npx ts-node prisma/seed.ts`.)

### 9.2 Deploy `apps/api` to Vercel

1. New Vercel project → import this repo → **Root Directory: `apps/api`**.
2. Framework Preset: "Other". Vercel auto-detects `apps/api/api/index.ts` as the serverless function
   (`apps/api/vercel.json` rewrites every path to it, so `/api/*` all resolve correctly).
3. Environment variables: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `JWT_SECRET`, `JWT_EXPIRES_IN`,
   `CORS_ORIGIN` (your `apps/web` Vercel domain, set after step 9.3), and the `SMS_PROVIDER`/`MSG91_*`
   vars if you have real MSG91 credentials. `DATABASE_URL` can stay as the local-file default — it's
   unused at runtime once `TURSO_DATABASE_URL` is set, only the build's `prisma generate` needs it to
   exist.
4. Deploy. `postinstall` runs `prisma generate` automatically. Verify with
   `https://<your-api>.vercel.app/api/services/categories` and `/api/docs`.

### 9.3 Deploy `apps/web` to Vercel

1. New Vercel project → same repo → **Root Directory: `apps/web`**.
2. Environment variables: `NEXT_PUBLIC_API_URL=https://<your-api>.vercel.app/api`,
   `NEXT_PUBLIC_WHATSAPP_NUMBER`, `NEXT_PUBLIC_INSTAGRAM_URL`.
3. Deploy, then go back to the `apps/api` project and set `CORS_ORIGIN` to this project's domain.

### 9.4 Alternative: keep SQLite, skip Turso

If you'd rather not introduce Turso, deploy `apps/web` to Vercel as above but host `apps/api` on
Render/Railway/Fly.io instead (§12) — those give the API a real persistent disk, so
`DATABASE_URL="file:./dev.db"` keeps working exactly as it does locally, no `TURSO_*` vars needed.

## 10. Seed Data

`apps/api/prisma/seed.ts` seeds: all 6 categories with every pricing tier from the price list,
one admin user (from `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`), 14 days of sample availability with
5 daily time slots, sample testimonials and gallery entries. Re-run any time with `npm run prisma:seed`
— it upserts, so it's safe to run repeatedly.

## 11. Commands

```bash
npm run dev:api / dev:web           # start dev servers
npm run build:api / build:web       # production builds (verified passing)
npm run prisma:generate             # regenerate Prisma client
npm run prisma:migrate              # create a new migration (interactive)
npm run prisma:seed                 # seed the database
```

Backend tests: `npm run test --workspace=apps/api` (Jest is configured; add specs under
`apps/api/src/**/*.spec.ts` as the codebase grows — recommended priority: bookings.service
conflict handling, auth guards, DTO validation).

## 12. Deployment

- **All on Vercel (recommended path, see §9 for full steps):** `apps/web` and `apps/api` as two
  Vercel projects from this one repo (different Root Directory each). The API connects to **Turso**
  in this configuration since Vercel functions have no persistent disk.
- **Alternative — Vercel + a traditional host:** `apps/web` on Vercel as above; `apps/api` on
  Render/Railway/Fly.io (root directory `apps/api`, build `npm run build`, start
  `node dist/src/main.js`) with `DATABASE_URL="file:./dev.db"` — no Turso needed, since those hosts
  give the API a real persistent disk.

## 13. Admin Setup

The first admin account is created via `npm run prisma:seed` (from `SEED_ADMIN_EMAIL` /
`SEED_ADMIN_PASSWORD`). `POST /api/auth/register` only works while zero admin accounts exist, as a
one-time bootstrap safeguard — after that, admins are managed directly via the seed script or database.

## 14. What's Deliberately Scoped Down (v1)

- **Payments:** architecture is in place (`Payment` model, `PENDING/PARTIAL/PAID/REFUNDED` states,
  `POST/GET /api/payments`) but no live payment gateway is wired up — Razorpay can be added by
  calling `PaymentsService.create` from a webhook handler.
- **Admin image upload:** Gallery items store an `imageUrl` string (populate with hosted image URLs
  or wire up Supabase Storage / an upload endpoint later) rather than a full upload pipeline.
- **Automated test coverage** is scaffolded (Jest configured, no local Postgres needed to run it)
  but not exhaustive — see §11 for where to extend it first.
