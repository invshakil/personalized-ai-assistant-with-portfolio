// Money Manager — people you pay. A Beneficiary can have obligations:
//   RECURRING (allowance/stipend, no balance) or LOAN (principal with a running
//   outstanding balance). A loan's direction says who owes whom:
//     OWED_BY_ME  → I borrowed; my repayments are DEBIT entries (money out)
//     OWED_TO_ME  → I lent;    their repayments are CREDIT entries (money in)
//   outstanding = principal − Σ(repayment entries in the matching direction).
//   Payments are plain ledger entries tagged with beneficiaryId (+ obligationId).
import { db } from "@/lib/db";
import { ObligationDirection, ObligationStatus, ObligationType } from "@prisma/client";
import { toNum, toIso } from "./_serializers";
import { ensureCategory } from "./categories";
import { getEntries, createEntry } from "./entries";
import type { BeneficiaryDetail, BeneficiaryRow, ObligationRow } from "@/types";

/** Map of obligationId → { debit, credit } summed across tagged ledger entries. */
async function obligationFlows(): Promise<Map<string, { debit: number; credit: number }>> {
  const rows = await db.moneyEntry.groupBy({
    by: ["obligationId", "direction"],
    where: { obligationId: { not: null } },
    _sum: { amount: true },
  });
  const map = new Map<string, { debit: number; credit: number }>();
  for (const r of rows) {
    if (!r.obligationId) continue;
    const e = map.get(r.obligationId) ?? { debit: 0, credit: 0 };
    if (r.direction === "DEBIT") e.debit += toNum(r._sum.amount);
    else if (r.direction === "CREDIT") e.credit += toNum(r._sum.amount);
    map.set(r.obligationId, e);
  }
  return map;
}

function obligationOutstanding(
  type: ObligationType,
  direction: ObligationDirection,
  principal: number,
  flow: { debit: number; credit: number } | undefined
): { totalPaid: number; outstanding: number } {
  const repaid = direction === "OWED_BY_ME" ? (flow?.debit ?? 0) : (flow?.credit ?? 0);
  if (type === "RECURRING") return { totalPaid: repaid, outstanding: 0 };
  return { totalPaid: repaid, outstanding: principal - repaid };
}

type ObligationRecord = {
  id: string;
  beneficiaryId: string;
  type: ObligationType;
  direction: ObligationDirection;
  amount: { toNumber(): number } | number;
  frequency: string | null;
  startDate: Date;
  endDate: Date | null;
  status: ObligationStatus;
  notes: string | null;
};

function serializeObligation(
  o: ObligationRecord,
  flows: Map<string, { debit: number; credit: number }>
): ObligationRow {
  const principal = toNum(o.amount);
  const { totalPaid, outstanding } = obligationOutstanding(
    o.type,
    o.direction,
    principal,
    flows.get(o.id)
  );
  return {
    id: o.id,
    beneficiaryId: o.beneficiaryId,
    type: o.type,
    direction: o.direction,
    amount: principal,
    frequency: o.frequency,
    startDate: toIso(o.startDate)!,
    endDate: toIso(o.endDate),
    status: o.status,
    notes: o.notes,
    totalPaid,
    outstanding,
  };
}

export async function getBeneficiaries(): Promise<BeneficiaryRow[]> {
  const [beneficiaries, flows, paidByBen] = await Promise.all([
    db.beneficiary.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      include: { obligations: true },
    }),
    obligationFlows(),
    db.moneyEntry.groupBy({
      by: ["beneficiaryId"],
      where: { beneficiaryId: { not: null }, direction: "DEBIT" },
      _sum: { amount: true },
    }),
  ]);
  const paidMap = new Map(paidByBen.map((p) => [p.beneficiaryId, toNum(p._sum.amount)]));

  return beneficiaries.map((b) => {
    // Net within each direction so an overpayment on one loan reduces the
    // person's other loans, then clamp once at the person level. Clamping per
    // obligation would discard the excess and overstate the running due.
    let owedByMe = 0;
    let owedToMe = 0;
    for (const o of b.obligations) {
      if (o.type !== "LOAN" || o.status !== "ACTIVE") continue;
      const { outstanding } = obligationOutstanding(
        o.type,
        o.direction,
        toNum(o.amount),
        flows.get(o.id)
      );
      // outstanding may be negative (overpaid); keep the sign so it spills over.
      if (o.direction === "OWED_BY_ME") owedByMe += outstanding;
      else owedToMe += outstanding;
    }
    owedByMe = Math.max(0, owedByMe);
    owedToMe = Math.max(0, owedToMe);
    return {
      id: b.id,
      name: b.name,
      relationship: b.relationship,
      phone: b.phone,
      isActive: b.isActive,
      notes: b.notes,
      obligationCount: b.obligations.length,
      totalPaid: paidMap.get(b.id) ?? 0,
      outstandingByMe: owedByMe,
      outstandingToMe: owedToMe,
    };
  });
}

export async function getBeneficiaryDetail(id: string): Promise<BeneficiaryDetail | null> {
  const b = await db.beneficiary.findUnique({
    where: { id },
    include: { obligations: { orderBy: { startDate: "desc" } } },
  });
  if (!b) return null;

  const flows = await obligationFlows();
  const obligations = b.obligations.map((o) => serializeObligation(o, flows));
  const payments = await getEntries({ beneficiaryId: id });

  // Net across same-direction loans (an overpaid loan offsets the others), then
  // clamp once — mirrors getBeneficiaries so list and detail totals agree.
  const owedByMe = Math.max(
    0,
    obligations
      .filter((o) => o.type === "LOAN" && o.status === "ACTIVE" && o.direction === "OWED_BY_ME")
      .reduce((s, o) => s + o.outstanding, 0)
  );
  const owedToMe = Math.max(
    0,
    obligations
      .filter((o) => o.type === "LOAN" && o.status === "ACTIVE" && o.direction === "OWED_TO_ME")
      .reduce((s, o) => s + o.outstanding, 0)
  );
  const totalPaid = payments
    .filter((p) => p.direction === "DEBIT")
    .reduce((s, p) => s + p.amount, 0);

  return {
    id: b.id,
    name: b.name,
    relationship: b.relationship,
    phone: b.phone,
    isActive: b.isActive,
    notes: b.notes,
    obligationCount: obligations.length,
    totalPaid,
    outstandingByMe: owedByMe,
    outstandingToMe: owedToMe,
    obligations,
    payments,
  };
}

// ─── Beneficiary CRUD ──────────────────────────────────────────────────────--

export interface CreateBeneficiaryInput {
  name: string;
  relationship?: string | null;
  phone?: string | null;
  isActive?: boolean;
  notes?: string | null;
}

export async function createBeneficiary(input: CreateBeneficiaryInput) {
  return db.beneficiary.create({
    data: {
      name: input.name,
      relationship: input.relationship ?? null,
      phone: input.phone ?? null,
      isActive: input.isActive ?? true,
      notes: input.notes ?? null,
    },
  });
}

export async function updateBeneficiary(id: string, input: Partial<CreateBeneficiaryInput>) {
  return db.beneficiary.update({
    where: { id },
    data: {
      ...(input.name && { name: input.name }),
      ...(input.relationship !== undefined && { relationship: input.relationship }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.isActive != null && { isActive: input.isActive }),
      ...(input.notes !== undefined && { notes: input.notes }),
    },
  });
}

export async function deleteBeneficiary(id: string) {
  const entryCount = await db.moneyEntry.count({ where: { beneficiaryId: id } });
  if (entryCount > 0) {
    return {
      deleted: false,
      error: `Has ${entryCount} ledger entry(ies); deactivate instead to keep history.`,
    };
  }
  await db.$transaction([
    db.beneficiaryObligation.deleteMany({ where: { beneficiaryId: id } }),
    db.beneficiary.delete({ where: { id } }),
  ]);
  return { deleted: true };
}

// ─── Obligations (recurring + loans) ───────────────────────────────────────--

export interface CreateObligationInput {
  beneficiaryId: string;
  type: ObligationType;
  direction?: ObligationDirection;
  amount: number;
  frequency?: string | null;
  startDate: string;
  endDate?: string | null;
  status?: ObligationStatus;
  notes?: string | null;
}

export async function createObligation(input: CreateObligationInput) {
  return db.beneficiaryObligation.create({
    data: {
      beneficiaryId: input.beneficiaryId,
      type: input.type,
      direction: input.direction ?? ObligationDirection.OWED_BY_ME,
      amount: input.amount,
      frequency: input.frequency ?? null,
      startDate: new Date(input.startDate),
      endDate: input.endDate ? new Date(input.endDate) : null,
      status: input.status ?? ObligationStatus.ACTIVE,
      notes: input.notes ?? null,
    },
  });
}

export interface UpdateObligationInput {
  type?: ObligationType;
  direction?: ObligationDirection;
  amount?: number;
  frequency?: string | null;
  startDate?: string;
  endDate?: string | null;
  status?: ObligationStatus;
  notes?: string | null;
}

export async function updateObligation(id: string, input: UpdateObligationInput) {
  return db.beneficiaryObligation.update({
    where: { id },
    data: {
      ...(input.type && { type: input.type }),
      ...(input.direction && { direction: input.direction }),
      ...(input.amount != null && { amount: input.amount }),
      ...(input.frequency !== undefined && { frequency: input.frequency }),
      ...(input.startDate && { startDate: new Date(input.startDate) }),
      ...(input.endDate !== undefined && {
        endDate: input.endDate ? new Date(input.endDate) : null,
      }),
      ...(input.status && { status: input.status }),
      ...(input.notes !== undefined && { notes: input.notes }),
    },
  });
}

export async function deleteObligation(id: string) {
  // Keep payment history: untag entries (FK is SET NULL) by deleting the obligation.
  await db.beneficiaryObligation.delete({ where: { id } });
  return { deleted: true };
}

// ─── Record a payment to / from a person ──────────────────────────────────────

export interface RecordPaymentInput {
  beneficiaryId: string;
  amount: number;
  date: string;
  obligationId?: string | null;
  /** Direction of the money: DEBIT = I paid them (default); CREDIT = they paid me. */
  direction?: "DEBIT" | "CREDIT";
  accountId?: string | null;
  categoryId?: string | null; // defaults to a "Payments to People" category
  description?: string | null;
  notes?: string | null;
}

export async function recordPayment(input: RecordPaymentInput) {
  const direction = input.direction ?? "DEBIT";

  // Delegate to createEntry so the entry inherits the account's currency + the
  // captured fxRate (and amount validation), and returns a full MoneyEntryRow —
  // the same path manual entries and cross-domain links use. The payment is just
  // a ledger entry tagged with the beneficiary (+ obligation for loan repayments).
  // Atomic: the find-or-created category and the entry commit together, so a
  // rejected entry cannot leave a brand-new empty category behind.
  return db.$transaction(async (tx) => {
    const categoryId =
      input.categoryId ??
      (await ensureCategory(
        direction === "DEBIT" ? "Payments to People" : "Repayments from People",
        direction === "DEBIT" ? "EXPENSE" : "INCOME",
        tx
      ));

    return createEntry(
      {
        date: input.date,
        direction,
        amount: input.amount,
        categoryId,
        accountId: input.accountId ?? null,
        beneficiaryId: input.beneficiaryId,
        obligationId: input.obligationId ?? null,
        description: input.description ?? null,
        notes: input.notes ?? null,
      },
      tx
    );
  });
}
