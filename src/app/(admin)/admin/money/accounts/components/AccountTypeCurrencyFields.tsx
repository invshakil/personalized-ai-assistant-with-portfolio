import { FormControl, InputLabel, MenuItem, Select, Typography } from "@mui/material";
import { SUPPORTED_CURRENCIES, type MoneyAccountType } from "@/types";
import { ACCOUNT_TYPE_LABEL } from "../../format";
import type { AccountForm } from "../hooks/useAccountForm";

const TYPES: MoneyAccountType[] = ["CASH", "BANK", "MOBILE_WALLET", "CREDIT_CARD", "OTHER"];

interface Props {
  form: AccountForm;
  editingHasEntries: boolean;
  onChange: (updater: (f: AccountForm) => AccountForm) => void;
}

/** Type + currency selects, with the "currency locked" hint once entries exist. */
export default function AccountTypeCurrencyFields({ form, editingHasEntries, onChange }: Props) {
  return (
    <>
      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
        <InputLabel>Type</InputLabel>
        <Select
          label="Type"
          value={form.type}
          onChange={(e) => onChange((f) => ({ ...f, type: e.target.value as MoneyAccountType }))}
        >
          {TYPES.map((t) => (
            <MenuItem key={t} value={t}>
              {ACCOUNT_TYPE_LABEL[t]}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl fullWidth size="small" sx={{ mb: 2 }} disabled={editingHasEntries}>
        <InputLabel>Currency</InputLabel>
        <Select
          label="Currency"
          value={form.currency}
          onChange={(e) => onChange((f) => ({ ...f, currency: e.target.value }))}
        >
          {SUPPORTED_CURRENCIES.map((c) => (
            <MenuItem key={c} value={c}>
              {c}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {editingHasEntries && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
          Currency is locked because this account already has ledger entries.
        </Typography>
      )}
    </>
  );
}
