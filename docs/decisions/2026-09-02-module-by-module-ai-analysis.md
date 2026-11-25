# Module-by-module AI analysis

**AI opportunities are sorted by six interaction patterns, not as a feature list: Fill, Find, Flag, Explain, Draft and Ambient** (Shakil, 2 Sep 2026).

- **Why:** the pattern determines the latency budget, the cost profile and how much the output can be trusted. Five of the six never need the chat page.

This is entry A7 of the AI integration work stream.

Three structural findings:

1. **Solar** stores `SolisDailyReading` per day and reports only monthly aggregates. A failing panel string is invisible in a monthly total. This is the largest gap between data and insight in the app.
2. **36 models** carry a `notes`, `description` or `reason` field, and nothing can search them.
3. **Subscription creep** is recorded in `SubscriptionRateChange` and never shown as a cumulative figure.

Roadmap revision:

- The command bar was promoted out of "ambient": it is structural, not a feature.
- Reports gained their own phase.
- Voice moved to the front of Capture, because `useSpeechRecognition` (223 lines) already exists with one consumer.
- A Phase 0b was added for two pieces that were built but left unwired.

The roadmap itself is in `docs/AI_FEATURE_INTEGRATION_PLAN.md`.
