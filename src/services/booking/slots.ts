// Slot resolution: walks the working-hours window in `timezone`, filters by
// blackouts + min-notice + horizon, then drops any candidate that conflicts
// with an existing booking or a Google freeBusy range. The result is what the
// public picker shows. Commit-time re-checks the chosen slot for races.
import { db } from "@/lib/db";
import { getBookingSettings, getGoogleRefreshToken } from "./settings";
import { freeBusy, getAccessToken } from "./googleCalendar";
import type { BookingSettings } from "@/types";

const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/**
 * Convert a wall-clock time in `tz` (year/month/day/hour/minute) to a UTC Date.
 * Uses Intl.DateTimeFormat to query the zone's offset at the proposed instant.
 * Accurate for non-ambiguous times; DST transitions snap to the standard offset.
 */
export function wallTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  tz: string
): Date {
  const fakeUtcMs = Date.UTC(year, month - 1, day, hour, minute);
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(new Date(fakeUtcMs));
  const p: Record<string, string> = {};
  for (const x of parts) p[x.type] = x.value;
  const asTzMs = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  const offsetMs = asTzMs - fakeUtcMs;
  return new Date(fakeUtcMs - offsetMs);
}

/** Weekday (0=Sun..6=Sat) for the given UTC instant as seen in `tz`. */
export function weekdayInTz(d: Date, tz: string): number {
  const wd = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(d);
  return WEEKDAY_MAP[wd] ?? d.getUTCDay();
}

/** "YYYY-MM-DD" → {y, m, d} (no parsing as local date — pure digit split). */
function parseDayKey(date: string): { y: number; m: number; d: number } {
  const [y, m, d] = date.slice(0, 10).split("-").map(Number);
  return { y, m, d };
}

interface ConflictRange {
  start: number;
  end: number;
}

async function loadConflictsForDay(
  settings: BookingSettings,
  dayStartMs: number,
  dayEndMs: number
): Promise<ConflictRange[]> {
  const out: ConflictRange[] = [];

  // DB conflicts (PENDING + CONFIRMED only).
  const existing = await db.booking.findMany({
    where: {
      status: { in: ["PENDING", "CONFIRMED"] },
      startsAt: { lt: new Date(dayEndMs) },
      endsAt: { gt: new Date(dayStartMs) },
    },
    select: { startsAt: true, endsAt: true },
  });
  for (const e of existing) {
    out.push({ start: e.startsAt.getTime(), end: e.endsAt.getTime() });
  }

  // Google freeBusy (best-effort; commit re-checks).
  if (settings.googleConnected) {
    const refreshToken = await getGoogleRefreshToken();
    if (refreshToken) {
      try {
        const accessToken = await getAccessToken(refreshToken);
        const ranges = await freeBusy(
          accessToken,
          settings.calendarId,
          new Date(dayStartMs).toISOString(),
          new Date(dayEndMs).toISOString()
        );
        for (const r of ranges) {
          out.push({ start: new Date(r.start).getTime(), end: new Date(r.end).getTime() });
        }
      } catch {
        // Soft-fail: the picker still shows DB-checked availability. The commit
        // re-runs the same check and surfaces a clear error if the slot is gone.
      }
    }
  }

  return out;
}

export interface ResolveSlotsResult {
  starts: string[]; // ISO timestamps (UTC) of slot starts
  duration: number;
}

/**
 * Returns the open slot starts for `date` (interpreted in the configured
 * timezone) and the requested duration. Empty array → nothing offered for that
 * day. Caller already validated `enabled` upstream; we still no-op if disabled.
 */
export async function resolveSlots(date: string, duration: number): Promise<ResolveSlotsResult> {
  const settings = await getBookingSettings();
  if (!settings.enabled) return { starts: [], duration };
  if (!settings.googleConnected) return { starts: [], duration };
  if (!settings.durationsMinutes.includes(duration)) {
    return { starts: [], duration };
  }

  const { y, m, d } = parseDayKey(date);
  const dayStart = wallTimeToUtc(y, m, d, 0, 0, settings.timezone);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  // Blackout? (stored as UTC midnight for the calendar day, see settings.ts)
  const black = await db.bookingBlackout.findUnique({
    where: { date: new Date(Date.UTC(y, m - 1, d)) },
  });
  if (black) return { starts: [], duration };

  const weekday = weekdayInTz(new Date(dayStart.getTime() + 12 * 3600_000), settings.timezone);
  const ranges = settings.workingHours.filter((h) => h.weekday === weekday);
  if (ranges.length === 0) return { starts: [], duration };

  const nowMs = Date.now();
  const earliestMs = nowMs + settings.minNoticeHours * 3600_000;
  const latestMs = nowMs + settings.maxHorizonDays * 86400_000;
  const incMs = settings.slotIncrementMinutes * 60_000;
  const durMs = duration * 60_000;
  const bufferMs = settings.bufferMinutes * 60_000;

  // Candidate starts (in UTC) inside each range.
  const candidates: number[] = [];
  for (const r of ranges) {
    const [sh, sm] = r.start.split(":").map(Number);
    const [eh, em] = r.end.split(":").map(Number);
    const rangeStartMs = wallTimeToUtc(y, m, d, sh, sm, settings.timezone).getTime();
    const rangeEndMs = wallTimeToUtc(y, m, d, eh, em, settings.timezone).getTime();
    for (let t = rangeStartMs; t + durMs <= rangeEndMs; t += incMs) {
      if (t < earliestMs || t > latestMs) continue;
      candidates.push(t);
    }
  }
  if (candidates.length === 0) return { starts: [], duration };

  // Load conflicts for the day window once.
  const conflicts = await loadConflictsForDay(settings, dayStart.getTime(), dayEnd.getTime());

  const out: string[] = [];
  for (const tMs of candidates) {
    const slotStart = tMs - bufferMs;
    const slotEnd = tMs + durMs + bufferMs;
    const collides = conflicts.some((c) => slotStart < c.end && slotEnd > c.start);
    if (!collides) out.push(new Date(tMs).toISOString());
  }
  return { starts: out, duration };
}

/** Commit-time check: is the exact (start, duration) still free? */
export async function isSlotStillFree(startsAtMs: number, duration: number): Promise<boolean> {
  const settings = await getBookingSettings();
  const endMs = startsAtMs + duration * 60_000;
  const bufferMs = settings.bufferMinutes * 60_000;
  // Pull a small window around the slot.
  const winStart = startsAtMs - 24 * 3600_000;
  const winEnd = endMs + 24 * 3600_000;
  const conflicts = await loadConflictsForDay(settings, winStart, winEnd);
  return !conflicts.some((c) => startsAtMs - bufferMs < c.end && endMs + bufferMs > c.start);
}
