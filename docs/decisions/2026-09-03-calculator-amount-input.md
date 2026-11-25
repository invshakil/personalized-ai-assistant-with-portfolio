# Calculator amount input

**The Ledger's amount box does arithmetic through a hand-written parser, and the form only ever receives a finished number** (Shakil, 3 Sep 2026).

- **Why:** the owner sometimes needs to add several amounts while entering one. He asked to type a sum such as `200 + 300 + 500` and have the input behave as a calculator.
- **Instead of:** `eval` or `new Function`, and `type="number"`.

This is entry C1. `AmountField` replaced the Ledger drawer's amount box. Type a sum, see the running total under the field, and it settles on the number when you leave the field.

| Piece                        | File                                                  |
| ---------------------------- | ----------------------------------------------------- |
| Grammar and evaluator (pure) | `src/lib/calcExpression.ts`                           |
| The input                    | `src/components/admin/AmountField.tsx`                |
| Wired into the Ledger drawer | `money/entries/components/EntryDrawerBasicFields.tsx` |

Decisions:

- **No `eval`, no `new Function`.** The input is a form field, so it is attacker-controlled by definition. A hand-written tokeniser and recursive-descent parser over digits, `.`, `+`, `-`, `*`, `/` and brackets is the whole language. Anything else is rejected rather than sanitised, so there is no clever input to get past. The rejection tests are the security tests.
- **The parent only ever receives a resolved number.** This is the part that could have gone quietly wrong. `parseFloat("200 + 300")` is `200`, so a component that passed its raw text up would post 200 the moment someone hit Save mid-expression: a plausible wrong figure, silently. Mid-expression the field emits `""` instead, which fails loudly on save. An unfinished sum is not an amount.
- **`type="number"` had to go.** It rejects `+` and spaces outright. The field is `type="text"` with its own grammar, which also means no browser spinners on a money field.
- **Results round to 2 decimals,** because these are money amounts: `0.1 + 0.2` is `0.3`.
- **The hint under the field is permanent.** It is the only cue that the box does arithmetic, and keeping it there holds the row height steady when the running total replaces it.
- **Errors wait for blur.** "200 +" is a normal thing to have typed a moment ago. Flagging it while the cursor is still in the field would be noise. On blur, an unparseable value keeps its text so it can be corrected rather than retyped.

Verified: 10 unit tests on the evaluator, covering precedence, brackets, unary minus, float noise, division by zero, and a rejection block covering `alert(1)`, `require('fs')`, `2 ** 8`, `1e3`, `0x10`, `__proto__` and `1; 2`. Plus a keystroke trace of `200 + 300 + 500` asserting that every value the parent receives equals the true sum of what has been typed so far, and that no keystroke yields a plausible but wrong number. 135 of 135 tests, `tsc`, eslint with 0 issues, build.

Not wired at this point (offered, not assumed): the Transfer drawer's amount, destination amount and fee, and the Property, Finance and Trips amount boxes.

Since then: `AmountField` became the shared `NumberField` and replaced every number input in the admin. See [Calculator number fields, archivable account types and one account picker](2026-09-23-number-fields-account-types-one-picker.md).
