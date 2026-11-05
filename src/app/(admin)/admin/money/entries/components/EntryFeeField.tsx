import NumberField from "@/components/admin/NumberField";
import type { MoneyAccountRow } from "@/types";
import { currencySymbol, fmtCurrency } from "../../format";
import type { EntryForm } from "../types";

interface EntryFeeFieldProps {
  form: EntryForm;
  setForm: React.Dispatch<React.SetStateAction<EntryForm>>;
  accounts: MoneyAccountRow[];
}

/**
 * The charge an account levies on top of a payment — a bank's transfer fee, a
 * mobile-wallet cash-out charge. The payee still gets `amount`; the account is
 * debited `amount + fee`, with the fee booked as its own linked expense.
 */
export default function EntryFeeField({ form, setForm, accounts }: EntryFeeFieldProps) {
  const cur = accounts.find((a) => a.id === form.accountId)?.currency ?? "BDT";
  const amountNum = parseFloat(form.amount);
  const feeNum = parseFloat(form.fee);
  const hasFee = Number.isFinite(feeNum) && feeNum > 0;
  const helper =
    hasFee && Number.isFinite(amountNum) && amountNum > 0
      ? `Account debited ${fmtCurrency(amountNum + feeNum, cur)} = ${fmtCurrency(amountNum, cur)} + ${fmtCurrency(feeNum, cur)} fee. Fee is recorded as a separate expense.`
      : "Charged by the account on top of the amount (e.g. a bank transfer fee).";

  return (
    <NumberField
      label={`Fee (${currencySymbol(cur)}) — optional`}
      min={0}
      value={form.fee}
      onChange={(v) => setForm((f) => ({ ...f, fee: v }))}
      helperText={helper}
      size="small"
      fullWidth
      sx={{ mb: 2 }}
    />
  );
}
