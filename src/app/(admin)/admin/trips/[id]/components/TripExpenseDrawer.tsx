import { Alert, Box, Button, Drawer, TextField, Typography } from "@mui/material";
import SearchableSelect from "@/components/admin/SearchableSelect";
import {
  TRIP_CATEGORIES,
  TRIP_CATEGORY_LABEL,
  type MoneyAccountRow,
  type TripCategory,
  type TripParticipantRow,
  type TripSplitMode,
} from "@/types";
import type { TripExpenseForm } from "../hooks/expenseForm";
import SplitEditor from "./SplitEditor";
import ExpenseFundingFields from "./ExpenseFundingFields";

interface Props {
  open: boolean;
  editing: boolean;
  form: TripExpenseForm;
  active: TripParticipantRow[];
  accounts: MoneyAccountRow[];
  saving: boolean;
  error: string | null;
  rateLoading: boolean;
  payerIsSelf: boolean;
  setForm: (updater: (f: TripExpenseForm) => TripExpenseForm) => void;
  onPayerChange: (id: string) => void;
  onAccountChange: (id: string) => void;
  onCurrencyChange: (cur: string) => void;
  onMode: (mode: TripSplitMode) => void;
  onToggle: (id: string, checked: boolean) => void;
  onSelectAll: () => void;
  onSelectOnlyPayer: () => void;
  onExact: (id: string, val: string) => void;
  onClose: () => void;
  onSave: () => void;
}

const CATEGORY_OPTIONS = TRIP_CATEGORIES.map((c) => ({ value: c, label: TRIP_CATEGORY_LABEL[c] }));

export default function TripExpenseDrawer(props: Props) {
  const { form, active, saving, error, payerIsSelf, setForm } = props;
  const amount = Number(form.amount) || 0;
  const exactSum = form.participantIds.reduce(
    (s, id) => s + (Number(form.exactAmounts[id]) || 0),
    0
  );
  const splitValid =
    form.participantIds.length > 0 &&
    (form.splitMode !== "EXACT" || Math.abs(amount - exactSum) < 0.001);
  const canSave =
    !saving && !!form.amount && amount > 0 && splitValid && (!payerIsSelf || !!form.accountId);

  return (
    <Drawer
      anchor="right"
      open={props.open}
      onClose={props.onClose}
      slotProps={{ paper: { sx: { width: { xs: "100%", sm: 440 } } } }}
    >
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          {props.editing ? "Edit Expense" : "Add Expense"}
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

        <ExpenseFundingFields
          form={form}
          active={active}
          accounts={props.accounts}
          payerIsSelf={payerIsSelf}
          rateLoading={props.rateLoading}
          setForm={setForm}
          onPayerChange={props.onPayerChange}
          onAccountChange={props.onAccountChange}
          onCurrencyChange={props.onCurrencyChange}
        />

        <SplitEditor
          participants={active}
          amount={amount}
          currency={form.currency}
          splitMode={form.splitMode}
          selectedIds={form.participantIds}
          exactAmounts={form.exactAmounts}
          onMode={props.onMode}
          onToggle={props.onToggle}
          onSelectAll={props.onSelectAll}
          onSelectOnlyPayer={props.onSelectOnlyPayer}
          onExact={props.onExact}
        />

        <TextField
          label="Description"
          size="small"
          fullWidth
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          sx={{ mb: 2 }}
        />
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Button variant="contained" fullWidth onClick={props.onSave} disabled={!canSave}>
          {saving ? "Saving…" : props.editing ? "Save Changes" : "Add Expense"}
        </Button>
      </Box>
    </Drawer>
  );
}
