import { Alert, Box, Button, Drawer, TextField, Typography } from "@mui/material";
import SearchableSelect from "@/components/admin/SearchableSelect";
import {
  TRIP_CATEGORIES,
  TRIP_CATEGORY_LABEL,
  type MoneyAccountRow,
  type TripCategory,
} from "@/types";
import { accountOptions, currencySymbol, fmt } from "../../format";
import type { TripExpenseForm } from "../hooks/useTripExpenseDrawer";

interface Props {
  open: boolean;
  editing: boolean;
  form: TripExpenseForm;
  accounts: MoneyAccountRow[];
  saving: boolean;
  error: string | null;
  rateLoading: boolean;
  currencyOf: (id: string) => string;
  setForm: (updater: (f: TripExpenseForm) => TripExpenseForm) => void;
  onAccountChange: (id: string) => void;
  onClose: () => void;
  onSave: () => void;
}

const CATEGORY_OPTIONS = TRIP_CATEGORIES.map((c) => ({ value: c, label: TRIP_CATEGORY_LABEL[c] }));

export default function TripExpenseDrawer({
  open,
  editing,
  form,
  accounts,
  saving,
  error,
  rateLoading,
  currencyOf,
  setForm,
  onAccountChange,
  onClose,
  onSave,
}: Props) {
  const currency = currencyOf(form.accountId);
  const foreign = currency !== "BDT";
  const bdt =
    foreign && form.amount && form.fxRate ? Number(form.amount) * Number(form.fxRate) : null;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: "100%", sm: 420 } } } }}
    >
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          {editing ? "Edit Expense" : "Add Expense"}
        </Typography>
        <TextField
          label="Date"
          type="date"
          size="small"
          fullWidth
          value={form.date}
          onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
          sx={{ mb: 2 }}
        />
        <SearchableSelect
          label="Category"
          value={form.category}
          options={CATEGORY_OPTIONS}
          onChange={(v) => setForm((f) => ({ ...f, category: v as TripCategory }))}
          sx={{ mb: 2 }}
        />
        <SearchableSelect
          label="Paid from account"
          value={form.accountId}
          options={accountOptions(accounts)}
          onChange={onAccountChange}
          disabled={editing}
          sx={{ mb: 2 }}
        />
        <TextField
          label={`Amount (${currencySymbol(currency)})`}
          type="number"
          size="small"
          fullWidth
          value={form.amount}
          onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
          sx={{ mb: 2 }}
        />
        {foreign && (
          <TextField
            label={`FX rate (৳ per 1 ${currency})`}
            type="number"
            size="small"
            fullWidth
            value={form.fxRate}
            onChange={(e) => setForm((f) => ({ ...f, fxRate: e.target.value }))}
            helperText={
              rateLoading
                ? "Fetching live rate…"
                : bdt != null
                  ? `≈ ${fmt(bdt)} (stored as BDT)`
                  : "Editable"
            }
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
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Button
          variant="contained"
          fullWidth
          onClick={onSave}
          disabled={saving || !form.accountId || !form.amount}
        >
          {saving ? "Saving…" : editing ? "Save Changes" : "Add Expense"}
        </Button>
      </Box>
    </Drawer>
  );
}
