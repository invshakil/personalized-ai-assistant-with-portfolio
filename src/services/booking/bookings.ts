import crypto from "node:crypto";
import { db } from "@/lib/db";
import type { BookingRecord, BookingStatus } from "@/types";
import { getBookingSettings, getGoogleRefreshToken } from "./settings";
import { isSlotStillFree } from "./slots";
import { deleteEvent, getAccessToken, insertEvent } from "./googleCalendar";
import { toBookingDto } from "./_serializers";

export interface CreateBookingInput {
  name: string;
  email: string;
  topic: string;
  message: string | null;
  startsAt: string; // ISO from the picker
  durationMin: number;
  ip: string | null;
}

export interface CreateBookingResult {
  booking: BookingRecord;
  cancelToken: string;
}

export class BookingError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function renderTitle(template: string, name: string): string {
  return template.replaceAll("{name}", name).slice(0, 200);
}

function renderDescription(input: CreateBookingInput, base: string | null): string {
  const lines = [
    base?.trim() ? base.trim() : null,
    "",
    `Booked by: ${input.name} <${input.email}>`,
    input.topic ? `Topic: ${input.topic}` : null,
    input.message ? `\nMessage:\n${input.message}` : null,
  ].filter((x) => x !== null);
  return lines.join("\n");
}

/**
 * Per-IP rate limit, enforced by counting recent rows. The (ip, createdAt)
 * index keeps this cheap. Returns true when the request should proceed.
 */
export async function checkRateLimit(ip: string | null): Promise<{
  ok: boolean;
  reason?: string;
}> {
  if (!ip) return { ok: true };
  const oneHourAgo = new Date(Date.now() - 3600_000);
  const oneDayAgo = new Date(Date.now() - 86400_000);
  const [hour, day] = await Promise.all([
    db.booking.count({ where: { ip, createdAt: { gte: oneHourAgo } } }),
    db.booking.count({ where: { ip, createdAt: { gte: oneDayAgo } } }),
  ]);
  if (hour >= 3) return { ok: false, reason: "Too many bookings from this IP in the last hour." };
  if (day >= 10) return { ok: false, reason: "Daily booking limit reached. Please email instead." };
  return { ok: true };
}

export async function createBooking(input: CreateBookingInput): Promise<CreateBookingResult> {
  const settings = await getBookingSettings();
  if (!settings.enabled) throw new BookingError("Bookings are currently closed.", 403);
  if (!settings.googleConnected) {
    throw new BookingError("Booking is temporarily unavailable.", 503);
  }

  // Validate inputs.
  const name = input.name.trim().slice(0, 80);
  const email = input.email.trim().toLowerCase().slice(0, 120);
  const topic = input.topic.trim().slice(0, 120);
  const message = input.message?.trim().slice(0, 1000) || null;
  if (!name) throw new BookingError("Name is required.");
  if (!EMAIL_RE.test(email)) throw new BookingError("Please enter a valid email.");
  if (!topic) throw new BookingError("Please include a short topic.");
  if (!settings.durationsMinutes.includes(input.durationMin)) {
    throw new BookingError("Selected duration is not offered.");
  }

  // Parse start.
  const startsMs = Date.parse(input.startsAt);
  if (!Number.isFinite(startsMs)) throw new BookingError("Invalid time.");
  const endsMs = startsMs + input.durationMin * 60_000;
  if (startsMs < Date.now() + settings.minNoticeHours * 3600_000 - 60_000) {
    throw new BookingError("That time is too soon — please pick a later slot.");
  }
  if (startsMs > Date.now() + settings.maxHorizonDays * 86400_000) {
    throw new BookingError("That time is too far out — please pick something sooner.");
  }

  // Race-safe-ish: re-check conflicts then insert a PENDING row immediately.
  const free = await isSlotStillFree(startsMs, input.durationMin);
  if (!free) throw new BookingError("That slot was just taken — please pick another.", 409);

  const cancelToken = crypto.randomBytes(24).toString("base64url");
  const booking = await db.booking.create({
    data: {
      name,
      email,
      topic,
      message,
      startsAt: new Date(startsMs),
      endsAt: new Date(endsMs),
      durationMin: input.durationMin,
      status: "PENDING",
      cancelToken,
      ip: input.ip,
    },
  });

  // Create the Calendar event. Failure → mark CANCELLED + raise.
  const refreshToken = await getGoogleRefreshToken();
  if (!refreshToken) {
    await db.booking.update({
      where: { id: booking.id },
      data: { status: "CANCELLED", cancelReason: "google-not-connected" },
    });
    throw new BookingError("Booking is temporarily unavailable.", 503);
  }

  try {
    const accessToken = await getAccessToken(refreshToken);
    const adminEmail = settings.googleEmail || process.env.ADMIN_EMAIL || "";
    const attendees = Array.from(
      new Set([email, adminEmail, settings.notifyEmail || ""].filter((e) => e && EMAIL_RE.test(e)))
    );
    const evt = await insertEvent(accessToken, {
      calendarId: settings.calendarId,
      summary: renderTitle(settings.meetingTitleTemplate, name),
      description: renderDescription(input, settings.meetingDescription),
      startIso: new Date(startsMs).toISOString(),
      endIso: new Date(endsMs).toISOString(),
      timezone: settings.timezone,
      attendees,
    });
    const confirmed = await db.booking.update({
      where: { id: booking.id },
      data: {
        status: "CONFIRMED",
        googleEventId: evt.id,
        meetUrl: evt.meetUrl,
      },
    });
    return { booking: toBookingDto(confirmed), cancelToken };
  } catch (err) {
    await db.booking.update({
      where: { id: booking.id },
      data: {
        status: "CANCELLED",
        cancelReason: err instanceof Error ? err.message.slice(0, 200) : "google-failed",
      },
    });
    throw new BookingError("Calendar booking failed. Please try again.", 502);
  }
}

export async function cancelByToken(token: string, reason?: string): Promise<void> {
  const booking = await db.booking.findUnique({ where: { cancelToken: token } });
  if (!booking) throw new BookingError("Booking not found.", 404);
  if (booking.status === "CANCELLED") return;
  await cancelGoogleEventBestEffort(booking.googleEventId);
  await db.booking.update({
    where: { id: booking.id },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelReason: reason?.slice(0, 200) || "cancelled-by-visitor",
    },
  });
}

export async function adminCancel(id: string, reason?: string): Promise<BookingRecord> {
  const booking = await db.booking.findUnique({ where: { id } });
  if (!booking) throw new BookingError("Booking not found.", 404);
  await cancelGoogleEventBestEffort(booking.googleEventId);
  const updated = await db.booking.update({
    where: { id },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelReason: reason?.slice(0, 200) || "cancelled-by-admin",
    },
  });
  return toBookingDto(updated);
}

async function cancelGoogleEventBestEffort(eventId: string | null): Promise<void> {
  if (!eventId) return;
  const settings = await getBookingSettings();
  const refreshToken = await getGoogleRefreshToken();
  if (!refreshToken) return;
  try {
    const accessToken = await getAccessToken(refreshToken);
    await deleteEvent(accessToken, settings.calendarId, eventId);
  } catch {
    // Calendar may be unreachable; row is still marked cancelled.
  }
}

export interface ListBookingsOptions {
  status?: BookingStatus;
  window?: "upcoming" | "past" | "all";
  from?: string;
  to?: string;
  q?: string;
  limit?: number;
}

export async function listBookings(opts: ListBookingsOptions = {}): Promise<BookingRecord[]> {
  const where: import("@prisma/client").Prisma.BookingWhereInput = {};
  if (opts.status) where.status = opts.status;
  const now = new Date();
  if (opts.window === "upcoming") where.startsAt = { gte: now };
  else if (opts.window === "past") where.startsAt = { lt: now };
  if (opts.from || opts.to) {
    where.startsAt = {
      ...(where.startsAt as object),
      ...(opts.from && { gte: new Date(opts.from) }),
      ...(opts.to && { lte: new Date(opts.to) }),
    };
  }
  const q = opts.q?.trim();
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { topic: { contains: q, mode: "insensitive" } },
    ];
  }
  const rows = await db.booking.findMany({
    where,
    orderBy: { startsAt: "desc" },
    take: Math.min(Math.max(opts.limit ?? 100, 1), 500),
  });
  return rows.map(toBookingDto);
}
