// Vendor-neutral tool catalog for the AI assistant. Read-only only — each
// handler calls the exact same service function the HTTP API uses. Model-
// generated inputs are treated as untrusted; the services enforce the real
// rules and throw user-safe errors.
import {
  getFinanceDashboard,
  getEarnings,
  getEmployeePayments,
  getBizExpenses,
  getSubscriptions,
  getEmployees,
  getIncomeSources,
  getMonthlyPnl,
  getClientProfitability,
  getEmployeeCostReport,
  getExpenseBreakdown,
  getSubscriptionSpendReport,
  getRemittanceReport,
  getFiscalYearComparison,
} from "@/services/finance";
import {
  getDashboardStats,
  getUnits,
  getTenants,
  getPayments,
  getExpenses,
  getPropertyFinancials,
  getPropertyExpenseBreakdown,
  getPayeeSpendReport,
  getCollectionByMethod,
  getServiceRevenueReport,
  getRentRoll,
  getArrearsReport,
  getAdvanceLiabilityReport,
  getOccupancyReport,
  getLeaseExpiryReport,
  getScheduledRentChanges,
  getTenantStatement,
} from "@/services/property";
import {
  getMoneyDashboard,
  getMonthlySavings,
  getExpenseBreakdown as getMoneyExpenseBreakdown,
  getAccountBalances,
  getBeneficiaryBalances,
  getEntries as getMoneyEntries,
  getCategories as getMoneyCategories,
  listAccountsWithBalances,
} from "@/services/money";
import { PERIOD_TOKENS } from "@/services/_shared/dateRange";
import { PaymentKind, ExpenseCategory } from "@prisma/client";
import { writeToolDefs, isWriteTool, previewWrite } from "./writeTools";
import { EXPENSE_CATEGORIES, PAYMENT_KINDS } from "./writeTools/shared";
import type { AiToolDef, RunTool, ToolScope } from "./types";

const obj = (properties: Record<string, unknown>) => ({ type: "object", properties });

const fiscalYear = { type: "string", description: 'Fiscal year, e.g. "2025-2026" (optional)' };

// Shared flexible date-range params. The model passes a relative `period`
// (resolved server-side against today) or explicit from/to dates.
const RANGE = {
  period: {
    type: "string",
    enum: PERIOD_TOKENS,
    description:
      "Relative period (preferred): this_month, last_3_months, last_6_months, last_12_months, " +
      "this_year, last_year, this_fiscal_year, last_fiscal_year, all.",
  },
  from: { type: "string", description: "Explicit start date ISO yyyy-mm-dd (overrides period)" },
  to: { type: "string", description: "Explicit end date ISO yyyy-mm-dd (overrides period)" },
};

// Read tools: execute immediately and return data to the model.
const financeReadTools: AiToolDef[] = [
  // ── Financial Tracker — lists & dashboard ──
  {
    name: "get_finance_summary",
    description:
      "Business profit-and-loss summary in BDT. Income, employee costs, tool/subscription costs, net profit and margin per fiscal year, plus per-employee and per-client breakdowns, remittance split, and monthly income. Optionally restrict to an ISO date range.",
    parameters: obj({
      from: { type: "string", description: "Start date ISO yyyy-mm-dd (optional)" },
      to: { type: "string", description: "End date ISO yyyy-mm-dd (optional)" },
    }),
  },
  {
    name: "list_earnings",
    description:
      "List client income (earnings): date, client, remittance (REM/NON_REM), amount, fiscal year. " +
      "Filter by fiscalYear, income-source id (sourceId), a date range (period or from/to), and search " +
      "notes + the remittance type label with q (e.g. q='remittance').",
    parameters: obj({
      fiscalYear,
      sourceId: { type: "string", description: "Income source / client id (optional)" },
      ...RANGE,
      q: {
        type: "string",
        description: "Case-insensitive search over notes and the remittance type label (optional)",
      },
    }),
  },
  {
    name: "list_salary_payments",
    description:
      "List salary/bonus payments to employees: date, employee, type, attributed clients, amount, note. " +
      "Filter by fiscalYear, employee id, payment type (SALARY/BONUS/ADVANCE/OTHER), attributed client id, " +
      "and a date range (period or from/to).",
    parameters: obj({
      fiscalYear,
      employeeId: { type: "string", description: "Employee id (optional)" },
      type: { type: "string", enum: PAYMENT_KINDS, description: "Payment kind (optional)" },
      clientId: { type: "string", description: "Attributed client / income-source id (optional)" },
      ...RANGE,
    }),
  },
  {
    name: "list_business_expenses",
    description:
      "List one-off and recurring business expenses (tools/subscriptions): date, name, category, recurring flag, amount. " +
      "Filter by fiscalYear, category id, a date range (period or from/to), and search the tool/service name with q.",
    parameters: obj({
      fiscalYear,
      categoryId: { type: "string", description: "Expense category id (optional)" },
      ...RANGE,
      q: {
        type: "string",
        description: "Case-insensitive search over the tool/service name (optional)",
      },
    }),
  },
  {
    name: "list_subscriptions",
    description:
      "List recurring business subscriptions with monthly amount, status, total spent. " +
      "Filter by category id and search the service name with q.",
    parameters: obj({
      categoryId: { type: "string", description: "Subscription category id (optional)" },
      q: {
        type: "string",
        description: "Case-insensitive search over the service name (optional)",
      },
    }),
  },
  {
    name: "list_employees",
    description: "List business employees with phone, payment count, and total paid.",
    parameters: obj({}),
  },
  {
    name: "list_clients",
    description: "List clients / income sources with earning counts.",
    parameters: obj({}),
  },

  // ── Financial Tracker — reports ──
  {
    name: "get_monthly_pnl",
    description:
      "Month-by-month business P&L (income, employee costs, tool costs, net profit) over a date range. Use for trend questions like 'show my monthly profit this year'.",
    parameters: obj({ ...RANGE }),
  },
  {
    name: "get_client_profitability",
    description:
      "Per-client profitability: income minus the employee salaries attributed to each client, with margin. Answers 'which client makes me the most money after costs'.",
    parameters: obj({ ...RANGE }),
  },
  {
    name: "get_employee_cost_report",
    description:
      "Per-employee compensation split by salary/bonus/advance, with each person's share of total payroll, over a date range.",
    parameters: obj({ ...RANGE }),
  },
  {
    name: "get_expense_breakdown",
    description:
      "Business expense breakdown by category, recurring vs one-off totals, and the largest items, over a date range.",
    parameters: obj({ ...RANGE }),
  },
  {
    name: "get_subscription_spend",
    description:
      "Recurring-subscription run-rate: active count, monthly and annualized cost, by category, plus recently-ended subscriptions. Current state (no range).",
    parameters: obj({}),
  },
  {
    name: "get_remittance_report",
    description:
      "Remittance vs non-remittance income: totals, the remittance percentage, the monthly trend, and top clients, over a date range.",
    parameters: obj({ ...RANGE }),
  },
  {
    name: "get_fiscal_year_comparison",
    description:
      "Fiscal-year-over-year comparison: income, net profit, margin, and year-over-year growth percentages for every fiscal year.",
    parameters: obj({}),
  },
];

const propertyReadTools: AiToolDef[] = [
  // ── Property — lists & single-month dashboard ──
  {
    name: "get_property_dashboard",
    description:
      "Rental-property dashboard for a single month: expected vs collected rent, expenses, net profit, occupancy, due tracker, yearly trend. Defaults to the current month.",
    parameters: obj({
      month: { type: "integer", description: "Month 1-12 (optional, defaults to current month)" },
      year: { type: "integer", description: "Year (optional, defaults to current year)" },
    }),
  },
  {
    name: "list_units",
    description: "List all rental units with current/future tenant, rent, occupancy.",
    parameters: obj({}),
  },
  {
    name: "list_tenants",
    description:
      "List tenants with unit, rent, advance balance, status. Filter by coarse filter " +
      "(active/inactive/all, default active), by unit id, by status (CURRENT=active / FUTURE=scheduled), " +
      "and search tenant name or phone with q.",
    parameters: obj({
      filter: {
        type: "string",
        enum: ["active", "inactive", "all"],
        description: "Coarse tenant filter (optional, default active)",
      },
      unitId: { type: "string", description: "Restrict to this unit id (optional)" },
      status: {
        type: "string",
        enum: ["CURRENT", "FUTURE"],
        description: "CURRENT=active, FUTURE=scheduled (optional)",
      },
      q: {
        type: "string",
        description: "Case-insensitive search over tenant name or phone (optional)",
      },
    }),
  },
  {
    name: "list_rent_payments",
    description:
      "List rent payments: tenant, unit, due, paid, balance, status, receipt no. Filter by a single " +
      "month + year, by unit id, by tenant id, or across months with a date range (period or from/to — " +
      "e.g. period='all' for every month of a tenant).",
    parameters: obj({
      month: { type: "integer", description: "Month 1-12 (optional)" },
      year: { type: "integer", description: "Year (optional)" },
      unitId: { type: "string", description: "Unit id (optional)" },
      tenantId: { type: "string", description: "Tenant id (optional)" },
      ...RANGE,
    }),
  },
  {
    name: "list_property_expenses",
    description:
      "List property expenses by category/payee. Filter by month, year, payee id, category, " +
      "service-type id, and search description + notes with q.",
    parameters: obj({
      month: { type: "integer", description: "Month 1-12 (optional)" },
      year: { type: "integer", description: "Year (optional)" },
      payeeId: { type: "string", description: "Payee id (optional)" },
      category: {
        type: "string",
        enum: EXPENSE_CATEGORIES,
        description: "Expense category (optional)",
      },
      serviceTypeId: { type: "string", description: "Service type id (optional)" },
      q: {
        type: "string",
        description: "Case-insensitive search over description and notes (optional)",
      },
    }),
  },

  // ── Property — reports ──
  {
    name: "get_property_financials",
    description:
      "Multi-month rental P&L over a date range: expected vs collected rent, collection rate, expenses, net profit, and a monthly trend. Use for 'how did the property do this year'.",
    parameters: obj({ ...RANGE }),
  },
  {
    name: "get_property_expense_breakdown",
    description: "Property expenses by category with the largest items, over a date range.",
    parameters: obj({ ...RANGE }),
  },
  {
    name: "get_payee_spend_report",
    description: "How much was paid to each payee (vendor/caretaker) over a date range.",
    parameters: obj({ ...RANGE }),
  },
  {
    name: "get_collection_by_method",
    description:
      "Rent collected by payment method (cash / bank transfer / advance applied / …) over a date range.",
    parameters: obj({ ...RANGE }),
  },
  {
    name: "get_service_revenue",
    description:
      "Recurring revenue from add-on services (WiFi, parking…): active tenants and monthly revenue per service.",
    parameters: obj({}),
  },
  {
    name: "get_rent_roll",
    description:
      "Current rent roll: each active tenant's unit, base rent, add-on services, and total monthly billing.",
    parameters: obj({}),
  },
  {
    name: "get_arrears_report",
    description:
      "Cross-month arrears: which tenants owe money, how much in total, how many months behind, and the oldest unpaid month.",
    parameters: obj({}),
  },
  {
    name: "get_advance_liability",
    description: "Total tenant advance currently held, broken down per tenant.",
    parameters: obj({}),
  },
  {
    name: "get_occupancy_report",
    description:
      "Occupancy snapshot: total/occupied/vacant units, occupancy %, and the list of vacant units.",
    parameters: obj({}),
  },
  {
    name: "get_lease_expiry_report",
    description: "Leases ending or move-outs scheduled within N days (default 90).",
    parameters: obj({
      withinDays: { type: "integer", description: "Window in days (optional, default 90)" },
    }),
  },
  {
    name: "get_scheduled_rent_changes",
    description:
      "Pending (not-yet-applied) scheduled rent changes: tenant, unit, effective date, old/new rent.",
    parameters: obj({}),
  },
  {
    name: "get_tenant_statement",
    description:
      "Per-tenant statement over a date range: month-by-month due vs paid with a running balance, advance held, and outstanding total.",
    parameters: obj({
      tenantId: { type: "string", description: "Tenant id (required)" },
      ...RANGE,
    }),
  },
];

const moneyReadTools: AiToolDef[] = [
  // ── Money Manager (personal finance) ──
  {
    name: "get_money_overview",
    description:
      "Personal money overview in BDT over a date range: total income, expenses, savings and savings rate, expense breakdown by category, account balances, cash position, credit-card debt, who you owe / who owes you, and read-only venture income context (Property/Finance take-home). Use for 'how are my personal finances doing'.",
    parameters: obj({ ...RANGE }),
  },
  {
    name: "get_monthly_savings",
    description:
      "Month-by-month personal savings (income − expenses) over a date range. Use for 'how much did I save last month / this year'.",
    parameters: obj({ ...RANGE }),
  },
  {
    name: "get_personal_expense_breakdown",
    description:
      "Personal/household expense breakdown by category with the total, over a date range. Use for 'where is my money going'.",
    parameters: obj({ ...RANGE }),
  },
  {
    name: "get_account_balances",
    description:
      "Current balance of every personal account (cash, bank, mobile wallet, credit card), plus total cash position and total credit-card debt. Answers 'how much money do I have right now'.",
    parameters: obj({}),
  },
  {
    name: "get_people_balances",
    description:
      "People you pay: total you still owe, total owed to you, and per-person outstanding balances and lifetime paid. Answers 'who do I owe money to'.",
    parameters: obj({}),
  },
  {
    name: "list_money_entries",
    description:
      "List personal ledger entries (income, expense, transfer) over a date range. " +
      "Optionally filter by direction (CREDIT=income / DEBIT=expense / TRANSFER), by categoryName " +
      "(e.g. 'Groceries'), by accountName (e.g. 'Cash', 'bKash' — matches entries from or into that account), " +
      "and search descriptions with q. Sort with sortBy (date/amount/category) + sortDir (asc/desc), and limit the count.",
    parameters: obj({
      ...RANGE,
      direction: {
        type: "string",
        enum: ["CREDIT", "DEBIT", "TRANSFER"],
        description: "Filter by entry direction (optional)",
      },
      categoryName: {
        type: "string",
        description: "Filter by category name, case-insensitive (optional)",
      },
      accountName: {
        type: "string",
        description: "Filter by account name, case-insensitive (optional)",
      },
      q: { type: "string", description: "Case-insensitive search over the description (optional)" },
      sortBy: {
        type: "string",
        enum: ["date", "amount", "category"],
        description: "Sort field (default date)",
      },
      sortDir: {
        type: "string",
        enum: ["asc", "desc"],
        description: "Sort direction (default desc)",
      },
      limit: { type: "integer", description: "Max entries to return (optional)" },
    }),
  },
];

const sharedReadTools: AiToolDef[] = [
  // ── Cross-domain ──
  {
    name: "get_combined_income_summary",
    description:
      "Combined overview across both domains over one date range: business income + net profit (Financial Tracker) and rental collected + net profit (Property), with combined totals. Use for 'how am I doing overall'.",
    parameters: obj({ ...RANGE }),
  },
];

// Read tools, tagged by module so scope filtering can include the right subset.
const READ_TOOLS: AiToolDef[] = [
  ...financeReadTools.map((t): AiToolDef => ({ ...t, kind: "read", domain: "finance" })),
  ...propertyReadTools.map((t): AiToolDef => ({ ...t, kind: "read", domain: "property" })),
  ...moneyReadTools.map((t): AiToolDef => ({ ...t, kind: "read", domain: "money" })),
  ...sharedReadTools.map((t): AiToolDef => ({ ...t, kind: "read", domain: "shared" })),
];

// Full catalog handed to the model: read tools (immediate) + write tools
// (previewed in-stream, then committed only on explicit user approval). Write
// tool defs already carry their kind + domain (see writeTools/).
export const AI_TOOLS: AiToolDef[] = [...READ_TOOLS, ...writeToolDefs];

// ── Tool scoping (manual `/property`, `/finance`) ──────────────────────────────
//
// We hand the model only the tools relevant to the user's chosen module instead
// of the whole catalog: smaller payload, better tool-selection accuracy, and a
// stable per-scope prefix that prompt-caches cleanly. "shared" (cross-domain)
// tools load in every scope. This is the manual-selection tier — see
// AI_TOOLS_REFERENCE §"Tool selection strategy" for when to graduate to
// retrieval (option 2/3).
export function getToolsForScope(scope: ToolScope): AiToolDef[] {
  if (scope === "all") return AI_TOOLS;
  return AI_TOOLS.filter((t) => t.domain === scope || t.domain === "shared");
}

/**
 * Per-scope tool-count thresholds at which manual scoping stops being the right
 * strategy. Keep in sync with AI_TOOLS_REFERENCE §"Tool selection strategy".
 */
export const TOOL_SCOPE_LIMITS = {
  /** Approaching the limit — start planning tool retrieval (option 2/3). */
  warn: 80,
  /** Past the limit — manual scoping degrades accuracy/cost; migrate to retrieval. */
  migrate: 120,
} as const;

// One-time health check: alerts in server/build logs when a single scope grows
// past what manual selection handles well, so the switch to retrieval isn't
// missed. Counts the tools the model actually sees in the largest single scope.
(() => {
  const sizes = {
    property: getToolsForScope("property").length,
    finance: getToolsForScope("finance").length,
    money: getToolsForScope("money").length,
  };
  const biggest = Math.max(sizes.property, sizes.finance, sizes.money);
  const detail = `Largest scope=${biggest} tools ${JSON.stringify(sizes)}. See AI_TOOLS_REFERENCE §"Tool selection strategy".`;
  if (biggest > TOOL_SCOPE_LIMITS.migrate) {
    console.warn(
      `[ai/tools] ⚠ Manual scoping is past its limit (>${TOOL_SCOPE_LIMITS.migrate}). Migrate to tool retrieval. ${detail}`
    );
  } else if (biggest > TOOL_SCOPE_LIMITS.warn) {
    console.warn(
      `[ai/tools] Manual scoping approaching its limit (>${TOOL_SCOPE_LIMITS.warn}). Plan tool retrieval. ${detail}`
    );
  }
})();

type ToolInput = Record<string, unknown>;
const str = (v: unknown): string | undefined => (typeof v === "string" && v ? v : undefined);
const num = (v: unknown): number | undefined => (typeof v === "number" ? v : undefined);
const range = (i: ToolInput) => ({ period: str(i.period), from: str(i.from), to: str(i.to) });

// Money entries can be filtered by category/account name (consistent with the
// money write tools). Resolve a name to its id, erroring with the available
// names so the model can recover.
async function moneyCategoryId(name: string): Promise<string> {
  const cats = await getMoneyCategories();
  const found = cats.find((c) => c.name.toLowerCase() === name.toLowerCase());
  if (!found)
    throw new Error(
      `No category named "${name}". Available: ${cats.map((c) => c.name).join(", ")}`
    );
  return found.id;
}
async function moneyAccountId(name: string): Promise<string> {
  const accts = await listAccountsWithBalances();
  const found = accts.find((a) => a.name.toLowerCase() === name.toLowerCase());
  if (!found)
    throw new Error(
      `No account named "${name}". Available: ${accts.map((a) => a.name).join(", ")}`
    );
  return found.id;
}

const handlers: Record<string, (input: ToolInput) => Promise<unknown>> = {
  // Finance — lists & dashboard
  get_finance_summary: (i) => getFinanceDashboard({ from: str(i.from), to: str(i.to) }),
  list_earnings: (i) =>
    getEarnings({
      fiscalYear: str(i.fiscalYear),
      sourceId: str(i.sourceId),
      ...range(i),
      q: str(i.q),
    }),
  list_salary_payments: (i) =>
    getEmployeePayments({
      fiscalYear: str(i.fiscalYear),
      employeeId: str(i.employeeId),
      type: str(i.type) as PaymentKind | undefined,
      clientId: str(i.clientId),
      ...range(i),
    }),
  list_business_expenses: (i) =>
    getBizExpenses({
      fiscalYear: str(i.fiscalYear),
      categoryId: str(i.categoryId),
      ...range(i),
      q: str(i.q),
    }),
  list_subscriptions: (i) => getSubscriptions({ categoryId: str(i.categoryId), q: str(i.q) }),
  list_employees: () => getEmployees(),
  list_clients: () => getIncomeSources(),
  // Finance — reports
  get_monthly_pnl: (i) => getMonthlyPnl(range(i)),
  get_client_profitability: (i) => getClientProfitability(range(i)),
  get_employee_cost_report: (i) => getEmployeeCostReport(range(i)),
  get_expense_breakdown: (i) => getExpenseBreakdown(range(i)),
  get_subscription_spend: () => getSubscriptionSpendReport(),
  get_remittance_report: (i) => getRemittanceReport(range(i)),
  get_fiscal_year_comparison: () => getFiscalYearComparison(),
  // Property — lists & dashboard
  get_property_dashboard: (i) => {
    const now = new Date();
    return getDashboardStats(num(i.month) ?? now.getMonth() + 1, num(i.year) ?? now.getFullYear());
  },
  list_units: () => getUnits(),
  list_tenants: (i) =>
    getTenants({
      filter: (str(i.filter) as "active" | "inactive" | "all") ?? "active",
      unitId: str(i.unitId),
      status: str(i.status) as "CURRENT" | "FUTURE" | undefined,
      q: str(i.q),
    }),
  list_rent_payments: (i) =>
    getPayments({
      month: num(i.month),
      year: num(i.year),
      unitId: str(i.unitId),
      tenantId: str(i.tenantId),
      ...range(i),
    }),
  list_property_expenses: (i) =>
    getExpenses({
      month: num(i.month),
      year: num(i.year),
      payeeId: str(i.payeeId),
      category: str(i.category) as ExpenseCategory | undefined,
      serviceTypeId: str(i.serviceTypeId),
      q: str(i.q),
    }),
  // Property — reports
  get_property_financials: (i) => getPropertyFinancials(range(i)),
  get_property_expense_breakdown: (i) => getPropertyExpenseBreakdown(range(i)),
  get_payee_spend_report: (i) => getPayeeSpendReport(range(i)),
  get_collection_by_method: (i) => getCollectionByMethod(range(i)),
  get_service_revenue: () => getServiceRevenueReport(),
  get_rent_roll: () => getRentRoll(),
  get_arrears_report: () => getArrearsReport(),
  get_advance_liability: () => getAdvanceLiabilityReport(),
  get_occupancy_report: () => getOccupancyReport(),
  get_lease_expiry_report: (i) => getLeaseExpiryReport({ withinDays: num(i.withinDays) }),
  get_scheduled_rent_changes: () => getScheduledRentChanges(),
  get_tenant_statement: (i) => {
    const tenantId = str(i.tenantId);
    if (!tenantId) throw new Error("tenantId is required.");
    return getTenantStatement(tenantId, range(i));
  },
  // Money Manager (personal finance)
  get_money_overview: (i) => getMoneyDashboard(range(i)),
  get_monthly_savings: (i) => getMonthlySavings(range(i)),
  get_personal_expense_breakdown: (i) => getMoneyExpenseBreakdown(range(i)),
  get_account_balances: () => getAccountBalances(),
  get_people_balances: () => getBeneficiaryBalances(),
  list_money_entries: async (i) => {
    const categoryName = str(i.categoryName);
    const accountName = str(i.accountName);
    const [categoryId, accountId] = await Promise.all([
      categoryName ? moneyCategoryId(categoryName) : Promise.resolve(undefined),
      accountName ? moneyAccountId(accountName) : Promise.resolve(undefined),
    ]);
    return getMoneyEntries({
      ...range(i),
      direction: str(i.direction) as "CREDIT" | "DEBIT" | "TRANSFER" | undefined,
      categoryId,
      accountId,
      q: str(i.q),
      sortBy: str(i.sortBy) as "date" | "amount" | "category" | undefined,
      sortDir: str(i.sortDir) as "asc" | "desc" | undefined,
      limit: num(i.limit),
    });
  },
  // Cross-domain
  get_combined_income_summary: async (i) => {
    const [fin, prop] = await Promise.all([
      getMonthlyPnl(range(i)),
      getPropertyFinancials(range(i)),
    ]);
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
};

export const runAiTool: RunTool = (name, input) => {
  // Write tools never execute here — they are validated and previewed only.
  // The actual mutation happens via the execute endpoint after user approval.
  if (isWriteTool(name)) return previewWrite(name, input);

  const handler = handlers[name];
  if (!handler) throw new Error(`Unknown tool: ${name}`);
  return handler((input ?? {}) as ToolInput);
};
