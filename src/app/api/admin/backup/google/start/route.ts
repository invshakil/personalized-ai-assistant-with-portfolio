import crypto from "node:crypto";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { isDriveConfigured, buildConsentUrl } from "@/services/admin/googleDrive";

// GET → redirect to Google's consent screen (sets an anti-CSRF state cookie).
export async function GET() {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!isDriveConfigured()) {
    return Response.json(
      { error: "Google OAuth is not configured (GOOGLE_OAUTH_CLIENT_ID/SECRET)." },
      { status: 400 }
    );
  }

  const state = crypto.randomBytes(16).toString("hex");
  const res = NextResponse.redirect(buildConsentUrl(state));
  res.cookies.set("gdrive_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minutes
  });
  return res;
}
