// Property-management write tools (tenants, units, rent, expenses, services).
// Each maps a model-callable tool onto an existing @/services/property function;
// no business logic lives here — only coercion, a preview, and the commit call.
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
import { ExpenseCategory, TransactionType, PaymentStatus } from "@prisma/client";
import {
  write,
  type WriteToolDef,
  optStr,
  optNum,
  optBool,
  reqStr,
  reqNum,
  reqDate,
  optDate,
  reqEnum,
  optEnum,
  requireUpdate,
  taka,
  ym,
  field,
  nameOf,
  schema,
  Str,
  Num,
  Bool,
  Int,
  Enum,
  EXPENSE_CATEGORIES,
  TX_TYPES,
  PAYMENT_STATUSES,
} from "./shared";

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

export const propertyTools: WriteToolDef[] = [
  write({
    name: "create_tenant",
    description:
      "Add a new tenant. For an in-building tenant pass the unitId (resolve it via list_units first). " +
      "For an off-property/external tenant pass isExternal=true and omit unitId. If the unit is already " +
      "occupied, the tenant is queued as a future tenant and the current tenant's move-out + lease-end " +
      "are scheduled (defaults to the day before this tenant's move-in; override with outgoingMoveOutDate).",
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
        outgoingMoveOutDate: Str(
          "When the unit is occupied, the current tenant's move-out date YYYY-MM-DD " +
            "(optional; defaults to the day before moveInDate)"
        ),
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
      outgoingMoveOutDate: optDate(i.outgoingMoveOutDate, "outgoingMoveOutDate") ?? null,
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
      "Resolve the tenant id via list_tenants first. Reassigning into an occupied unit queues this " +
      "tenant as a future tenant and schedules the current tenant's move-out + lease-end (defaults to " +
      "the day before this tenant's move-in; override with outgoingMoveOutDate).",
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
        outgoingMoveOutDate: Str(
          "When reassigning into an occupied unit, the current tenant's move-out date YYYY-MM-DD " +
            "(optional; defaults to the day before this tenant's move-in)"
        ),
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
        outgoingMoveOutDate: optDate(i.outgoingMoveOutDate, "outgoingMoveOutDate"),
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
      "Bulk-create the monthly rent-due rows for the tenants occupying each unit in a given month/year " +
      "(idempotent — existing rows are left untouched). Respects tenancy dates: promotes scheduled tenants " +
      "whose move-in falls in the month (moving out the outgoing tenant on their unit), skips and deactivates " +
      "tenants whose lease ended before the month, and skips tenants not yet moved in. Use before recording " +
      "payments for a new month.",
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
