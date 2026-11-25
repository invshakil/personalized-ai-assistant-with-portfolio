# Admin styling: Material UI and emotion

**The admin surface is styled with Material UI and emotion, scoped to `/admin`** (Shakil, 9 Jun 2026).

- **Why:** it gives a professional dark dashboard UI, and scoping it to `/admin` means no conflict with the portfolio's Tailwind.
- **Instead of:** Tailwind in the admin, which the first version of the admin panel used.

The admin is on MUI v9. Components are styled through the `sx` prop, and every colour comes from the theme in `src/lib/adminTheme.ts`. MUI is loaded through `AdminShell.tsx`, which provides the theme and `CssBaseline` for the admin layout only.

The login page at `/admin/login` is outside the `(admin)` route group, so it has no sidebar. It has its own `ThemeProvider` in `LoginPage.tsx`.

The work that made the switch is in [Admin panel v2](2026-06-09-admin-panel-v2-mui-migration.md).
