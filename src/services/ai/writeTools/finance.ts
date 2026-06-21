// Financial-tracker write tools (earnings, salaries, expenses, subscriptions,
// employees, clients, categories). Each maps a model-callable tool onto an
// existing @/services/finance function; no business logic lives here.
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
import { listAccountsWithBalances } from "@/services/money";
import { RemittanceType, PaymentKind } from "@prisma/client";
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
  optStrList,
  requireUpdate,
  taka,
  field,
  nameOf,
  schema,
  Str,
  Num,
  Bool,
  Enum,
  REMITTANCE,
  PAYMENT_KINDS,
} from "./shared";

// ─── Reference resolvers (existence checks + readable labels) ────────────────────

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
// Resolve an optional Money account by name (case-insensitive) for opt-in
// cross-domain linking. Mirrors accountByName in writeTools/money.ts.
async function moneyAccountByName(name: string) {
  const accounts = await listAccountsWithBalances();
  const found = accounts.find((a) => a.name.toLowerCase() === name.toLowerCase());
  if (!found) {
    const names = accounts.map((a) => a.name).join(", ");
    throw new Error(`No account named "${name}". Available: ${names}`);
  }
  return found;
}

export const financeTools: WriteToolDef[] = [
  write({
    name: "create_earning",
    description:
      "Record client income (an earning). Resolve sourceId (the client) via list_clients first. " +
      "fiscalYear is derived from the date when omitted. " +
      "Optionally pass accountName to also post the income as a CREDIT to that Money account " +
      "(money lands in its balance and shows in the Ledger); omit it for no ledger entry.",
    parameters: schema(
      {
        date: Str("Income date YYYY-MM-DD"),
        sourceId: Str("Client / income source id"),
        remittance: Enum(REMITTANCE, "REM (remittance) or NON_REM"),
        amount: Num("Amount in BDT"),
        fiscalYear: Str('Fiscal year, e.g. "2025-2026" (optional)'),
        accountName: Str("Money account to deposit into, e.g. Cash, bKash (optional)"),
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
      accountName: optStr(i.accountName),
      notes: optStr(i.notes) ?? null,
    }),
    preview: async (a) => {
      const c = await clientById(a.sourceId);
      const acct = a.accountName ? ` → ${a.accountName}` : "";
      return `Record ${taka(a.amount)} income from ${nameOf(c)} (${a.remittance})${acct} on ${a.date}.`;
    },
    commit: async (a) => {
      const accountId = a.accountName ? (await moneyAccountByName(a.accountName)).id : undefined;
      const e = await createEarning({
        date: a.date,
        sourceId: a.sourceId,
        remittance: a.remittance,
        amount: a.amount,
        fiscalYear: a.fiscalYear,
        notes: a.notes,
        accountId,
      });
      const c = await clientById(a.sourceId);
      const acct = a.accountName ? ` (deposited to ${a.accountName})` : "";
      return { summary: `Recorded ${taka(a.amount)} income from ${nameOf(c)}${acct}.`, data: e };
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
      "and any clientIds (clients the salary is attributed to) via list_clients. " +
      "Optionally pass accountName to also post the payment as an expense (DEBIT) on that Money " +
      "account (cash leaves its balance and shows in the Ledger); omit it for no ledger entry.",
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
        accountName: Str("Money account to pay from, e.g. Cash, bKash (optional)"),
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
      accountName: optStr(i.accountName),
      notes: optStr(i.notes) ?? null,
    }),
    preview: async (a) => {
      const e = await employeeById(a.employeeId);
      const acct = a.accountName ? ` from ${a.accountName}` : "";
      return `Pay ${taka(a.amount)} (${a.type ?? "SALARY"}) to ${nameOf(e)}${acct} on ${a.date}.`;
    },
    commit: async (a) => {
      const accountId = a.accountName ? (await moneyAccountByName(a.accountName)).id : undefined;
      const p = await createEmployeePayment({
        date: a.date,
        employeeId: a.employeeId,
        amount: a.amount,
        type: a.type,
        clientIds: a.clientIds,
        reference: a.reference,
        fiscalYear: a.fiscalYear,
        notes: a.notes,
        accountId,
      });
      const e = await employeeById(a.employeeId);
      const acct = a.accountName ? ` (paid from ${a.accountName})` : "";
      return {
        summary: `Recorded ${taka(a.amount)} ${a.type ?? "SALARY"} to ${nameOf(e)}${acct}.`,
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
      "via the expense categories. " +
      "Optionally pass accountName to also post the expense as a DEBIT on that Money account " +
      "(cash leaves its balance and shows in the Ledger); omit it for no ledger entry.",
    parameters: schema(
      {
        date: Str("Date YYYY-MM-DD"),
        name: Str("Expense name"),
        categoryId: Str("Expense category id"),
        amount: Num("Amount in BDT"),
        isRecurring: Bool("Recurring flag (optional)"),
        fiscalYear: Str("Fiscal year (optional)"),
        accountName: Str("Money account to pay from, e.g. Cash, bKash (optional)"),
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
      accountName: optStr(i.accountName),
      notes: optStr(i.notes) ?? null,
    }),
    preview: async (a) => {
      const c = await bizCategoryById(a.categoryId);
      const acct = a.accountName ? ` from ${a.accountName}` : "";
      return `Record ${taka(a.amount)} business expense "${a.name}" (${nameOf(c)})${acct} on ${a.date}.`;
    },
    commit: async (a) => {
      const accountId = a.accountName ? (await moneyAccountByName(a.accountName)).id : undefined;
      const e = await createBizExpense({
        date: a.date,
        name: a.name,
        categoryId: a.categoryId,
        amount: a.amount,
        isRecurring: a.isRecurring,
        fiscalYear: a.fiscalYear,
        notes: a.notes,
        accountId,
      });
      const acct = a.accountName ? ` (paid from ${a.accountName})` : "";
      return {
        summary: `Recorded ${taka(a.amount)} business expense "${a.name}"${acct}.`,
        data: e,
      };
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
