---
description: Operate the Money Manager — add expenses/income, transfers, payments to people, and read balances/savings
argument-hint: e.g. "spent 1200 on groceries from cash" or "savings last 3 months"
allowed-tools: Bash(npx tsx scripts/money.ts:*)
---

You are operating the **Money Manager** (personal finance) module for this project. Interpret the user's natural-language request below and run the matching `scripts/money.ts` CLI subcommand. All business logic lives in `src/services/money` — the CLI is the only thing you invoke; never touch the DB directly.

## Request

$ARGUMENTS

## How to act

1. Map the request to ONE subcommand (run with `npx tsx scripts/money.ts <cmd> …`):

   | Intent                                              | Command                                                                                     |
   | --------------------------------------------------- | ------------------------------------------------------------------------------------------- |
   | Log a spend / expense                               | `add-expense --amount N --category NAME [--account NAME] [--date YYYY-MM-DD] [--desc TEXT]` |
   | Log income received                                 | `add-income --amount N --category NAME [--account NAME] [--date] [--desc]`                  |
   | Move money between accounts (withdrawal, card bill) | `transfer --from NAME --to NAME --amount N [--date]`                                        |
   | Pay or receive from a person                        | `pay-person --person NAME --amount N [--account NAME] [--direction out\|in] [--date]`       |
   | "How much do I have / balances"                     | `balances`                                                                                  |
   | "How much did I save / spend"                       | `savings [--period this_month\|last_3_months\|last_6_months\|last_12_months\|all]`          |
   | "Who do I owe / owes me"                            | `owed`                                                                                      |

2. Parse amounts as plain numbers (strip ৳ and commas). Default the date to today if unspecified.
3. Category and account are matched by name. For expenses/income, the category is created on the fly if it doesn't exist; **account names must already exist** — if the CLI reports the account isn't found, show the user the available names it listed and ask which to use.
4. For `pay-person`, the person must already exist in **People & Loans**; if not found, tell the user to add them first.
5. If the request is ambiguous (missing amount, or unclear whether income vs expense), ask a brief clarifying question instead of guessing.
6. After running, report the CLI's confirmation back to the user in one line. For read commands, summarize the numbers clearly (BDT).

Run the command now.
