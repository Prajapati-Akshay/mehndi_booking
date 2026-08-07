# Final Report — Mehndi By Dhara (Per-Person Pricing + Notifications Update)

## 1. Implemented Features

- Per-person pricing throughout: booking form collects `numberOfPeople`, backend is the sole source
  of truth for `pricePerPerson × numberOfPeople = totalAmount`, `50% = advanceAmount`, remainder.
- Reactive People stepper (`[-] N [+]`, min 1, default 1) with a live price/advance/remaining preview
  that updates instantly, no page reload.
- Fully hardened Confirm Booking flow: validates every field client-side before enabling the button,
  shows a distinct loading label, disables the button during submission (no duplicate bookings),
  surfaces the exact server error on failure while preserving all entered data, and on a 409 slot
  conflict specifically refreshes availability and returns the user to the date/time step.
- SMS notification architecture: `NotificationsModule` → `NotificationsService` (templates + logging)
  → `SmsService` (provider resolution) → `Msg91Provider` (real MSG91 HTTP integration). Every send
  attempt is logged as a `Notification` row; a failure never affects the booking.
- `Notification` history admin endpoint (`GET /api/notifications`).
- WhatsApp deep-link messages now include price-per-person and total separately.
- Standardized error envelope: `{success:false, message, errorCode, errors}` across all endpoints.
- Booking status transitions (CONFIRMED/REJECTED/CANCELLED/COMPLETED) each fire the corresponding
  templated SMS and update the linked Payment status.

## 2. Documentation Created

- `docs/PLAN.md` — consolidated requirements/architecture/DB/API/frontend specification for this
  change (condensed from the requested 14 files by explicit user choice, to prioritize working code).
- `docs/IMPLEMENTATION-STATUS.md` — full task-by-task tracker (23/23 COMPLETED).
- `docs/FINAL-REPORT.md` — this document.
- `README.md` (root, pre-existing) still covers full setup/deploy for the base app.

## 3. Architecture

Unchanged monorepo shape (`apps/web` Next.js, `apps/api` NestJS, `packages/shared`). New backend
module: `apps/api/src/notifications/` (`NotificationsService`, `SmsService`, `Msg91Provider`,
`SmsProvider` interface, `NotificationsController`). `BookingsService` now depends on
`NotificationsService` and calls it strictly after its Prisma transaction commits.

## 4. Database Schema (delta)

- `Booking`: added `bookingNumber` (renamed from `bookingCode`), `serviceId` (new direct FK),
  `pricingId` (renamed from `servicePricingId`), `pricePerPerson`.
- `Payment`: added `totalAmount`, `advanceAmount`, `remainingAmount` snapshot fields.
- New `Notification` model: `id, bookingId, type, channel, recipient, message, status, provider,
  providerMessageId, errorMessage, createdAt, updatedAt`.
- SQLite, `DATABASE_URL="file:./dev.db"`, zero external DB install — unchanged.

## 5. API List (bookings + notifications, delta)

```
POST   /api/bookings                    { serviceId, pricingId, numberOfPeople, ... } -> slim response
GET    /api/bookings                    (admin)
GET    /api/bookings/:id
PATCH  /api/bookings/:id/status         (admin) -> fires templated SMS
PATCH  /api/bookings/:id                (admin)
DELETE /api/bookings/:id                (admin)
GET    /api/notifications?bookingId=    (admin)
```
Full endpoint list otherwise unchanged (see root `README.md` §8).

## 6. Frontend Routes

Unchanged route list; `/booking` wizard gained a People step (now 6 steps total:
Service → Package → People → Date & Time → Your Details → Summary).

## 7. Admin Features

Unchanged feature set (dashboard, bookings with status actions, services, pricing, availability,
customers) plus notification history now queryable via the API (no dedicated admin UI page added
in this pass — reachable via Swagger/API directly).

## 8. SMS Integration

MSG91 provider fully implemented against their `sendhttp` API, reading `SMS_PROVIDER`,
`MSG91_AUTH_KEY`, `MSG91_SENDER_ID` from environment. **Not live in this environment** — no MSG91
account/API key was available (requires the business owner's paid account, confirmed via the scoping
question at the start of this task). Every send attempt is still logged with the real HTTP flow
executed and a clear `errorMessage` when unconfigured — verified end-to-end (see §12).

## 9. WhatsApp Integration

Unchanged phone number and "Book via WhatsApp" CTA; message now includes price-per-person and total
as separate lines.

## 10. Person-Based Pricing Logic

`apps/api/src/bookings/booking-pricing.util.ts`:
```ts
totalAmount = pricePerPerson * numberOfPeople
advanceAmount = Math.ceil(totalAmount * 0.5)
remainingAmount = totalAmount - advanceAmount
```
Computed exclusively server-side from the `ServicePricing.price` row looked up by `pricingId` — the
client never sends a trusted amount.

## 11. Booking Flow

Service → Package → **People (new)** → Date → Time → Customer Details → Terms → Confirm Booking →
NestJS validation & recalculation → DB transaction (customer upsert, booking, status history, payment
snapshot, time-slot lock) → notification dispatch (post-commit, failure-isolated) →
`/booking/confirmation/[bookingId]`.

## 12. Testing Results

```
Test Suites: 2 passed, 2 total
Tests:       7 passed, 7 total
```
- `booking-pricing.util.spec.ts` — 5 tests: the three spec scenarios (₹500×1/2/5) plus the
  ₹200×3=₹600 Arabic Palm Length example plus a rounding edge case.
- `bookings.service.conflict.spec.ts` — 2 tests against a real, disposable SQLite database: first
  booking succeeds with correct amounts; second booking against the identical time slot throws
  `ConflictException` (409).

**Manual end-to-end run** (live servers, real HTTP, real DB — not simulated):
- `POST /bookings` for Arabic Mehndi / Palm Length / 3 people → API returned
  `pricePerPerson: 200, totalAmount: 600, advanceAmount: 300, remainingAmount: 300` (exact spec match).
- Confirmed identical values persisted in the `Booking` row and mirrored in a `Payment` snapshot row.
- Confirmed a `Notification` row (`type: BOOKING_CREATED`) was created; `status: FAILED` with
  `errorMessage: "MSG91_AUTH_KEY / MSG91_SENDER_ID not configured"` — booking remained successful.
- `GET /booking/confirmation/[id]` on the live Next.js server rendered the correct booking number and
  all three amounts.
- Admin login → `PATCH /bookings/:id/status {status: CONFIRMED}` → second `Notification` row
  (`BOOKING_CONFIRMED`) created, and the `Payment` row's status moved to `PARTIAL`.
- Test data cleaned up after verification.

## 13. Build Results

```
apps/api: tsc --noEmit  -> 0 errors
apps/api: eslint         -> 0 errors, 0 warnings
apps/api: nest build     -> success
apps/web: next lint      -> No ESLint warnings or errors
apps/web: next build     -> success, 21 routes generated
```

## 14. Known Limitations

- SMS is not actually delivered without real MSG91 credentials (see §8) — this is an external-account
  dependency, not a code gap; the integration is complete and tested up to that boundary.
- No WhatsApp Business API send integration — WhatsApp remains a `wa.me` deep link (as originally
  scoped in the base app), not a server-triggered message.
- `GET /notifications` has no dedicated admin UI page yet (API-only in this pass).
- Payment collection is still logged manually by the admin; no live payment gateway (Razorpay-ready
  architecture only, per the base app's README §14).

## 15. Future Improvements

- Add a WhatsApp Business Cloud API provider behind the same `NotificationsService` abstraction.
- Admin UI page for notification history and manual "resend SMS" action.
- Razorpay integration for the advance payment.
- Idempotency key on `POST /bookings` to make client-side retries after a network timeout provably
  safe (today, the disabled-button + numberOfPeople-aware conflict check makes duplicate bookings
  practically very unlikely, but not formally idempotent).

## 16. Local Setup

Unchanged from root `README.md` §6, plus new SMS env vars:
```bash
npm install
npm run prisma:generate
npx prisma db push --accept-data-loss --schema apps/api/prisma/schema.prisma   # first run only
npm run prisma:seed
npm run dev:api   # http://localhost:4000/api/docs
npm run dev:web   # http://localhost:3000
```
`apps/api/.env` additions:
```
SMS_PROVIDER=msg91
MSG91_AUTH_KEY=
MSG91_SENDER_ID=
MSG91_TEMPLATE_ID=
```
Leave the MSG91 vars blank to keep booking fully functional with SMS logged-but-not-sent; fill them
in with real credentials to go live — no code changes required.

## 17. Deployment Instructions

Unchanged from root `README.md` §12 (Vercel for `apps/web`, Render/Railway/Fly.io for `apps/api`,
SQLite file or migrate to Supabase Postgres per README §9). Add the three MSG91 env vars to the
backend host's environment when real credentials are available.
