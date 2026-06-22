import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { exchangeCode, saveGoogleConnection } from "@/services/booking";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const base = process.env.AUTH_URL ?? new URL(req.url).origin;
  const settingsUrl = new URL("/admin/settings/booking", base);
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = req.cookies.get("gbooking_oauth_state")?.value;

  if (url.searchParams.get("error")) {
    settingsUrl.searchParams.set("google", "denied");
    return NextResponse.redirect(settingsUrl);
  }
  if (!code || !state || !cookieState || state !== cookieState) {
    settingsUrl.searchParams.set("google", "error");
    return NextResponse.redirect(settingsUrl);
  }

  try {
    const { refreshToken, email } = await exchangeCode(code);
    await saveGoogleConnection(refreshToken, email);
    settingsUrl.searchParams.set("google", "connected");
  } catch {
    settingsUrl.searchParams.set("google", "error");
  }
  const res = NextResponse.redirect(settingsUrl);
  res.cookies.delete("gbooking_oauth_state");
  return res;
}
