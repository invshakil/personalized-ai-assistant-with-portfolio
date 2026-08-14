import type { PaymentWithTenant } from "@/types";

export function usePaymentSummary(payments: PaymentWithTenant[]) {
  const overdueCount = payments.filter(
    (p) => p.status === "OVERDUE" || (p.status === "PENDING" && p.balance > 0)
  ).length;
  // Expected is what was billed — vouchers have already been deducted from
  // rentDue, so a credited month lowers Expected rather than inflating anything.
  const totalExpected = payments.reduce((s, p) => s + p.rentDue, 0);
  // Collected is cash/bank that actually came in. Advance drawn down settles a
  // bill but is not new money this month (the cash arrived when the advance was
  // taken), so it is reported on its own rather than folded in here.
  const totalCollected = payments.reduce((s, p) => s + p.amountPaid, 0);
  const totalAdvanceApplied = payments.reduce((s, p) => s + p.advanceApplied, 0);
  const totalOutstanding = payments.reduce((s, p) => s + p.balance, 0);

  return {
    overdueCount,
    totalExpected,
    totalCollected,
    totalAdvanceApplied,
    totalOutstanding,
  };
}
