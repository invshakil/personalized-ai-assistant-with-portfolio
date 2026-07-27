import { Alert, Box, Button, Drawer, TextField, Typography } from "@mui/material";
import SearchableSelect from "@/components/admin/SearchableSelect";
import CurrencySelect from "@/components/admin/CurrencySelect";
import type { TripParticipantRow } from "@/types";
import { currencySymbol, fmt } from "../../format";
import type { SettlementForm } from "../hooks/useTripSettlements";

interface Props {
  open: boolean;
  form: SettlementForm;
  participants: TripParticipantRow[]; // active
  saving: boolean;
  error: string | null;
  rateLoading: boolean;
  setForm: (updater: (f: SettlementForm) => SettlementForm) => void;
  onCurrencyChange: (cur: string) => void;
  onClose: () => void;
  onSave: () => void;
}

export default function SettlementDrawer({
  open,
  form,
  participants,
  saving,
  error,
  rateLoading,
  setForm,
  onCurrencyChange,
  onClose,
  onSave,
}: Props) {
  const options = participants.map((p) => ({
    value: p.id,
    label: `${p.name}${p.isSelf ? " (me)" : ""}`,
  }));
  const foreign = form.currency !== "BDT";
  const amount = Number(form.amount) || 0;
  const bdt = foreign && form.amount && form.fxRate ? amount * Number(form.fxRate) : null;
  const canSave =
    !saving &&
    !!form.amount &&
    amount > 0 &&
    !!form.fromParticipantId &&
    !!form.toParticipantId &&
    form.fromParticipantId !== form.toParticipantId;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: "100%", sm: 400 } } } }}
    >
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          Record payment
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
          label="From (who paid)"
          value={form.fromParticipantId}
          options={options}
          onChange={(v) => setForm((f) => ({ ...f, fromParticipantId: v }))}
          sx={{ mb: 2 }}
        />
        <SearchableSelect
          label="To (who received)"
          value={form.toParticipantId}
          options={options}
          onChange={(v) => setForm((f) => ({ ...f, toParticipantId: v }))}
          sx={{ mb: 2 }}
        />
        <CurrencySelect
          label="Currency"
          value={form.currency}
          onChange={onCurrencyChange}
          sx={{ mb: 2 }}
        />
        <TextField
          label={`Amount (${currencySymbol(form.currency)})`}
          type="number"
          size="small"
          fullWidth
          value={form.amount}
          onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
          sx={{ mb: 2 }}
        />
        {foreign && (
          <TextField
            label={`FX rate (৳ per 1 ${form.currency})`}
            type="number"
            size="small"
            fullWidth
            value={form.fxRate}
            onChange={(e) => setForm((f) => ({ ...f, fxRate: e.target.value }))}
            helperText={
              rateLoading ? "Fetching live rate…" : bdt != null ? `≈ ${fmt(bdt)}` : "Editable"
            }
            sx={{ mb: 2 }}
          />
        )}
        <TextField
          label="Note"
          size="small"
          fullWidth
          value={form.note}
          onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
          sx={{ mb: 2 }}
        />
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Button variant="contained" fullWidth onClick={onSave} disabled={!canSave}>
          {saving ? "Saving…" : "Record payment"}
        </Button>
      </Box>
    </Drawer>
  );
}
