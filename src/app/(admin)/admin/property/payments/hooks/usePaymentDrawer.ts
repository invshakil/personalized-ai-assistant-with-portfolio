import { useState, useCallback, useMemo } from "react";
import { propertyApi } from "@/lib/api/property";
import type { SelectOption } from "@/components/admin/SearchableSelect";
import type { MoneyAccountRow, PaymentWithTenant } from "@/types";
import { NO_ACCOUNT } from "../types";

export function usePaymentDrawer(accounts: MoneyAccountRow[], onSuccess: () => Promise<void>) {
  const [drawer, setDrawer] = useState<{
    payment: PaymentWithTenant;
    mode: "pay" | "advance";
  } | null>(null);
  const [txType, setTxType] = useState("CASH");
  const [txAmount, setTxAmount] = useState("");
  const [txDate, setTxDate] = useState(new Date().toISOString().split("T")[0]);
  const [txNotes, setTxNotes] = useState("");
  const [txAccountId, setTxAccountId] = useState<string>(NO_ACCOUNT);
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);

  // Pick a sensible default account for a transaction type: first CASH account
  // for cash, first BANK account for bank transfer; "" (none) otherwise.
  const defaultAccountForType = useCallback(
    (type: string): string => {
      if (type === "CASH") return accounts.find((a) => a.type === "CASH")?.id ?? NO_ACCOUNT;
      if (type === "BANK_TRANSFER")
        return accounts.find((a) => a.type === "BANK")?.id ?? NO_ACCOUNT;
      return NO_ACCOUNT;
    },
    [accounts]
  );

  // Account dropdown options: a "none" sentinel plus every account.
  const accountOptions: SelectOption[] = useMemo(
    () => [
      { value: NO_ACCOUNT, label: "— none / don't add to wallet —" },
      ...accounts.map((a) => ({ value: a.id, label: a.name })),
    ],
    [accounts]
  );

  function openPayDrawer(payment: PaymentWithTenant, mode: "pay" | "advance") {
    const outstanding = payment.balance;
    const maxApplicable =
      mode === "advance" ? Math.min(payment.advanceBalance, outstanding) : outstanding;
    const initialType = mode === "advance" ? "ADVANCE_APPLIED" : "CASH";
    setTxType(initialType);
    setTxAmount(String(maxApplicable > 0 ? maxApplicable : ""));
    setTxDate(new Date().toISOString().split("T")[0]);
    setTxNotes("");
    setTxAccountId(defaultAccountForType(initialType));
    setTxError(null);
    setDrawer({ payment, mode });
  }

  function changeTxType(next: string) {
    setTxType(next);
    setTxAccountId(defaultAccountForType(next));
  }

  async function submitTransaction() {
    if (!drawer) return;
    setTxLoading(true);
    setTxError(null);
    try {
      await propertyApi.addPaymentTransaction(drawer.payment.id, {
        type: txType,
        amount: parseFloat(txAmount),
        date: txDate,
        notes: txNotes || null,
        // Only link to the wallet for real cash/bank receipts when one is chosen.
        accountId:
          (txType === "CASH" || txType === "BANK_TRANSFER") && txAccountId
            ? txAccountId
            : undefined,
      });
      setDrawer(null);
      await onSuccess();
    } catch (e: unknown) {
      setTxError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setTxLoading(false);
    }
  }

  return {
    drawer,
    closeDrawer: () => setDrawer(null),
    txType,
    changeTxType,
    txAmount,
    setTxAmount,
    txDate,
    setTxDate,
    txNotes,
    setTxNotes,
    txAccountId,
    setTxAccountId,
    txLoading,
    txError,
    accountOptions,
    openPayDrawer,
    submitTransaction,
  };
}
