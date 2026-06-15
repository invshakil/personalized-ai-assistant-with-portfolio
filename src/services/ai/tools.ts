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
} from "@/services/finance";
import {
  getDashboardStats,
  getUnits,
  getTenants,
  getPayments,
  getExpenses,
} from "@/services/property";
import type { AiToolDef, RunTool } from "./types";

const obj = (properties: Record<string, unknown>) => ({
  type: "object",
  properties,
});

const isoDate = (desc: string) => ({ type: "string", description: desc });
const fiscalYear = { type: "string", description: 'Fiscal year, e.g. "2025-2026" (optional)' };

export const AI_TOOLS: AiToolDef[] = [
  // ── Financial Tracker (business / agency) ──
  {
    name: "get_finance_summary",
    description:
      "Business profit-and-loss summary in BDT. Returns income, employee costs, tool/subscription costs, net profit and margin per fiscal year, plus per-employee and per-client breakdowns, remittance split, and monthly income. Optionally restrict to an ISO date range.",
    parameters: obj({
      from: isoDate("Start date ISO yyyy-mm-dd (optional)"),
      to: isoDate("End date ISO yyyy-mm-dd (optional)"),
    }),
  },
  {
    name: "list_earnings",
    description:
      "List client income (earnings): date, client, remittance (REM/NON_REM), amount, fiscal year. Filter by fiscal year or income-source id.",
    parameters: obj({ fiscalYear, sourceId: { type: "string", description: "Income source id (optional)" } }),
  },
  {
    name: "list_salary_payments",
    description:
      "List salary/bonus payments to employees: date, employee, type, attributed clients, amount, note. Filter by fiscal year or employee id.",
    parameters: obj({ fiscalYear, employeeId: { type: "string", description: "Employee id (optional)" } }),
  },
  {
    name: "list_business_expenses",
    description:
      "List one-off and recurring business expenses (tools/subscriptions): date, name, category, recurring flag, amount. Filter by fiscal year or category id.",
    parameters: obj({ fiscalYear, categoryId: { type: "string", description: "Expense category id (optional)" } }),
  },
  {
    name: "list_subscriptions",
    description:
      "List recurring business subscriptions: monthly amount, start/end, active status, total spent, months charged.",
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
  // ── Property management (rental) ──
  {
    name: "get_property_dashboard",
    description:
      "Rental-property financial dashboard for a given month: expected vs collected rent, expenses, net profit, occupancy, due tracker, and yearly trend. Defaults to the current month/year if not given.",
    parameters: obj({
      month: { type: "integer", description: "Month 1-12 (optional, defaults to current month)" },
      year: { type: "integer", description: "Year, e.g. 2026 (optional, defaults to current year)" },
    }),
  },
  {
    name: "list_units",
    description: "List all rental units with current/future tenant, monthly rent, and occupancy.",
    parameters: obj({}),
  },
  {
    name: "list_tenants",
    description:
      "List tenants with unit, rent, advance balance, and status. Filter by active/inactive/all (default active).",
    parameters: obj({
      filter: { type: "string", enum: ["active", "inactive", "all"], description: "Tenant filter (optional)" },
    }),
  },
  {
    name: "list_rent_payments",
    description:
      "List rent payments: tenant, unit, due, paid, balance, status, receipt number. Filter by month, year, or tenant id.",
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
];

type ToolInput = Record<string, unknown>;
const str = (v: unknown): string | undefined => (typeof v === "string" && v ? v : undefined);
const num = (v: unknown): number | undefined => (typeof v === "number" ? v : undefined);

const handlers: Record<string, (input: ToolInput) => Promise<unknown>> = {
  get_finance_summary: (i) => getFinanceDashboard({ from: str(i.from), to: str(i.to) }),
  list_earnings: (i) => getEarnings({ fiscalYear: str(i.fiscalYear), sourceId: str(i.sourceId) }),
  list_salary_payments: (i) => getEmployeePayments({ fiscalYear: str(i.fiscalYear), employeeId: str(i.employeeId) }),
  list_business_expenses: (i) => getBizExpenses({ fiscalYear: str(i.fiscalYear), categoryId: str(i.categoryId) }),
  list_subscriptions: () => getSubscriptions(),
  list_employees: () => getEmployees(),
  list_clients: () => getIncomeSources(),
  get_property_dashboard: (i) => {
    const now = new Date();
    return getDashboardStats(num(i.month) ?? now.getMonth() + 1, num(i.year) ?? now.getFullYear());
  },
  list_units: () => getUnits(),
  list_tenants: (i) => getTenants((str(i.filter) as "active" | "inactive" | "all") ?? "active"),
  list_rent_payments: (i) => getPayments({ month: num(i.month), year: num(i.year), tenantId: str(i.tenantId) }),
  list_property_expenses: (i) => getExpenses({ month: num(i.month), year: num(i.year), payeeId: str(i.payeeId) }),
};

export const runAiTool: RunTool = (name, input) => {
  const handler = handlers[name];
  if (!handler) throw new Error(`Unknown tool: ${name}`);
  return handler((input ?? {}) as ToolInput);
};
