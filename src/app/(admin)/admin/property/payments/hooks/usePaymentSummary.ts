import type { PaymentWithTenant } from "@/types";

export function usePaymentSummary(payments: PaymentWithTenant[]) {
  const overdueCount = payments.filter(
    (p) => p.status === "OVERDUE" || (p.status === "PENDING" && p.balance > 0)
  ).length;
  const totalExpected = payments.reduce((s, p) => s + p.rentDue, 0);
  // Total Paid = cash/bank received (amountPaid). Collected also counts advance
  // drawn down; Outstanding is what is still due across the filtered set.
  const totalPaid = payments.reduce((s, p) => s + p.amountPaid, 0);
  const totalCollected = payments.reduce((s, p) => s + p.amountPaid + p.advanceApplied, 0);
  const totalOutstanding = payments.reduce((s, p) => s + p.balance, 0);

  return { overdueCount, totalExpected, totalPaid, totalCollected, totalOutstanding };
}
