import { TextField } from "@mui/material";
import SearchableSelect from "@/components/admin/SearchableSelect";
import type { MoneyAccountRow } from "@/types";
import type { TransferForm } from "../types";

interface TransferAccountFieldsProps {
  transfer: TransferForm;
  setTransfer: React.Dispatch<React.SetStateAction<TransferForm>>;
  accounts: MoneyAccountRow[];
}

export default function TransferAccountFields({
  transfer,
  setTransfer,
  accounts,
}: TransferAccountFieldsProps) {
  return (
    <>
      <TextField
        label="Date"
        type="date"
        size="small"
        fullWidth
        value={transfer.date}
        onChange={(e) => setTransfer((t) => ({ ...t, date: e.target.value }))}
        sx={{ mb: 2 }}
      />
      <SearchableSelect
        label="From"
        value={transfer.fromAccountId}
        options={accounts.map((a) => ({ value: a.id, label: a.name }))}
        onChange={(v) => setTransfer((t) => ({ ...t, fromAccountId: v }))}
        sx={{ mb: 2 }}
      />
      <SearchableSelect
        label="To"
        value={transfer.toAccountId}
        options={accounts
          .filter((a) => a.id !== transfer.fromAccountId)
          .map((a) => ({ value: a.id, label: a.name }))}
        onChange={(v) => setTransfer((t) => ({ ...t, toAccountId: v }))}
        sx={{ mb: 2 }}
      />
    </>
  );
}
