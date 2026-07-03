import { Box, Button, FormControl, InputLabel, MenuItem, Select, TextField } from "@mui/material";
import { HandCoins } from "lucide-react";
import type { MoneyAccountRow, ObligationRow } from "@/types";
import PaymentAccountObligationFields from "./PaymentAccountObligationFields";

type PaymentForm = {
  amount: string;
  date: string;
  accountId: string;
  obligationId: string;
  direction: "DEBIT" | "CREDIT";
};

interface Props {
  form: PaymentForm;
  onChange: (form: PaymentForm) => void;
  accounts: MoneyAccountRow[];
  obligations: ObligationRow[];
  saving: boolean;
  onSave: () => void;
}

export default function RecordPaymentForm({
  form,
  onChange,
  accounts,
  obligations,
  saving,
  onSave,
}: Props) {
  return (
    <>
      <Box sx={{ display: "flex", gap: 1, mb: 1, flexWrap: "wrap" }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Direction</InputLabel>
          <Select
            label="Direction"
            value={form.direction}
            onChange={(e) => onChange({ ...form, direction: e.target.value as "DEBIT" | "CREDIT" })}
          >
            <MenuItem value="DEBIT">I paid them</MenuItem>
            <MenuItem value="CREDIT">They paid me</MenuItem>
          </Select>
        </FormControl>
        <TextField
          label="Amount (৳)"
          type="number"
          size="small"
          sx={{ width: 130 }}
          value={form.amount}
          onChange={(e) => onChange({ ...form, amount: e.target.value })}
        />
        <TextField
          label="Date"
          type="date"
          size="small"
          sx={{ width: 150 }}
          value={form.date}
          onChange={(e) => onChange({ ...form, date: e.target.value })}
        />
        <PaymentAccountObligationFields
          accountId={form.accountId}
          obligationId={form.obligationId}
          accounts={accounts}
          obligations={obligations}
          onAccountChange={(accountId) => onChange({ ...form, accountId })}
          onObligationChange={(obligationId) => onChange({ ...form, obligationId })}
        />
      </Box>
      <Button
        size="small"
        variant="contained"
        startIcon={<HandCoins size={15} />}
        onClick={onSave}
        disabled={saving || !form.amount}
      >
        {saving ? "Saving…" : "Record payment"}
      </Button>
    </>
  );
}
