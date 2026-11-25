# AI audit and plan

**AI features will be built into the pages where the work happens, not only into the chat** (Shakil, 30 Aug 2026).

- **Why:** chat is right for open-ended analysis and wrong for four things the app does constantly: classification at volume, extraction from a document, ranking known signals, and turning intent into UI state.

The finding: `grep getActiveProvider` returned two hits, both in `src/app/api/admin/ai/route.ts`. The app had 101 tools, a provider-neutral seam, an approval gate and budget metering, all reachable only by typing prose into `/admin/ai-assistant`.

The result is `docs/AI_FEATURE_INTEGRATION_PLAN.md`.

This is entry A1 of the AI integration work stream.
