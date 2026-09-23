import { FormControl, InputLabel, MenuItem, Select, TextField } from "@mui/material";
import AccountTypeAccountSelect from "@/components/admin/AccountTypeAccountSelect";
import type { MoneyAccountRow, PaymentWithTenant } from "@/types";
import NumberField from "@/components/admin/NumberField";
import type { AccountSelection } from "@/lib/accountPicker";

interface PaymentDrawerFieldsProps {
  payment: PaymentWithTenant;
  mode: "pay" | "advance";
  txType: string;
  onTxTypeChange: (v: string) => void;
  accounts: MoneyAccountRow[];
  txAccount: AccountSelection;
  onTxAccountChange: (sel: AccountSelection) => void;
  txAmount: string;
  onTxAmountChange: (v: string) => void;
  txDate: string;
  onTxDateChange: (v: string) => void;
  txNotes: string;
  onTxNotesChange: (v: string) => void;
}

export default function PaymentDrawerFields({
  payment,
  mode,
  txType,
  onTxTypeChange,
  accounts,
  txAccount,
  onTxAccountChange,
  txAmount,
  onTxAmountChange,
  txDate,
  onTxDateChange,
  txNotes,
  onTxNotesChange,
}: PaymentDrawerFieldsProps) {
  return (
    <>
      {mode === "pay" && (
        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>Type</InputLabel>
          <Select label="Type" value={txType} onChange={(e) => onTxTypeChange(e.target.value)}>
            <MenuItem value="CASH">Cash</MenuItem>
            <MenuItem value="BANK_TRANSFER">Bank Transfer</MenuItem>
            <MenuItem value="ADJUSTMENT">Adjustment</MenuItem>
            <MenuItem value="OTHER">Other</MenuItem>
          </Select>
        </FormControl>
      )}

      {/* Optional wallet link — only for real cash/bank receipts */}
      {mode === "pay" &&
        (txType === "CASH" || txType === "BANK_TRANSFER") &&
        accounts.length > 0 && (
          <AccountTypeAccountSelect
            accounts={accounts}
            accountLabel="Add to account (optional)"
            value={txAccount}
            onChange={onTxAccountChange}
            optional
            noneLabel="— none / don't add to an account —"
            sx={{ mb: 2 }}
          />
        )}

      <NumberField
        label="Amount (৳)"
        size="small"
        fullWidth
        value={txAmount}
        onChange={onTxAmountChange}
        min={0}
        max={mode === "advance" ? Math.min(payment.advanceBalance, payment.balance) : undefined}
        sx={{ mb: 2 }}
      />
      <TextField
        label="Date"
        type="date"
        size="small"
        fullWidth
        value={txDate}
        onChange={(e) => onTxDateChange(e.target.value)}
        sx={{ mb: 2 }}
      />
      <TextField
        label="Notes (optional)"
        size="small"
        fullWidth
        value={txNotes}
        onChange={(e) => onTxNotesChange(e.target.value)}
        sx={{ mb: 2 }}
      />
    </>
  );
}
