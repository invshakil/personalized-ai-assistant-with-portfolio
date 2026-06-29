// Money Manager — dashboard aggregations. Savings and balances are derived
// PURELY from the personal ledger (no double-count). Venture take-home from the
// Property and Finance modules is surfaced read-only for context — it is never
// summed into the savings number; you record it as income when it lands in an
// account. All money BDT; series are calendar-month, oldest first.
import { db } from "@/lib/db";
import { resolveRange, dateColumnWhere, type RangeInput } from "@/services/_shared/dateRange";
import { getPropertyFinancials } from "@/services/property/reports";
import { getMonthlyPnl } from "@/services/finance/reports";
import { getLatestRatesToBdt } from "@/services/_shared/fx";
import { toNum } from "./_serializers";
import { listAccountsWithBalances } from "./accounts";
import { getBeneficiaries } from "./beneficiaries";
import type { ExpenseCategorySlice, MoneyDashboardData, SavingsPoint, VenturePoint } from "@/types";

/** A per-row BDT rate (null/legacy → 1). Used to canonicalize foreign entries. */
const rowRate = (fxRate: { toNumber(): number } | number | null) =>
  fxRate == null ? 1 : toNum(fxRate);

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

/** Ledger-only monthly savings series + totals (income credits − expense debits). */
export async function getPersonalSavings(
  input: RangeInput = {}
): Promise<{ range: string; series: SavingsPoint[]; totals: MoneyDashboardData["totals"] }> {
  const range = resolveRange(input, "last_12_months");
  const entries = await db.moneyEntry.findMany({
    where: dateColumnWhere(range),
    select: {
      date: true,
      direction: true,
      amount: true,
      fxRate: true,
      category: { select: { kind: true } },
    },
  });

  // Savings is a BDT P&L: convert each foreign entry by its own captured rate
  // (historical), so the series is in one unit. BDT rows have fxRate 1 → no-op.
  const buckets = new Map<string, { income: number; expense: number }>();
  const get = (k: string) => buckets.get(k) ?? buckets.set(k, { income: 0, expense: 0 }).get(k)!;
  for (const e of entries) {
    if (e.direction === "TRANSFER") continue; // excluded from savings
    const b = get(monthKey(e.date));
    const bdt = toNum(e.amount) * rowRate(e.fxRate);
    if (e.direction === "CREDIT" && e.category?.kind === "INCOME") b.income += bdt;
    else if (e.direction === "DEBIT" && e.category?.kind === "EXPENSE") b.expense += bdt;
  }

  const series: SavingsPoint[] = Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, v]) => ({
      period,
      income: v.income,
      expense: v.expense,
      savings: v.income - v.expense,
    }));

  const income = series.reduce((s, m) => s + m.income, 0);
  const expense = series.reduce((s, m) => s + m.expense, 0);
  const savings = income - expense;
  return {
    range: range.label,
    series,
    totals: { income, expense, savings, savingsRate: income ? savings / income : 0 },
  };
}

/** READ-ONLY context: property net + business net per calendar month, plus the
 *  income you actually recorded in the ledger that month (for comparison). */
export async function getVentureContext(input: RangeInput = {}): Promise<VenturePoint[]> {
  const range = resolveRange(input, "last_12_months");
  const [property, business, recorded] = await Promise.all([
    getPropertyFinancials(input),
    getMonthlyPnl(input),
    db.moneyEntry.findMany({
      where: { ...dateColumnWhere(range), direction: "CREDIT" },
      select: { date: true, amount: true, fxRate: true, category: { select: { kind: true } } },
    }),
  ]);

  const map = new Map<string, VenturePoint>();
  const get = (period: string) =>
    map.get(period) ??
    map.set(period, { period, propertyNet: 0, businessNet: 0, recordedIncome: 0 }).get(period)!;

  for (const m of property.byMonth) get(m.period).propertyNet = m.net;
  for (const m of business.months) get(m.period).businessNet = m.netProfit;
  for (const e of recorded) {
    if (e.category?.kind === "INCOME")
      get(monthKey(e.date)).recordedIncome += toNum(e.amount) * rowRate(e.fxRate);
  }
  return Array.from(map.values()).sort((a, b) => a.period.localeCompare(b.period));
}

export async function getMoneyDashboard(input: RangeInput = {}): Promise<MoneyDashboardData> {
  const range = resolveRange(input, "last_12_months");

  const [savings, venture, accounts, beneficiaries, expenseRows] = await Promise.all([
    getPersonalSavings(input),
    getVentureContext(input),
    listAccountsWithBalances(),
    getBeneficiaries(),
    db.moneyEntry.findMany({
      where: { ...dateColumnWhere(range), direction: "DEBIT" },
      select: {
        amount: true,
        fxRate: true,
        category: { select: { id: true, name: true, kind: true } },
      },
    }),
  ]);

  // Expense breakdown by category (EXPENSE-kind debits only), largest first, in BDT.
  const catMap = new Map<string, ExpenseCategorySlice>();
  for (const e of expenseRows) {
    if (e.category?.kind !== "EXPENSE") continue;
    const slice =
      catMap.get(e.category.id) ??
      catMap
        .set(e.category.id, { categoryId: e.category.id, name: e.category.name, total: 0 })
        .get(e.category.id)!;
    slice.total += toNum(e.amount) * rowRate(e.fxRate);
  }
  const expenseByCategory = Array.from(catMap.values()).sort((a, b) => b.total - a.total);

  // Balances are per-account-currency; convert to BDT for the combined figures
  // using the latest cached/live rate. Also expose a per-currency breakdown so
  // the UI can show "৳X total (incl. $Y, €Z)" with the rate's as-of date.
  const rates = await getLatestRatesToBdt(accounts.map((a) => a.currency));
  const toBdt = (amount: number, currency: string) =>
    currency === "BDT" ? amount : amount * (rates.get(currency)?.rate ?? 0);

  const cashPosition = accounts
    .filter((a) => a.type !== "CREDIT_CARD")
    .reduce((s, a) => s + toBdt(a.balance, a.currency), 0);
  const cardDebt = accounts
    .filter((a) => a.type === "CREDIT_CARD")
    .reduce((s, a) => s + Math.max(0, -toBdt(a.balance, a.currency)), 0);

  // Per-currency native balances (asset accounts), for the dashboard breakdown.
  const byCurMap = new Map<string, number>();
  for (const a of accounts) {
    if (a.type === "CREDIT_CARD") continue;
    byCurMap.set(a.currency, (byCurMap.get(a.currency) ?? 0) + a.balance);
  }
  const balancesByCurrency = Array.from(byCurMap.entries()).map(([currency, native]) => ({
    currency,
    native,
    rate: currency === "BDT" ? 1 : (rates.get(currency)?.rate ?? null),
    bdt: toBdt(native, currency),
  }));
  // Latest rate timestamp across foreign currencies (for an "as of" indicator).
  const fxAsOf =
    Array.from(rates.values())
      .map((r) => r.asOf)
      .filter((d): d is string => !!d)
      .sort()
      .pop() ?? null;

  const peopleOwed = beneficiaries.reduce(
    (acc, b) => ({
      owedByMe: acc.owedByMe + b.outstandingByMe,
      owedToMe: acc.owedToMe + b.outstandingToMe,
    }),
    { owedByMe: 0, owedToMe: 0 }
  );

  return {
    range: range.label,
    totals: savings.totals,
    savings: savings.series,
    expenseByCategory,
    accounts: accounts.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      currency: a.currency,
      balance: a.balance,
      creditLimit: a.creditLimit,
      availableCredit: a.availableCredit,
    })),
    cashPosition,
    cardDebt,
    balancesByCurrency,
    fxAsOf,
    peopleOwed,
    venture,
  };
}
