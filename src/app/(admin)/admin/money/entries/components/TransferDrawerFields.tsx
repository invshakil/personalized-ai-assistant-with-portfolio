import { Alert, Button, TextField } from "@mui/material";
import type { MoneyAccountRow } from "@/types";
import { currencySymbol, fmtCurrency } from "../../format";
import type { TransferForm } from "../types";
import TransferAccountFields from "./TransferAccountFields";

interface TransferDrawerFieldsProps {
  transfer: TransferForm;
  setTransfer: React.Dispatch<React.SetStateAction<TransferForm>>;
  accounts: MoneyAccountRow[];
  transferSaving: boolean;
  transferError: string | null;
  onSave: () => void;
}

export default function TransferDrawerFields({
  transfer,
  setTransfer,
  accounts,
  transferSaving,
  transferError,
  onSave,
}: TransferDrawerFieldsProps) {
  const fromCur = accounts.find((a) => a.id === transfer.fromAccountId)?.currency ?? "BDT";
  const toCur = accounts.find((a) => a.id === transfer.toAccountId)?.currency ?? "BDT";
  const crossCurrency = !!transfer.fromAccountId && !!transfer.toAccountId && fromCur !== toCur;

  const amountNum = parseFloat(transfer.amount);
  const feeNum = parseFloat(transfer.fee);
  const hasFee = Number.isFinite(feeNum) && feeNum > 0;
  const feePct =
    hasFee && Number.isFinite(amountNum) && amountNum > 0
      ? ` (${(Math.round((feeNum / amountNum) * 1000) / 10).toLocaleString("en-IN")}% of amount)`
      : "";
  const feeHelper =
    hasFee && Number.isFinite(amountNum) && amountNum > 0
      ? `Source debited ${fmtCurrency(amountNum + feeNum, fromCur)} = ${fmtCurrency(amountNum, fromCur)} transfer + ${fmtCurrency(feeNum, fromCur)} fee${feePct}. Fee is recorded as an expense.`
      : "Optional. Charge the source takes on the transfer (e.g. mobile-wallet cash-out). Recorded as an expense.";

  return (
    <>
      <TransferAccountFields transfer={transfer} setTransfer={setTransfer} accounts={accounts} />
      <TextField
        label={`Amount (${currencySymbol(fromCur)})`}
        type="number"
        size="small"
        fullWidth
        value={transfer.amount}
        onChange={(e) => setTransfer((t) => ({ ...t, amount: e.target.value }))}
        sx={{ mb: 2 }}
      />
      {crossCurrency && (
        <TextField
          label={`Amount received (${currencySymbol(toCur)})`}
          type="number"
          size="small"
          fullWidth
          value={transfer.toAmount}
          onChange={(e) => setTransfer((t) => ({ ...t, toAmount: e.target.value }))}
          helperText={`Cross-currency: enter how much ${toCur} arrives in the destination.`}
          sx={{ mb: 2 }}
        />
      )}
      <TextField
        label={`Fee (${currencySymbol(fromCur)}) — optional`}
        type="number"
        size="small"
        fullWidth
        value={transfer.fee}
        onChange={(e) => setTransfer((t) => ({ ...t, fee: e.target.value }))}
        helperText={feeHelper}
        sx={{ mb: 2 }}
      />
      <TextField
        label="Description"
        size="small"
        fullWidth
        value={transfer.description}
        onChange={(e) => setTransfer((t) => ({ ...t, description: e.target.value }))}
        sx={{ mb: 2 }}
      />
      {transferError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {transferError}
        </Alert>
      )}
      <Button
        variant="contained"
        fullWidth
        onClick={onSave}
        disabled={
          transferSaving ||
          !transfer.fromAccountId ||
          !transfer.toAccountId ||
          !transfer.amount ||
          (crossCurrency && !transfer.toAmount)
        }
      >
        {transferSaving ? "Saving…" : "Record Transfer"}
      </Button>
    </>
  );
}
