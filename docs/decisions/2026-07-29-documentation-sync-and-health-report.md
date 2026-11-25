# Documentation sync and health report

**The docs and memory were audited against the codebase after a long feature run, and the gaps were closed without changing any code** (Shakil, 29 Jul 2026).

The verdict at the time: the app was feature-complete for its scope and in a releasable state, with every planned module except Renovation built. The one real problem was documentation drift, not code.

Gaps found and closed:

1. **The Booking module was entirely undocumented.** It shipped on 23 Jun. A module section, 3 schema rows (`BookingSettings`, `BookingBlackout`, `Booking`), folder-tree and README entries, and a memory file were added.
2. **The Trip memory still described v1**, "a trip is a tag over the money ledger". It was rewritten to the shipped v2 group model.
3. **`AI_TOOLS_REFERENCE.md` was missing the Money and Trip read tools** and reported 66 tools when there were 98 (48 read and 50 write). Both tool tables were added, and the footprint and per-scope counts were corrected: `/property` 40, `/finance` 33, `/money` 19, `/solar` 9. The stale `writeTools.ts` path became `writeTools/`.
4. **Two environment variables were undocumented:** `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`. They were added to `.env.example` and the environment table, with a note that one Google OAuth client is shared by Drive backups and the Booking calendar (two APIs, two redirect URIs).
5. **Stale planning scaffolding:** the header date, the folder tree (missing the money, trips, booking, solar and solis services, `store/`, `hooks/` and per-module types), a "what to build next" list that still listed Property and Finance, and a progress log missing every July feature.
6. **The memory index** never listed the Trip memory and described the AI seam as read-only tool use. Write tools behind an approval gate had existed since 18 Jun.

A new `docs/PROJECT_STATUS_REPORT.md` recorded the gap analysis and the open items.

The codebase at that date: 58 Prisma models, 21 enums, 25 migrations, 10 service domains, 127 API route handlers, 10 admin feature folders, 98 AI tools, 5 service test suites. The warning threshold for tools in one scope is 80.

Open items recorded then, and what became of them:

- Renovation Tracker: still not built.
- Booking admin pages not decomposed: still open.
- Trip audit finding 8: still open.
- `SERVICE_LAYER.md` covers Property only: still open.
- Deploy to DigitalOcean: done since.
- OpenAI and Gemini adapters, persisted write-action cards, tool retrieval: see [STATUS.md](../STATUS.md).

Since then: `PROJECT_PLANNING.md` and `PROJECT_STATUS_REPORT.md` were replaced by `docs/ARCHITECTURE.md`, `docs/STATUS.md` and this folder.
