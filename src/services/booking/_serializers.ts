import type {
  BookingBlackout,
  BookingRecord,
  BookingSettings,
  BookingStatus,
  BookingWorkingHour,
} from "@/types";

export const DEFAULT_WORKING_HOURS: BookingWorkingHour[] = [
  { weekday: 1, start: "09:00", end: "18:00" },
  { weekday: 2, start: "09:00", end: "18:00" },
  { weekday: 3, start: "09:00", end: "18:00" },
  { weekday: 4, start: "09:00", end: "18:00" },
  { weekday: 5, start: "09:00", end: "18:00" },
];

interface BookingSettingsRow {
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

function parseWorkingHours(raw: unknown): BookingWorkingHour[] {
  if (!Array.isArray(raw)) return DEFAULT_WORKING_HOURS;
  return raw
    .map((r) => {
      if (!r || typeof r !== "object") return null;
      const o = r as Record<string, unknown>;
      const weekday = Number(o.weekday);
      const start = typeof o.start === "string" ? o.start : null;
      const end = typeof o.end === "string" ? o.end : null;
      if (!Number.isFinite(weekday) || weekday < 0 || weekday > 6 || !start || !end) return null;
      return { weekday, start, end };
    })
    .filter((x): x is BookingWorkingHour => x !== null);
}

export function toPublicSettings(row: BookingSettingsRow): BookingSettings {
  return {
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
    workingHours: parseWorkingHours(row.workingHours),
    notifyEmail: row.notifyEmail,
    whatsappNumber: row.whatsappNumber,
    whatsappPrefill: row.whatsappPrefill,
    whatsappEnabled: row.whatsappEnabled,
    googleConnected: row.googleConnected,
    googleEmail: row.googleEmail,
  };
}

export function toBlackoutDto(b: {
  id: string;
  date: Date;
  reason: string | null;
}): BookingBlackout {
  return { id: b.id, date: b.date.toISOString(), reason: b.reason };
}

export function toBookingDto(b: {
  id: string;
  name: string;
  email: string;
  topic: string;
  message: string | null;
  startsAt: Date;
  endsAt: Date;
  durationMin: number;
  status: string;
  googleEventId: string | null;
  meetUrl: string | null;
  cancelledAt: Date | null;
  createdAt: Date;
}): BookingRecord {
  return {
    id: b.id,
    name: b.name,
    email: b.email,
    topic: b.topic,
    message: b.message,
    startsAt: b.startsAt.toISOString(),
    endsAt: b.endsAt.toISOString(),
    durationMin: b.durationMin,
    status: b.status as BookingStatus,
    googleEventId: b.googleEventId,
    meetUrl: b.meetUrl,
    cancelledAt: b.cancelledAt?.toISOString() ?? null,
    createdAt: b.createdAt.toISOString(),
  };
}
