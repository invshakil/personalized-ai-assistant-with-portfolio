import { TextField } from "@mui/material";
import SearchableSelect from "@/components/admin/SearchableSelect";
import AccountTypeAccountSelect from "@/components/admin/AccountTypeAccountSelect";
import type { MoneyAccountRow, MoneyCategoryRow } from "@/types";
import type { EntryForm } from "../types";

interface EntryDrawerCategoryFieldsProps {
  form: EntryForm;
  setForm: React.Dispatch<React.SetStateAction<EntryForm>>;
  accounts: MoneyAccountRow[];
  formCategories: MoneyCategoryRow[];
}

export default function EntryDrawerCategoryFields({
  form,
  setForm,
  accounts,
  formCategories,
}: EntryDrawerCategoryFieldsProps) {
  return (
    <>
      <SearchableSelect
        label="Category"
        value={form.categoryId}
        options={formCategories.map((c) => ({ value: c.id, label: c.name }))}
        onChange={(v) => setForm((f) => ({ ...f, categoryId: v }))}
        sx={{ mb: 2 }}
      />
      <AccountTypeAccountSelect
        accounts={accounts}
        value={{ typeId: form.accountTypeId, accountId: form.accountId }}
        onChange={(sel) =>
          setForm((f) => ({ ...f, accountTypeId: sel.typeId, accountId: sel.accountId }))
        }
        optional
        sx={{ mb: 2 }}
      />
      <TextField
        label="Description"
        size="small"
        fullWidth
        value={form.description}
        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        sx={{ mb: 2 }}
      />
      <TextField
        label="Notes"
        size="small"
        fullWidth
        multiline
        rows={2}
        value={form.notes}
        onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
        sx={{ mb: 2 }}
      />
    </>
  );
}
