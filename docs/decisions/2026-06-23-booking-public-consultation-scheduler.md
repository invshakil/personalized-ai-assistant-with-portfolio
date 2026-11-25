# Booking: a public consultation scheduler

**Visitors book a call from the portfolio home page through a scheduler built in this repo, with no third-party scheduling service** (Shakil, 23 Jun 2026).

- **Instead of:** a third-party scheduler such as Calendly. The slot maths and the Google integration are implemented in-repo.

Commits `01f2e2c` to `112ce3e`.

- The portfolio home page renders `BookConsultation` (a section with id `booking`) and `FloatingBookButton`. Both hide themselves when booking is not live.
- The visitor flow: duration chips, a 14-day day grid, time-slot chips fetched per day, visitor fields, the Cloudflare Turnstile captcha, then a confirmed view with the Meet link and a self-cancel button.
- The app creates a Google Calendar event with a Google Meet link and emails invites. It reads free/busy, and creates and deletes only the events it created.
- Anti-abuse: a hidden honeypot field, a per-IP rate limit, and Turnstile verification on the server. Turnstile is skipped only when its keys are unset.
- New models: `BookingSettings`, `BookingBlackout`, `Booking`, and the `BookingStatus` enum.
- Services in `src/services/booking/`: the slot maths (`slots.ts`) and plain-`fetch` OAuth and Calendar REST (`googleCalendar.ts`), mirroring `services/admin/googleDrive.ts`. It reuses the Drive OAuth client: the Calendar API is enabled on it and a second redirect, `<AUTH_URL>/api/admin/booking/google/callback`, is registered. The refresh token is AES-256-GCM encrypted in the `BookingSettings` singleton.
- `createBooking` inserts a `PENDING` row, creates the Calendar event, then flips the row to `CONFIRMED`. If Google fails, it rolls back to `CANCELLED`.
- Four unauthenticated routes: `GET /api/booking/config`, `GET /api/booking/slots`, `POST /api/booking/create`, `POST /api/booking/cancel`. Session-guarded admin routes under `/api/admin/booking*` and `/api/admin/bookings`.
- Admin pages: `/admin/bookings` (filter, table, cancel) and `/admin/settings/booking` (master enable, Google connect and disconnect, slot rules, working-hours grid, blackout dates, WhatsApp button, meeting template).
- 30 self-cleaning tests in `src/services/booking/__tests__/booking.test.ts` (`npm run test:booking`).
- No AI tools and no slash command.

The module was undocumented until the [documentation sync of 29 Jul](2026-07-29-documentation-sync-and-health-report.md).

Known debt from the start: the two admin pages were not split into `hooks/` and `components/`. See [STATUS.md](../STATUS.md).
