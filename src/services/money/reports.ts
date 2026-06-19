// Money Manager — compact, read-only summaries for the AI assistant and CLI.
// Thin wrappers over the dashboard/services so the savings/balance definitions
// live in one place. All accept a flexible date range; money is BDT.
import { type RangeInput } from "@/services/_shared/dateRange";
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

/** Current balance of each account, plus aggregate cash position and card debt. */
export async function getAccountBalances() {
  const accounts = await listAccountsWithBalances();
  const cashPosition = accounts
    .filter((a) => a.type !== "CREDIT_CARD")
    .reduce((s, a) => s + a.balance, 0);
  const cardDebt = accounts
    .filter((a) => a.type === "CREDIT_CARD")
    .reduce((s, a) => s + Math.max(0, -a.balance), 0);
  return {
    cashPosition,
    cardDebt,
    accounts: accounts.map((a) => ({
      name: a.name,
      type: a.type,
      balance: a.balance,
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
