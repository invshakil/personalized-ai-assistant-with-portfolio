// AI usage recording + monthly budget. All money is USD (Anthropic's billing
// unit), tracked separately from the BDT business ledgers. Powers the dashboard
// spend panel, the Settings → AI budget card, and chat-route enforcement.
import { db } from "@/lib/db";
import { toNum } from "@/services/finance/_serializers";
import { costUsd } from "./pricing";
import type { AiProviderId, BudgetInput, UsageSummary, UsageTotals } from "./types";

/** Record one chat turn's token usage + computed cost. */
export async function recordUsage(input: {
  provider: AiProviderId;
  model: string;
  usage: UsageTotals;
}): Promise<void> {
  const { usage } = input;
  await db.aiUsage.create({
    data: {
      provider: input.provider,
      model: input.model,
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

export async function getBudget(): Promise<BudgetInput> {
  const row = await ensureBudget();
  return {
    monthlyLimitUsd: row.monthlyLimitUsd === null ? null : toNum(row.monthlyLimitUsd),
    enforce: row.enforce,
  };
}

export async function setBudget(input: BudgetInput): Promise<BudgetInput> {
  if (input.monthlyLimitUsd !== null && (!(input.monthlyLimitUsd >= 0) || !isFinite(input.monthlyLimitUsd))) {
    throw new Error("Monthly limit must be a non-negative number.");
  }
  await ensureBudget();
  const row = await db.aiBudget.update({
    where: { id: "singleton" },
    data: { monthlyLimitUsd: input.monthlyLimitUsd, enforce: input.enforce },
  });
  return {
    monthlyLimitUsd: row.monthlyLimitUsd === null ? null : toNum(row.monthlyLimitUsd),
    enforce: row.enforce,
  };
}

function monthStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

async function spendSince(from: Date): Promise<number> {
  const r = await db.aiUsage.aggregate({ where: { createdAt: { gte: from } }, _sum: { costUsd: true } });
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

  const [monthToDate, allTimeAgg, rows] = await Promise.all([
    spendSince(monthStart(now)),
    db.aiUsage.aggregate({ _sum: { costUsd: true } }),
    // Last 12 months of records for the monthly chart.
    db.aiUsage.findMany({
      where: { createdAt: { gte: new Date(now.getFullYear(), now.getMonth() - 11, 1) } },
      select: { createdAt: true, costUsd: true },
    }),
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
  };
}
