# CODING_CONVENTION.md — sshakil.com

Coding conventions for this repo. Referenced from `CLAUDE.md` — read that file first for
project context, stack, file locations, and DO NOTs. This file covers **how** to write code;
`CLAUDE.md` covers **what/where**.

---

## General

- **TypeScript strict mode** — no `any`, no `@ts-ignore` without a comment explaining why
- **No default exports from lib files** — named exports only in `src/lib/`
- **Server components by default** — only add `"use client"` when you actually need interactivity or browser APIs
- Keep components **small and single-purpose** — if a component exceeds ~150 lines, split it

## Component structure & decomposition

Every feature page follows the **orchestrator + hooks + components** pattern. A page file wires logic to UI — it contains neither. If a page file exceeds ~300 lines, it must be split before the PR lands.

**Size thresholds (hard limits):**

| File type                                        | Limit     | Action when exceeded        |
| ------------------------------------------------ | --------- | --------------------------- |
| Page / orchestrator (`*Page.tsx`)                | 300 lines | Extract a hook or component |
| Custom hook (`use*.ts`)                          | 200 lines | Split by responsibility     |
| Presentational component                         | 100 lines | Split into smaller pieces   |
| Shared admin component (`src/components/admin/`) | 150 lines | Split                       |

**Co-location for complex feature pages:**

When a page has meaningful logic or more than ~3 sub-components, create `hooks/` and `components/` subdirectories co-located with the page. Do **not** dump feature-specific hooks or components into the global `src/hooks/` or `src/components/admin/` — those are for genuinely shared pieces used across multiple features.

```
src/app/(admin)/admin/<feature>/
  page.tsx                    ← Next.js entry — thin; just exports the Page component
  <Feature>Page.tsx           ← orchestrator: wires hooks → components, ≤ 300 lines
  types.ts                    ← feature-local types (only if not shared via src/types/)
  hooks/
    use<Domain>.ts            ← one hook per responsibility (session, stream, filters…)
  components/
    <SubComponent>.tsx        ← pure or near-pure UI; props only, no Redux/API access
```

**What belongs where:**

| Layer                    | Contains                                                  | Must NOT contain                                                       |
| ------------------------ | --------------------------------------------------------- | ---------------------------------------------------------------------- |
| `hooks/use*.ts`          | state, effects, API calls, derived values, event handlers | JSX, MUI imports                                                       |
| `components/*.tsx`       | JSX + sx styles; receives data/callbacks as props         | `useState` for business state, `useEffect`, API calls, Redux selectors |
| Orchestrator `*Page.tsx` | hook invocations + JSX wiring only                        | inline `fetch`, `db.*`, business logic blocks                          |

**The orchestrator pattern:**

```tsx
export default function FeaturePage() {
  // 1. Redux selectors — read-only
  const items = useAppSelector((s) => s.feature.items);

  // 2. Local UI state only (open/close dialogs, input values)
  const [search, setSearch] = useState("");

  // 3. Domain hooks — each owns one concern
  const session = useFeatureSession();
  const filters = useFeatureFilters(search);
  const { save, remove } = useFeatureMutations({ refresh: session.refresh });

  // 4. Derived display values (useMemo only — no effects here)
  const filtered = useMemo(() => items.filter(filters.fn), [items, filters.fn]);

  // 5. JSX — named components only; no inline logic blocks
  return (
    <Box>
      <FeatureToolbar onSearch={setSearch} onNew={session.openNew} />
      <FeatureTable rows={filtered} onDelete={remove} />
    </Box>
  );
}
```

**Canonical reference** — `src/app/(admin)/admin/ai-assistant/`: 7 hooks + 11 components, orchestrator 276 lines.

**DO NOTs (decomposition-specific):**

- **Do not** write or commit a page/feature file that exceeds 300 lines — split first
- **Do not** put `useEffect`, `useState`, or API calls inside a presentational component
- **Do not** import Redux selectors inside `components/` files — pass data as props
- **Do not** combine multiple unrelated responsibilities in one hook (e.g. session + streaming + file uploads)
- **Do not** put feature-specific hooks in `src/hooks/` or feature-specific components in `src/components/admin/` — co-locate them next to the feature page

## Redux state management

Redux holds **transient client state that must outlive a single page mount** — state that must survive admin-page navigation without a server round-trip. Do not put server-fetched list data, form values, or UI-only open/close flags in Redux.

**Redux vs local state — decision table:**

| State type                                      | Where it lives                                    |
| ----------------------------------------------- | ------------------------------------------------- |
| Chat thread, streaming flag, current session id | Redux — must survive navigation                   |
| Dialog open/close, search input, selected tab   | `useState` in the orchestrator                    |
| Derived display values (filtered list, totals)  | `useMemo` in the orchestrator or hook             |
| Server-fetched list/detail data                 | `useState` inside the domain hook that fetches it |

**Store layout:**

```
src/store/
  store.ts           ← makeStore() — configureStore; add new reducers here
  hooks.ts           ← useAppSelector / useAppDispatch — always use these, never bare react-redux hooks
  StoreProvider.tsx  ← mounted in AdminShell; one store per layout mount (survives navigation)
  slices/
    <domain>Slice.ts ← one slice per feature domain
```

**Slice convention:**

- One file per feature domain: `src/store/slices/<domain>Slice.ts`
- Export the reducer as `<domain>Reducer`; register it under its key in `store.ts`
- Export all actions as named exports from the slice file — import them by name in hooks
- Keep the slice state minimal: only what must persist across navigation. If it can live in a hook's `useState`, it should.

**Which layer reads / which layer dispatches:**

| Layer                    | Reads Redux?                       | Dispatches?                               |
| ------------------------ | ---------------------------------- | ----------------------------------------- |
| `components/*.tsx`       | No — receives data as props        | No                                        |
| Orchestrator `*Page.tsx` | Yes — `useAppSelector` (read-only) | No                                        |
| `hooks/use*.ts`          | Yes — `useAppSelector`             | Yes — `useAppDispatch` + dispatch actions |

**The dispatch rule:** hooks are the only layer that dispatches. The orchestrator may read Redux state to pass down as props (`const isStreaming = useAppSelector(s => s.aiChat.isStreaming)`), but it never calls `dispatch(...)` directly. If you find yourself dispatching in a page file or a component, move that call into a hook.

**Adding a new slice:**

1. Create `src/store/slices/<domain>Slice.ts` using `createSlice`
2. Register it: add `<domain>: <domain>Reducer` to `makeStore`'s reducer map in `store.ts`
3. `RootState` is inferred automatically — no extra type declarations needed

**DO NOTs (Redux-specific):**

- **Do not** call `useAppSelector` or `useAppDispatch` inside `components/` files
- **Do not** dispatch actions directly in an orchestrator page — put dispatch calls in a hook
- **Do not** store server-fetched data (API responses, DB rows) in Redux — keep it in hook-local `useState`
- **Do not** create a new Redux store instance anywhere — `StoreProvider` already mounts one in `AdminShell`
- **Do not** import bare `useSelector` / `useDispatch` from `react-redux` — always use the typed wrappers from `@/store/hooks`

## Styling rules by surface

**Portfolio** (`src/app/(portfolio)/`, `src/components/portfolio/`, `src/components/shared/`):

- Tailwind utility classes only
- No inline styles — use Tailwind or CSS variables from `globals.css`
- Match colour tokens from `globals.css` exactly — do not introduce new colour values
- The design reference is the original `portfolio.html`

**Admin** (`src/app/(admin)/`, `src/components/admin/`):

- MUI components only — `Box`, `Card`, `Typography`, `TextField`, `Button`, etc.
- Use the `sx` prop for layout and overrides; never use Tailwind classes in admin components
- Never use `className` with Tailwind utilities inside the `(admin)` route group
- All colours come from the MUI theme (`adminTheme`) — never hardcode hex values in admin components
- Use `color="primary.main"`, `bgcolor="background.paper"`, etc., not raw hex strings
- Animations: use `@emotion/react` `keyframes` helper (already installed as MUI dependency)
- Do **not** use `<Box component="nav">` — the portfolio has a global `nav { position: fixed }` SCSS rule that bleeds in. Use `<Box role="navigation">` instead.

## Naming conventions

- Components: `PascalCase.tsx` — e.g. `Hero.tsx`, `AdminSidebar.tsx`
- Pages: `page.tsx` (Next.js convention)
- Layouts: `layout.tsx` (Next.js convention)
- API routes: `route.ts` (Next.js convention)
- Lib utilities: `camelCase.ts` — e.g. `auth.ts`, `db.ts`, `adminTheme.ts`
- Types: `PascalCase` interfaces/types in `src/types/` per-module files (`property.ts`, `finance.ts`, `admin.ts`, `portfolio.ts`), re-exported via the `index.ts` barrel — always import from `@/types`

## List page filter standard

Every admin list/table page (Ledger, Payments, Earnings, Expenses, etc.) gets the same filter/search/sort/URL/AI-tool contract:

1. **Filters hit the real API, not client-side `useMemo`.** Move every filter into the query sent to the API → service `where`. No silent client-only filtering of a period's worth of rows.
2. **Filter/search/sort state lives in the URL** (query params via `useSearchParams`/`router.replace`), so reload and back-navigation restore it.
3. **Search by description** (free-text `q` / `contains`, case-insensitive) on any page with a description/notes field — usually needs a service + API param, since most services only filter by id/direction/date.
4. **Sortable table columns** (date, amount, category, etc.) use server-side sort params (`sortBy`/`sortDir`) over client sort, so sorting composes with API filtering.
5. **Period dropdown stays as a shortcut, but always pair it with a real date-range picker** (`from`/`to`) so historical data outside the shortcut presets is reachable. Shared range plumbing: `resolveRange`/`dateColumnWhere` in `src/services/_shared/dateRange.ts`; API routes read `period`/`from`/`to`.
6. **Keep the matching AI read tool in lockstep** — add new filter/search params to the tool's JSON schema in `src/services/ai/tools.ts` AND refresh its `description` so the model knows the capability exists (e.g. a `categoryId` filter or description search added to a list page must also land on the corresponding `list_*` tool).
7. **Every dropdown must be searchable (type-to-filter).** Use the shared `src/components/admin/SearchableSelect.tsx` (MUI `Autocomplete` wrapper) instead of raw `<Select>/<MenuItem>` — for filters AND drawer/form selects. Include any "All …" / "— none —" sentinel as an explicit option.

**Why:** keeps every list page deep-linkable, server-filtered, and fully exposed to the AI assistant — not just visually filtered.

## Entity linking: click-to-filter vs. link-to-profile

Two established patterns for making table columns interactive, applied consistently across Property, Finance, and Money modules:

- **Click-to-filter** — a column whose value is a _category_ the page already filters on (type, category, account, currency). Render it as an MUI `Chip` with `clickable` + an `onClick` that calls the page's filter hook (e.g. `filters.setParams({ category: categoryId })`). The click **replaces** that filter param — it doesn't merge into a multi-select. No navigation.
- **Link-to-profile** — a column whose value names an _entity with its own identity_ (tenant, unit, payee, employee, client, account). Use the shared `src/components/admin/EntityLink.tsx` component to link to that entity's page/filtered view. Use `stopPropagation` when nesting the link inside an already-clickable row (e.g. an expandable table row), and `inline` when embedding mid-sentence inside another `Typography`.
- When an entity has no dedicated profile route yet, link instead to that entity's **filtered list view** (e.g. a category name links to `/admin/.../entries?category=<id>`) rather than inventing a new page — this is the default unless a dedicated profile page already exists.
- When a detail view is a **Drawer**, not a routed page (e.g. quick person/account detail), don't force it into a route just to make the name clickable — make the name itself trigger the same `onView`-style callback the existing action icon uses, styled like `EntityLink` (hover: `primary.main` + underline) for the same visual affordance.
- For **cross-page** deep links into a drawer-based detail (e.g. linking to a person from a different page's row), add a small `use<Entity>DeepLink` hook that reads a dedicated query param (e.g. `?person=<id>`) via `useSearchParams`, opens the detail on mount, then strips the param with `router.replace(..., { scroll: false })` — mirrors the existing `?deposit=<accountId>` deep link between Accounts and the Ledger.

## Refactoring & decomposition practices

Lessons from decomposing the Property, Finance, and Money modules into the orchestrator+hooks+components pattern — apply these whenever splitting an oversized page, especially when dispatching multiple agents in parallel:

- **Verify against the file system, not the self-report.** Background/parallel agent runs can silently no-op, get truncated by a session limit mid-task, or leave a page half-migrated (new hooks/components created but the orchestrator never rewritten). After any decomposition batch, check `git status`/`find`/`wc -l` yourself, and diff line counts against the original file to confirm the orchestrator was actually rewritten — don't trust a "done" summary.
- **Lint, don't just typecheck.** Run `eslint` on every touched directory in addition to `tsc --noEmit`. `tsc` won't catch a circular reference between two hooks whose callbacks close over each other before both are declared (works by luck since the callbacks only fire on later events) — `eslint-plugin-react-hooks` rules do.
- **Check for dead state before transcribing 1:1.** Before moving a component's state/JSX into a new hook/component, grep for the actual setter call sites — some state may be declared but never invoked with real data (unreachable), and should be deleted rather than faithfully preserved.
- **Don't thread a value from a sibling hook as a construction-time argument.** If hook A needs data that only exists inside hook B's state, and hook B needs a value hook A produces, that's a circular hook-construction dependency. Pass the value at _call time_ to the specific handler that needs it instead, or compute the derived value in the orchestrator with `useMemo`.
- **When two hooks fetch the same resource**, keep the one that's actually wired to refresh after mutations (e.g. via a `reloadAll`), and delete the other "just get me X once" convenience hook — silently picking the never-refreshing one is an easy mistake during decomposition.
- **Dispatch one background agent per file/directory** when decomposing several oversized pages at once (safe in parallel since each touches a different path), and point each at the closest already-refactored sibling module as a concrete reference — not just a description of the rules.
