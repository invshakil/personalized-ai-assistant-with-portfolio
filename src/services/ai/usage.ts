// AI usage recording + monthly budget. All money is USD (Anthropic's billing
// unit), tracked separately from the BDT business ledgers. Powers the dashboard
// spend panel, the Settings → AI budget card, and chat-route enforcement.
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { toNum } from "@/services/finance/_serializers";
import { costUsd } from "./pricing";
import type {
  AiFeature,
  AiProviderId,
  BudgetInput,
  CreditSummary,
  UsageSummary,
  UsageTotals,
} from "./types";

/**
 * Record one call's token usage + computed cost.
 *
 * `feature` names the surface that spent it (chat, CSV categorisation, a
 * nightly insight…). It defaults to "chat" so the historical rows — all of
 * which were chat turns — stay correct, but new callers should always pass it.
 */
export async function recordUsage(input: {
  provider: AiProviderId;
  model: string;
  usage: UsageTotals;
  feature?: AiFeature;
}): Promise<void> {
  const { usage } = input;
  await db.aiUsage.create({
    data: {
      provider: input.provider,
      model: input.model,
      feature: input.feature ?? "chat",
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      cacheReadTokens: usage.cacheReadTokens,
      cacheCreateTokens: usage.cacheCreateTokens,
      costUsd: costUsd(input.model, usage),
    },
  });
}

async function ensureBudget() {
  return db.aiBudget.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton", enforce: false },
  });
}

/** Format a stored day as YYYY-MM-DD in local time (toISOString would shift it to UTC). */
const dateOnly = (d: Date | null): string | null =>
  d
    ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    : null;

const todayLocal = () => dateOnly(new Date()) as string;

/** Parse a YYYY-MM-DD as local midnight (so "as of" and "expires" are whole days). */
function parseDay(value: string, field: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) throw new Error(`${field} must be a date in YYYY-MM-DD form.`);
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (isNaN(d.getTime())) throw new Error(`${field} is not a valid date.`);
  return d;
}

function serializeBudget(row: {
  monthlyLimitUsd: Prisma.Decimal | null;
  enforce: boolean;
  creditBalanceUsd: Prisma.Decimal | null;
  creditAsOf: Date | null;
  creditExpiresAt: Date | null;
}): BudgetInput {
  return {
    monthlyLimitUsd: row.monthlyLimitUsd === null ? null : toNum(row.monthlyLimitUsd),
    enforce: row.enforce,
    creditBalanceUsd: row.creditBalanceUsd === null ? null : toNum(row.creditBalanceUsd),
    creditAsOf: dateOnly(row.creditAsOf),
    creditExpiresAt: dateOnly(row.creditExpiresAt),
  };
}

export async function getBudget(): Promise<BudgetInput> {
  return serializeBudget(await ensureBudget());
}

export async function setBudget(input: BudgetInput): Promise<BudgetInput> {
  if (
    input.monthlyLimitUsd !== null &&
    (!(input.monthlyLimitUsd >= 0) || !isFinite(input.monthlyLimitUsd))
  ) {
    throw new Error("Monthly limit must be a non-negative number.");
  }
  if (
    input.creditBalanceUsd !== null &&
    (!(input.creditBalanceUsd >= 0) || !isFinite(input.creditBalanceUsd))
  ) {
    throw new Error("Credit balance must be a non-negative number.");
  }
  // A balance only means something on a date; default "as of" to today so the
  // remaining-credit estimate has a starting point.
  const creditAsOf =
    input.creditBalanceUsd === null
      ? null
      : parseDay(input.creditAsOf ?? todayLocal(), "creditAsOf");
  const creditExpiresAt = input.creditExpiresAt
    ? parseDay(input.creditExpiresAt, "creditExpiresAt")
    : null;
  await ensureBudget();
  const row = await db.aiBudget.update({
    where: { id: "singleton" },
    data: {
      monthlyLimitUsd: input.monthlyLimitUsd,
      enforce: input.enforce,
      creditBalanceUsd: input.creditBalanceUsd,
      creditAsOf,
      creditExpiresAt,
    },
  });
  return serializeBudget(row);
}

/**
 * Remaining prepaid credit = the balance the user read off the Console minus
 * the spend this app has recorded since that day. An estimate: calls made
 * outside this app (or before pricing.ts knew a model) are not in AiUsage.
 */
export async function getCreditSummary(
  budget: BudgetInput,
  now = new Date()
): Promise<CreditSummary | null> {
  if (budget.creditBalanceUsd === null || !budget.creditAsOf) return null;
  const asOf = parseDay(budget.creditAsOf, "creditAsOf");
  const spentSince = await spendSince(asOf);
  const remainingUsd = Math.max(0, Math.round((budget.creditBalanceUsd - spentSince) * 1e6) / 1e6);
  let daysToExpiry: number | null = null;
  if (budget.creditExpiresAt) {
    const expires = parseDay(budget.creditExpiresAt, "creditExpiresAt");
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    daysToExpiry = Math.round((expires.getTime() - today.getTime()) / 86_400_000);
  }
  return {
    balanceUsd: budget.creditBalanceUsd,
    asOf: budget.creditAsOf,
    spentSince: Math.round(spentSince * 1e6) / 1e6,
    remainingUsd,
    expiresAt: budget.creditExpiresAt,
    daysToExpiry,
    expired: daysToExpiry !== null && daysToExpiry < 0,
  };
}

function monthStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

async function spendSince(from: Date): Promise<number> {
  const r = await db.aiUsage.aggregate({
    where: { createdAt: { gte: from } },
    _sum: { costUsd: true },
  });
  return toNum(r._sum.costUsd);
}

/** Month-to-date spend vs the budget — the gate the chat route checks. */
export async function isOverBudget(): Promise<boolean> {
  const budget = await getBudget();
  if (!budget.enforce || budget.monthlyLimitUsd === null) return false;
  const mtd = await spendSince(monthStart(new Date()));
  return mtd >= budget.monthlyLimitUsd;
}

/** Full spend summary for the dashboard + settings (USD). */
export async function getUsageSummary(): Promise<UsageSummary> {
  const now = new Date();
  const budget = await getBudget();

  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 29);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const [monthToDate, allTimeAgg, rows, dailyRows, featureRows, credit] = await Promise.all([
    spendSince(monthStart(now)),
    db.aiUsage.aggregate({ _sum: { costUsd: true } }),
    // Last 12 months of records for the monthly chart.
    db.aiUsage.findMany({
      where: { createdAt: { gte: new Date(now.getFullYear(), now.getMonth() - 11, 1) } },
      select: { createdAt: true, costUsd: true },
    }),
    // Last 30 days of records for the daily chart.
    db.aiUsage.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true, costUsd: true },
    }),
    // Month-to-date spend per product surface — which feature is worth its cost.
    db.aiUsage.groupBy({
      by: ["feature"],
      where: { createdAt: { gte: monthStart(now) } },
      _sum: { costUsd: true },
      _count: { _all: true },
    }),
    getCreditSummary(budget, now),
  ]);
  const allTime = toNum(allTimeAgg._sum.costUsd);

  // Build a dense 12-month series (oldest → current), filling empty months.
  const buckets = new Map<string, number>();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, 0);
  }
  for (const r of rows) {
    const key = `${r.createdAt.getFullYear()}-${String(r.createdAt.getMonth() + 1).padStart(2, "0")}`;
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + toNum(r.costUsd));
  }
  const monthly = Array.from(buckets.entries()).map(([period, costUsd]) => ({
    period,
    costUsd: Math.round(costUsd * 1e6) / 1e6,
  }));

  // Daily series — dense 30-day bucket, oldest → today.
  const dayBuckets = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    dayBuckets.set(key, 0);
  }
  for (const r of dailyRows) {
    const d = r.createdAt;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (dayBuckets.has(key)) dayBuckets.set(key, (dayBuckets.get(key) ?? 0) + toNum(r.costUsd));
  }
  const daily = Array.from(dayBuckets.entries()).map(([period, costUsd]) => ({
    period,
    costUsd: Math.round(costUsd * 1e6) / 1e6,
  }));

  const limit = budget.monthlyLimitUsd;
  const daysElapsed = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const projectedMonthEnd = daysElapsed ? (monthToDate / daysElapsed) * daysInMonth : monthToDate;

  return {
    currency: "USD",
    monthToDate,
    allTime,
    monthlyLimitUsd: limit,
    enforce: budget.enforce,
    remaining: limit === null ? null : Math.max(0, limit - monthToDate),
    pctUsed: limit ? Math.round((monthToDate / limit) * 1000) / 10 : null,
    projectedMonthEnd: Math.round(projectedMonthEnd * 100) / 100,
    overBudget: budget.enforce && limit !== null && monthToDate >= limit,
    monthly,
    daily,
    byFeature: featureRows
      .map((r) => ({
        feature: r.feature,
        costUsd: Math.round(toNum(r._sum.costUsd) * 1e6) / 1e6,
        calls: r._count._all,
      }))
      .sort((a, b) => b.costUsd - a.costUsd),
    credit,
  };
}
