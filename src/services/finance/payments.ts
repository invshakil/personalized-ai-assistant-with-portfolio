import { db } from "@/lib/db";
import { PaymentKind } from "@prisma/client";
import { fiscalYearOf } from "@/lib/fiscalYear";
import { resolveRange, dateColumnWhere } from "@/services/_shared/dateRange";
import { recordLinkedEntry } from "@/services/money";
import { toNum, toIso, resolveMoney, resolveMoneyUpdate } from "./_serializers";

export interface GetEmployeePaymentsOptions {
  fiscalYears?: string[];
  employeeIds?: string[];
  /** Payment kinds: SALARY | BONUS | ADVANCE | OTHER. */
  types?: PaymentKind[];
  /** Filter to payments attributed to these clients (IncomeSource ids). */
  clientIds?: string[];
  /** Relative period token (resolved server-side) — e.g. "last_3_months". */
  period?: string;
  /** Explicit inclusive date bounds (override `period`). ISO yyyy-mm-dd. */
  from?: string;
  to?: string;
}

export async function getEmployeePayments(opts: GetEmployeePaymentsOptions = {}) {
  const range = resolveRange({ period: opts.period, from: opts.from, to: opts.to });
  const payments = await db.employeePayment.findMany({
    where: {
      ...(opts.fiscalYears?.length && { fiscalYear: { in: opts.fiscalYears } }),
      ...(opts.employeeIds?.length && { employeeId: { in: opts.employeeIds } }),
      ...(opts.types?.length && { type: { in: opts.types } }),
      ...(opts.clientIds?.length && { clients: { some: { id: { in: opts.clientIds } } } }),
      ...dateColumnWhere(range),
    },
    orderBy: [{ date: "desc" }],
    include: {
      employee: { select: { name: true } },
      clients: { select: { id: true, name: true }, orderBy: { name: "asc" } },
    },
  });
  return payments.map((p) => ({
    id: p.id,
    date: toIso(p.date),
    employeeId: p.employeeId,
    employeeName: p.employee.name,
    type: p.type,
    reference: p.reference,
    clients: p.clients,
    amount: toNum(p.amount),
    currency: p.currency,
    originalAmount: p.originalAmount == null ? toNum(p.amount) : toNum(p.originalAmount),
    fxRate: toNum(p.fxRate),
    fiscalYear: p.fiscalYear,
    notes: p.notes,
  }));
}

export interface CreateEmployeePaymentInput {
  date: string;
  employeeId: string;
  type?: PaymentKind;
  reference?: string | null;
  clientIds?: string[]; // IncomeSource ids this salary is attributed to
  /** BDT-equivalent. Derived server-side from originalAmount × fxRate; legacy BDT callers may pass this. */
  amount?: number;
  /** Original currency (BDT | USD | EUR). Defaults to BDT. */
  currency?: string;
  /** Amount in `currency`. Falls back to `amount` for BDT/legacy callers. */
  originalAmount?: number;
  /** BDT per 1 unit of `currency`. Defaults to 1. */
  fxRate?: number;
  fiscalYear?: string;
  notes?: string | null;
  /**
   * Opt-in cross-domain link: when set, a DEBIT is posted to this Money account
   * after the payment is created so the cash leaves that account's balance and
   * shows in the Ledger. No account → no ledger entry. Posted once at create
   * time; not reversed on edit/delete.
   */
  accountId?: string;
}

export async function createEmployeePayment(input: CreateEmployeePaymentInput) {
  const date = new Date(input.date);
  const money = resolveMoney(input);
  // The salary row and its opt-in ledger entry are one unit of work. Salaries are
  // multi-currency, so the link can legitimately fail on an account-currency
  // mismatch — that must not leave a paid salary with no cash movement behind it.
  const payment = await db.$transaction(async (tx) => {
    const created = await tx.employeePayment.create({
      data: {
        date,
        employeeId: input.employeeId,
        type: input.type ?? PaymentKind.SALARY,
        reference: input.reference ?? null,
        amount: money.amount, // BDT canonical
        currency: money.currency,
        originalAmount: money.originalAmount,
        fxRate: money.fxRate,
        fiscalYear: input.fiscalYear || fiscalYearOf(date),
        notes: input.notes ?? null,
        ...(input.clientIds?.length && {
          clients: { connect: input.clientIds.map((id) => ({ id })) },
        }),
      },
    });

    // Opt-in cross-domain link: post a ledger DEBIT for the cash paid out.
    if (input.accountId) {
      const employee = await tx.employee.findUnique({
        where: { id: input.employeeId },
        select: { name: true },
      });
      await recordLinkedEntry(
        {
          accountId: input.accountId,
          direction: "DEBIT",
          amount: money.amount,
          currency: money.currency,
          originalAmount: money.originalAmount,
          fxRate: money.fxRate,
          date: input.date,
          categoryName: "Employee Salary",
          description: `${input.type ?? PaymentKind.SALARY} — ${employee?.name ?? "employee"}`,
        },
        tx
      );
    }

    return created;
  });

  return { ...payment, amount: toNum(payment.amount), date: toIso(payment.date) };
}

export interface UpdateEmployeePaymentInput {
  date?: string;
  employeeId?: string;
  type?: PaymentKind;
  reference?: string | null;
  clientIds?: string[];
  amount?: number;
  currency?: string;
  originalAmount?: number;
  fxRate?: number;
  fiscalYear?: string;
  notes?: string | null;
}

export async function updateEmployeePayment(id: string, input: UpdateEmployeePaymentInput) {
  const nextDate = input.date ? new Date(input.date) : undefined;

  let money: ReturnType<typeof resolveMoney> | null = null;
  if (
    input.amount !== undefined ||
    input.currency !== undefined ||
    input.originalAmount !== undefined ||
    input.fxRate !== undefined
  ) {
    const current = await db.employeePayment.findUnique({
      where: { id },
      select: { currency: true, originalAmount: true, fxRate: true, amount: true },
    });
    if (!current) throw new Error("Payment not found");
    money = resolveMoneyUpdate(input, {
      currency: current.currency,
      originalAmount:
        current.originalAmount == null ? toNum(current.amount) : toNum(current.originalAmount),
      fxRate: toNum(current.fxRate),
    });
  }

  const payment = await db.employeePayment.update({
    where: { id },
    data: {
      ...(nextDate && { date: nextDate }),
      ...(input.employeeId && { employeeId: input.employeeId }),
      ...(input.type && { type: input.type }),
      ...(input.reference !== undefined && { reference: input.reference }),
      ...(money && {
        amount: money.amount,
        currency: money.currency,
        originalAmount: money.originalAmount,
        fxRate: money.fxRate,
      }),
      ...(input.fiscalYear
        ? { fiscalYear: input.fiscalYear }
        : nextDate
          ? { fiscalYear: fiscalYearOf(nextDate) }
          : {}),
      ...(input.notes !== undefined && { notes: input.notes }),
      // Replace the full client set when provided.
      ...(input.clientIds && { clients: { set: input.clientIds.map((cid) => ({ id: cid })) } }),
    },
  });
  return { ...payment, amount: toNum(payment.amount), date: toIso(payment.date) };
}

export async function deleteEmployeePayment(id: string) {
  await db.employeePayment.delete({ where: { id } });
  return { deleted: true };
}
