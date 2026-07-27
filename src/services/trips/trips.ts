// Trip Expense Manager — trip + budget CRUD and publish/unpublish. A trip is a
// tag over the money ledger; actuals are derived from the tagged MoneyEntry rows
// (never stored), mirroring how account balances work.
import { db } from "@/lib/db";
import { Prisma, TripStatus, type TripCategory } from "@prisma/client";
import { isSupportedCurrency } from "@/services/_shared/fx";
import { toNum, toIso, money2 } from "./_serializers";
import type { TripBudgetRow, TripRow } from "@/types";

/** Validate + normalize a currency code (well-formed ISO code). */
function normalizeCurrency(code: string | undefined, field: string): string {
  const c = (code || "").toUpperCase();
  if (!isSupportedCurrency(c)) throw new Error(`${field} must be a 3-letter currency code`);
  return c;
}

/** A trip's foreign wallet must hold the trip's local currency, or the wallet math is wrong. */
async function assertWalletCurrency(accountId: string | null | undefined, localCurrency: string) {
  if (!accountId) return;
  const acct = await db.moneyAccount.findUnique({
    where: { id: accountId },
    select: { currency: true },
  });
  if (!acct) throw new Error("Wallet account not found");
  if (acct.currency !== localCurrency) {
    throw new Error(
      `Wallet account currency (${acct.currency}) must match the trip's local currency (${localCurrency})`
    );
  }
}

const TRIP_INCLUDE = {
  localWalletAccount: { select: { name: true } },
  budgets: { orderBy: { category: "asc" } },
} satisfies Prisma.TripInclude;

type TripWith = Prisma.TripGetPayload<{ include: typeof TRIP_INCLUDE }>;

function serializeBudget(b: TripWith["budgets"][number]): TripBudgetRow {
  return {
    id: b.id,
    tripId: b.tripId,
    category: b.category,
    plannedAmount: toNum(b.plannedAmount),
  };
}

/** Total group cost (BDT, all payers) + expense count for a trip. Reads the split
 *  ledger (TripExpense) — the source of truth — not the money ledger, so it counts
 *  friend-paid and credit-card expenses too. */
async function actualsFor(
  tripId: string
): Promise<{ totalActualBdt: number; expenseCount: number }> {
  const agg = await db.tripExpense.aggregate({
    where: { tripId },
    _sum: { amountBdt: true },
    _count: true,
  });
  return { totalActualBdt: money2(toNum(agg._sum.amountBdt)), expenseCount: agg._count };
}

function serializeTrip(
  t: TripWith,
  actuals: { totalActualBdt: number; expenseCount: number }
): TripRow {
  const budgets = t.budgets.map(serializeBudget);
  const totalPlannedBdt = money2(budgets.reduce((s, b) => s + b.plannedAmount, 0));
  return {
    id: t.id,
    name: t.name,
    destination: t.destination,
    homeCurrency: t.homeCurrency,
    localCurrency: t.localCurrency,
    startDate: toIso(t.startDate)!,
    endDate: toIso(t.endDate),
    status: t.status,
    localWalletAccountId: t.localWalletAccountId,
    localWalletAccountName: t.localWalletAccount?.name ?? null,
    notes: t.notes,
    publicSlug: t.publicSlug,
    isPublic: t.isPublic,
    publicIntro: t.publicIntro,
    budgets,
    totalPlannedBdt,
    totalActualBdt: actuals.totalActualBdt,
    expenseCount: actuals.expenseCount,
  };
}

export async function getTrips(): Promise<TripRow[]> {
  const trips = await db.trip.findMany({ orderBy: [{ startDate: "desc" }], include: TRIP_INCLUDE });
  if (!trips.length) return [];
  // One query for all trips' split-ledger expenses, bucketed in memory — no N+1.
  const rows = await db.tripExpense.findMany({
    where: { tripId: { in: trips.map((t) => t.id) } },
    select: { tripId: true, amountBdt: true },
  });
  const actuals = new Map<string, { totalActualBdt: number; expenseCount: number }>();
  for (const r of rows) {
    const acc = actuals.get(r.tripId) ?? { totalActualBdt: 0, expenseCount: 0 };
    acc.totalActualBdt += toNum(r.amountBdt);
    acc.expenseCount += 1;
    actuals.set(r.tripId, acc);
  }
  return trips.map((t) => {
    const a = actuals.get(t.id) ?? { totalActualBdt: 0, expenseCount: 0 };
    return serializeTrip(t, {
      totalActualBdt: money2(a.totalActualBdt),
      expenseCount: a.expenseCount,
    });
  });
}

export async function getTrip(id: string): Promise<TripRow | null> {
  const t = await db.trip.findUnique({ where: { id }, include: TRIP_INCLUDE });
  return t ? serializeTrip(t, await actualsFor(t.id)) : null;
}

export interface CreateTripInput {
  name: string;
  destination: string;
  localCurrency: string;
  homeCurrency?: string;
  startDate: string;
  endDate?: string | null;
  status?: TripStatus;
  localWalletAccountId?: string | null;
  notes?: string | null;
  publicIntro?: string | null;
}

export async function createTrip(input: CreateTripInput): Promise<TripRow> {
  if (!input.name?.trim()) throw new Error("name is required");
  if (!input.destination?.trim()) throw new Error("destination is required");
  if (!input.startDate) throw new Error("startDate is required");
  const startDate = new Date(input.startDate);
  if (Number.isNaN(startDate.getTime())) throw new Error("startDate is not a valid date");
  const endDate = input.endDate ? new Date(input.endDate) : null;
  if (endDate && Number.isNaN(endDate.getTime())) throw new Error("endDate is not a valid date");
  const localCurrency = normalizeCurrency(input.localCurrency, "localCurrency");
  const homeCurrency = normalizeCurrency(input.homeCurrency || "BDT", "homeCurrency");
  await assertWalletCurrency(input.localWalletAccountId, localCurrency);
  // Create the trip and its "self" participant ("Me") atomically — every trip has
  // exactly one, and the group-split math anchors on it.
  const t = await db.$transaction(async (tx) => {
    const trip = await tx.trip.create({
      data: {
        name: input.name.trim(),
        destination: input.destination.trim(),
        localCurrency,
        homeCurrency,
        startDate,
        endDate,
        status: input.status ?? TripStatus.PLANNING,
        localWalletAccountId: input.localWalletAccountId || null,
        notes: input.notes ?? null,
        publicIntro: input.publicIntro ?? null,
      },
      include: TRIP_INCLUDE,
    });
    await tx.tripParticipant.create({ data: { tripId: trip.id, name: "Me", isSelf: true } });
    return trip;
  });
  return serializeTrip(t, { totalActualBdt: 0, expenseCount: 0 });
}

export interface UpdateTripInput {
  name?: string;
  destination?: string;
  localCurrency?: string;
  homeCurrency?: string;
  startDate?: string;
  endDate?: string | null;
  status?: TripStatus;
  localWalletAccountId?: string | null;
  notes?: string | null;
  publicIntro?: string | null;
}

export async function updateTrip(id: string, input: UpdateTripInput): Promise<TripRow> {
  if (input.localCurrency !== undefined) normalizeCurrency(input.localCurrency, "localCurrency");
  if (input.homeCurrency !== undefined) normalizeCurrency(input.homeCurrency, "homeCurrency");
  const startDate = input.startDate ? new Date(input.startDate) : undefined;
  if (startDate && Number.isNaN(startDate.getTime()))
    throw new Error("startDate is not a valid date");
  const endDate =
    input.endDate !== undefined ? (input.endDate ? new Date(input.endDate) : null) : undefined;
  if (endDate && Number.isNaN(endDate.getTime())) throw new Error("endDate is not a valid date");

  // Keep wallet ↔ localCurrency coherent whenever either is touched.
  if (input.localCurrency !== undefined || input.localWalletAccountId !== undefined) {
    const current = await db.trip.findUnique({
      where: { id },
      select: { localCurrency: true, localWalletAccountId: true },
    });
    if (!current) throw new Error("Trip not found");
    const nextLocal = input.localCurrency
      ? normalizeCurrency(input.localCurrency, "localCurrency")
      : current.localCurrency;
    const nextWallet =
      input.localWalletAccountId !== undefined
        ? input.localWalletAccountId || null
        : current.localWalletAccountId;
    await assertWalletCurrency(nextWallet, nextLocal);
  }

  const t = await db.trip.update({
    where: { id },
    data: {
      ...(input.name && { name: input.name.trim() }),
      ...(input.destination && { destination: input.destination.trim() }),
      ...(input.localCurrency && { localCurrency: input.localCurrency.toUpperCase() }),
      ...(input.homeCurrency && { homeCurrency: input.homeCurrency.toUpperCase() }),
      ...(startDate && { startDate }),
      ...(endDate !== undefined && { endDate }),
      ...(input.status && { status: input.status }),
      ...(input.localWalletAccountId !== undefined && {
        localWalletAccountId: input.localWalletAccountId || null,
      }),
      ...(input.notes !== undefined && { notes: input.notes }),
      ...(input.publicIntro !== undefined && { publicIntro: input.publicIntro }),
    },
    include: TRIP_INCLUDE,
  });
  return serializeTrip(t, await actualsFor(id));
}

/** Delete a trip. Tagged ledger entries are untagged (tripId → null), not removed;
 *  budgets cascade. The money ledger stays intact. */
export async function deleteTrip(id: string): Promise<{ deleted: boolean }> {
  await db.trip.delete({ where: { id } });
  return { deleted: true };
}

// ─── Budgets ────────────────────────────────────────────────────────────────

export async function getTripBudgets(tripId: string): Promise<TripBudgetRow[]> {
  const rows = await db.tripBudget.findMany({ where: { tripId }, orderBy: { category: "asc" } });
  return rows.map(serializeBudget);
}

/** Upsert one category's planned amount (BDT). Zero/absent budgets need no row. */
export async function setTripBudget(
  tripId: string,
  category: TripCategory,
  plannedAmount: number
): Promise<TripBudgetRow> {
  if (!Number.isFinite(plannedAmount) || plannedAmount < 0)
    throw new Error("plannedAmount must be a finite, non-negative number");
  const b = await db.tripBudget.upsert({
    where: { tripId_category: { tripId, category } },
    update: { plannedAmount },
    create: { tripId, category, plannedAmount },
  });
  return serializeBudget(b);
}

export async function deleteTripBudget(tripId: string, category: TripCategory) {
  await db.tripBudget.deleteMany({ where: { tripId, category } });
  return { deleted: true };
}

// ─── Publish ──────────────────────────────────────────────────────────────--

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** Publish a trip to /trips/<slug>. The slug is minted once and kept stable. */
export async function publishTrip(id: string): Promise<TripRow> {
  const trip = await db.trip.findUnique({ where: { id } });
  if (!trip) throw new Error("Trip not found");
  const slug = trip.publicSlug ?? `${slugify(trip.name) || "trip"}-${id.slice(-6)}`;
  const t = await db.trip.update({
    where: { id },
    data: { isPublic: true, publicSlug: slug },
    include: TRIP_INCLUDE,
  });
  return serializeTrip(t, await actualsFor(id));
}

/** Hide the public page but keep the slug so re-publishing reuses the same URL. */
export async function unpublishTrip(id: string): Promise<TripRow> {
  const t = await db.trip.update({
    where: { id },
    data: { isPublic: false },
    include: TRIP_INCLUDE,
  });
  return serializeTrip(t, await actualsFor(id));
}
