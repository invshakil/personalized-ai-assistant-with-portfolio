import { db } from "@/lib/db";
import { PaymentKind } from "@prisma/client";
import { fiscalYearOf } from "@/lib/fiscalYear";
import { toNum, toIso } from "./_serializers";

export async function getEmployeePayments(opts: { fiscalYear?: string; employeeId?: string } = {}) {
  const payments = await db.employeePayment.findMany({
    where: {
      ...(opts.fiscalYear && { fiscalYear: opts.fiscalYear }),
      ...(opts.employeeId && { employeeId: opts.employeeId }),
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
  amount: number;
  fiscalYear?: string;
  notes?: string | null;
}

export async function createEmployeePayment(input: CreateEmployeePaymentInput) {
  const date = new Date(input.date);
  const payment = await db.employeePayment.create({
    data: {
      date,
      employeeId: input.employeeId,
      type: input.type ?? PaymentKind.SALARY,
      reference: input.reference ?? null,
      amount: input.amount,
      fiscalYear: input.fiscalYear || fiscalYearOf(date),
      notes: input.notes ?? null,
      ...(input.clientIds?.length && {
        clients: { connect: input.clientIds.map((id) => ({ id })) },
      }),
    },
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
  fiscalYear?: string;
  notes?: string | null;
}

export async function updateEmployeePayment(id: string, input: UpdateEmployeePaymentInput) {
  const nextDate = input.date ? new Date(input.date) : undefined;
  const payment = await db.employeePayment.update({
    where: { id },
    data: {
      ...(nextDate && { date: nextDate }),
      ...(input.employeeId && { employeeId: input.employeeId }),
      ...(input.type && { type: input.type }),
      ...(input.reference !== undefined && { reference: input.reference }),
      ...(input.amount != null && { amount: input.amount }),
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
