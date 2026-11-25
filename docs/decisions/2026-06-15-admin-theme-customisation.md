# Admin theme customisation

**The admin theme is built from saved settings that the owner edits at `/admin/settings/appearance`** (Shakil, 15 Jun 2026).

The settings: light, dark or system mode; primary colour (presets and hex); card shadow and border; corner radius; density; base font size.

- `adminTheme.ts` was refactored into `createAdminTheme(settings, resolvedMode)`, and a full light palette was added.
- A new `AdminThemeProvider` context drives live preview and persistence.
- A new `AdminThemeSettings` singleton model, a service, and `PUT /api/admin/theme`.
- The `(admin)` layout loads the settings on the server, so there is no flash.
- A quick light/dark toggle in `AdminHeader`.
- The Settings sidebar entry became collapsible: Site Settings and Appearance.

Verified: build, lint and `tsc` clean.
