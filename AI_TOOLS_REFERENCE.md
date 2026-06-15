# AI Tool Functions Reference — sshakil admin

> **Purpose:** a self-contained catalog of the app's server-side **service functions** that are
> ready to be exposed as Claude **tools** (tool use). Paste this whole file into a Claude chat (or
> attach it) and say _"these are my available functions — help me wire them as tools"_ to learn /
> build AI tool integration against this codebase.

---

## 1. The architecture (read this first)

Every domain has a **service layer** under `src/services/<domain>/` — plain async TypeScript
functions that hold all business logic + Prisma database access and return **JSON-safe** data.

```
API route handler  ─┐
                     ├──►  src/services/<domain>/*   ──►  Prisma  ──►  PostgreSQL
AI tool handler     ─┘     (the single source of truth)
```

- The HTTP API routes (`src/app/api/admin/**`) are thin wrappers that call these functions.
- **AI tools call the exact same functions** — no duplication. To add a tool, you define an
  Anthropic tool schema and, when Claude calls it, invoke the matching service function.
- Import them from the domain barrels: `@/services/finance`, `@/services/property`, `@/services/admin`.
- Conventions: money is **BDT**; the financial fiscal year runs **July→June** (string `"2023-2024"`);
  `Decimal`/`Date` are already serialized to `number`/ISO-string by the services.

---

## 2. The pattern — turning a service function into a Claude tool

The chat endpoint already uses the Anthropic SDK (`src/app/api/admin/ai/route.ts`). A tool is:

1. a **schema** (name + description + JSON-Schema `input_schema` mirroring the function's params), and
2. a **handler** that runs the service function and returns its result as a `tool_result`.

```ts
import Anthropic from "@anthropic-ai/sdk";
import { getFinanceDashboard, getEmployeePayments } from "@/services/finance";

// 1) Declare the tools Claude is allowed to call
const tools: Anthropic.Tool[] = [
  {
    name: "get_finance_summary",
    description:
      "Business profit-and-loss summary. Returns income, employee costs, tool/subscription costs, " +
      "net profit and margin per fiscal year, plus per-client and per-employee breakdowns. " +
      "Optionally restrict to a date range (ISO yyyy-mm-dd).",
    input_schema: {
      type: "object",
      properties: {
        from: { type: "string", description: "Start date ISO yyyy-mm-dd (optional)" },
        to: { type: "string", description: "End date ISO yyyy-mm-dd (optional)" },
      },
    },
  },
  {
    name: "list_salary_payments",
    description:
      "List salary/bonus payments to employees, optionally filtered by fiscal year or employee id.",
    input_schema: {
      type: "object",
      properties: {
        fiscalYear: { type: "string", description: 'e.g. "2025-2026" (optional)' },
        employeeId: { type: "string", description: "Employee id (optional)" },
      },
    },
  },
];

// 2) Map tool name -> service function
const toolHandlers: Record<string, (input: any) => Promise<unknown>> = {
  get_finance_summary: (input) => getFinanceDashboard({ from: input.from, to: input.to }),
  list_salary_payments: (input) => getEmployeePayments(input),
};

// 3) The tool-use loop
const MAX_ROUNDS = 6; // cap so a misbehaving model can't loop forever

async function run(userMessage: string) {
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: userMessage }];
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const res = await client.messages.create({
      model: "claude-sonnet-4-6", // current model (claude-sonnet-4-20250514 is retired)
      max_tokens: 1024,
      tools,
      messages,
    });
    messages.push({ role: "assistant", content: res.content });

    if (res.stop_reason !== "tool_use") return res; // final answer

    // Run every tool Claude asked for CONCURRENTLY, feed results back.
    // Each call is isolated: a thrown error becomes an is_error result so one
    // bad tool can't break the round — Claude sees the error and answers around it.
    const toolUses = res.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
      toolUses.map(async (block): Promise<Anthropic.ToolResultBlockParam> => {
        try {
          const data = await toolHandlers[block.name](block.input);
          return { type: "tool_result", tool_use_id: block.id, content: JSON.stringify(data) };
        } catch (err) {
          return {
            type: "tool_result",
            tool_use_id: block.id,
            content: err instanceof Error ? err.message : "Tool execution failed.",
            is_error: true,
          };
        }
      })
    );
    messages.push({ role: "user", content: toolResults });
  }

  throw new Error(`AI tool loop exceeded ${MAX_ROUNDS} rounds`);
}
```

That's the whole pattern: **declare → handle → loop**. Everything below is the menu of functions you
can plug into `tools` + `toolHandlers`.

---

## 3. Read functions (the prime tool candidates)

These are safe, read-only, and answer "what / how much / who" questions. Suggested tool names shown.

### Financial Tracker — `@/services/finance`

| Suggested tool            | Function                      | Params                         | Returns                                                                                                                                        |
| ------------------------- | ----------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `get_finance_summary`     | `getFinanceDashboard(range?)` | `{ from?, to? }` ISO dates     | P&L per fiscal year (income, empCosts, toolSubs, netProfit, margin), totals, `byEmployee[]`, `bySource[]`, remittance split, `monthlyIncome[]` |
| `list_earnings`           | `getEarnings(opts?)`          | `{ fiscalYear?, sourceId? }`   | Earnings rows: date, client, REM/NON_REM, amount, fiscalYear                                                                                   |
| `list_salary_payments`    | `getEmployeePayments(opts?)`  | `{ fiscalYear?, employeeId? }` | Salary rows: date, employee, type, clients[], amount, note                                                                                     |
| `list_business_expenses`  | `getBizExpenses(opts?)`       | `{ fiscalYear?, categoryId? }` | Expense rows: date, name, category, recurring, amount                                                                                          |
| `list_subscriptions`      | `getSubscriptions()`          | —                              | Recurring subscriptions: monthly amount, start/end, active, totalSpent, monthsCharged                                                          |
| `get_subscription`        | `getSubscriptionDetail(id)`   | `id`                           | One subscription + per-month charge history                                                                                                    |
| `list_employees`          | `getEmployees()`              | —                              | Employees + phone, paymentCount, totalPaid                                                                                                     |
| `list_clients`            | `getIncomeSources()`          | —                              | Clients/income sources + earning counts                                                                                                        |
| `list_expense_categories` | `getExpenseCategories()`      | —                              | Categories + expense counts                                                                                                                    |

### Property Management — `@/services/property`

| Suggested tool           | Function                         | Params                            | Returns                                                                           |
| ------------------------ | -------------------------------- | --------------------------------- | --------------------------------------------------------------------------------- |
| `get_property_dashboard` | `getDashboardStats(month, year)` | `month` (1–12), `year`            | Expected vs collected, expenses, net profit, occupancy, due tracker, yearly trend |
| `list_units`             | `getUnits()`                     | —                                 | All units + current/future tenant, rent, occupancy                                |
| `get_unit`               | `getUnit(id)`                    | `id`                              | One unit + tenants + payment history                                              |
| `list_tenants`           | `getTenants(filter?)`            | `"active" \| "inactive" \| "all"` | Tenants + unit, rent, advance balance, status                                     |
| `get_tenant`             | `getTenant(id)`                  | `id`                              | Tenant profile: services, rent changes, payment history, advance                  |
| `list_rent_payments`     | `getPayments(opts?)`             | `{ month?, year?, tenantId? }`    | Rent payments: tenant, unit, due, paid, balance, status, receipt no.              |
| `get_rent_payment`       | `getPayment(id)`                 | `id`                              | One payment + transactions                                                        |
| `list_property_expenses` | `getExpenses(opts?)`             | `{ month?, year?, payeeId? }`     | Property expenses by category/payee                                               |
| `list_payees`            | `getPayees()`                    | —                                 | Vendors/staff paid for property work                                              |
| `get_payee`              | `getPayee(id)`                   | `id`                              | One payee                                                                         |
| `list_service_types`     | `getServiceTypes()`              | —                                 | Property service-type catalog                                                     |
| `list_addon_services`    | `getServices()`                  | —                                 | Add-on services (WiFi, parking…)                                                  |
| `get_move_out_preview`   | `getMoveOutPreview(id, date)`    | `id`, ISO `date`                  | Settlement preview for a tenant move-out                                          |
| `get_property_settings`  | `getPropertySettings()`          | —                                 | Property/owner profile singleton                                                  |

### Reports — range-aware aggregations (`@/services/finance`, `@/services/property`)

These are pre-aggregated **report** functions added for chat (distinct from the row-level lists
above). Financial reports accept a **flexible date range** resolved server-side
(`src/services/_shared/dateRange.ts`): a relative `period` token — `this_month`, `last_3_months`,
`last_6_months`, `last_12_months`, `this_year`, `last_year`, `this_fiscal_year`, `last_fiscal_year`,
`all` — **or** explicit `from`/`to` ISO dates (which override the token). The model passes the token;
the server computes the dates against "today" (the model is told today's date in the chat system
prompt). Snapshot reports take no range.

| Suggested tool                   | Function                                             | Params                | Answers                                                             |
| -------------------------------- | ---------------------------------------------------- | --------------------- | ------------------------------------------------------------------- |
| `get_monthly_pnl`                | `getMonthlyPnl(range?)`                              | range                 | Month-by-month business income / costs / net profit                 |
| `get_client_profitability`       | `getClientProfitability(range?)`                     | range                 | Income minus attributed salaries, per client, with margin           |
| `get_employee_cost_report`       | `getEmployeeCostReport(range?)`                      | range                 | Per-employee comp split by salary/bonus/advance + % of payroll      |
| `get_expense_breakdown`          | `getExpenseBreakdown(range?)`                        | range                 | Business expenses by category, recurring vs one-off, top items      |
| `get_subscription_spend`         | `getSubscriptionSpendReport()`                       | —                     | Active subscription run-rate (monthly/annualized), by category      |
| `get_remittance_report`          | `getRemittanceReport(range?)`                        | range                 | REM vs NON_REM totals, %, monthly trend, top clients                |
| `get_fiscal_year_comparison`     | `getFiscalYearComparison()`                          | —                     | Income/profit/margin per FY with YoY growth %                       |
| `get_property_financials`        | `getPropertyFinancials(range?)`                      | range                 | Multi-month expected vs collected, expenses, net, monthly trend     |
| `get_property_expense_breakdown` | `getPropertyExpenseBreakdown(range?)`                | range                 | Property expenses by category + top items                           |
| `get_payee_spend_report`         | `getPayeeSpendReport(range?)`                        | range                 | Spend per payee (vendor/caretaker)                                  |
| `get_collection_by_method`       | `getCollectionByMethod(range?)`                      | range                 | Rent collected by method (cash/bank/advance)                        |
| `get_service_revenue`            | `getServiceRevenueReport()`                          | —                     | Add-on service revenue (WiFi, parking) per service                  |
| `get_rent_roll`                  | `getRentRoll()`                                      | —                     | Current rent roll: unit, tenant, base rent, services, total billing |
| `get_arrears_report`             | `getArrearsReport()`                                 | —                     | Who owes, total outstanding, months behind, oldest unpaid           |
| `get_advance_liability`          | `getAdvanceLiabilityReport()`                        | —                     | Total tenant advance held, per tenant                               |
| `get_occupancy_report`           | `getOccupancyReport()`                               | —                     | Occupancy %, vacant units                                           |
| `get_lease_expiry_report`        | `getLeaseExpiryReport({withinDays?})`                | `withinDays` (def 90) | Leases ending / move-outs scheduled soon                            |
| `get_scheduled_rent_changes`     | `getScheduledRentChanges()`                          | —                     | Pending (not-yet-applied) rent increases                            |
| `get_tenant_statement`           | `getTenantStatement(id, range?)`                     | `tenantId`, range     | Per-tenant month-by-month due/paid + running balance                |
| `get_combined_income_summary`    | `getMonthlyPnl` + `getPropertyFinancials` (composed) | range                 | Business + property income/net over one range (overall view)        |

> `range` = `{ period?, from?, to? }`. All return small, pre-aggregated, JSON-safe summaries (totals +
> short/top-N arrays), so a report never dumps every row into the context window.

`get_combined_income_summary` has no service function of its own — it composes the two domains in the
tool handler (`src/services/ai/tools.ts`), summing the monthly P&L for the business side so both sides
honour the same resolved range:

```ts
get_combined_income_summary: async (i) => {
  const [fin, prop] = await Promise.all([getMonthlyPnl(range(i)), getPropertyFinancials(range(i))]);
  const businessIncome = fin.months.reduce((s, m) => s + m.income, 0);
  const businessNet = fin.months.reduce((s, m) => s + m.netProfit, 0);
  return {
    range: prop.range,
    business: { income: businessIncome, netProfit: businessNet },
    property: { collected: prop.collected, netProfit: prop.netProfit },
    combinedIncome: businessIncome + prop.collected,
    combinedNetProfit: businessNet + prop.netProfit,
  };
},
```

(`range(i)` is the shared `{ period?, from?, to? }` extractor used by every range-aware tool, so the
business and property figures cover the identical window despite their different native grains —
business by ledger `date`, property by `month`/`year`.)

> **Good "AI question" examples these answer:** "What was my net profit last fiscal year?",
> "How much have I paid Rashidul in total?", "Which tenants are overdue this month?",
> "What's my monthly subscription run-rate?", "List income from MapX this year."

---

## 4. Write / action functions (expose only with a confirmation step)

These mutate data. If you expose them as tools, gate them behind an explicit user confirmation in the
UI (Claude proposes → user approves → you call). Each throws on validation failure (message is safe to show).

**Finance:** `createEarning` · `updateEarning` · `deleteEarning` · `createEmployeePayment` ·
`updateEmployeePayment` · `deleteEmployeePayment` (each accepts `clientIds[]`) · `createBizExpense` ·
`updateBizExpense` · `deleteBizExpense` · `createSubscription` · `updateSubscription` ·
`stopSubscription(id, endDate?)` · `resumeSubscription(id)` · `deleteSubscription` ·
`createEmployee`/`updateEmployee`/`deleteEmployee` (employee has `phone`) ·
`createIncomeSource`/`updateIncomeSource`/`deleteIncomeSource` ·
`createExpenseCategory`/`updateExpenseCategory`/`deleteExpenseCategory` ·
`generateSubscriptionCharges()` (idempotent monthly charge generation).

**Property:** `createUnit`/`updateUnit`/`deleteUnit` · `createTenant`/`updateTenant` ·
`activateTenant`/`deactivateTenant`/`autoDeactivateExpired` · `settleMoveOut(id, date, settlements)` ·
`generatePayments(month, year)` · `updatePayment`/`deletePayment` ·
`addTransaction`/`updateTransaction`/`deleteTransaction` ·
`createExpense`/`updateExpense`/`deleteExpense` · `createPayee`/`updatePayee`/`deactivatePayee` ·
`createServiceType`/`updateServiceType`/`deactivateServiceType` ·
`createService`/`updateService`/`deactivateService`/`assignService`/`updateServiceAssignment`/`endServiceAssignment` ·
`createRentChange`/`updateRentChange`/`deleteRentChange` · document upload/delete helpers.

**Admin:** `updateDisplayName` · `changePassword` · `upsertSiteSettings` ·
`getBusinessProfile`/`updateBusinessProfile` (PDF letterhead identity).

---

## 5. Tips for learning tool integration with this codebase

- **Start read-only.** Wire 2–3 read tools (`get_finance_summary`, `list_rent_payments`,
  `list_tenants`) and ask the assistant business questions. No risk.
- **Descriptions matter more than names.** Claude picks tools from the `description` — be explicit
  about _when_ to use each and what each param means.
- **Keep results small (token cost).** Every tool result is fed back into the model, so a single
  turn that chains several tools (e.g. "give me a full financial overview" → `get_finance_summary` +
  `get_monthly_pnl` + `get_client_profitability` + `get_employee_cost_report`) stacks up payloads.
  **Aim to keep each report under ~2 KB of JSON.** The report functions in §3 are already
  pre-aggregated and top-N capped for this reason — prefer them over the row-level lists. If a
  function ever returns more than that, add a `limit` / `top_n` param and summarise in the service
  before returning, rather than handing Claude the full set.
- **Payload-sensitive tools — validate size before relying on them.** A few tools return
  **unbounded** rows and can grow with the dataset; treat them as "expose after checking payload
  size," and lean on the aggregated reports instead for analytical questions:
  - `list_earnings`, `list_salary_payments`, `list_business_expenses`, `list_rent_payments`,
    `list_property_expenses` — return **every** matching row (no cap). Fine with a tight filter
    (one fiscal year / one month), risky unfiltered. Consider adding a `limit`.
  - `get_tenant_statement` — one line per month; bounded by the range, but a wide `period` (or
    `all`) on a long-tenured tenant can get large. Default range is `last_12_months`; keep it scoped.
  - `get_finance_summary` (`getFinanceDashboard`) — grows with #employees × #fiscal-years (the
    per-employee matrix) and the monthly-income series; moderate today, watch it as data grows.
- **Validate at the route, business rules in the service.** Tool inputs are model-generated — treat
  them like untrusted input; the services already enforce the real rules and throw clear errors.
- **Multi-step:** the loop above lets Claude chain tools (e.g. `list_tenants` → `get_tenant`) before
  answering. Keep `max_tokens` modest and cap the loop iterations in production.
- **Implemented in this repo (2026-06-14).** The pattern above now lives in `src/services/ai/`:
  the vendor-neutral catalog + handler map is `tools.ts` (`AI_TOOLS` + `runAiTool`), and the
  declare→handle→loop is inside the provider adapter (`adapters/anthropic.ts`, **streaming**). That
  adapter already applies the production hardening shown in §2: the loop is **capped**
  (`MAX_ITERATIONS = 6`), tool calls in a round run **concurrently** via `Promise.all`, and each is
  isolated in a `try/catch` that returns an `is_error` `tool_result` so one failing tool can't break
  the turn. The chat route (`src/app/api/admin/ai/route.ts`) resolves the active provider via
  `getActiveProvider()` and streams text deltas. The read tools wired today are listed in
  PROJECT_PLANNING → AI Assistant. Write/action tools (§4) remain unexposed — gate them behind a
  confirmation step before adding.

---

## 6. The system prompt (`src/app/api/admin/ai/route.ts`)

The system prompt is what makes the tools usable — it sets the domain, the money/fiscal-year
conventions, and (critically) **injects today's date** so the model can map a user's "last 3 months"
or "this fiscal year" to the right `period` token. Without the date line, relative ranges resolve
against the model's training cutoff and silently produce wrong windows. The exact prompt sent today:

```ts
// src/app/api/admin/ai/route.ts
const SYSTEM_PROMPT =
  "You are a personal assistant for Syful Islam Shakil — a Tech Lead and Full-Stack Engineer " +
  "based in Comilla, Bangladesh. You have access to his admin dashboard through tools covering two " +
  "domains: the Financial Tracker (business income, employee salaries, expenses, subscriptions) and " +
  "Property Management (rental units, tenants, rent payments, expenses). Use the tools to answer " +
  "questions with real data rather than guessing. Money is in BDT (৳); the business fiscal year " +
  'runs July→June, written like "2025-2026". Be concise, helpful, and professional. When a tool ' +
  "returns no data or the information isn't available, say so clearly instead of making something up.";

// Per request — appended so the model can resolve relative periods (the report tools resolve them
// server-side too, but this guides tool choice):
const system = `${SYSTEM_PROMPT} Today's date is ${new Date().toISOString().slice(0, 10)}.`;
```

Why each part is load-bearing:

| Line                                                                               | Why it matters                                                                                                                                                          |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain summary (two domains + what each holds)                                     | Helps the model pick the right tool family from 30+ tools.                                                                                                              |
| "Use the tools … rather than guessing" + "say so … instead of making something up" | The anti-hallucination guardrail — figures must come from tool results, not the model.                                                                                  |
| `Money is in BDT (৳)`                                                              | Stops the model from assuming USD or converting.                                                                                                                        |
| `fiscal year runs July→June, written like "2025-2026"`                             | So `fiscalYear` params and the `this_fiscal_year` token line up with the data (see `src/lib/fiscalYear.ts`).                                                            |
| **`Today's date is YYYY-MM-DD`** (per-request)                                     | The reason `this_fiscal_year` / `last_3_months` resolve correctly — the model knows "now" and the server resolver (`services/_shared/dateRange.ts`) does the date math. |

Note: appending the date makes the prompt change every request, which would defeat prompt caching if
you add it later — keep the date at the **end** (after the stable prefix) so only the tail varies.

---

## 7. Cost tracking & monthly budget (USD)

The assistant meters its own spend and can hard-stop when a monthly budget is reached. **All AI money
is USD** — the unit Anthropic prices tokens in — kept separate from the BDT business/property ledgers.

**How a turn's cost is captured:**

1. The Anthropic adapter accumulates `usage` across every API call in the tool-loop (`input_tokens`,
   `output_tokens`, `cache_read_input_tokens`, `cache_creation_input_tokens`) and emits a single
   `{ type: "usage", usage }` stream event at the end of the turn.
2. The chat route reads that event and calls `recordUsage()` whenever tokens were billed (independent
   of whether the conversation was saved), writing one `AiUsage` row.
3. Cost = `costUsd(model, usage)` from `src/services/ai/pricing.ts` — per-model \$/MTok rates
   (`claude-opus-4-8` 5/25, `claude-sonnet-4-6` 3/15, `claude-haiku-4-5` 1/5), with cache reads at
   0.1× input and 5-minute cache writes at 1.25× input. Unknown models cost 0 (tokens still recorded).

**Budget & enforcement** (`src/services/ai/usage.ts`, `AiBudget` singleton):

| Function                                                | Purpose                                                                                                                                                                                               |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getUsageSummary()`                                     | Dashboard/settings payload: `monthToDate`, `allTime`, `monthlyLimitUsd`, `remaining`, `pctUsed`, `projectedMonthEnd` (run-rate), `overBudget`, and a dense 12-month `monthly[]` series for the chart. |
| `getBudget()` / `setBudget({monthlyLimitUsd, enforce})` | Read/write the monthly cap (null = no limit).                                                                                                                                                         |
| `isOverBudget()`                                        | `enforce && limit !== null && monthToDate >= limit`. **The chat route calls this first and returns `402` before streaming** when true, so no further tokens are spent.                                |

**Surfaces:** Settings → AI has a budget card (limit + enforce + month-to-date bar); the home
dashboard shows spend cards + a monthly-cost bar chart (`getUsageSummary` → `/api/admin/ai/usage`);
the AI Assistant page checks `overBudget` on load, shows a banner, and disables input. Routes:
`/api/admin/ai/usage` (GET), `/api/admin/ai/budget` (GET/PUT).

> Spend resets implicitly each calendar month (month-to-date is computed from the 1st). To change to a
> billing-cycle or rolling window, adjust `monthStart()` in `usage.ts`.
