# Sliding 24-hour admin session

**The admin session lasts 24 hours and is renewed by every admin page or API request, so only 24 hours with no admin traffic ends it** (Shakil, 5 Nov 2026).

- **Why:** the JWT session was capped at 12 hours, and only page loads through `proxy.ts` re-issued the cookie. A user working inside one page, in forms or the AI chat, could be logged out in the middle of their work.

What changed:

- `session.maxAge` is now 24 hours.
- The proxy also matches `/api/admin/:path*`. This is not to redirect API calls: handlers keep answering 401. It is so `auth()` re-signs the token on every admin page or API request.
- The routing decision was extracted to the pure `lib/adminRouting.ts` (`resolveAdminAccess`), which is unit-tested.

Verified with a login probe: `exp` was now plus 24 hours after login, and it was re-issued 2 seconds later by both a page request and an API request.

Commit `8905f81`.
