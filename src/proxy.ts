import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { resolveAdminAccess } from "@/lib/adminRouting";

// Every matched request passes through `auth()`, which re-issues the session
// cookie with a fresh expiry (see session.maxAge in lib/auth.ts) — that is what
// keeps an active user signed in. The routing decision itself is in
// lib/adminRouting.ts.
export default auth((req) => {
  const { nextUrl } = req;
  const access = resolveAdminAccess(nextUrl.pathname, !!req.auth);

  // Unauthenticated on a protected admin page: remember where the user was so
  // login can return them there.
  if (access === "login") {
    const loginUrl = new URL("/admin/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname + nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  // Already signed in on the login page.
  if (access === "home") {
    return NextResponse.redirect(new URL("/admin", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
