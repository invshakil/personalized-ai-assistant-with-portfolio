import { useState } from "react";
import { moneyApi } from "@/lib/api/money";
import { fmt, todayInput } from "../../format";
import type {
  BeneficiaryDetail,
  MoneyAccountRow,
  ObligationDirection,
  ObligationRow,
  ObligationType,
} from "@/types";

type ObligationForm = {
  type: ObligationType;
  direction: ObligationDirection;
  amount: string;
  frequency: string;
  startDate: string;
  notes: string;
};
const BLANK_OBLIGATION: ObligationForm = {
  type: "LOAN",
  direction: "OWED_BY_ME",
  amount: "",
  frequency: "monthly",
  startDate: todayInput(),
  notes: "",
};

type PaymentForm = {
  amount: string;
  date: string;
  accountId: string;
  obligationId: string;
  direction: "DEBIT" | "CREDIT";
};
const BLANK_PAYMENT: PaymentForm = {
  amount: "",
  date: todayInput(),
  accountId: "",
  obligationId: "",
  direction: "DEBIT",
};

type OpenConfirm = (
  title: string,
  message: string,
  onConfirm: () => Promise<void>,
  opts?: { confirmLabel?: string; confirmColor?: "error" | "warning" | "success" | "primary" }
) => void;

/** Owns the person detail drawer: obligations, payments, and the "add to due" flow. */
export function usePersonDetail(
  accounts: MoneyAccountRow[],
  onChanged: () => void,
  openConfirm: OpenConfirm
) {
  const [detail, setDetail] = useState<BeneficiaryDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [obForm, setObForm] = useState<ObligationForm>(BLANK_OBLIGATION);
  const [obSaving, setObSaving] = useState(false);

  const [payForm, setPayForm] = useState<PaymentForm>(BLANK_PAYMENT);
  const [paySaving, setPaySaving] = useState(false);

  // Inline "add to due" (grow a loan balance for a new credit purchase / further lending)
  const [addDueId, setAddDueId] = useState<string | null>(null);
  const [addDueAmount, setAddDueAmount] = useState("");
  const [addDueSaving, setAddDueSaving] = useState(false);

  // Inline edit of an obligation's amount (fix a wrong figure) + delete.
  const [editObId, setEditObId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  async function openDetail(id: string) {
    setDetailLoading(true);
    setDetailError(null);
    setObForm({ ...BLANK_OBLIGATION, startDate: todayInput() });
    setPayForm({ ...BLANK_PAYMENT, date: todayInput(), accountId: accounts[0]?.id ?? "" });
    setAddDueId(null);
    setAddDueAmount("");
    setEditObId(null);
    setEditAmount("");
    try {
      setDetail(await moneyApi.getBeneficiary(id));
    } finally {
      setDetailLoading(false);
    }
  }

  function closeDetail() {
    setDetail(null);
  }

  async function refreshDetail() {
    if (!detail) return;
    setDetail(await moneyApi.getBeneficiary(detail.id));
    onChanged();
  }

  async function addObligation() {
    if (!detail) return;
    setObSaving(true);
    setDetailError(null);
    try {
      await moneyApi.createObligation(detail.id, {
        type: obForm.type,
        direction: obForm.direction,
        amount: parseFloat(obForm.amount),
        frequency: obForm.type === "RECURRING" ? obForm.frequency || null : null,
        startDate: obForm.startDate,
      });
      setObForm({ ...BLANK_OBLIGATION, startDate: todayInput() });
      await refreshDetail();
    } catch (e: unknown) {
      setDetailError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setObSaving(false);
    }
  }

  async function recordPayment() {
    if (!detail) return;
    setPaySaving(true);
    setDetailError(null);
    try {
      await moneyApi.recordPayment(detail.id, {
        amount: parseFloat(payForm.amount),
        date: payForm.date,
        accountId: payForm.accountId || null,
        obligationId: payForm.obligationId || null,
        direction: payForm.direction,
      });
      setPayForm({ ...BLANK_PAYMENT, date: todayInput(), accountId: accounts[0]?.id ?? "" });
      await refreshDetail();
    } catch (e: unknown) {
      setDetailError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setPaySaving(false);
    }
  }

  // Grow a loan balance — a new purchase on a shop tab, or lending more. No cash
  // moves; only the obligation's principal goes up (outstanding follows).
  async function addToDue(o: ObligationRow) {
    if (!detail) return;
    const delta = parseFloat(addDueAmount);
    if (!delta || delta <= 0) return;
    setAddDueSaving(true);
    setDetailError(null);
    try {
      await moneyApi.updateObligation(detail.id, o.id, { amount: o.amount + delta });
      setAddDueId(null);
      setAddDueAmount("");
      await refreshDetail();
    } catch (e: unknown) {
      setDetailError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setAddDueSaving(false);
    }
  }

  function startAddDue(id: string) {
    setAddDueId(id);
    setAddDueAmount("");
    setDetailError(null);
  }

  function cancelAddDue() {
    setAddDueId(null);
    setAddDueAmount("");
  }

  // Correct a wrong figure: overwrite the obligation's amount (its principal).
  // For a loan the outstanding balance recomputes from the new principal.
  function startEditObligation(o: ObligationRow) {
    setEditObId(o.id);
    setEditAmount(String(o.amount));
    setAddDueId(null);
    setDetailError(null);
  }

  function cancelEditObligation() {
    setEditObId(null);
    setEditAmount("");
  }

  async function saveObligation(o: ObligationRow) {
    if (!detail) return;
    const amount = parseFloat(editAmount);
    if (!amount || amount <= 0) {
      setDetailError("Amount must be greater than zero");
      return;
    }
    setEditSaving(true);
    setDetailError(null);
    try {
      await moneyApi.updateObligation(detail.id, o.id, { amount });
      setEditObId(null);
      setEditAmount("");
      await refreshDetail();
    } catch (e: unknown) {
      setDetailError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setEditSaving(false);
    }
  }

  // Delete an obligation. Payment history is kept — the FK is SET NULL, so tagged
  // ledger entries simply lose their obligation link rather than being removed.
  function deleteObligation(o: ObligationRow) {
    if (!detail) return;
    const benId = detail.id;
    const kind = o.type === "LOAN" ? "loan" : "recurring obligation";
    openConfirm(
      "Delete obligation",
      `Delete this ${kind} of ${fmt(o.amount)}? Payment history is kept but will no longer be linked to it. This cannot be undone.`,
      async () => {
        try {
          await moneyApi.deleteObligation(benId, o.id);
          await refreshDetail();
        } catch (e: unknown) {
          setDetailError(e instanceof Error ? e.message : "Failed to delete");
        }
      },
      { confirmLabel: "Delete", confirmColor: "error" }
    );
  }

  return {
    detail,
    detailLoading,
    detailError,
    obForm,
    setObForm,
    obSaving,
    payForm,
    setPayForm,
    paySaving,
    addDueId,
    addDueAmount,
    setAddDueAmount,
    addDueSaving,
    openDetail,
    closeDetail,
    addObligation,
    recordPayment,
    addToDue,
    startAddDue,
    cancelAddDue,
    editObId,
    editAmount,
    setEditAmount,
    editSaving,
    startEditObligation,
    cancelEditObligation,
    saveObligation,
    deleteObligation,
  };
}
