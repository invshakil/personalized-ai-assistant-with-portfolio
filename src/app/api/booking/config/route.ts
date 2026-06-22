import { getBookingSettings } from "@/services/booking";
import type { PublicBookingConfig } from "@/types";

// Public — no auth. Drives the visitor-facing picker. Never leak admin email,
// timezone is fine to expose (Date stamps already imply it).
export async function GET() {
  const s = await getBookingSettings();
  // Show the booking surface only when both enabled AND Google is connected.
  // Otherwise, the visitor would see slots that can't be committed.
  const enabled = s.enabled && s.googleConnected;
  const data: PublicBookingConfig = {
    enabled,
    durationsMinutes: s.durationsMinutes,
    maxHorizonDays: s.maxHorizonDays,
    minNoticeHours: s.minNoticeHours,
    timezone: s.timezone,
    whatsapp: {
      enabled: s.whatsappEnabled && !!s.whatsappNumber,
      number: s.whatsappNumber,
      prefill: s.whatsappPrefill,
    },
    turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || null,
  };
  return Response.json({ data });
}
