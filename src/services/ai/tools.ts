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
import { PERIOD_TOKENS } from "@/services/_shared/dateRange";
import { writeToolDefs, isWriteTool, previewWrite } from "./writeTools";
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
      "List client income (earnings): date, client, remittance (REM/NON_REM), amount, fiscal year. Filter by fiscal year or income-source id.",
    parameters: obj({
      fiscalYear,
      sourceId: { type: "string", description: "Income source id (optional)" },
    }),
  },
  {
    name: "list_salary_payments",
    description:
      "List salary/bonus payments to employees: date, employee, type, attributed clients, amount, note. Filter by fiscal year or employee id.",
    parameters: obj({
      fiscalYear,
      employeeId: { type: "string", description: "Employee id (optional)" },
    }),
  },
  {
    name: "list_business_expenses",
    description:
      "List one-off and recurring business expenses (tools/subscriptions): date, name, category, recurring flag, amount. Filter by fiscal year or category id.",
    parameters: obj({
      fiscalYear,
      categoryId: { type: "string", description: "Expense category id (optional)" },
    }),
  },
  {
    name: "list_subscriptions",
    description: "List recurring business subscriptions with monthly amount, status, total spent.",
    parameters: obj({}),
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
      "List tenants with unit, rent, advance balance, status. Filter active/inactive/all (default active).",
    parameters: obj({
      filter: {
        type: "string",
        enum: ["active", "inactive", "all"],
        description: "Tenant filter (optional)",
      },
    }),
  },
  {
    name: "list_rent_payments",
    description:
      "List rent payments: tenant, unit, due, paid, balance, status, receipt no. Filter by month, year, or tenant id.",
    parameters: obj({
      month: { type: "integer", description: "Month 1-12 (optional)" },
      year: { type: "integer", description: "Year (optional)" },
      tenantId: { type: "string", description: "Tenant id (optional)" },
    }),
  },
  {
    name: "list_property_expenses",
    description: "List property expenses by category/payee. Filter by month, year, or payee id.",
    parameters: obj({
      month: { type: "integer", description: "Month 1-12 (optional)" },
      year: { type: "integer", description: "Year (optional)" },
      payeeId: { type: "string", description: "Payee id (optional)" },
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
  };
  const biggest = Math.max(sizes.property, sizes.finance);
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

const handlers: Record<string, (input: ToolInput) => Promise<unknown>> = {
  // Finance — lists & dashboard
  get_finance_summary: (i) => getFinanceDashboard({ from: str(i.from), to: str(i.to) }),
  list_earnings: (i) => getEarnings({ fiscalYear: str(i.fiscalYear), sourceId: str(i.sourceId) }),
  list_salary_payments: (i) =>
    getEmployeePayments({ fiscalYear: str(i.fiscalYear), employeeId: str(i.employeeId) }),
  list_business_expenses: (i) =>
    getBizExpenses({ fiscalYear: str(i.fiscalYear), categoryId: str(i.categoryId) }),
  list_subscriptions: () => getSubscriptions(),
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
  list_tenants: (i) => getTenants((str(i.filter) as "active" | "inactive" | "all") ?? "active"),
  list_rent_payments: (i) =>
    getPayments({ month: num(i.month), year: num(i.year), tenantId: str(i.tenantId) }),
  list_property_expenses: (i) =>
    getExpenses({ month: num(i.month), year: num(i.year), payeeId: str(i.payeeId) }),
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
