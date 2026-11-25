# Heavy work runs at low priority, one at a time (#19)

**Builds, test runs and servers go through `heavy-run`, which shares one lock with CT Admin so the two projects take turns. Agents use port 3100; port 3000 is Shakil's. `cleanup:local` runs before each report, which ends with "Local cleanup: done"** (Shakil, 25 Nov 2026).

- **Why:** both projects run on Shakil's Mac at once and reach 100% CPU when their builds overlap.
- Until the tooling PR ports `heavy-run` and `cleanup:local` from CT Admin, heavy steps run with `nice -n 10`.
- Test files run one at a time: they share the local database, and in parallel two property tests failed intermittently (#18).
