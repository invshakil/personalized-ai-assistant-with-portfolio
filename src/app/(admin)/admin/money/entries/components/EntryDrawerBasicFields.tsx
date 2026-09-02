import { TextField, ToggleButton, ToggleButtonGroup } from "@mui/material";
import type { MoneyAccountRow, MoneyCategoryRow } from "@/types";
import AmountField from "@/components/admin/AmountField";
import { currencySymbol } from "../../format";
import type { EntryDir, EntryForm } from "../types";
import EntryDrawerCategoryFields from "./EntryDrawerCategoryFields";

interface EntryDrawerBasicFieldsProps {
  form: EntryForm;
  setForm: React.Dispatch<React.SetStateAction<EntryForm>>;
  accounts: MoneyAccountRow[];
  formCategories: MoneyCategoryRow[];
  onDirectionChange: (direction: EntryDir) => void;
}

export default function EntryDrawerBasicFields({
  form,
  setForm,
  accounts,
  formCategories,
  onDirectionChange,
}: EntryDrawerBasicFieldsProps) {
  return (
    <>
      <ToggleButtonGroup
        exclusive
        fullWidth
        size="small"
        value={form.direction}
        onChange={(_e, v) => v && onDirectionChange(v as EntryDir)}
        sx={{ mb: 2 }}
      >
        <ToggleButton value="DEBIT" color="warning">
          Expense
        </ToggleButton>
        <ToggleButton value="CREDIT" color="success">
          Income
        </ToggleButton>
      </ToggleButtonGroup>
      <TextField
        label="Date"
        type="date"
        size="small"
        fullWidth
        value={form.date}
        onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
        sx={{ mb: 2 }}
      />
      {/* The hint is permanent on purpose: it is the only cue that the field
          does arithmetic, and it holds the row height steady so nothing shifts
          when the running total replaces it. */}
      <AmountField
        label={`Amount (${currencySymbol(
          accounts.find((a) => a.id === form.accountId)?.currency ?? "BDT"
        )})`}
        value={form.amount}
        onChange={(amount) => setForm((f) => ({ ...f, amount }))}
        helperText="Adds up as you type — try 200 + 300"
        sx={{ mb: 2 }}
      />
      <EntryDrawerCategoryFields
        form={form}
        setForm={setForm}
        accounts={accounts}
        formCategories={formCategories}
      />
    </>
  );
}
