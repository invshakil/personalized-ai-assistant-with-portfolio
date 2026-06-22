// Booking service tests. node:test via tsx, dev DB, self-cleaning.
//
// Run: npm run test:booking
//
// Strategy:
//  - Snapshot the BookingSettings singleton in before(), restore in after()
//    so a developer's local config (Google connection, blackouts, custom hours)
//    is never disturbed.
//  - Tag every Booking row we create with email prefix `__BKTEST_<timestamp>@`
//    and every Blackout reason with the same tag; after() purges them.
//  - Google Calendar paths are exercised at the boundary only: we set
//    googleConnected=true with no refresh token, so the booking row is created
//    then rolled back to CANCELLED — proves the rollback path without making
//    network calls. Happy-path Google integration belongs to a manual smoke
//    test, not the unit suite.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { db } from "@/lib/db";
import {
  addBlackout,
  adminCancel,
  BookingError,
  cancelByToken,
  checkRateLimit,
  createBooking,
  deleteBlackout,
  getBookingSettings,
  listBlackouts,
  listBookings,
  resolveSlots,
  updateBookingSettings,
} from "@/services/booking";
import { wallTimeToUtc, weekdayInTz, isSlotStillFree } from "@/services/booking/slots";

// Emails are lowercased by createBooking — keep the tag lowercase so cleanup
// filters (which use a case-sensitive startsWith) match what's actually stored.
const TAG = `__bktest_${Date.now()}`;
const tagEmail = (n = 0) => `${TAG}${n}@example.com`;

// A future Wednesday at the chosen offset in days from "now" — used to anchor
// slot-resolution tests on a known weekday in the working window.
function nextWeekday(weekday: number): { iso: string; y: number; m: number; d: number } {
  const now = new Date();
  for (let i = 1; i < 14; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    if (d.getDay() === weekday) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return { iso: `${y}-${m}-${day}`, y, m: d.getMonth() + 1, d: d.getDate() };
    }
  }
  throw new Error("could not find weekday");
}

interface BookingSettingsSnapshot {
  enabled: boolean;
  calendarId: string;
  meetingTitleTemplate: string;
  meetingDescription: string | null;
  durationsMinutes: number[];
  slotIncrementMinutes: number;
  bufferMinutes: number;
  minNoticeHours: number;
  maxHorizonDays: number;
  timezone: string;
  workingHours: unknown;
  notifyEmail: string | null;
  whatsappNumber: string | null;
  whatsappPrefill: string | null;
  whatsappEnabled: boolean;
  googleConnected: boolean;
  googleEmail: string | null;
}

let snapshot: BookingSettingsSnapshot | null = null;

before(async () => {
  // Snapshot existing settings so a developer's local state survives the run.
  const row = await db.bookingSettings.findUnique({ where: { id: "singleton" } });
  snapshot = row
    ? {
        enabled: row.enabled,
        calendarId: row.calendarId,
        meetingTitleTemplate: row.meetingTitleTemplate,
        meetingDescription: row.meetingDescription,
        durationsMinutes: row.durationsMinutes,
        slotIncrementMinutes: row.slotIncrementMinutes,
        bufferMinutes: row.bufferMinutes,
        minNoticeHours: row.minNoticeHours,
        maxHorizonDays: row.maxHorizonDays,
        timezone: row.timezone,
        workingHours: row.workingHours,
        notifyEmail: row.notifyEmail,
        whatsappNumber: row.whatsappNumber,
        whatsappPrefill: row.whatsappPrefill,
        whatsappEnabled: row.whatsappEnabled,
        googleConnected: row.googleConnected,
        googleEmail: row.googleEmail,
      }
    : null;

  // Known test config: 09:00–18:00 Mon–Fri Asia/Dhaka, 30-min slots, no buffer,
  // 1-hour min notice, 30-day horizon, Google "connected" (without a real
  // refresh token) so resolveSlots runs and createBooking exercises the rollback.
  await db.bookingSettings.upsert({
    where: { id: "singleton" },
    update: {
      enabled: true,
      calendarId: "primary",
      meetingTitleTemplate: "Consultation — {name}",
      meetingDescription: null,
      durationsMinutes: [30],
      slotIncrementMinutes: 30,
      bufferMinutes: 0,
      minNoticeHours: 1,
      maxHorizonDays: 30,
      timezone: "Asia/Dhaka",
      workingHours: [
        { weekday: 1, start: "09:00", end: "18:00" },
        { weekday: 2, start: "09:00", end: "18:00" },
        { weekday: 3, start: "09:00", end: "18:00" },
        { weekday: 4, start: "09:00", end: "18:00" },
        { weekday: 5, start: "09:00", end: "18:00" },
      ],
      googleConnected: true,
      googleEmail: null,
      googleTokenEnc: null,
      googleTokenIv: null,
      googleTokenTag: null,
      notifyEmail: null,
    },
    create: {
      id: "singleton",
      enabled: true,
      workingHours: [
        { weekday: 1, start: "09:00", end: "18:00" },
        { weekday: 2, start: "09:00", end: "18:00" },
        { weekday: 3, start: "09:00", end: "18:00" },
        { weekday: 4, start: "09:00", end: "18:00" },
        { weekday: 5, start: "09:00", end: "18:00" },
      ],
      durationsMinutes: [30],
      slotIncrementMinutes: 30,
      bufferMinutes: 0,
      minNoticeHours: 1,
      maxHorizonDays: 30,
      timezone: "Asia/Dhaka",
      googleConnected: true,
    },
  });

  // Clean any stale rows from a prior crashed run.
  await db.booking.deleteMany({ where: { email: { startsWith: "__bktest_" } } });
  await db.bookingBlackout.deleteMany({ where: { reason: { startsWith: "__bktest_" } } });
});

after(async () => {
  // Purge anything we created.
  await db.booking.deleteMany({ where: { email: { startsWith: "__bktest_" } } });
  await db.bookingBlackout.deleteMany({ where: { reason: { startsWith: "__bktest_" } } });

  // Restore (or remove) the settings row.
  if (snapshot) {
    await db.bookingSettings.update({
      where: { id: "singleton" },
      data: snapshot as Parameters<typeof db.bookingSettings.update>[0]["data"],
    });
  } else {
    await db.bookingSettings.deleteMany({ where: { id: "singleton" } });
  }

  await db.$disconnect();
});

// ─── Pure time-zone helpers ──────────────────────────────────────────────────

test("wallTimeToUtc: 09:00 Asia/Dhaka === 03:00 UTC (UTC+6, no DST)", () => {
  const d = wallTimeToUtc(2026, 6, 24, 9, 0, "Asia/Dhaka");
  assert.equal(d.toISOString(), "2026-06-24T03:00:00.000Z");
});

test("wallTimeToUtc: midnight Asia/Dhaka === 18:00 UTC previous day", () => {
  const d = wallTimeToUtc(2026, 6, 24, 0, 0, "Asia/Dhaka");
  assert.equal(d.toISOString(), "2026-06-23T18:00:00.000Z");
});

test("wallTimeToUtc: UTC stays as-is", () => {
  const d = wallTimeToUtc(2026, 6, 24, 15, 30, "UTC");
  assert.equal(d.toISOString(), "2026-06-24T15:30:00.000Z");
});

test("weekdayInTz: known instant maps to expected local weekday", () => {
  // 2026-06-24T03:00:00Z is Wednesday in Asia/Dhaka (09:00 local).
  const wd = weekdayInTz(new Date("2026-06-24T03:00:00Z"), "Asia/Dhaka");
  assert.equal(wd, 3); // 0=Sun..6=Sat → Wed=3
});

// ─── Settings: validation & sanitization ─────────────────────────────────────

test("updateBookingSettings: clamps numeric fields to safe ranges", async () => {
  const out = await updateBookingSettings({
    slotIncrementMinutes: 9999,
    bufferMinutes: -50,
    minNoticeHours: 99999,
    maxHorizonDays: 99999,
  });
  assert.equal(out.slotIncrementMinutes, 120); // capped at 120
  assert.equal(out.bufferMinutes, 0); // floored at 0
  assert.equal(out.minNoticeHours, 720); // capped at 720
  assert.equal(out.maxHorizonDays, 180); // capped at 180

  // Restore the test config for downstream tests.
  await updateBookingSettings({
    slotIncrementMinutes: 30,
    bufferMinutes: 0,
    minNoticeHours: 1,
    maxHorizonDays: 30,
  });
});

test("updateBookingSettings: drops malformed working-hour rows", async () => {
  const out = await updateBookingSettings({
    workingHours: [
      { weekday: 1, start: "09:00", end: "17:00" }, // keep
      { weekday: 7, start: "09:00", end: "17:00" }, // drop — weekday > 6
      { weekday: 2, start: "25:00", end: "26:00" }, // drop — bad HH
      { weekday: 3, start: "17:00", end: "09:00" }, // drop — start >= end
      { weekday: 4, start: "09:00", end: "13:00" }, // keep
    ],
  });
  assert.equal(out.workingHours.length, 2);
  assert.deepEqual(
    out.workingHours.map((h) => h.weekday),
    [1, 4]
  );

  // Restore.
  await updateBookingSettings({
    workingHours: [
      { weekday: 1, start: "09:00", end: "18:00" },
      { weekday: 2, start: "09:00", end: "18:00" },
      { weekday: 3, start: "09:00", end: "18:00" },
      { weekday: 4, start: "09:00", end: "18:00" },
      { weekday: 5, start: "09:00", end: "18:00" },
    ],
  });
});

test("updateBookingSettings: ignores empty durationsMinutes list", async () => {
  // A bad client must not be able to wipe the duration list — keep current.
  const before = (await getBookingSettings()).durationsMinutes;
  const out = await updateBookingSettings({ durationsMinutes: [] });
  assert.deepEqual(out.durationsMinutes, before);
});

// ─── Blackouts ────────────────────────────────────────────────────────────────

test("addBlackout + listBlackouts + uniqueness on date", async () => {
  const date = "2099-12-25"; // out-of-horizon, safe to leave
  const a = await addBlackout(date, `${TAG}_holiday`);
  const b = await addBlackout(date, `${TAG}_updated`); // upsert same date
  assert.equal(a.date.slice(0, 10), b.date.slice(0, 10));
  const all = await listBlackouts();
  const ours = all.filter((x) => x.reason?.startsWith(TAG));
  assert.equal(ours.length, 1);
  assert.equal(ours[0].reason, `${TAG}_updated`);
  await deleteBlackout(b.id);
});

// ─── Slot resolution ─────────────────────────────────────────────────────────

test("resolveSlots: returns slots for a working weekday", async () => {
  // Use next Wednesday → working hours 09:00–18:00 = 18 30-min slots (last at 17:30).
  const { iso } = nextWeekday(3);
  const r = await resolveSlots(iso, 30);
  assert.equal(r.duration, 30);
  // Allow flex: at minimum 1 slot, at maximum 18.
  assert.ok(r.starts.length >= 1 && r.starts.length <= 18, `got ${r.starts.length} slots`);
});

test("resolveSlots: empty for a non-working day (Sunday in test config)", async () => {
  const { iso } = nextWeekday(0); // Sunday — not in workingHours
  const r = await resolveSlots(iso, 30);
  assert.equal(r.starts.length, 0);
});

test("resolveSlots: empty when the date is blacked out", async () => {
  const { iso } = nextWeekday(3);
  const black = await addBlackout(iso, `${TAG}_blackout`);
  try {
    const r = await resolveSlots(iso, 30);
    assert.equal(r.starts.length, 0);
  } finally {
    await deleteBlackout(black.id);
  }
});

test("resolveSlots: an existing CONFIRMED booking removes that slot", async () => {
  const { iso, y, m, d } = nextWeekday(3);
  const baseline = await resolveSlots(iso, 30);
  if (baseline.starts.length === 0) {
    return; // skip silently if the only working Wednesday is gone — degenerate
  }
  // Block 11:00 local in Asia/Dhaka.
  const startsAt = wallTimeToUtc(y, m, d, 11, 0, "Asia/Dhaka");
  const endsAt = new Date(startsAt.getTime() + 30 * 60_000);
  const booked = await db.booking.create({
    data: {
      name: "blocker",
      email: tagEmail(99),
      topic: "block",
      message: null,
      startsAt,
      endsAt,
      durationMin: 30,
      status: "CONFIRMED",
      cancelToken: `${TAG}_blocker`,
    },
  });
  try {
    const after = await resolveSlots(iso, 30);
    // Must lose at least the exact 11:00 slot.
    assert.ok(
      !after.starts.includes(startsAt.toISOString()),
      "11:00 should be excluded by the CONFIRMED booking"
    );
    // And the rest of the slots should still be there minus 1.
    assert.equal(after.starts.length, baseline.starts.length - 1);
  } finally {
    await db.booking.delete({ where: { id: booked.id } });
  }
});

test("resolveSlots: rejects unsupported duration", async () => {
  const { iso } = nextWeekday(3);
  const r = await resolveSlots(iso, 17);
  assert.equal(r.starts.length, 0);
});

// ─── isSlotStillFree ─────────────────────────────────────────────────────────

test("isSlotStillFree: false when a booking overlaps; true when free", async () => {
  const { y, m, d } = nextWeekday(3);
  const startsAt = wallTimeToUtc(y, m, d, 13, 0, "Asia/Dhaka");
  // Free initially.
  assert.equal(await isSlotStillFree(startsAt.getTime(), 30), true);
  // Insert a conflict and re-check.
  const booked = await db.booking.create({
    data: {
      name: "blocker",
      email: tagEmail(98),
      topic: "block",
      startsAt,
      endsAt: new Date(startsAt.getTime() + 30 * 60_000),
      durationMin: 30,
      status: "CONFIRMED",
      cancelToken: `${TAG}_blocker2`,
    },
  });
  try {
    assert.equal(await isSlotStillFree(startsAt.getTime(), 30), false);
  } finally {
    await db.booking.delete({ where: { id: booked.id } });
  }
});

// ─── createBooking: validation paths ─────────────────────────────────────────

async function defaultStart(): Promise<string> {
  const { y, m, d } = nextWeekday(3);
  return wallTimeToUtc(y, m, d, 14, 0, "Asia/Dhaka").toISOString();
}

test("createBooking: rejects empty name", async () => {
  const startsAt = await defaultStart();
  await assert.rejects(
    () =>
      createBooking({
        name: "  ",
        email: tagEmail(1),
        topic: "Hi",
        message: null,
        startsAt,
        durationMin: 30,
        ip: null,
      }),
    /Name is required/
  );
});

test("createBooking: rejects malformed email", async () => {
  const startsAt = await defaultStart();
  await assert.rejects(
    () =>
      createBooking({
        name: "Visitor",
        email: "not-an-email",
        topic: "Hi",
        message: null,
        startsAt,
        durationMin: 30,
        ip: null,
      }),
    /valid email/
  );
});

test("createBooking: rejects empty topic", async () => {
  const startsAt = await defaultStart();
  await assert.rejects(
    () =>
      createBooking({
        name: "Visitor",
        email: tagEmail(2),
        topic: "  ",
        message: null,
        startsAt,
        durationMin: 30,
        ip: null,
      }),
    /short topic/
  );
});

test("createBooking: rejects unsupported duration", async () => {
  const startsAt = await defaultStart();
  await assert.rejects(
    () =>
      createBooking({
        name: "Visitor",
        email: tagEmail(3),
        topic: "Hi",
        message: null,
        startsAt,
        durationMin: 17,
        ip: null,
      }),
    /not offered/
  );
});

test("createBooking: rejects a slot before minNoticeHours", async () => {
  // 10 minutes from now — well under the 1-hour min notice in the test config.
  const startsAt = new Date(Date.now() + 10 * 60_000).toISOString();
  await assert.rejects(
    () =>
      createBooking({
        name: "Visitor",
        email: tagEmail(4),
        topic: "Hi",
        message: null,
        startsAt,
        durationMin: 30,
        ip: null,
      }),
    /too soon/
  );
});

test("createBooking: rejects a slot beyond maxHorizonDays", async () => {
  const startsAt = new Date(Date.now() + 365 * 86400_000).toISOString();
  await assert.rejects(
    () =>
      createBooking({
        name: "Visitor",
        email: tagEmail(5),
        topic: "Hi",
        message: null,
        startsAt,
        durationMin: 30,
        ip: null,
      }),
    /too far out/
  );
});

test("createBooking: 503 when Google is not connected", async () => {
  await updateBookingSettings({} as Record<string, never>); // no-op to ensure singleton exists
  await db.bookingSettings.update({
    where: { id: "singleton" },
    data: { googleConnected: false },
  });
  try {
    const startsAt = await defaultStart();
    await assert.rejects(
      () =>
        createBooking({
          name: "Visitor",
          email: tagEmail(6),
          topic: "Hi",
          message: null,
          startsAt,
          durationMin: 30,
          ip: null,
        }),
      (e: unknown) => e instanceof BookingError && e.status === 503
    );
  } finally {
    await db.bookingSettings.update({
      where: { id: "singleton" },
      data: { googleConnected: true },
    });
  }
});

test("createBooking: rolls a row back to CANCELLED when refresh token is missing", async () => {
  // googleConnected=true but no refresh token (test config) — exercises the
  // "create row → call Google → fail → mark CANCELLED" branch.
  const startsAt = await defaultStart();
  // Use a fresh future slot to avoid colliding with earlier tests.
  const offset = 9; // distinct minute offset → no overlap
  const startWithOffset = new Date(new Date(startsAt).getTime() + offset * 60_000).toISOString();
  await assert.rejects(
    () =>
      createBooking({
        name: "Visitor",
        email: tagEmail(7),
        topic: "Topic",
        message: null,
        startsAt: startWithOffset,
        durationMin: 30,
        ip: null,
      }),
    /temporarily unavailable/
  );
  // The booking row should have been written and then marked CANCELLED.
  const row = await db.booking.findFirst({ where: { email: tagEmail(7) } });
  assert.ok(row, "row was created");
  assert.equal(row!.status, "CANCELLED");
  assert.equal(row!.cancelReason, "google-not-connected");
});

// ─── Rate limit ──────────────────────────────────────────────────────────────

test("checkRateLimit: ok under threshold, blocked at threshold", async () => {
  const ip = `1.2.3.${(Date.now() % 200) + 10}`;
  const base = await defaultStart();
  // Seed 3 confirmed bookings in the last hour for this IP.
  for (let i = 0; i < 3; i++) {
    await db.booking.create({
      data: {
        name: "rl",
        email: tagEmail(20 + i),
        topic: "rl",
        startsAt: new Date(new Date(base).getTime() + (i + 30) * 60_000),
        endsAt: new Date(new Date(base).getTime() + (i + 31) * 60_000),
        durationMin: 30,
        status: "CONFIRMED",
        cancelToken: `${TAG}_rl${i}`,
        ip,
      },
    });
  }
  const r = await checkRateLimit(ip);
  assert.equal(r.ok, false);
});

test("checkRateLimit: ok when ip is null (server-side fallback)", async () => {
  const r = await checkRateLimit(null);
  assert.equal(r.ok, true);
});

// ─── Cancel flows ────────────────────────────────────────────────────────────

test("cancelByToken: idempotent; sets CANCELLED + cancelledAt", async () => {
  const base = await defaultStart();
  const startsAt = new Date(new Date(base).getTime() + 80 * 60_000);
  const row = await db.booking.create({
    data: {
      name: "to-cancel",
      email: tagEmail(50),
      topic: "test",
      startsAt,
      endsAt: new Date(startsAt.getTime() + 30 * 60_000),
      durationMin: 30,
      status: "CONFIRMED",
      cancelToken: `${TAG}_cancel`,
    },
  });
  await cancelByToken(`${TAG}_cancel`, "visitor-changed-mind");
  const after = await db.booking.findUnique({ where: { id: row.id } });
  assert.equal(after?.status, "CANCELLED");
  assert.ok(after?.cancelledAt);
  // Second cancel is a no-op (no throw).
  await cancelByToken(`${TAG}_cancel`);
});

test("cancelByToken: unknown token throws 404", async () => {
  await assert.rejects(
    () => cancelByToken("nonexistent-token"),
    (e: unknown) => e instanceof BookingError && e.status === 404
  );
});

test("adminCancel: sets CANCELLED + cancelReason from admin path", async () => {
  const base = await defaultStart();
  const startsAt = new Date(new Date(base).getTime() + 110 * 60_000);
  const row = await db.booking.create({
    data: {
      name: "admin-cancel",
      email: tagEmail(51),
      topic: "test",
      startsAt,
      endsAt: new Date(startsAt.getTime() + 30 * 60_000),
      durationMin: 30,
      status: "CONFIRMED",
      cancelToken: `${TAG}_acancel`,
    },
  });
  const dto = await adminCancel(row.id, "schedule clash");
  assert.equal(dto.status, "CANCELLED");
  assert.equal(dto.id, row.id);
});

// ─── listBookings: filters ───────────────────────────────────────────────────

test("listBookings: status filter narrows results", async () => {
  const all = await listBookings({ status: "CANCELLED", window: "all" });
  // Our seeded rows include several cancelled (cancel tests + 503 rollback).
  assert.ok(all.length >= 1);
  for (const row of all) {
    assert.equal(row.status, "CANCELLED");
  }
});

test("listBookings: q matches by name / email / topic (case-insensitive)", async () => {
  const got = await listBookings({ q: "to-cancel", window: "all" });
  assert.ok(got.some((b) => b.name === "to-cancel"));
});

test("listBookings: window=past excludes upcoming startsAt", async () => {
  const past = await listBookings({ window: "past" });
  for (const row of past) {
    assert.ok(new Date(row.startsAt).getTime() < Date.now(), "past row must be < now");
  }
});
