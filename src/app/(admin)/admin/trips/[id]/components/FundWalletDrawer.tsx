import { Alert, Box, Button, Drawer, TextField, Typography } from "@mui/material";
import AccountTypeAccountSelect from "@/components/admin/AccountTypeAccountSelect";
import type { MoneyAccountRow } from "@/types";
import { currencySymbol } from "../../format";
import NumberField from "@/components/admin/NumberField";

interface FundForm {
  fromAccountTypeId: string;
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
        <AccountTypeAccountSelect
          accounts={accounts}
          accountLabel="From account"
          filter={(a) => a.id !== walletAccountId}
          optionLabel={(a) => `${a.name} · ${a.currency}`}
          value={{ typeId: form.fromAccountTypeId, accountId: form.fromAccountId }}
          onChange={(sel) =>
            setForm((f) => ({ ...f, fromAccountTypeId: sel.typeId, fromAccountId: sel.accountId }))
          }
          sx={{ mb: 2 }}
        />
        <NumberField
          label={`Amount to convert (${currencySymbol(sourceCurrency)})`}
          size="small"
          fullWidth
          value={form.amount}
          onChange={(v) => setForm((f) => ({ ...f, amount: v }))}
          sx={{ mb: 1 }}
        />
        <Button size="small" onClick={onPrefillRate} sx={{ mb: 1 }}>
          Prefill at live rate
        </Button>
        <NumberField
          label={`Received (${currencySymbol(localCurrency)})`}
          size="small"
          fullWidth
          value={form.toAmount}
          onChange={(v) => setForm((f) => ({ ...f, toAmount: v }))}
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
