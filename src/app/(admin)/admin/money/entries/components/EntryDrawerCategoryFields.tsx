import { TextField } from "@mui/material";
import SearchableSelect from "@/components/admin/SearchableSelect";
import type { MoneyAccountRow, MoneyCategoryRow, MoneyEntryMethod } from "@/types";
import { METHOD_LABEL } from "../../format";
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
      <SearchableSelect
        label="Account"
        value={form.accountId}
        options={[
          { value: "", label: "— none —" },
          ...accounts.map((a) => ({ value: a.id, label: a.name })),
        ]}
        onChange={(v) => setForm((f) => ({ ...f, accountId: v }))}
        sx={{ mb: 2 }}
      />
      {form.direction === "CREDIT" && (
        <SearchableSelect
          label="Source (how it arrived)"
          value={form.method}
          options={[
            { value: "", label: "— unspecified —" },
            ...(Object.keys(METHOD_LABEL) as MoneyEntryMethod[]).map((m) => ({
              value: m,
              label: METHOD_LABEL[m],
            })),
          ]}
          onChange={(v) => setForm((f) => ({ ...f, method: v as MoneyEntryMethod | "" }))}
          sx={{ mb: 2 }}
        />
      )}
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
