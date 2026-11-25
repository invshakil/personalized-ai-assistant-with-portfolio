# Solar reports decomposition

**`SolarReportsPage.tsx` was split from 847 lines into a 108-line orchestrator with 3 hooks and 14 components** (Shakil, 1 Sep 2026).

Commit `5db9522`. Every file is inside its size limit. This is entry A6 of the AI integration work stream.

Decisions:

- `useSolarData` takes its bounds as two primitives, not the object holding them. An object identity in a dependency list refetches on every render.
- `yearOptions` stays in the orchestrator. It needs the install date that only the report carries, and putting it in `useSolarRange` would make the range hook depend on the data hook that depends on it.
- `MetricBlock` replaced twelve copy-pasted caption-over-figure blocks. `WeatherNotice` replaced two near-identical dashed panels.

Verified: both extracted pure functions were checked against the original implementations using six real months from the database. All 11 fields were identical, and `rangeBounds` was identical across 6 presets.

Not verified: the page was never checked in a browser, because no browser tool was available and the page is behind login. This is still open: see [STATUS.md](../STATUS.md).
