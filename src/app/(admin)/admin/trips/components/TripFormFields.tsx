import { TextField } from "@mui/material";
import SearchableSelect from "@/components/admin/SearchableSelect";
import CurrencySelect from "@/components/admin/CurrencySelect";
import { TRIP_STATUS_LABEL, type MoneyAccountRow, type TripStatus } from "@/types";
import { accountOptions } from "../format";
import type { TripForm } from "../hooks/useTripForm";

interface Props {
  form: TripForm;
  accounts: MoneyAccountRow[];
  onChange: (updater: (f: TripForm) => TripForm) => void;
}

const STATUS_OPTIONS = (Object.keys(TRIP_STATUS_LABEL) as TripStatus[]).map((s) => ({
  value: s,
  label: TRIP_STATUS_LABEL[s],
}));

export default function TripFormFields({ form, accounts, onChange }: Props) {
  // A trip wallet must hold the local currency (funded by conversion).
  const walletOpts = accountOptions(accounts.filter((a) => a.currency === form.localCurrency));

  return (
    <>
      <TextField
        label="Trip name"
        size="small"
        fullWidth
        value={form.name}
        onChange={(e) => onChange((f) => ({ ...f, name: e.target.value }))}
        sx={{ mb: 2 }}
      />
      <TextField
        label="Destination"
        size="small"
        fullWidth
        value={form.destination}
        onChange={(e) => onChange((f) => ({ ...f, destination: e.target.value }))}
        sx={{ mb: 2 }}
      />
      <CurrencySelect
        label="Local currency"
        value={form.localCurrency}
        onChange={(v) => onChange((f) => ({ ...f, localCurrency: v }))}
        sx={{ mb: 2 }}
      />
      <TextField
        label="Start date"
        type="date"
        size="small"
        fullWidth
        value={form.startDate}
        onChange={(e) => onChange((f) => ({ ...f, startDate: e.target.value }))}
        sx={{ mb: 2 }}
      />
      <TextField
        label="End date (optional)"
        type="date"
        size="small"
        fullWidth
        value={form.endDate}
        onChange={(e) => onChange((f) => ({ ...f, endDate: e.target.value }))}
        sx={{ mb: 2 }}
      />
      <SearchableSelect
        label="Status"
        value={form.status}
        options={STATUS_OPTIONS}
        onChange={(v) => onChange((f) => ({ ...f, status: v as TripStatus }))}
        sx={{ mb: 2 }}
      />
      <SearchableSelect
        label={`Trip wallet (${form.localCurrency} account, optional)`}
        value={form.localWalletAccountId}
        options={walletOpts}
        onChange={(v) => onChange((f) => ({ ...f, localWalletAccountId: v }))}
        clearable
        sx={{ mb: 2 }}
      />
      <TextField
        label="Notes (private)"
        size="small"
        fullWidth
        multiline
        rows={2}
        value={form.notes}
        onChange={(e) => onChange((f) => ({ ...f, notes: e.target.value }))}
        sx={{ mb: 2 }}
      />
      <TextField
        label="Public intro (shown on the shared page)"
        size="small"
        fullWidth
        multiline
        rows={2}
        value={form.publicIntro}
        onChange={(e) => onChange((f) => ({ ...f, publicIntro: e.target.value }))}
        sx={{ mb: 2 }}
      />
    </>
  );
}
