# Form defaults: the inert Last-used toggle, and a wiring test

**A test checks that every registered form-default scope is both seeded and remembered by a form** (Shakil, 2 Sep 2026).

- **Why:** a form that seeds and never remembers looks correctly wired from every angle except the one that matters. Nothing could see that the call was missing, and a comment cannot fail a build.

This is entry D6 of the form defaults work stream. It closes the finding the [code review](2026-09-02-form-defaults-review-two-fixes.md) left open.

The bug: `useTransferDrawer` seeded from its defaults but never called `remember`. The Fixed and Last-used toggle that the Settings page renders for From account and To account was a control that could not do anything. The transfer drawer is the only place a transfer's account choice is ever known, and it was throwing that away.

It was harmless in the shipped state: both fields start `fixed`, which ignores `remember` anyway. That is exactly why it survived review of the diff. It only becomes wrong the moment someone uses the toggle.

The real fix is the test, not the call. One line restores the behaviour. The earlier verification of "no registered field is unwired" passed because it checked `seed` and stopped there. `registry.ts` already carried the warning in a comment: an entry there with no wiring shows the user a setting that does nothing.

`lib/formDefaults/__tests__/wiring.test.ts` scans `src/app/(admin)` for `useFormDefaults("…")` call sites. For every registered scope it asserts that a form both seeds from it and reports back to it. It also asserts the reverse: no form reads a scope the registry does not declare (`setFormDefault` would refuse it).

This mattered most for the next phase. Property, Finance and Trips added roughly ten more fields, each one the same two-sided wiring done by hand.

Verified: the wiring test, re-run against the unwired code, fails on exactly the right assertion, "every registered scope reports what was saved", and passes on the fix. 125 of 125 tests (was 120), `tsc`, eslint with 0 issues, build.
