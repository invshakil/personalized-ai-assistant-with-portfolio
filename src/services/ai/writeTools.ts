// Write-tool registry for the AI assistant. Every entry maps a model-callable
// tool onto an existing service function — NO business logic lives here, only
// input coercion, a human-readable preview, and the commit call.
//
// Two-phase by design (see route + execute endpoint):
//   • preview(input) runs DURING the chat turn. It validates/looks up references
//     and returns a summary string. It must NEVER mutate data.
//   • commit(input)  runs ONLY after the user approves the action in the UI, via
//     POST /api/admin/ai/actions/execute. It re-parses the same untrusted input
//     and calls the real service (which enforces the actual rules).
//
// The model's input is untrusted: parse() coerces + validates and throws
// user-safe errors; the service layer is the real guard.
import {
  createTenant,
  updateTenant,
  createUnit,
  updateUnit,
  addTransaction,
  updatePayment,
  generatePayments,
  createExpense,
  updateExpense,
  createRentChange,
  updateRentChange,
  createPayee,
  updatePayee,
  createService,
  updateService,
  assignService,
  updateServiceAssignment,
  createServiceType,
  updateServiceType,
  getUnit,
  getTenant,
  getPayment,
  getServices,
  getPayees,
  getServiceTypes,
} from "@/services/property";
import {
  createEarning,
  updateEarning,
  createEmployeePayment,
  updateEmployeePayment,
  createBizExpense,
  updateBizExpense,
  createSubscription,
  updateSubscription,
  addRateChange,
  setMonthOverride,
  createEmployee,
  updateEmployee,
  createIncomeSource,
  updateIncomeSource,
  createExpenseCategory,
  getEmployees,
  getIncomeSources,
  getExpenseCategories,
} from "@/services/finance";
import {
  ExpenseCategory,
  TransactionType,
  RemittanceType,
  PaymentKind,
  PaymentStatus,
} from "@prisma/client";
import type { AiToolDef, CommitResult } from "./types";

// ─── Tool definition shape ────────────────────────────────────────────────────

export interface WriteToolDef extends AiToolDef {
  kind: "write";
  /** Validate + describe without mutating. Returns a future-tense summary. */
  preview(input: Raw): Promise<string>;
  /** Re-validate + perform the write. Only called after user approval. */
  commit(input: Raw): Promise<CommitResult>;
}

type Raw = Record<string, unknown>;

/**
 * Builds a write tool from a single `parse` shared by preview and commit, so the
 * approved input is validated identically on both passes.
 */
function write<A>(def: {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  parse: (input: Raw) => A;
  preview: (args: A) => Promise<string>;
  commit: (args: A) => Promise<CommitResult>;
}): WriteToolDef {
  return {
    name: def.name,
    description: def.description,
    parameters: def.parameters,
    kind: "write",
    preview: (input) => def.preview(def.parse(input)),
    commit: (input) => def.commit(def.parse(input)),
  };
}

// ─── Input coercion (model input is untrusted) ──────────────────────────────────

const optStr = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim() : undefined;

const optNum = (v: unknown): number | undefined => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return undefined;
};

const optBool = (v: unknown): boolean | undefined => (typeof v === "boolean" ? v : undefined);

function reqStr(v: unknown, field: string): string {
  const x = optStr(v);
  if (!x) throw new Error(`"${field}" is required.`);
  return x;
}

function reqNum(v: unknown, field: string): number {
  const x = optNum(v);
  if (x === undefined) throw new Error(`"${field}" must be a number.`);
  return x;
}

function reqDate(v: unknown, field: string): string {
  const x = optStr(v);
  if (!x || Number.isNaN(Date.parse(x)))
    throw new Error(`"${field}" must be a valid date (YYYY-MM-DD).`);
  return x;
}

const optDate = (v: unknown, field: string): string | undefined =>
  optStr(v) === undefined ? undefined : reqDate(v, field);

function reqEnum<T extends string>(v: unknown, allowed: readonly T[], field: string): T {
  const x = optStr(v);
  if (!x || !allowed.includes(x as T))
    throw new Error(`"${field}" must be one of: ${allowed.join(", ")}.`);
  return x as T;
}

const optEnum = <T extends string>(
  v: unknown,
  allowed: readonly T[],
  field: string
): T | undefined => (optStr(v) === undefined ? undefined : reqEnum(v, allowed, field));

const optStrList = (v: unknown): string[] | undefined =>
  Array.isArray(v) ? v.map((x) => optStr(x)).filter((x): x is string => !!x) : undefined;

/** Require an update to actually change something. */
function requireUpdate(obj: Record<string, unknown>): void {
  if (Object.values(obj).every((v) => v === undefined))
    throw new Error("Provide at least one field to update.");
}

// ─── Presentation helpers ───────────────────────────────────────────────────────

const taka = (n: number) => `৳${Math.round(n).toLocaleString("en-US")}`;
const MONTHS = [
  "",
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const ym = (m: number, y: number) => `${MONTHS[m] ?? m} ${y}`;

/** Safe field read from an unknown service result (no `any`). */
function field(o: unknown, key: string): string | undefined {
  if (o && typeof o === "object" && key in o) {
    const v = (o as Record<string, unknown>)[key];
    return v == null ? undefined : String(v);
  }
  return undefined;
}
const nameOf = (o: unknown) => field(o, "name");

// ─── Reference resolvers (existence checks + readable labels) ────────────────────

async function unitById(id: string) {
  const u = await getUnit(id);
  if (!u) throw new Error(`No unit found with id "${id}". Use list_units to find it.`);
  return u;
}
async function tenantById(id: string) {
  const t = await getTenant(id);
  if (!t) throw new Error(`No tenant found with id "${id}". Use list_tenants to find it.`);
  return t;
}
async function paymentById(id: string) {
  const p = await getPayment(id);
  if (!p)
    throw new Error(`No rent payment found with id "${id}". Use list_rent_payments to find it.`);
  return p;
}
async function employeeById(id: string) {
  const e = (await getEmployees()).find((x) => x.id === id);
  if (!e) throw new Error(`No employee found with id "${id}". Use list_employees to find it.`);
  return e;
}
async function clientById(id: string) {
  const c = (await getIncomeSources()).find((x) => x.id === id);
  if (!c)
    throw new Error(`No client/income source found with id "${id}". Use list_clients to find it.`);
  return c;
}
async function bizCategoryById(id: string) {
  const c = (await getExpenseCategories()).find((x) => x.id === id);
  if (!c) throw new Error(`No expense category found with id "${id}".`);
  return c;
}
async function payeeById(id: string) {
  const p = (await getPayees()).find((x) => x.id === id);
  if (!p) throw new Error(`No payee found with id "${id}".`);
  return p;
}
async function serviceById(id: string) {
  const s = (await getServices()).find((x) => x.id === id);
  if (!s) throw new Error(`No add-on service found with id "${id}".`);
  return s;
}
async function serviceTypeById(id: string) {
  const s = (await getServiceTypes()).find((x) => x.id === id);
  if (!s) throw new Error(`No service type found with id "${id}".`);
  return s;
}

// ─── Parameter-schema shorthands ─────────────────────────────────────────────────

const schema = (properties: Record<string, unknown>, required: string[] = []) => ({
  type: "object",
  properties,
  ...(required.length ? { required } : {}),
});
const Str = (description: string) => ({ type: "string", description });
const Num = (description: string) => ({ type: "number", description });
const Bool = (description: string) => ({ type: "boolean", description });
const Int = (description: string) => ({ type: "integer", description });
const Enum = (vals: readonly string[], description: string) => ({
  type: "string",
  enum: [...vals],
  description,
});

const EXPENSE_CATEGORIES = [
  "MAINTENANCE",
  "UTILITY",
  "SALARY",
  "SUBSCRIPTION",
  "CONSTRUCTION",
  "OTHER",
] as const;
const TX_TYPES = ["CASH", "BANK_TRANSFER", "ADVANCE_APPLIED", "ADJUSTMENT", "OTHER"] as const;
const REMITTANCE = ["REM", "NON_REM"] as const;
const PAYMENT_KINDS = ["SALARY", "BONUS", "ADVANCE", "OTHER"] as const;
const PAYMENT_STATUSES = ["PENDING", "PAID", "PARTIAL", "OVERDUE"] as const;

// ════════════════════════════════════════════════════════════════════════════════
//  PROPERTY MANAGEMENT
// ════════════════════════════════════════════════════════════════════════════════

const propertyTools: WriteToolDef[] = [
  write({
    name: "create_tenant",
    description:
      "Add a new tenant. For an in-building tenant pass the unitId (resolve it via list_units first). " +
      "For an off-property/external tenant pass isExternal=true and omit unitId.",
    parameters: schema(
      {
        name: Str("Tenant full name"),
        unitId: Str("Unit id the tenant occupies (required unless isExternal=true)"),
        moveInDate: Str("Move-in date, YYYY-MM-DD"),
        leaseEndDate: Str("Lease end date YYYY-MM-DD (optional)"),
        phone: Str("Contact phone (optional)"),
        email: Str("Email (optional)"),
        nidNumber: Str("National ID number (optional)"),
        advancePaid: Bool("Whether an advance/deposit was paid (optional)"),
        advanceAmount: Num("Advance/deposit amount in BDT (optional)"),
        isExternal: Bool("True for a tenant not tied to a unit (optional)"),
        notes: Str("Notes (optional)"),
      },
      ["name", "moveInDate"]
    ),
    parse: (i) => ({
      name: reqStr(i.name, "name"),
      unitId: optStr(i.unitId) ?? null,
      moveInDate: reqDate(i.moveInDate, "moveInDate"),
      leaseEndDate: optDate(i.leaseEndDate, "leaseEndDate") ?? null,
      phone: optStr(i.phone) ?? null,
      email: optStr(i.email) ?? null,
      nidNumber: optStr(i.nidNumber) ?? null,
      advancePaid: optBool(i.advancePaid),
      advanceAmount: optNum(i.advanceAmount),
      isExternal: optBool(i.isExternal),
      notes: optStr(i.notes) ?? null,
    }),
    preview: async (a) => {
      let unitLabel = "external (no unit)";
      if (!a.isExternal) {
        if (!a.unitId) throw new Error("unitId is required unless isExternal=true.");
        unitLabel = `Unit ${field(await unitById(a.unitId), "unitNumber")}`;
      }
      const adv = a.advanceAmount ? `, advance ${taka(a.advanceAmount)}` : "";
      return `Create tenant "${a.name}" — ${unitLabel}, move-in ${a.moveInDate}${adv}.`;
    },
    commit: async (a) => {
      const t = await createTenant(a);
      return {
        summary: `Created tenant ${field(t, "name")} (${field(t, "tenantCode")}).`,
        data: t,
      };
    },
  }),

  write({
    name: "update_tenant",
    description:
      "Update an existing tenant's details (name, contact, lease end, advance, notes, or unit). " +
      "Resolve the tenant id via list_tenants first.",
    parameters: schema(
      {
        id: Str("Tenant id"),
        name: Str("New name (optional)"),
        phone: Str("New phone (optional)"),
        email: Str("New email (optional)"),
        nidNumber: Str("New NID (optional)"),
        moveInDate: Str("New move-in date YYYY-MM-DD (optional)"),
        leaseEndDate: Str("New lease end date YYYY-MM-DD (optional)"),
        advancePaid: Bool("Advance paid flag (optional)"),
        advanceAmount: Num("Advance amount in BDT (optional)"),
        unitId: Str("Reassign to this unit id (optional)"),
        notes: Str("Notes (optional)"),
      },
      ["id"]
    ),
    parse: (i) => {
      const id = reqStr(i.id, "id");
      const patch = {
        name: optStr(i.name),
        phone: optStr(i.phone),
        email: optStr(i.email),
        nidNumber: optStr(i.nidNumber),
        moveInDate: optDate(i.moveInDate, "moveInDate"),
        leaseEndDate: optDate(i.leaseEndDate, "leaseEndDate"),
        advancePaid: optBool(i.advancePaid),
        advanceAmount: optNum(i.advanceAmount),
        unitId: optStr(i.unitId),
        notes: optStr(i.notes),
      };
      requireUpdate(patch);
      return { id, patch };
    },
    preview: async ({ id, patch }) => {
      const t = await tenantById(id);
      const fields = Object.entries(patch)
        .filter(([, v]) => v !== undefined)
        .map(([k]) => k)
        .join(", ");
      return `Update tenant ${field(t, "name")} (${field(t, "tenantCode")}) — change: ${fields}.`;
    },
    commit: async ({ id, patch }) => {
      const t = await updateTenant(id, patch);
      return {
        summary: `Updated tenant ${field(t, "name")} (${field(t, "tenantCode")}).`,
        data: t,
      };
    },
  }),

  write({
    name: "create_unit",
    description: "Add a new rental unit.",
    parameters: schema(
      {
        unitNumber: Str('Unit number/label, e.g. "5A"'),
        floor: Str('Floor, e.g. "5th"'),
        monthlyRent: Num("Base monthly rent in BDT"),
        description: Str("Description (optional)"),
        notes: Str("Notes (optional)"),
      },
      ["unitNumber", "floor", "monthlyRent"]
    ),
    parse: (i) => ({
      unitNumber: reqStr(i.unitNumber, "unitNumber"),
      floor: reqStr(i.floor, "floor"),
      monthlyRent: reqNum(i.monthlyRent, "monthlyRent"),
      description: optStr(i.description) ?? null,
      notes: optStr(i.notes) ?? null,
    }),
    preview: async (a) =>
      `Create unit ${a.unitNumber} (floor ${a.floor}) at ${taka(a.monthlyRent)}/month.`,
    commit: async (a) => {
      const u = await createUnit(a);
      return { summary: `Created unit ${field(u, "unitNumber")}.`, data: u };
    },
  }),

  write({
    name: "update_unit",
    description: "Update a rental unit's number, floor, rent, description, or notes.",
    parameters: schema(
      {
        id: Str("Unit id"),
        unitNumber: Str("New unit number (optional)"),
        floor: Str("New floor (optional)"),
        monthlyRent: Num("New base monthly rent in BDT (optional)"),
        description: Str("Description (optional)"),
        notes: Str("Notes (optional)"),
      },
      ["id"]
    ),
    parse: (i) => {
      const id = reqStr(i.id, "id");
      const patch = {
        unitNumber: optStr(i.unitNumber),
        floor: optStr(i.floor),
        monthlyRent: optNum(i.monthlyRent),
        description: optStr(i.description),
        notes: optStr(i.notes),
      };
      requireUpdate(patch);
      return { id, patch };
    },
    preview: async ({ id, patch }) => {
      const u = await unitById(id);
      const rent = patch.monthlyRent !== undefined ? ` → rent ${taka(patch.monthlyRent)}` : "";
      return `Update unit ${field(u, "unitNumber")}${rent}.`;
    },
    commit: async ({ id, patch }) => {
      const u = await updateUnit(id, patch);
      return { summary: `Updated unit ${field(u, "unitNumber")}.`, data: u };
    },
  }),

  write({
    name: "record_rent_payment",
    description:
      "Record money received against an existing monthly rent row. First find the row with " +
      "list_rent_payments (pass tenant/month/year) to get its paymentId. type=ADVANCE_APPLIED draws " +
      "down the tenant's held advance instead of taking new cash.",
    parameters: schema(
      {
        paymentId: Str("Id of the monthly rent payment row to pay against"),
        amount: Num("Amount in BDT"),
        type: Enum(TX_TYPES, "How it was paid"),
        date: Str("Payment date YYYY-MM-DD"),
        notes: Str("Notes (optional)"),
      },
      ["paymentId", "amount", "type", "date"]
    ),
    parse: (i) => ({
      paymentId: reqStr(i.paymentId, "paymentId"),
      amount: reqNum(i.amount, "amount"),
      type: reqEnum(i.type, TX_TYPES, "type") as TransactionType,
      date: reqDate(i.date, "date"),
      notes: optStr(i.notes),
    }),
    preview: async (a) => {
      const p = await paymentById(a.paymentId);
      const who = `${p.tenant.name} (${p.tenant.tenantCode})`;
      return (
        `Record ${taka(a.amount)} (${a.type}) on ${a.date} against ${who} — ` +
        `${ym(p.month, p.year)} rent (due ${taka(p.rentDue)}, paid ${taka(p.amountPaid)} so far).`
      );
    },
    commit: async (a) => {
      const tx = await addTransaction(a);
      const p = await paymentById(a.paymentId);
      return {
        summary: `Recorded ${taka(a.amount)} (${a.type}) for ${p.tenant.name} — ${ym(p.month, p.year)}. New status: ${p.status}.`,
        data: tx,
      };
    },
  }),

  write({
    name: "update_rent_payment",
    description:
      "Adjust a monthly rent row's notes, status, or the amount due (rentDue). To record money " +
      "received use record_rent_payment instead.",
    parameters: schema(
      {
        id: Str("Rent payment row id"),
        rentDue: Num("New rent-due amount in BDT (optional)"),
        status: Enum(PAYMENT_STATUSES, "New status (optional)"),
        notes: Str("Notes (optional)"),
      },
      ["id"]
    ),
    parse: (i) => {
      const id = reqStr(i.id, "id");
      const patch = {
        rentDue: optNum(i.rentDue),
        status: optEnum(i.status, PAYMENT_STATUSES, "status") as PaymentStatus | undefined,
        notes: optStr(i.notes),
      };
      requireUpdate(patch);
      return { id, patch };
    },
    preview: async ({ id, patch }) => {
      const p = await paymentById(id);
      const bits = [
        patch.rentDue !== undefined ? `due → ${taka(patch.rentDue)}` : null,
        patch.status ? `status → ${patch.status}` : null,
        patch.notes !== undefined ? "notes" : null,
      ].filter(Boolean);
      return `Update ${p.tenant.name}'s ${ym(p.month, p.year)} rent row (${bits.join(", ")}).`;
    },
    commit: async ({ id, patch }) => {
      const p = await updatePayment(id, patch);
      return { summary: `Updated rent row ${id}.`, data: p };
    },
  }),

  write({
    name: "generate_rent_payments",
    description:
      "Bulk-create the monthly rent-due rows for every active tenant for a given month/year (idempotent — " +
      "existing rows are left untouched). Use before recording payments for a new month.",
    parameters: schema({ month: Int("Month 1-12"), year: Int("Year, e.g. 2026") }, [
      "month",
      "year",
    ]),
    parse: (i) => {
      const month = reqNum(i.month, "month");
      const year = reqNum(i.year, "year");
      if (month < 1 || month > 12) throw new Error("month must be between 1 and 12.");
      return { month, year };
    },
    preview: async (a) =>
      `Generate rent-due rows for all active tenants for ${ym(a.month, a.year)}.`,
    commit: async (a) => {
      const res = await generatePayments(a.month, a.year);
      const created = field(res, "created");
      return {
        summary: `Generated rent rows for ${ym(a.month, a.year)}${created ? ` (${created} created)` : ""}.`,
        data: res,
      };
    },
  }),

  write({
    name: "create_property_expense",
    description: "Log a property expense (maintenance, utility, construction, etc.) for a month.",
    parameters: schema(
      {
        description: Str("What the expense was for"),
        amount: Num("Amount in BDT"),
        category: Enum(EXPENSE_CATEGORIES, "Expense category"),
        month: Int("Month 1-12"),
        year: Int("Year"),
        expenseDate: Str("Date YYYY-MM-DD (optional)"),
        paidTo: Str("Free-text payee name (optional)"),
        payeeId: Str("Existing payee id (optional)"),
        unitId: Str("Related unit id (optional)"),
        serviceTypeId: Str("Service type id (optional)"),
        paymentMode: Str("Payment mode, e.g. cash/bank (optional)"),
        notes: Str("Notes (optional)"),
      },
      ["description", "amount", "category", "month", "year"]
    ),
    parse: (i) => {
      const month = reqNum(i.month, "month");
      if (month < 1 || month > 12) throw new Error("month must be between 1 and 12.");
      return {
        description: reqStr(i.description, "description"),
        amount: reqNum(i.amount, "amount"),
        category: reqEnum(i.category, EXPENSE_CATEGORIES, "category") as ExpenseCategory,
        month,
        year: reqNum(i.year, "year"),
        expenseDate: optDate(i.expenseDate, "expenseDate") ?? null,
        paidTo: optStr(i.paidTo) ?? null,
        payeeId: optStr(i.payeeId) ?? null,
        unitId: optStr(i.unitId) ?? null,
        serviceTypeId: optStr(i.serviceTypeId) ?? null,
        paymentMode: optStr(i.paymentMode) ?? null,
        notes: optStr(i.notes) ?? null,
      };
    },
    preview: async (a) => {
      const payee = a.payeeId
        ? ` to ${nameOf(await payeeById(a.payeeId))}`
        : a.paidTo
          ? ` to ${a.paidTo}`
          : "";
      return `Log ${a.category} expense ${taka(a.amount)} — "${a.description}"${payee} (${ym(a.month, a.year)}).`;
    },
    commit: async (a) => {
      const e = await createExpense(a);
      return {
        summary: `Logged ${taka(a.amount)} ${a.category} expense — "${a.description}".`,
        data: e,
      };
    },
  }),

  write({
    name: "update_property_expense",
    description: "Update a property expense's fields.",
    parameters: schema(
      {
        id: Str("Expense id"),
        description: Str("New description (optional)"),
        amount: Num("New amount BDT (optional)"),
        category: Enum(EXPENSE_CATEGORIES, "New category (optional)"),
        month: Int("Month 1-12 (optional)"),
        year: Int("Year (optional)"),
        expenseDate: Str("Date YYYY-MM-DD (optional)"),
        paidTo: Str("Payee name (optional)"),
        notes: Str("Notes (optional)"),
      },
      ["id"]
    ),
    parse: (i) => {
      const id = reqStr(i.id, "id");
      const patch = {
        description: optStr(i.description),
        amount: optNum(i.amount),
        category: optEnum(i.category, EXPENSE_CATEGORIES, "category") as
          | ExpenseCategory
          | undefined,
        month: optNum(i.month),
        year: optNum(i.year),
        expenseDate: optDate(i.expenseDate, "expenseDate"),
        paidTo: optStr(i.paidTo),
        notes: optStr(i.notes),
      };
      requireUpdate(patch);
      return { id, patch };
    },
    preview: async ({ id, patch }) => {
      const amt = patch.amount !== undefined ? ` → ${taka(patch.amount)}` : "";
      return `Update property expense ${id}${amt}.`;
    },
    commit: async ({ id, patch }) => {
      const e = await updateExpense(id, patch);
      return { summary: `Updated property expense ${id}.`, data: e };
    },
  }),

  write({
    name: "create_rent_change",
    description:
      "Schedule a future rent change for a tenant. It is applied automatically on the effective date.",
    parameters: schema(
      {
        tenantId: Str("Tenant id"),
        effectiveDate: Str("Effective date YYYY-MM-DD"),
        newRent: Num("New monthly rent in BDT"),
        reason: Str("Reason (optional)"),
      },
      ["tenantId", "effectiveDate", "newRent"]
    ),
    parse: (i) => ({
      tenantId: reqStr(i.tenantId, "tenantId"),
      effectiveDate: reqDate(i.effectiveDate, "effectiveDate"),
      newRent: reqNum(i.newRent, "newRent"),
      reason: optStr(i.reason) ?? null,
    }),
    preview: async (a) => {
      const t = await tenantById(a.tenantId);
      return `Schedule rent change for ${field(t, "name")} → ${taka(a.newRent)} effective ${a.effectiveDate}.`;
    },
    commit: async (a) => {
      const rc = await createRentChange(a);
      const t = await tenantById(a.tenantId);
      return {
        summary: `Scheduled ${field(t, "name")}'s rent → ${taka(a.newRent)} from ${a.effectiveDate}.`,
        data: rc,
      };
    },
  }),

  write({
    name: "update_rent_change",
    description: "Update a pending (not-yet-applied) scheduled rent change.",
    parameters: schema(
      {
        id: Str("Rent change id"),
        effectiveDate: Str("New effective date YYYY-MM-DD (optional)"),
        newRent: Num("New rent BDT (optional)"),
        reason: Str("Reason (optional)"),
      },
      ["id"]
    ),
    parse: (i) => {
      const id = reqStr(i.id, "id");
      const patch = {
        effectiveDate: optDate(i.effectiveDate, "effectiveDate"),
        newRent: optNum(i.newRent),
        reason: optStr(i.reason),
      };
      requireUpdate(patch);
      return { id, patch };
    },
    preview: async ({ id, patch }) => {
      const rent = patch.newRent !== undefined ? ` → ${taka(patch.newRent)}` : "";
      return `Update scheduled rent change ${id}${rent}.`;
    },
    commit: async ({ id, patch }) => {
      const rc = await updateRentChange(id, patch);
      return { summary: `Updated scheduled rent change ${id}.`, data: rc };
    },
  }),

  write({
    name: "create_payee",
    description: "Add a payee/vendor (caretaker, electrician, etc.) for property expenses.",
    parameters: schema(
      {
        name: Str("Payee name"),
        role: Str('Role, e.g. "Caretaker", "Electrician"'),
        phone: Str("Phone (optional)"),
        email: Str("Email (optional)"),
        address: Str("Address (optional)"),
        nidNumber: Str("NID (optional)"),
        notes: Str("Notes (optional)"),
      },
      ["name", "role"]
    ),
    parse: (i) => ({
      name: reqStr(i.name, "name"),
      role: reqStr(i.role, "role"),
      phone: optStr(i.phone) ?? null,
      email: optStr(i.email) ?? null,
      address: optStr(i.address) ?? null,
      nidNumber: optStr(i.nidNumber) ?? null,
      notes: optStr(i.notes) ?? null,
    }),
    preview: async (a) => `Create payee "${a.name}" (${a.role}).`,
    commit: async (a) => {
      const p = await createPayee(a);
      return { summary: `Created payee ${field(p, "name")}.`, data: p };
    },
  }),

  write({
    name: "update_payee",
    description: "Update a payee's details.",
    parameters: schema(
      {
        id: Str("Payee id"),
        name: Str("New name (optional)"),
        role: Str("New role (optional)"),
        phone: Str("Phone (optional)"),
        email: Str("Email (optional)"),
        address: Str("Address (optional)"),
        nidNumber: Str("NID (optional)"),
        notes: Str("Notes (optional)"),
      },
      ["id"]
    ),
    parse: (i) => {
      const id = reqStr(i.id, "id");
      const patch = {
        name: optStr(i.name),
        role: optStr(i.role),
        phone: optStr(i.phone),
        email: optStr(i.email),
        address: optStr(i.address),
        nidNumber: optStr(i.nidNumber),
        notes: optStr(i.notes),
      };
      requireUpdate(patch);
      return { id, patch };
    },
    preview: async ({ id }) => {
      const p = await payeeById(id);
      return `Update payee ${nameOf(p)}.`;
    },
    commit: async ({ id, patch }) => {
      const p = await updatePayee(id, patch);
      return { summary: `Updated payee ${field(p, "name")}.`, data: p };
    },
  }),

  write({
    name: "create_service",
    description:
      "Create an add-on service offering (WiFi, parking, etc.) that can be assigned to tenants.",
    parameters: schema({ name: Str("Service name"), description: Str("Description (optional)") }, [
      "name",
    ]),
    parse: (i) => ({ name: reqStr(i.name, "name"), description: optStr(i.description) ?? null }),
    preview: async (a) => `Create add-on service "${a.name}".`,
    commit: async (a) => {
      const s = await createService(a.name, a.description);
      return { summary: `Created add-on service ${field(s, "name")}.`, data: s };
    },
  }),

  write({
    name: "update_service",
    description: "Update an add-on service's name or description.",
    parameters: schema(
      {
        id: Str("Service id"),
        name: Str("New name (optional)"),
        description: Str("New description (optional)"),
      },
      ["id"]
    ),
    parse: (i) => {
      const id = reqStr(i.id, "id");
      const patch = { name: optStr(i.name), description: optStr(i.description) };
      requireUpdate(patch);
      return { id, patch };
    },
    preview: async ({ id }) => `Update add-on service ${nameOf(await serviceById(id))}.`,
    commit: async ({ id, patch }) => {
      const s = await updateService(id, patch);
      return { summary: `Updated add-on service ${field(s, "name")}.`, data: s };
    },
  }),

  write({
    name: "assign_service",
    description: "Assign an add-on service to a tenant at a monthly fee, starting on a date.",
    parameters: schema(
      {
        tenantId: Str("Tenant id"),
        serviceId: Str("Service id"),
        monthlyFee: Num("Monthly fee in BDT"),
        startDate: Str("Start date YYYY-MM-DD"),
        notes: Str("Notes (optional)"),
      },
      ["tenantId", "serviceId", "monthlyFee", "startDate"]
    ),
    parse: (i) => ({
      tenantId: reqStr(i.tenantId, "tenantId"),
      serviceId: reqStr(i.serviceId, "serviceId"),
      monthlyFee: reqNum(i.monthlyFee, "monthlyFee"),
      startDate: reqDate(i.startDate, "startDate"),
      notes: optStr(i.notes) ?? null,
    }),
    preview: async (a) => {
      const [t, s] = await Promise.all([tenantById(a.tenantId), serviceById(a.serviceId)]);
      return `Assign "${nameOf(s)}" to ${field(t, "name")} at ${taka(a.monthlyFee)}/month from ${a.startDate}.`;
    },
    commit: async (a) => {
      const r = await assignService(a);
      return { summary: `Assigned service at ${taka(a.monthlyFee)}/month.`, data: r };
    },
  }),

  write({
    name: "update_service_assignment",
    description: "Update a tenant's service assignment (fee, end date, or notes).",
    parameters: schema(
      {
        id: Str("Service assignment id"),
        monthlyFee: Num("New monthly fee BDT (optional)"),
        endDate: Str("End date YYYY-MM-DD (optional)"),
        notes: Str("Notes (optional)"),
      },
      ["id"]
    ),
    parse: (i) => {
      const id = reqStr(i.id, "id");
      const patch = {
        monthlyFee: optNum(i.monthlyFee),
        endDate: optDate(i.endDate, "endDate"),
        notes: optStr(i.notes),
      };
      requireUpdate(patch);
      return { id, patch };
    },
    preview: async ({ id, patch }) => {
      const fee = patch.monthlyFee !== undefined ? ` → ${taka(patch.monthlyFee)}/month` : "";
      return `Update service assignment ${id}${fee}.`;
    },
    commit: async ({ id, patch }) => {
      const r = await updateServiceAssignment(id, patch);
      return { summary: `Updated service assignment ${id}.`, data: r };
    },
  }),

  write({
    name: "create_service_type",
    description: "Create a service type used to classify property expenses.",
    parameters: schema(
      {
        name: Str("Service type name"),
        category: Enum(EXPENSE_CATEGORIES, "Expense category it maps to"),
        description: Str("Description (optional)"),
      },
      ["name", "category"]
    ),
    parse: (i) => ({
      name: reqStr(i.name, "name"),
      category: reqEnum(i.category, EXPENSE_CATEGORIES, "category") as ExpenseCategory,
      description: optStr(i.description) ?? null,
    }),
    preview: async (a) => `Create service type "${a.name}" (${a.category}).`,
    commit: async (a) => {
      const s = await createServiceType(a);
      return { summary: `Created service type ${field(s, "name")}.`, data: s };
    },
  }),

  write({
    name: "update_service_type",
    description: "Update a service type's name, category, or description.",
    parameters: schema(
      {
        id: Str("Service type id"),
        name: Str("New name (optional)"),
        category: Enum(EXPENSE_CATEGORIES, "New category (optional)"),
        description: Str("Description (optional)"),
      },
      ["id"]
    ),
    parse: (i) => {
      const id = reqStr(i.id, "id");
      const patch = {
        name: optStr(i.name),
        category: optEnum(i.category, EXPENSE_CATEGORIES, "category") as
          | ExpenseCategory
          | undefined,
        description: optStr(i.description),
      };
      requireUpdate(patch);
      return { id, patch };
    },
    preview: async ({ id }) => `Update service type ${nameOf(await serviceTypeById(id))}.`,
    commit: async ({ id, patch }) => {
      const s = await updateServiceType(id, patch);
      return { summary: `Updated service type ${field(s, "name")}.`, data: s };
    },
  }),
];

// ════════════════════════════════════════════════════════════════════════════════
//  FINANCIAL TRACKER
// ════════════════════════════════════════════════════════════════════════════════

const financeTools: WriteToolDef[] = [
  write({
    name: "create_earning",
    description:
      "Record client income (an earning). Resolve sourceId (the client) via list_clients first. " +
      "fiscalYear is derived from the date when omitted.",
    parameters: schema(
      {
        date: Str("Income date YYYY-MM-DD"),
        sourceId: Str("Client / income source id"),
        remittance: Enum(REMITTANCE, "REM (remittance) or NON_REM"),
        amount: Num("Amount in BDT"),
        fiscalYear: Str('Fiscal year, e.g. "2025-2026" (optional)'),
        notes: Str("Notes (optional)"),
      },
      ["date", "sourceId", "remittance", "amount"]
    ),
    parse: (i) => ({
      date: reqDate(i.date, "date"),
      sourceId: reqStr(i.sourceId, "sourceId"),
      remittance: reqEnum(i.remittance, REMITTANCE, "remittance") as RemittanceType,
      amount: reqNum(i.amount, "amount"),
      fiscalYear: optStr(i.fiscalYear),
      notes: optStr(i.notes) ?? null,
    }),
    preview: async (a) => {
      const c = await clientById(a.sourceId);
      return `Record ${taka(a.amount)} income from ${nameOf(c)} (${a.remittance}) on ${a.date}.`;
    },
    commit: async (a) => {
      const e = await createEarning(a);
      const c = await clientById(a.sourceId);
      return { summary: `Recorded ${taka(a.amount)} income from ${nameOf(c)}.`, data: e };
    },
  }),

  write({
    name: "update_earning",
    description: "Update a client income (earning) record.",
    parameters: schema(
      {
        id: Str("Earning id"),
        date: Str("Date YYYY-MM-DD (optional)"),
        sourceId: Str("Client id (optional)"),
        remittance: Enum(REMITTANCE, "Remittance type (optional)"),
        amount: Num("Amount BDT (optional)"),
        fiscalYear: Str("Fiscal year (optional)"),
        notes: Str("Notes (optional)"),
      },
      ["id"]
    ),
    parse: (i) => {
      const id = reqStr(i.id, "id");
      const patch = {
        date: optDate(i.date, "date"),
        sourceId: optStr(i.sourceId),
        remittance: optEnum(i.remittance, REMITTANCE, "remittance") as RemittanceType | undefined,
        amount: optNum(i.amount),
        fiscalYear: optStr(i.fiscalYear),
        notes: optStr(i.notes),
      };
      requireUpdate(patch);
      return { id, patch };
    },
    preview: async ({ id, patch }) => {
      const amt = patch.amount !== undefined ? ` → ${taka(patch.amount)}` : "";
      return `Update earning ${id}${amt}.`;
    },
    commit: async ({ id, patch }) => {
      const e = await updateEarning(id, patch);
      return { summary: `Updated earning ${id}.`, data: e };
    },
  }),

  write({
    name: "create_salary_payment",
    description:
      "Record a salary/bonus/advance payment to an employee. Resolve employeeId via list_employees " +
      "and any clientIds (clients the salary is attributed to) via list_clients.",
    parameters: schema(
      {
        date: Str("Payment date YYYY-MM-DD"),
        employeeId: Str("Employee id"),
        amount: Num("Amount in BDT"),
        type: Enum(PAYMENT_KINDS, "Payment kind (optional, default SALARY)"),
        clientIds: {
          type: "array",
          items: { type: "string" },
          description: "Attributed client ids (optional)",
        },
        reference: Str("Reference (optional)"),
        fiscalYear: Str("Fiscal year (optional)"),
        notes: Str("Notes (optional)"),
      },
      ["date", "employeeId", "amount"]
    ),
    parse: (i) => ({
      date: reqDate(i.date, "date"),
      employeeId: reqStr(i.employeeId, "employeeId"),
      amount: reqNum(i.amount, "amount"),
      type: optEnum(i.type, PAYMENT_KINDS, "type") as PaymentKind | undefined,
      clientIds: optStrList(i.clientIds),
      reference: optStr(i.reference) ?? null,
      fiscalYear: optStr(i.fiscalYear),
      notes: optStr(i.notes) ?? null,
    }),
    preview: async (a) => {
      const e = await employeeById(a.employeeId);
      return `Pay ${taka(a.amount)} (${a.type ?? "SALARY"}) to ${nameOf(e)} on ${a.date}.`;
    },
    commit: async (a) => {
      const p = await createEmployeePayment(a);
      const e = await employeeById(a.employeeId);
      return {
        summary: `Recorded ${taka(a.amount)} ${a.type ?? "SALARY"} to ${nameOf(e)}.`,
        data: p,
      };
    },
  }),

  write({
    name: "update_salary_payment",
    description: "Update an employee salary/bonus payment.",
    parameters: schema(
      {
        id: Str("Payment id"),
        date: Str("Date YYYY-MM-DD (optional)"),
        employeeId: Str("Employee id (optional)"),
        amount: Num("Amount BDT (optional)"),
        type: Enum(PAYMENT_KINDS, "Payment kind (optional)"),
        clientIds: {
          type: "array",
          items: { type: "string" },
          description: "Attributed client ids (optional)",
        },
        reference: Str("Reference (optional)"),
        fiscalYear: Str("Fiscal year (optional)"),
        notes: Str("Notes (optional)"),
      },
      ["id"]
    ),
    parse: (i) => {
      const id = reqStr(i.id, "id");
      const patch = {
        date: optDate(i.date, "date"),
        employeeId: optStr(i.employeeId),
        amount: optNum(i.amount),
        type: optEnum(i.type, PAYMENT_KINDS, "type") as PaymentKind | undefined,
        clientIds: optStrList(i.clientIds),
        reference: optStr(i.reference),
        fiscalYear: optStr(i.fiscalYear),
        notes: optStr(i.notes),
      };
      requireUpdate(patch);
      return { id, patch };
    },
    preview: async ({ id, patch }) => {
      const amt = patch.amount !== undefined ? ` → ${taka(patch.amount)}` : "";
      return `Update salary payment ${id}${amt}.`;
    },
    commit: async ({ id, patch }) => {
      const p = await updateEmployeePayment(id, patch);
      return { summary: `Updated salary payment ${id}.`, data: p };
    },
  }),

  write({
    name: "create_business_expense",
    description:
      "Record a one-off or recurring business expense (tool/subscription/etc.). Resolve categoryId " +
      "via the expense categories.",
    parameters: schema(
      {
        date: Str("Date YYYY-MM-DD"),
        name: Str("Expense name"),
        categoryId: Str("Expense category id"),
        amount: Num("Amount in BDT"),
        isRecurring: Bool("Recurring flag (optional)"),
        fiscalYear: Str("Fiscal year (optional)"),
        notes: Str("Notes (optional)"),
      },
      ["date", "name", "categoryId", "amount"]
    ),
    parse: (i) => ({
      date: reqDate(i.date, "date"),
      name: reqStr(i.name, "name"),
      categoryId: reqStr(i.categoryId, "categoryId"),
      amount: reqNum(i.amount, "amount"),
      isRecurring: optBool(i.isRecurring),
      fiscalYear: optStr(i.fiscalYear),
      notes: optStr(i.notes) ?? null,
    }),
    preview: async (a) => {
      const c = await bizCategoryById(a.categoryId);
      return `Record ${taka(a.amount)} business expense "${a.name}" (${nameOf(c)}) on ${a.date}.`;
    },
    commit: async (a) => {
      const e = await createBizExpense(a);
      return { summary: `Recorded ${taka(a.amount)} business expense "${a.name}".`, data: e };
    },
  }),

  write({
    name: "update_business_expense",
    description: "Update a business expense.",
    parameters: schema(
      {
        id: Str("Business expense id"),
        date: Str("Date YYYY-MM-DD (optional)"),
        name: Str("Name (optional)"),
        categoryId: Str("Category id (optional)"),
        amount: Num("Amount BDT (optional)"),
        isRecurring: Bool("Recurring flag (optional)"),
        fiscalYear: Str("Fiscal year (optional)"),
        notes: Str("Notes (optional)"),
      },
      ["id"]
    ),
    parse: (i) => {
      const id = reqStr(i.id, "id");
      const patch = {
        date: optDate(i.date, "date"),
        name: optStr(i.name),
        categoryId: optStr(i.categoryId),
        amount: optNum(i.amount),
        isRecurring: optBool(i.isRecurring),
        fiscalYear: optStr(i.fiscalYear),
        notes: optStr(i.notes),
      };
      requireUpdate(patch);
      return { id, patch };
    },
    preview: async ({ id, patch }) => {
      const amt = patch.amount !== undefined ? ` → ${taka(patch.amount)}` : "";
      return `Update business expense ${id}${amt}.`;
    },
    commit: async ({ id, patch }) => {
      const e = await updateBizExpense(id, patch);
      return { summary: `Updated business expense ${id}.`, data: e };
    },
  }),

  write({
    name: "create_subscription",
    description: "Add a recurring business subscription with a monthly amount.",
    parameters: schema(
      {
        name: Str("Subscription name"),
        categoryId: Str("Expense category id"),
        monthlyAmount: Num("Monthly amount in BDT"),
        startDate: Str("Start date YYYY-MM-DD"),
        notes: Str("Notes (optional)"),
      },
      ["name", "categoryId", "monthlyAmount", "startDate"]
    ),
    parse: (i) => ({
      name: reqStr(i.name, "name"),
      categoryId: reqStr(i.categoryId, "categoryId"),
      monthlyAmount: reqNum(i.monthlyAmount, "monthlyAmount"),
      startDate: reqDate(i.startDate, "startDate"),
      notes: optStr(i.notes) ?? null,
    }),
    preview: async (a) => {
      const c = await bizCategoryById(a.categoryId);
      return `Create subscription "${a.name}" (${nameOf(c)}) at ${taka(a.monthlyAmount)}/month from ${a.startDate}.`;
    },
    commit: async (a) => {
      const s = await createSubscription(a);
      return {
        summary: `Created subscription "${a.name}" at ${taka(a.monthlyAmount)}/month.`,
        data: s,
      };
    },
  }),

  write({
    name: "update_subscription",
    description: "Update a subscription's name, category, monthly amount, or start date.",
    parameters: schema(
      {
        id: Str("Subscription id"),
        name: Str("Name (optional)"),
        categoryId: Str("Category id (optional)"),
        monthlyAmount: Num("Monthly amount BDT (optional)"),
        startDate: Str("Start date YYYY-MM-DD (optional)"),
        notes: Str("Notes (optional)"),
      },
      ["id"]
    ),
    parse: (i) => {
      const id = reqStr(i.id, "id");
      const patch = {
        name: optStr(i.name),
        categoryId: optStr(i.categoryId),
        monthlyAmount: optNum(i.monthlyAmount),
        startDate: optDate(i.startDate, "startDate"),
        notes: optStr(i.notes),
      };
      requireUpdate(patch);
      return { id, patch };
    },
    preview: async ({ id, patch }) => {
      const amt = patch.monthlyAmount !== undefined ? ` → ${taka(patch.monthlyAmount)}/month` : "";
      return `Update subscription ${id}${amt}.`;
    },
    commit: async ({ id, patch }) => {
      const s = await updateSubscription(id, patch);
      return { summary: `Updated subscription ${id}.`, data: s };
    },
  }),

  write({
    name: "add_subscription_rate_change",
    description: "Schedule a rate change for a subscription, effective from a given month.",
    parameters: schema(
      {
        subscriptionId: Str("Subscription id"),
        effectiveMonth: Str("Effective month, YYYY-MM or YYYY-MM-DD"),
        monthlyAmount: Num("New monthly amount in BDT"),
        note: Str("Note (optional)"),
      },
      ["subscriptionId", "effectiveMonth", "monthlyAmount"]
    ),
    parse: (i) => ({
      subscriptionId: reqStr(i.subscriptionId, "subscriptionId"),
      effectiveMonth: reqStr(i.effectiveMonth, "effectiveMonth"),
      monthlyAmount: reqNum(i.monthlyAmount, "monthlyAmount"),
      note: optStr(i.note) ?? null,
    }),
    preview: async (a) =>
      `Set subscription ${a.subscriptionId} to ${taka(a.monthlyAmount)}/month from ${a.effectiveMonth}.`,
    commit: async (a) => {
      const r = await addRateChange(a.subscriptionId, {
        effectiveMonth: a.effectiveMonth,
        monthlyAmount: a.monthlyAmount,
        note: a.note,
      });
      return {
        summary: `Scheduled rate change → ${taka(a.monthlyAmount)}/month from ${a.effectiveMonth}.`,
        data: r,
      };
    },
  }),

  write({
    name: "set_subscription_override",
    description: "Override a subscription's charged amount for one specific month.",
    parameters: schema(
      {
        subscriptionId: Str("Subscription id"),
        month: Str("Month, YYYY-MM or YYYY-MM-DD"),
        amount: Num("Amount charged for that month in BDT"),
        note: Str("Note (optional)"),
      },
      ["subscriptionId", "month", "amount"]
    ),
    parse: (i) => ({
      subscriptionId: reqStr(i.subscriptionId, "subscriptionId"),
      month: reqStr(i.month, "month"),
      amount: reqNum(i.amount, "amount"),
      note: optStr(i.note) ?? null,
    }),
    preview: async (a) =>
      `Override subscription ${a.subscriptionId} to ${taka(a.amount)} for ${a.month}.`,
    commit: async (a) => {
      const r = await setMonthOverride(a.subscriptionId, {
        month: a.month,
        amount: a.amount,
        note: a.note,
      });
      return { summary: `Set ${a.month} override to ${taka(a.amount)}.`, data: r };
    },
  }),

  write({
    name: "create_employee",
    description: "Add a business employee.",
    parameters: schema(
      {
        name: Str("Employee name"),
        phone: Str("Phone (optional)"),
        notes: Str("Notes (optional)"),
      },
      ["name"]
    ),
    parse: (i) => ({
      name: reqStr(i.name, "name"),
      phone: optStr(i.phone) ?? null,
      notes: optStr(i.notes) ?? null,
    }),
    preview: async (a) => `Create employee "${a.name}".`,
    commit: async (a) => {
      const e = await createEmployee(a);
      return { summary: `Created employee ${field(e, "name")}.`, data: e };
    },
  }),

  write({
    name: "update_employee",
    description: "Update an employee's name, phone, or notes.",
    parameters: schema(
      {
        id: Str("Employee id"),
        name: Str("New name (optional)"),
        phone: Str("Phone (optional)"),
        notes: Str("Notes (optional)"),
      },
      ["id"]
    ),
    parse: (i) => {
      const id = reqStr(i.id, "id");
      const patch = { name: optStr(i.name), phone: optStr(i.phone), notes: optStr(i.notes) };
      requireUpdate(patch);
      return { id, patch };
    },
    preview: async ({ id }) => `Update employee ${nameOf(await employeeById(id))}.`,
    commit: async ({ id, patch }) => {
      const e = await updateEmployee(id, patch);
      return { summary: `Updated employee ${field(e, "name")}.`, data: e };
    },
  }),

  write({
    name: "create_client",
    description: "Add a client / income source.",
    parameters: schema({ name: Str("Client name"), notes: Str("Notes (optional)") }, ["name"]),
    parse: (i) => ({ name: reqStr(i.name, "name"), notes: optStr(i.notes) ?? null }),
    preview: async (a) => `Create client "${a.name}".`,
    commit: async (a) => {
      const c = await createIncomeSource(a);
      return { summary: `Created client ${field(c, "name")}.`, data: c };
    },
  }),

  write({
    name: "update_client",
    description: "Update a client / income source's name or notes.",
    parameters: schema(
      { id: Str("Client id"), name: Str("New name (optional)"), notes: Str("Notes (optional)") },
      ["id"]
    ),
    parse: (i) => {
      const id = reqStr(i.id, "id");
      const patch = { name: optStr(i.name), notes: optStr(i.notes) };
      requireUpdate(patch);
      return { id, patch };
    },
    preview: async ({ id }) => `Update client ${nameOf(await clientById(id))}.`,
    commit: async ({ id, patch }) => {
      const c = await updateIncomeSource(id, patch);
      return { summary: `Updated client ${field(c, "name")}.`, data: c };
    },
  }),

  write({
    name: "create_expense_category",
    description: "Add a business expense category.",
    parameters: schema({ name: Str("Category name") }, ["name"]),
    parse: (i) => ({ name: reqStr(i.name, "name") }),
    preview: async (a) => `Create expense category "${a.name}".`,
    commit: async (a) => {
      const c = await createExpenseCategory(a);
      return { summary: `Created expense category ${field(c, "name")}.`, data: c };
    },
  }),
];

// ─── Registry ────────────────────────────────────────────────────────────────────

export const WRITE_TOOLS: WriteToolDef[] = [...propertyTools, ...financeTools];

const byName = new Map(WRITE_TOOLS.map((t) => [t.name, t]));

export const isWriteTool = (name: string): boolean => byName.has(name);

/** Tool defs (name/description/parameters/kind) for the model catalog. */
export const writeToolDefs: AiToolDef[] = WRITE_TOOLS.map(
  ({ name, description, parameters, kind }) => ({
    name,
    description,
    parameters,
    kind,
  })
);

/** Validate + describe a proposed write WITHOUT performing it (runs in-stream). */
export async function previewWrite(name: string, input: unknown): Promise<{ summary: string }> {
  const tool = byName.get(name);
  if (!tool) throw new Error(`Unknown write tool: ${name}`);
  const summary = await tool.preview((input ?? {}) as Raw);
  return { summary };
}

/** Perform an approved write. Re-validates the same untrusted input. */
export async function commitWrite(name: string, input: unknown): Promise<CommitResult> {
  const tool = byName.get(name);
  if (!tool) throw new Error(`Unknown write tool: ${name}`);
  return tool.commit((input ?? {}) as Raw);
}
