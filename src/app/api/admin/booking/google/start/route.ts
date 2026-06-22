import crypto from "node:crypto";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { isCalendarConfigured, buildConsentUrl } from "@/services/booking";

export async function GET() {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!isCalendarConfigured()) {
    return Response.json(
      { error: "Google OAuth is not configured (GOOGLE_OAUTH_CLIENT_ID/SECRET)." },
      { status: 400 }
    );
  }

  const state = crypto.randomBytes(16).toString("hex");
  const res = NextResponse.redirect(buildConsentUrl(state));
  res.cookies.set("gbooking_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
