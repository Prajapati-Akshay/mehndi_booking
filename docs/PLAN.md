# Mehndi By Dhara — Consolidated Plan (Requirements → Architecture → DB → API → Frontend)

Condensed per project decision (see IMPLEMENTATION-STATUS.md for the full 14-doc → 1-doc scope call).
This is a revision of the already-working v1 app: the two functional gaps being closed here are
**per-person pricing** and **SMS/notification infrastructure**, plus hardening Confirm Booking end-to-end.

## 1. Requirements (delta from v1)

| # | Requirement | Status before this change | Status after |
|---|---|---|---|
| R1 | All prices are **per person**; total = pricePerPerson × numberOfPeople | Price was a flat per-booking amount | Fixed |
| R2 | Backend recalculates price from DB, never trusts client total | Already true (client never sent totalAmount) | Kept, extended to pricePerPerson × people |
| R3 | People stepper (+/-, min 1, default 1) reactive on frontend | Not present | Added |
| R4 | Confirm Booking must be fully functional end-to-end, no stuck loading | Working for v1 shape | Re-verified against new DTO shape |
| R5 | Double-booking protection → HTTP 409 with exact message | Implemented via transaction | Kept, message text aligned to spec |
| R6 | SMS notifications on booking created/confirmed/rejected/cancelled/completed | Not present | Added (MSG91 provider behind an interface, stubbed until real key supplied) |
| R7 | SMS failure must never fail the booking | N/A | Enforced: notification dispatch happens after the DB transaction commits, wrapped in try/catch |
| R8 | Notification model + log every attempt | Not present | Added |
| R9 | Consistent API envelope incl. `errorCode`/`errors` on failure | Partial (`success/message/data` only) | Extended |
| R10 | WhatsApp message includes per-person price + total | Partial | Extended |

## 2. Architecture

No structural change to the monorepo. New pieces:

```
apps/api/src/notifications/
  notifications.module.ts
  notifications.service.ts        -> orchestrates: builds message from template, calls SmsService, writes Notification row
  sms/
    sms-provider.interface.ts     -> SmsProvider: send(to, message) => { success, providerMessageId?, error? }
    sms.service.ts                -> picks provider from SMS_PROVIDER env, exposes sendSms()
    msg91.provider.ts             -> real MSG91 HTTP call; if MSG91_AUTH_KEY is unset, short-circuits to a
                                      recorded failure instead of throwing, so booking creation is unaffected
```

`BookingsModule` imports `NotificationsModule` and calls `NotificationsService.notifyBookingCreated(booking)`
**after** the Prisma transaction that creates the booking has committed — never inside it — so a notification
failure can only ever produce a `FAILED` `Notification` row, never a rolled-back booking.

## 3. Database Design (delta)

`Booking` gains:
- `bookingNumber` (renamed from `bookingCode`, same generation scheme `MBD-XXXXXX`)
- `serviceId` (direct FK to `Service`, alongside the existing `pricingId` FK to `ServicePricing`) — lets the
  API accept `serviceId` + `pricingId` separately as the spec's request body requires, and lets the backend
  verify the pricing tier actually belongs to the given service.
- `pricePerPerson` (Int, snapshotted at booking time — pricing can change later without altering historical
  bookings)
- `pricingId` (renamed from `servicePricingId`)

`Payment` gains `totalAmount`, `advanceAmount`, `remainingAmount` (a summary snapshot written once at booking
creation), keeping the existing `amount`/`status`/`method`/`reference` fields for individual transaction rows
(e.g. when the advance is actually collected, admin logs a `Payment` row against the booking).

New model `Notification`:
```
id, bookingId, type (BOOKING_CREATED|CONFIRMED|REJECTED|CANCELLED|COMPLETED),
channel (SMS|WHATSAPP), recipient, message, status (PENDING|SENT|FAILED),
provider, providerMessageId, errorMessage, createdAt, updatedAt
```

## 4. API (delta)

`POST /api/bookings` request body (exact shape from spec):
```json
{
  "serviceId": "...", "pricingId": "...", "numberOfPeople": 3,
  "appointmentDate": "2026-08-20", "appointmentTime": "14:00",
  "fullName": "...", "phoneNumber": "...", "whatsappNumber": "...",
  "email": "...", "address": "...", "eventType": "...", "notes": "...",
  "termsAccepted": true
}
```
Server computes `pricePerPerson`, `totalAmount`, `advanceAmount`, `remainingAmount` from the `ServicePricing`
row — the request body never carries a trusted price. Response:
```json
{
  "success": true, "message": "Booking created successfully",
  "data": {
    "bookingId": "...", "bookingNumber": "MBD-...", "status": "PENDING",
    "pricePerPerson": 200, "numberOfPeople": 3, "totalAmount": 600,
    "advanceAmount": 300, "remainingAmount": 300,
    "appointmentDate": "...", "appointmentTime": "..."
  }
}
```
Conflict: `409` with `{"success":false,"message":"This appointment slot is no longer available. Please select another time.","errorCode":"SLOT_UNAVAILABLE","errors":[]}`.

Global error envelope (all endpoints): `{success:false, message, errorCode, errors: string[]}` — `errorCode`
derives from the HTTP status (`VALIDATION_ERROR`, `NOT_FOUND`, `UNAUTHORIZED`, `CONFLICT`, `FORBIDDEN`,
`INTERNAL_ERROR`); `errors` carries per-field `class-validator` messages when present.

## 5. Frontend (delta)

Booking wizard gains a **People** step between Package and Date: `[-] N [+]` plus a numeric input (min 1),
and a live summary block (Price/Person, People, Total, 50% Advance, Remaining) that recomputes on every
change with no page reload. This is a *preview only* — the authoritative numbers always come from the
`POST /bookings` response, which is what the confirmation page renders.

Confirm Booking button states: idle → `Confirming Booking…` (spinner, disabled, prevents double-submit) →
on success, navigates to `/booking/confirmation/[bookingId]`; on failure, re-enables the button, shows the
server's `message`, and preserves all entered form state (no reset) so the user can retry without re-typing.

## 6. Testing Strategy (delta)

Unit tests (`apps/api/src/bookings/bookings.pricing.spec.ts`): the three pricing scenarios from the spec
(1/2/5 people at ₹500/person) plus the ₹200 × 3 = ₹600 Arabic Palm Length example, run as pure function tests
against the calculation helper extracted from `BookingsService`. Double-booking is covered by a service-level
spec that creates two bookings against the same `timeSlotId` and asserts the second throws `ConflictException`.

## 7. Out of Scope / Explicit Limitations (unchanged from v1, see README §14)

Live MSG91 sending requires real `MSG91_AUTH_KEY`/`SENDER_ID`/`TEMPLATE_ID` — not obtainable by the assistant.
The provider is fully wired; without credentials it logs a `FAILED` Notification row and the booking still
succeeds, per R7.
