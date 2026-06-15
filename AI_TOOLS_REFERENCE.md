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
async function run(userMessage: string) {
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: userMessage }];
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  while (true) {
    const res = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      tools,
      messages,
    });
    messages.push({ role: "assistant", content: res.content });

    if (res.stop_reason !== "tool_use") return res; // final answer

    // Run every tool Claude asked for, feed results back
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of res.content) {
      if (block.type !== "tool_use") continue;
      const data = await toolHandlers[block.name](block.input);
      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: JSON.stringify(data),
      });
    }
    messages.push({ role: "user", content: toolResults });
  }
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
- **Keep results small.** For big lists, prefer a filtered/summarized function (e.g.
  `getFinanceDashboard` over dumping every earning) so you don't blow the context window.
- **Validate at the route, business rules in the service.** Tool inputs are model-generated — treat
  them like untrusted input; the services already enforce the real rules and throw clear errors.
- **Multi-step:** the loop above lets Claude chain tools (e.g. `list_tenants` → `get_tenant`) before
  answering. Keep `max_tokens` modest and cap the loop iterations in production.
- **Implemented in this repo (2026-06-14).** The pattern above now lives in `src/services/ai/`:
  the vendor-neutral catalog + handler map is `tools.ts` (`AI_TOOLS` + `runAiTool`), and the
  declare→handle→loop is inside the provider adapter (`adapters/anthropic.ts`, streaming). The chat
  route (`src/app/api/admin/ai/route.ts`) resolves the active provider via `getActiveProvider()` and
  streams text deltas. The read tools wired today are listed in PROJECT_PLANNING → AI Assistant.
  Write/action tools (§4) remain unexposed — gate them behind a confirmation step before adding.
