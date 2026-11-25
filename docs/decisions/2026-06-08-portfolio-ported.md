# Portfolio fully ported to Next.js

**The portfolio was ported from `portfolio.html` into Next.js components with an SCSS architecture** (Shakil, 8 Jun 2026).

- `sass` was installed.
- A 13-file SCSS architecture: variables, functions, mixins, base, sections, nav, one partial per portfolio section, and a `globals.scss` orchestrator.
- All 7 portfolio components were implemented from `portfolio.html`.
- `Nav` and `Footer` shared layout components.
- The root layout carries the full SEO metadata, geo tags and three JSON-LD structured data scripts.
- The build passed with zero errors.

The SCSS `_nav.scss` partial has a global `nav { position: fixed }` rule. That is why the admin sidebar later used `<Box role="navigation">` instead of a `nav` element.
