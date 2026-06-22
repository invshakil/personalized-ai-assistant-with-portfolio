// Booking — shared types for the public consultation feature.

export interface BookingWorkingHour {
  weekday: number; // 0=Sun..6=Sat
  start: string; // "HH:MM" local
  end: string; // "HH:MM" local
}

export interface BookingSettings {
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
  workingHours: BookingWorkingHour[];
  notifyEmail: string | null;
  whatsappNumber: string | null;
  whatsappPrefill: string | null;
  whatsappEnabled: boolean;
  googleConnected: boolean;
  googleEmail: string | null;
}

export interface BookingBlackout {
  id: string;
  date: string; // ISO
  reason: string | null;
}

export interface BookingSettingsState {
  settings: BookingSettings;
  blackouts: BookingBlackout[];
  googleConfigured: boolean; // env vars present
}

export type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED";

export interface BookingRecord {
  id: string;
  name: string;
  email: string;
  topic: string;
  message: string | null;
  startsAt: string;
  endsAt: string;
  durationMin: number;
  status: BookingStatus;
  meetUrl: string | null;
  googleEventId: string | null;
  cancelledAt: string | null;
  createdAt: string;
}

// ── Public surface ───────────────────────────────────────────────────────────

export interface PublicBookingConfig {
  enabled: boolean;
  durationsMinutes: number[];
  maxHorizonDays: number;
  minNoticeHours: number;
  timezone: string;
  whatsapp: {
    enabled: boolean;
    number: string | null; // E.164 digits, no "+"
    prefill: string | null;
  };
  turnstileSiteKey: string | null; // null when not configured
}

export interface PublicSlot {
  startsAt: string; // ISO
}
