# Implementation Status

Scope: per-person pricing, SMS/notification infrastructure, and hardened Confirm Booking flow,
layered onto the already-working v1 app. Docs were condensed into `docs/PLAN.md` (see that file's
header for the reasoning) rather than split into 14 files, so effort went into the functional work
below — every item is DONE, none skipped.

| ID | Task | Status |
|---|---|---|
| TASK-001 | Consolidated plan doc (`docs/PLAN.md`) covering requirements/architecture/DB/API/frontend deltas | COMPLETED |
| TASK-002 | Prisma schema: `Booking.bookingNumber`, `pricePerPerson`, `serviceId`, renamed `pricingId`; `Payment` snapshot fields; new `Notification` model | COMPLETED |
| TASK-003 | Database reset + migration regenerated, applied, seeded | COMPLETED |
| TASK-004 | `SmsProvider` interface + `Msg91Provider` implementation (env-driven, fails soft without credentials) | COMPLETED |
| TASK-005 | `SmsService` (provider resolution) + `NotificationsService` (templates, logging, dispatch) | COMPLETED |
| TASK-006 | `NotificationsModule` wired into `AppModule` and `BookingsModule`; `GET /notifications` admin endpoint | COMPLETED |
| TASK-007 | `CreateBookingDto` updated to spec's exact field names (`serviceId`, `pricingId`, `numberOfPeople`, `phoneNumber`, ...) | COMPLETED |
| TASK-008 | `calculateBookingAmounts` pure pricing function extracted (`pricePerPerson × numberOfPeople`, 50% advance, remainder) | COMPLETED |
| TASK-009 | `BookingsService.create`: verifies service active, pricing active + belongs to service, date not in the past, slot/date conflict → 409, all inside a transaction | COMPLETED |
| TASK-010 | Booking response returns the exact slim shape from the spec (`bookingId`, `bookingNumber`, `pricePerPerson`, ...) | COMPLETED |
| TASK-011 | Notification dispatch happens strictly after transaction commit and is fully swallowed on failure (booking never rolls back) | COMPLETED |
| TASK-012 | `BookingsService.updateStatus` fires CONFIRMED/REJECTED/CANCELLED/COMPLETED notifications and updates Payment status | COMPLETED |
| TASK-013 | Global error envelope extended with `errorCode` + `errors[]` in `AllExceptionsFilter` | COMPLETED |
| TASK-014 | Frontend `lib/types.ts`, `lib/api.ts` (surfaces `errorCode`/`errors`), `lib/whatsapp.ts` updated for new field names / per-person messaging | COMPLETED |
| TASK-015 | Booking wizard: new **People** step with `[-] N [+]` stepper + live reactive price/advance/remaining preview | COMPLETED |
| TASK-016 | Confirm Booking hardened: disabled-while-submitting (no double submit), distinct `Confirming Booking…` state, 409 handling refreshes availability and returns user to the date/time step with form data intact, generic failures show the server message and allow retry without data loss | COMPLETED |
| TASK-017 | Confirmation page + all admin pages (`dashboard`, `bookings`, `customers`) updated for `bookingNumber`/`pricing`/`service`/`pricePerPerson` | COMPLETED |
| TASK-018 | Unit tests: 4 pricing scenarios (₹500×1/2/5, ₹200×3) + rounding edge case | COMPLETED — 5/5 passing |
| TASK-019 | Integration test: real SQLite DB, two bookings against the same time slot, second asserted to throw `ConflictException` (409) | COMPLETED — 2/2 passing |
| TASK-020 | `.eslintrc` added for both apps (none existed before); `npm run lint` passes clean on both | COMPLETED |
| TASK-021 | `tsc --noEmit`, `nest build`, `next build` all pass with zero errors | COMPLETED |
| TASK-022 | Full manual end-to-end run against live servers: Arabic Mehndi/Palm Length/3 people → API returned pricePerPerson=200, total=600, advance=300, remaining=300; verified in DB; Payment snapshot row correct; Notification row created (status FAILED, clear reason, booking unaffected); confirmation page rendered correct numbers; admin CONFIRMED transition produced a second notification and moved Payment to PARTIAL | COMPLETED |
| TASK-023 | `docs/FINAL-REPORT.md` | COMPLETED |

## Explicit, disclosed limitation

SMS is **not actually delivered** in this environment — MSG91 requires a paid account and real
`MSG91_AUTH_KEY`/`MSG91_SENDER_ID`, which only the business owner can obtain (per the scoping
question answered at the start of this task: "build the abstraction, stub the send"). The provider,
templates, retry-safe logging, and failure isolation are all real and fully wired — supplying the
three MSG91 env vars in `apps/api/.env` is the only remaining step to go live.
