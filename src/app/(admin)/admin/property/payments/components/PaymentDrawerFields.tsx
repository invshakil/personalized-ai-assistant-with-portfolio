import { FormControl, InputLabel, MenuItem, Select, TextField } from "@mui/material";
import SearchableSelect, { type SelectOption } from "@/components/admin/SearchableSelect";
import type { MoneyAccountRow, PaymentWithTenant } from "@/types";

interface PaymentDrawerFieldsProps {
  payment: PaymentWithTenant;
  mode: "pay" | "advance";
  txType: string;
  onTxTypeChange: (v: string) => void;
  accounts: MoneyAccountRow[];
  accountOptions: SelectOption[];
  txAccountId: string;
  onTxAccountChange: (v: string) => void;
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
  accountOptions,
  txAccountId,
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
          <SearchableSelect
            label="Add to wallet/account (optional)"
            value={txAccountId}
            options={accountOptions}
            onChange={onTxAccountChange}
            sx={{ mb: 2 }}
          />
        )}

      <TextField
        label="Amount (৳)"
        type="number"
        size="small"
        fullWidth
        value={txAmount}
        onChange={(e) => onTxAmountChange(e.target.value)}
        sx={{ mb: 2 }}
        slotProps={{
          htmlInput: {
            max: mode === "advance" ? Math.min(payment.advanceBalance, payment.balance) : undefined,
          },
        }}
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
