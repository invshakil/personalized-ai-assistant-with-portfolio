# Bug fixes and an application logger

**Three bugs in tenants, date ranges and login were fixed, and the app gained a database-backed logger with a Logs page** (Shakil, 9 Oct 2026).

1. **External members never loaded.** The `active` tenant filter excludes them, so they could not be deactivated and kept being generated into payments. `useUnitsData` now also loads `external`.
2. **`this_month` and `this_year` ranges ended at today,** which hid future-dated entries. They now cover the whole period. The server time zone defaults to Asia/Dhaka.
3. **Login hung after the session expired,** because of a stale router cache. It was fixed with a hard navigation. A `callbackUrl` now makes the round trip through `proxy.ts`, and the client redirects on a 401.
4. **A new `LogEntry` model, the `logger`, and the `/admin/logs` page.**

How the logger works today is in the Logs section of [ARCHITECTURE.md](../ARCHITECTURE.md#logs-adminlogs).
