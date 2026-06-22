import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { encryptSecret, decryptSecret } from "@/services/ai/crypto";
import type {
  BookingBlackout,
  BookingSettings,
  BookingSettingsState,
  BookingWorkingHour,
} from "@/types";
import { isCalendarConfigured } from "./googleCalendar";
import { DEFAULT_WORKING_HOURS, toBlackoutDto, toPublicSettings } from "./_serializers";

async function getSettingsRow() {
  return db.bookingSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      workingHours: DEFAULT_WORKING_HOURS as unknown as Prisma.InputJsonValue,
    },
  });
}

export async function getBookingSettings(): Promise<BookingSettings> {
  const row = await getSettingsRow();
  return toPublicSettings(row);
}

export async function getBookingSettingsState(): Promise<BookingSettingsState> {
  const [row, blackouts] = await Promise.all([
    getSettingsRow(),
    db.bookingBlackout.findMany({ orderBy: { date: "asc" } }),
  ]);
  return {
    settings: toPublicSettings(row),
    blackouts: blackouts.map(toBlackoutDto),
    googleConfigured: isCalendarConfigured(),
  };
}

export interface UpdateBookingSettingsInput {
  enabled?: boolean;
  calendarId?: string;
  meetingTitleTemplate?: string;
  meetingDescription?: string | null;
  durationsMinutes?: number[];
  slotIncrementMinutes?: number;
  bufferMinutes?: number;
  minNoticeHours?: number;
  maxHorizonDays?: number;
  timezone?: string;
  workingHours?: BookingWorkingHour[];
  notifyEmail?: string | null;
  whatsappNumber?: string | null;
  whatsappPrefill?: string | null;
  whatsappEnabled?: boolean;
}

function sanitizeWorkingHours(hours: BookingWorkingHour[]): BookingWorkingHour[] {
  const out: BookingWorkingHour[] = [];
  const isHHMM = (s: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
  for (const h of hours) {
    if (
      Number.isInteger(h.weekday) &&
      h.weekday >= 0 &&
      h.weekday <= 6 &&
      isHHMM(h.start) &&
      isHHMM(h.end) &&
      h.start < h.end
    ) {
      out.push({ weekday: h.weekday, start: h.start, end: h.end });
    }
  }
  return out;
}

export async function updateBookingSettings(
  input: UpdateBookingSettingsInput
): Promise<BookingSettings> {
  const data: Prisma.BookingSettingsUpdateInput = {};
  if (input.enabled !== undefined) data.enabled = input.enabled;
  if (input.calendarId !== undefined) data.calendarId = input.calendarId || "primary";
  if (input.meetingTitleTemplate !== undefined)
    data.meetingTitleTemplate = input.meetingTitleTemplate;
  if (input.meetingDescription !== undefined) data.meetingDescription = input.meetingDescription;
  if (input.durationsMinutes !== undefined) {
    const durs = input.durationsMinutes
      .filter((n) => Number.isInteger(n) && n >= 5 && n <= 240)
      .sort((a, b) => a - b);
    if (durs.length > 0) data.durationsMinutes = durs;
  }
  if (input.slotIncrementMinutes !== undefined)
    data.slotIncrementMinutes = Math.max(5, Math.min(120, input.slotIncrementMinutes));
  if (input.bufferMinutes !== undefined)
    data.bufferMinutes = Math.max(0, Math.min(180, input.bufferMinutes));
  if (input.minNoticeHours !== undefined)
    data.minNoticeHours = Math.max(0, Math.min(720, input.minNoticeHours));
  if (input.maxHorizonDays !== undefined)
    data.maxHorizonDays = Math.max(1, Math.min(180, input.maxHorizonDays));
  if (input.timezone !== undefined && input.timezone) data.timezone = input.timezone;
  if (input.workingHours !== undefined) {
    data.workingHours = sanitizeWorkingHours(
      input.workingHours
    ) as unknown as Prisma.InputJsonValue;
  }
  if (input.notifyEmail !== undefined) data.notifyEmail = input.notifyEmail?.trim() || null;
  if (input.whatsappNumber !== undefined) {
    const digits = input.whatsappNumber?.replace(/\D/g, "") ?? "";
    data.whatsappNumber = digits || null;
  }
  if (input.whatsappPrefill !== undefined) data.whatsappPrefill = input.whatsappPrefill || null;
  if (input.whatsappEnabled !== undefined) data.whatsappEnabled = input.whatsappEnabled;

  const row = await db.bookingSettings.update({ where: { id: "singleton" }, data });
  return toPublicSettings(row);
}

// ─── Blackouts ────────────────────────────────────────────────────────────────

export async function listBlackouts(): Promise<BookingBlackout[]> {
  const rows = await db.bookingBlackout.findMany({ orderBy: { date: "asc" } });
  return rows.map(toBlackoutDto);
}

function parseLocalDay(iso: string): Date {
  // "YYYY-MM-DD" — store as UTC midnight so the same calendar day is unique.
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export async function addBlackout(date: string, reason: string | null): Promise<BookingBlackout> {
  const day = parseLocalDay(date);
  const row = await db.bookingBlackout.upsert({
    where: { date: day },
    update: { reason: reason?.trim() || null },
    create: { date: day, reason: reason?.trim() || null },
  });
  return toBlackoutDto(row);
}

export async function deleteBlackout(id: string): Promise<void> {
  await db.bookingBlackout.delete({ where: { id } });
}

// ─── Google connection (encrypted refresh token) ──────────────────────────────

export async function saveGoogleConnection(refreshToken: string, email: string): Promise<void> {
  const enc = encryptSecret(refreshToken);
  await db.bookingSettings.upsert({
    where: { id: "singleton" },
    update: {
      googleConnected: true,
      googleEmail: email,
      googleTokenEnc: enc.enc,
      googleTokenIv: enc.iv,
      googleTokenTag: enc.tag,
    },
    create: {
      id: "singleton",
      workingHours: DEFAULT_WORKING_HOURS as unknown as Prisma.InputJsonValue,
      googleConnected: true,
      googleEmail: email,
      googleTokenEnc: enc.enc,
      googleTokenIv: enc.iv,
      googleTokenTag: enc.tag,
    },
  });
}

export async function clearGoogleConnection(): Promise<string | null> {
  const row = await getSettingsRow();
  const token = readRefreshToken(row);
  await db.bookingSettings.update({
    where: { id: "singleton" },
    data: {
      googleConnected: false,
      googleEmail: null,
      googleTokenEnc: null,
      googleTokenIv: null,
      googleTokenTag: null,
    },
  });
  return token;
}

function readRefreshToken(row: {
  googleTokenEnc: string | null;
  googleTokenIv: string | null;
  googleTokenTag: string | null;
}): string | null {
  if (!row.googleTokenEnc || !row.googleTokenIv || !row.googleTokenTag) return null;
  return decryptSecret({ enc: row.googleTokenEnc, iv: row.googleTokenIv, tag: row.googleTokenTag });
}

/** Internal — used by booking commit + admin cancel to talk to Google. */
export async function getGoogleRefreshToken(): Promise<string | null> {
  const row = await getSettingsRow();
  return readRefreshToken(row);
}
