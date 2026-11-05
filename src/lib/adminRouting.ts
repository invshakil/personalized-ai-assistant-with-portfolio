// Which way proxy.ts sends an admin request. Pure, so the decision is unit-tested
// without spinning up NextAuth.
//
// Admin API calls are matched too — not to redirect them (route handlers return
// their own 401) but so that `auth()` runs on them and re-issues the session
// cookie. A user who stays on one page saving forms or chatting with the
// assistant is active, and must not be logged out for never navigating.

export type AdminAccess = "allow" | "login" | "home";

export const isAdminApiPath = (pathname: string) => pathname.startsWith("/api/admin");

export function resolveAdminAccess(pathname: string, isLoggedIn: boolean): AdminAccess {
  if (isAdminApiPath(pathname)) return "allow";
  const isLoginPage = pathname === "/admin/login";
  if (isLoginPage) return isLoggedIn ? "home" : "allow";
  if (pathname.startsWith("/admin")) return isLoggedIn ? "allow" : "login";
  return "allow";
}
