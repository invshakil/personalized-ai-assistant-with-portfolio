// Money Manager — compact, read-only summaries for the AI assistant and CLI.
// Thin wrappers over the dashboard/services so the savings/balance definitions
// live in one place. All accept a flexible date range; money is BDT.
import { type RangeInput } from "@/services/_shared/dateRange";
import { getLatestRatesToBdt } from "@/services/_shared/fx";
import { getPersonalSavings, getMoneyDashboard } from "./dashboard";
import { listAccountsWithBalances } from "./accounts";
import { getBeneficiaries } from "./beneficiaries";

/** Monthly savings (income − expense) within a range. Default: last 12 months. */
export async function getMonthlySavings(input: RangeInput = {}) {
  const { range, series, totals } = await getPersonalSavings(input);
  return { range, totals, months: series };
}

/** Personal expense breakdown by category + overall totals. */
export async function getExpenseBreakdown(input: RangeInput = {}) {
  const dash = await getMoneyDashboard(input);
  return {
    range: dash.range,
    totalExpense: dash.totals.expense,
    byCategory: dash.expenseByCategory,
  };
}

/**
 * Current balance of each account (in its own currency), plus aggregate cash
 * position and card debt CONVERTED TO BDT at the latest rate so the totals are
 * comparable across currencies.
 */
export async function getAccountBalances() {
  const accounts = await listAccountsWithBalances();
  const rates = await getLatestRatesToBdt(accounts.map((a) => a.currency));
  const toBdt = (amount: number, currency: string) =>
    currency === "BDT" ? amount : amount * (rates.get(currency)?.rate ?? 0);

  const cashPosition = accounts
    .filter((a) => a.type !== "CREDIT_CARD")
    .reduce((s, a) => s + toBdt(a.balance, a.currency), 0);
  const cardDebt = accounts
    .filter((a) => a.type === "CREDIT_CARD")
    .reduce((s, a) => s + Math.max(0, -toBdt(a.balance, a.currency)), 0);
  return {
    cashPositionBdt: cashPosition,
    cardDebtBdt: cardDebt,
    accounts: accounts.map((a) => ({
      name: a.name,
      type: a.type,
      currency: a.currency,
      balance: a.balance, // in the account's currency
      balanceBdt: toBdt(a.balance, a.currency),
      availableCredit: a.availableCredit,
    })),
  };
}

/** Who I owe and who owes me, with lifetime paid per person. */
export async function getBeneficiaryBalances() {
  const people = await getBeneficiaries();
  return {
    totalOwedByMe: people.reduce((s, b) => s + b.outstandingByMe, 0),
    totalOwedToMe: people.reduce((s, b) => s + b.outstandingToMe, 0),
    people: people.map((b) => ({
      name: b.name,
      relationship: b.relationship,
      totalPaid: b.totalPaid,
      outstandingByMe: b.outstandingByMe,
      outstandingToMe: b.outstandingToMe,
    })),
  };
}
