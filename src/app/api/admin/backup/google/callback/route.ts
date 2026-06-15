import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { exchangeCode } from "@/services/admin/googleDrive";
import { saveDriveConnection } from "@/services/admin";

// Google redirects here with ?code & ?state after consent.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const settingsUrl = new URL("/admin/settings/backup", req.url);
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = req.cookies.get("gdrive_oauth_state")?.value;

  if (url.searchParams.get("error")) {
    settingsUrl.searchParams.set("drive", "denied");
    return NextResponse.redirect(settingsUrl);
  }
  if (!code || !state || !cookieState || state !== cookieState) {
    settingsUrl.searchParams.set("drive", "error");
    return NextResponse.redirect(settingsUrl);
  }

  try {
    const { refreshToken, email } = await exchangeCode(code);
    await saveDriveConnection(refreshToken, email);
    settingsUrl.searchParams.set("drive", "connected");
  } catch {
    settingsUrl.searchParams.set("drive", "error");
  }
  const res = NextResponse.redirect(settingsUrl);
  res.cookies.delete("gdrive_oauth_state");
  return res;
}
