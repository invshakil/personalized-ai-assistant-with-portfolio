import { useState, useCallback } from "react";
import { propertyApi } from "@/lib/api/property";
import { useFormDefaults } from "@/hooks/useFormDefaults";
import {
  EMPTY_SELECTION,
  pairValidValues,
  rememberAccountPair,
  seedAccountPair,
  withKindFallback,
  type AccountSelection,
} from "@/lib/accountPicker";
import type { MoneyAccountRow, PaymentWithTenant } from "@/types";

export function usePaymentDrawer(accounts: MoneyAccountRow[], onSuccess: () => Promise<void>) {
  const [drawer, setDrawer] = useState<{
    payment: PaymentWithTenant;
    mode: "pay" | "advance";
  } | null>(null);
  const [txType, setTxType] = useState("CASH");
  const [txAmount, setTxAmount] = useState("");
  const [txDate, setTxDate] = useState(new Date().toISOString().split("T")[0]);
  const [txNotes, setTxNotes] = useState("");
  const [txAccount, setTxAccount] = useState<AccountSelection>(EMPTY_SELECTION);
  const defaults = useFormDefaults("property.payment");
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);

  // Only real cash/bank receipts can land in an account. A stored default wins;
  // with none, the first Cash account for cash and the first Bank account for a
  // bank transfer — the behaviour this form had before defaults existed.
  const defaultAccountForType = useCallback(
    (type: string): AccountSelection => {
      if (type !== "CASH" && type !== "BANK_TRANSFER") return EMPTY_SELECTION;
      const seeded = seedAccountPair(accounts, defaults.seed(pairValidValues(accounts)));
      return withKindFallback(accounts, seeded, type === "CASH" ? "CASH" : "BANK");
    },
    [accounts, defaults]
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
    setTxAccount(defaultAccountForType(initialType));
    setTxError(null);
    setDrawer({ payment, mode });
  }

  function changeTxType(next: string) {
    setTxType(next);
    setTxAccount(defaultAccountForType(next));
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
          (txType === "CASH" || txType === "BANK_TRANSFER") && txAccount.accountId
            ? txAccount.accountId
            : undefined,
      });
      if (txType === "CASH" || txType === "BANK_TRANSFER") {
        defaults.remember(rememberAccountPair(txAccount));
      }
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
    txAccount,
    setTxAccount,
    txLoading,
    txError,
    openPayDrawer,
    submitTransaction,
  };
}
