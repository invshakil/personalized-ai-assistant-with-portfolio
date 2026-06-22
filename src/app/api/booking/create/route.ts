import { NextRequest } from "next/server";
import { BookingError, checkRateLimit, createBooking } from "@/services/booking";

interface CreateBody {
  name?: string;
  email?: string;
  topic?: string;
  message?: string | null;
  startsAt?: string;
  durationMin?: number;
  turnstileToken?: string;
  // Honeypot — bots fill this; humans never see it.
  website?: string;
}

async function verifyTurnstile(token: string | undefined, ip: string | null): Promise<boolean> {
  // Accept either name — TURNSTILE_SECRET_KEY mirrors TURNSTILE_SITE_KEY.
  const secret = process.env.TURNSTILE_SECRET_KEY ?? process.env.TURNSTILE_SECRET;
  if (!secret) return true; // not configured → skip
  if (!token) return false;
  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set("remoteip", ip);
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

function clientIp(req: NextRequest): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") || null;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as CreateBody;

  // Honeypot: any value here means bot. Return a generic-looking success to
  // discourage automated retries.
  if (body.website && body.website.trim().length > 0) {
    return Response.json({ data: { ok: true } });
  }

  const ip = clientIp(req);

  const rate = await checkRateLimit(ip);
  if (!rate.ok) {
    return Response.json({ error: rate.reason ?? "Rate limit" }, { status: 429 });
  }

  const captchaOk = await verifyTurnstile(body.turnstileToken, ip);
  if (!captchaOk) {
    return Response.json({ error: "Captcha failed — please try again." }, { status: 400 });
  }

  if (
    typeof body.name !== "string" ||
    typeof body.email !== "string" ||
    typeof body.topic !== "string" ||
    typeof body.startsAt !== "string" ||
    typeof body.durationMin !== "number"
  ) {
    return Response.json({ error: "Missing fields" }, { status: 400 });
  }

  try {
    const result = await createBooking({
      name: body.name,
      email: body.email,
      topic: body.topic,
      message: body.message ?? null,
      startsAt: body.startsAt,
      durationMin: body.durationMin,
      ip,
    });
    return Response.json({
      data: {
        booking: result.booking,
        cancelToken: result.cancelToken,
      },
    });
  } catch (e) {
    if (e instanceof BookingError) {
      return Response.json({ error: e.message }, { status: e.status });
    }
    return Response.json({ error: "Booking failed" }, { status: 500 });
  }
}
