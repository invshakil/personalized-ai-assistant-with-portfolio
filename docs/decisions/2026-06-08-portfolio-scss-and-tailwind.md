# Portfolio styling: SCSS and Tailwind CSS v4

**The portfolio surface is styled with SCSS partials and Tailwind CSS v4** (Shakil, 8 Jun 2026).

- **Why:** SCSS gives variables, mixins and one partial per section; Tailwind gives utility classes.

The portfolio covers `/` and the other public pages. Its CSS tokens are CSS variables set in the SCSS base. The entry points are `src/styles/globals.scss` and `src/styles/tailwind.css`.

The two styling systems are kept apart by surface. The portfolio never uses MUI, and the admin never uses Tailwind. The admin side of this is in [the MUI decision](2026-06-09-admin-styling-material-ui.md).
