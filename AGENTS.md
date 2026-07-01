<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

---

## Component decomposition — mandatory check before writing code

Run this checklist **before** adding any code to a page or component file:

1. **Is the target file already > 300 lines (page) or > 200 lines (hook) or > 100 lines (component)?**
   → Stop. Extract first, then add. Do not grow a file that is already over its limit.

2. **Is what you are about to write logic — state, effects, API calls, derived values?**
   → It belongs in a `hooks/use<Domain>.ts` file next to the page, not in the page itself.

3. **Is what you are about to write UI that only needs props to render?**
   → It belongs in a `components/<Name>.tsx` file next to the page.

4. **Are you about to import a Redux selector or call `fetch` inside a `components/` file?**
   → Wrong layer. Pass data as props from the orchestrator instead.

5. **Are you about to create a feature-specific hook in `src/hooks/` or a feature-specific component in `src/components/admin/`?**
   → Wrong location. Co-locate it next to the feature page in `<feature>/hooks/` or `<feature>/components/`.

6. **Are you about to call `dispatch(...)` in a page file or a `components/` file?**
   → Move that dispatch into a domain hook. Only `hooks/use*.ts` files dispatch. The orchestrator may call `useAppSelector` (read), but never `dispatch`. Components receive callbacks as props and never touch Redux at all.

7. **Are you about to put server-fetched data (API response, DB rows) into Redux state?**
   → Wrong place. Keep fetched data in hook-local `useState`. Redux holds only transient client state that must survive navigation (e.g. the active chat thread).

**The rule in one sentence:** page files wire hooks to components — they contain neither logic nor markup blocks. Only hooks read and write Redux.

See `CLAUDE.md → Coding standards → Component structure & decomposition` and `→ Redux state management` for thresholds, directory layout, the orchestrator pattern, the dispatch rule, and the canonical reference implementation.
