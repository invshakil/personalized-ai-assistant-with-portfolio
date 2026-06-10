# Property Service Layer

This document describes the backend architecture for the property management module and how to use it from API routes, new features, and AI tool calls.

---

## Architecture Overview

```
HTTP Request
    │
    ▼
Route Handler (src/app/api/admin/property/...)
    │  • Auth check only
    │  • Parse request body / query params
    │  • Input validation (return 400 if missing required fields)
    │  • Call service function
    │  • Return Response.json({ data })
    ▼
Service Function (src/services/property/...)
    │  • Business logic
    │  • All Prisma queries
    │  • Data serialization (Decimal → number, Date → ISO string)
    │  • Throws Error on validation failure or not-found
    ▼
Database (Prisma / PostgreSQL)
```

**Key rule:** Service functions have no HTTP imports. They accept plain typed parameters and return plain JSON-safe objects or throw `Error`. This makes them importable anywhere — API routes, AI chat tool handlers, cron jobs, tests.

---

## File Structure

```
src/services/property/
  _serializers.ts       Shared helpers: toNum() and toIso()
  units.ts              Unit CRUD
  tenants.ts            Tenant lifecycle (create, update, deactivate, move-out, settle)
  payments.ts           Payment queries and updates
  paymentGeneration.ts  Monthly payment generation + rent change application
  transactions.ts       Payment transaction recording and editing
  expenses.ts           Expense CRUD
  addOnServices.ts      Service catalog + tenant service assignments
  rentChanges.ts        Scheduled rent change management
  dashboard.ts          Aggregated dashboard statistics
  index.ts              Barrel export — import everything from here
```

---

## Available Service Functions

### Units (`import { ... } from "@/services/property"`)

| Function | Parameters | Returns |
|----------|-----------|---------|
| `getUnits()` | — | `UnitWithTenant[]` |
| `getUnit(id)` | `id: string` | unit with full tenant history, or `null` |
| `createUnit(input)` | `CreateUnitInput` | created unit |
| `updateUnit(id, input)` | `UpdateUnitInput` | updated unit |
| `deleteUnit(id)` | `id: string` | `{ deleted: true }` or throws |

### Tenants

| Function | Parameters | Returns |
|----------|-----------|---------|
| `getTenants(filter?)` | `"active" \| "inactive" \| "external" \| "all" \| "future"` | tenant list |
| `getTenant(id)` | `id: string` | full tenant with payments/services/rent changes, or `null` |
| `createTenant(input)` | `CreateTenantInput` | created tenant; auto-sets CURRENT or FUTURE status |
| `updateTenant(id, input)` | `UpdateTenantInput` | updated tenant |
| `deactivateTenant(id)` | `id: string` | `{ deactivated, promoted }` |
| `activateTenant(id)` | `id: string` | `{ ok: true }` |
| `getMoveOutPreview(id, moveOutDate)` | tenant id + ISO date string | settlement preview (advance vs outstanding) |
| `settleMoveOut(id, moveOutDate, settlements)` | `Settlement[]` | `{ success, remainingAdvanceRefundable }` |
| `autoDeactivateExpired()` | — | `{ deactivated, promoted }` |

### Payments

| Function | Parameters | Returns |
|----------|-----------|---------|
| `getPayments({ month?, year?, tenantId? })` | optional filters | payment list with transactions |
| `getPayment(id)` | `id: string` | single payment with transactions, or `null` |
| `updatePayment(id, input)` | `UpdatePaymentInput` | updated payment |
| `deletePayment(id)` | `id: string` | `{ deleted: true }` |

### Payment Generation

| Function | Parameters | Returns |
|----------|-----------|---------|
| `generatePayments(month, year)` | `month: number, year: number` | `{ created, updated, skipped, rentChangesApplied, tenantsPromoted, message }` |

**Side effects:** applies pending rent changes, promotes FUTURE tenants whose moveInDate ≤ end of month, cleans up stale payments.

### Transactions

| Function | Parameters | Returns |
|----------|-----------|---------|
| `getTransactions(paymentId)` | `paymentId: string` | transaction list |
| `addTransaction(input)` | `AddTransactionInput` | created transaction; updates payment status + tenant advance balance |
| `updateTransaction(txId, input)` | `UpdateTransactionInput` | updated transaction; recalculates payment status |
| `deleteTransaction(txId)` | `txId: string` | `{ deleted: true }` |

### Expenses

| Function | Parameters | Returns |
|----------|-----------|---------|
| `getExpenses({ month?, year? })` | optional filters | expense list |
| `createExpense(input)` | `CreateExpenseInput` | created expense |
| `updateExpense(id, input)` | `UpdateExpenseInput` | updated expense |
| `deleteExpense(id)` | `id: string` | `{ deleted: true }` |

### Add-On Services

| Function | Parameters | Returns |
|----------|-----------|---------|
| `getServices()` | — | service catalog with active assignments |
| `createService(name, description?)` | strings | created service |
| `updateService(id, input)` | `UpdateServiceInput` | updated service |
| `deactivateService(id)` | `id: string` | deactivated service |
| `assignService(input)` | `AssignServiceInput` | tenant-service assignment (upserts) |
| `updateServiceAssignment(id, input)` | `UpdateAssignmentInput` | updated assignment |
| `endServiceAssignment(id)` | `id: string` | ended assignment (isActive=false, endDate=now) |

### Rent Changes

| Function | Parameters | Returns |
|----------|-----------|---------|
| `createRentChange(input)` | `CreateRentChangeInput` | pending rent change |
| `updateRentChange(id, input)` | `UpdateRentChangeInput` | updated change (throws if already applied) |
| `deleteRentChange(id)` | `id: string` | `{ ok: true }` (throws if already applied) |

### Dashboard

| Function | Parameters | Returns |
|----------|-----------|---------|
| `getDashboardStats(month, year)` | `month: number, year: number` | `PropertyDashboardStats` |

---

## Tenant Status Lifecycle

```
Create tenant (unitId provided)
       │
       ├─ Unit has no CURRENT tenant → tenantStatus = CURRENT
       └─ Unit already has CURRENT  → tenantStatus = FUTURE
              │
              │  On deactivateTenant() or autoDeactivateExpired():
              │  FUTURE tenant's moveInDate <= today?
              │      Yes → promote to CURRENT
              │      No  → stay FUTURE, unit becomes vacant
              │
              │  On generatePayments(month, year):
              │  FUTURE tenants with moveInDate <= end-of-month
              └─ → auto-promoted to CURRENT, payment generated
```

### Display rules (API responses)

The service layer normalises status for the UI:

| DB tenantStatus | moveInDate vs today | Response tenantStatus | Unit card slot |
|----------------|--------------------|-----------------------|---------------|
| `CURRENT` | ≤ today | `CURRENT` | currentTenant (Occupied) |
| `CURRENT` | > today | `FUTURE` (overridden) | futureTenant (Vacant) |
| `FUTURE` | any | `FUTURE` | futureTenant |
| `PAST` | any | `PAST` | not shown |

---

## Shared Serializers

```ts
import { toNum, toIso } from "@/services/property/_serializers";

toNum(prismaDecimalOrNumber)  // → number (handles Prisma Decimal objects)
toIso(dateOrNull)             // → ISO string or null
```

Always use these instead of `.toNumber()` or `.toISOString()` directly — they handle both Prisma Decimal objects and plain numbers, and are null-safe.

---

## Using Services in AI Tool Calls

Each service function maps directly to an Anthropic tool definition. Example for the AI chat route at `src/app/api/admin/ai/route.ts`:

```ts
import {
  getUnits, getTenants, getPayments, getDashboardStats, generatePayments
} from "@/services/property";

const TOOLS: Anthropic.Tool[] = [
  {
    name: "get_units",
    description: "List all property units with current and future tenant information.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_tenants",
    description: "List tenants. Filter: active (current), inactive (past), future (scheduled), external, all.",
    input_schema: {
      type: "object",
      properties: {
        filter: { type: "string", enum: ["active", "inactive", "future", "external", "all"] },
      },
    },
  },
  {
    name: "get_payments",
    description: "List monthly payments, optionally filtered by month, year, or tenant.",
    input_schema: {
      type: "object",
      properties: {
        month: { type: "number" },
        year: { type: "number" },
        tenantId: { type: "string" },
      },
    },
  },
  {
    name: "get_dashboard_stats",
    description: "Get aggregated property dashboard stats for a given month and year.",
    input_schema: {
      type: "object",
      required: ["month", "year"],
      properties: {
        month: { type: "number" },
        year: { type: "number" },
      },
    },
  },
  {
    name: "generate_payments",
    description: "Generate monthly payment records for all current tenants. Applies pending rent changes and promotes scheduled tenants.",
    input_schema: {
      type: "object",
      required: ["month", "year"],
      properties: {
        month: { type: "number" },
        year: { type: "number" },
      },
    },
  },
];

// Tool call dispatcher
async function executeTool(name: string, input: Record<string, unknown>) {
  switch (name) {
    case "get_units":       return getUnits();
    case "get_tenants":     return getTenants((input.filter as string) ?? "active");
    case "get_payments":    return getPayments(input as { month?: number; year?: number; tenantId?: string });
    case "get_dashboard_stats": return getDashboardStats(input.month as number, input.year as number);
    case "generate_payments":   return generatePayments(input.month as number, input.year as number);
    default: throw new Error(`Unknown tool: ${name}`);
  }
}
```

The AI chat handler calls `executeTool()` when Claude returns a `tool_use` block, then feeds the result back as `tool_result` in the next message.

---

## Adding a New Service Function

1. Write the function in the appropriate `src/services/property/*.ts` file — no HTTP imports.
2. Export it from `index.ts` (barrel already re-exports everything with `export *`).
3. Create or update the route handler to call it.
4. If it should be available to AI chat: add a tool definition and a case in `executeTool()`.

---

## Error Handling Convention

Service functions throw `Error` for expected failures:

```ts
throw new Error("Not found")           // → route returns 404
throw new Error("Cannot delete ...")   // → route returns 400
throw new Error("Advance exceeded ...") // → route returns 400
```

Route handlers wrap calls in `try/catch` and map thrown errors to HTTP responses:

```ts
try {
  const data = await someService(id, input);
  return Response.json({ data });
} catch (err) {
  return Response.json({ error: (err as Error).message }, { status: 400 });
}
```

For `null` returns (not-found pattern on GET), the route checks explicitly:

```ts
const data = await getUnit(id);
if (!data) return Response.json({ error: "Not found" }, { status: 404 });
```
