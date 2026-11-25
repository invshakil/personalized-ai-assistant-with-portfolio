# Form defaults phase 3: the Settings page

**Form defaults are reviewed and set on one page, Settings → Form Defaults, with the mode visible on every field** (Shakil, 2 Sep 2026).

- **Why:** until this landed, a default could only be set through the API. The visible effect of the first two phases was a form that opened empty rather than with the wrong value.

This is entry D4 of the form defaults work stream. The page is `/admin/settings/defaults`.

| Piece                     | File                                                 |
| ------------------------- | ---------------------------------------------------- |
| Orchestrator (115 lines)  | `settings/defaults/DefaultsSettingsPage.tsx`         |
| Option-source loader      | `settings/defaults/hooks/useDefaultOptions.ts`       |
| Field row                 | `settings/defaults/components/DefaultFieldRow.tsx`   |
| Form grouping             | `settings/defaults/components/FormDefaultsGroup.tsx` |
| Navigation and breadcrumb | `AdminSidebar.tsx`, `AdminBreadcrumb.tsx`            |

Decisions:

- **Only the sources the registry references are fetched.** Registering a Property field later costs one branch in `useDefaultOptions`, not a page-wide change.
- **"— no default —" is an explicit option,** following the list-page convention that every sentinel is a real choice rather than an empty box. Choosing it stores `value: ""` and keeps the chosen mode. The separate reset button deletes the row, so the field returns to the registry's starting mode.
- **The mode toggle is visible per field,** so there is no hidden state. You can see that Account is Fixed and Category is Last used without opening anything.
- **Registry order is display order,** and the page groups by adjacency. A registry that interleaved two forms would render duplicate cards, so that property is asserted in verification rather than left to chance.
- **The page states the open-to-add rule in a banner,** because "why didn't my default apply when I edited this row" is the obvious first confusion.

Verified: 9 checks on the page's data path. Every registry source is loadable; enum fields carry options; account and category shapes match what the page maps over; grouping is contiguous; no registered field is unwired to a real form; and the registry lookups the page and service share agree. Plus `tsc`, eslint with 0 errors, build, and 110 of 110 tests. All four files are inside their size limits (page 115 of 300, hook 60 of 200, components 93 and 26 of 100).
