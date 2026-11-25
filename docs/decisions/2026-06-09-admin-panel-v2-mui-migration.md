# Admin panel v2: migration to Material UI

**Tailwind was replaced with Material UI v9 in every admin component** (Shakil, 9 Jun 2026).

- A Materio-inspired dark theme in `src/lib/adminTheme.ts`.
- `AdminShell.tsx` provides `AppRouterCacheProvider` and `ThemeProvider`, scoped to the admin.

Rebuilt in MUI:

- Sidebar: MUI List navigation.
- Header: MUI Box and Avatar.
- Overview: animated stat cards.
- Login: MUI TextField and Alert.
- AI chat: MUI Card and a multiline TextField.
- Settings: MUI Switch and TextField.
- Account: MUI profile and password cards.

The reason for the choice is in [Admin styling: Material UI and emotion](2026-06-09-admin-styling-material-ui.md).
