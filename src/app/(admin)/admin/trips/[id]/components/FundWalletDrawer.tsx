import { Alert, Box, Button, Drawer, TextField, Typography } from "@mui/material";
import SearchableSelect from "@/components/admin/SearchableSelect";
import type { MoneyAccountRow } from "@/types";
import { accountOptions, currencySymbol } from "../../format";

interface FundForm {
  fromAccountId: string;
  amount: string;
  toAmount: string;
  date: string;
  notes: string;
}

interface Props {
  open: boolean;
  form: FundForm;
  accounts: MoneyAccountRow[];
  walletAccountId: string | null;
  walletAccountName: string | null;
  localCurrency: string;
  rateNote: string | null;
  saving: boolean;
  error: string | null;
  setForm: (updater: (f: FundForm) => FundForm) => void;
  onPrefillRate: () => void;
  onClose: () => void;
  onSave: () => void;
}

export default function FundWalletDrawer({
  open,
  form,
  accounts,
  walletAccountId,
  walletAccountName,
  localCurrency,
  rateNote,
  saving,
  error,
  setForm,
  onPrefillRate,
  onClose,
  onSave,
}: Props) {
  const sourceCurrency = accounts.find((a) => a.id === form.fromAccountId)?.currency ?? "BDT";
  const fromOptions = accountOptions(accounts.filter((a) => a.id !== walletAccountId));

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: "100%", sm: 420 } } } }}
    >
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
          Fund trip wallet
        </Typography>
        <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 2 }}>
          Convert into {walletAccountName ?? "the wallet"} ({localCurrency}).
        </Typography>
        <SearchableSelect
          label="From account"
          value={form.fromAccountId}
          options={fromOptions}
          onChange={(v) => setForm((f) => ({ ...f, fromAccountId: v }))}
          sx={{ mb: 2 }}
        />
        <TextField
          label={`Amount to convert (${currencySymbol(sourceCurrency)})`}
          type="number"
          size="small"
          fullWidth
          value={form.amount}
          onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
          sx={{ mb: 1 }}
        />
        <Button size="small" onClick={onPrefillRate} sx={{ mb: 1 }}>
          Prefill at live rate
        </Button>
        <TextField
          label={`Received (${currencySymbol(localCurrency)})`}
          type="number"
          size="small"
          fullWidth
          value={form.toAmount}
          onChange={(e) => setForm((f) => ({ ...f, toAmount: e.target.value }))}
          helperText={rateNote ?? "Use your actual received amount."}
          sx={{ mb: 2 }}
        />
        <TextField
          label="Date"
          type="date"
          size="small"
          fullWidth
          value={form.date}
          onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
          sx={{ mb: 2 }}
        />
        <TextField
          label="Notes"
          size="small"
          fullWidth
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
          disabled={saving || !form.fromAccountId || !form.amount || !form.toAmount}
        >
          {saving ? "Converting…" : "Fund Wallet"}
        </Button>
      </Box>
    </Drawer>
  );
}
