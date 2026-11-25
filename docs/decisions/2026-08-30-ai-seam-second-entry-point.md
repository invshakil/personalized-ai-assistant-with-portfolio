# The AI seam's second entry point

**The AI provider seam gained `complete<T>()`, a one-shot call with schema-constrained output, and a failed AI task in a feature page returns nothing instead of an error** (Shakil, 30 Aug 2026).

- **Why:** AI in a feature page is an assist, not a dependency. A failed suggestion must degrade to "no suggestion", never to a failed import.

Commits `efdc0a8`, `128dcef`, `f6d5be4`. This is entry A2 (Phase 0) of the AI integration work stream.

| Change                                                          | Files                                                                      |
| --------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `complete<T>()` on `AiProvider`, through `output_config.format` | `services/ai/types.ts`, `services/ai/adapters/anthropic.ts`                |
| `runAiTask` and `tryAiTask`: resolve, meter, return typed data  | `services/ai/task.ts`                                                      |
| Per-purpose model selection (`getProviderFor`)                  | `services/ai/registry.ts`, `services/ai/config.ts`                         |
| Per-feature spend attribution                                   | `AiUsage.feature`, `services/ai/usage.ts`                                  |
| Saved propose, approve, commit gate                             | `AiProposedAction`, `services/ai/proposedActions.ts`, `/ai/actions/cancel` |
| Model catalog and pricing refreshed to the Claude 5 family      | `services/ai/config.ts`, `services/ai/pricing.ts`                          |

Decisions:

- `tryAiTask` returns `null` rather than throwing, for the reason above.
- `AiUnavailableError` separates "the assistant is unavailable" (not configured, over budget) from "this task failed". Only the first is a cue for the caller to carry on silently.
- Classification and extraction resolve to the provider's fast model. Analysis and chat keep the model the user chose in Settings → AI. High-volume, low-judgement work should not pay for the reasoning model.
- Every `AiUsage` row carries a `feature` tag. Without it, a runaway background job and a heavy chat month look the same against the shared budget.

Verified: `tsc`, eslint, build, 104 of 104 tests. `output_config.format` was confirmed against the live API on SDK 0.102.

Left open by this entry, and still open (see [STATUS.md](../STATUS.md)):

- `listSessionProposedActions` was written but is never called, so approval cards are still lost on reload.
- `byFeature` is in the usage payload with no UI panel.

A note raised at the time: this whole work stream, from this entry through the form-defaults review, was committed straight onto `main`, never a feature branch.
