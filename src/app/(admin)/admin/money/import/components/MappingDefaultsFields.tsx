import { FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import type { ImportMapping } from "@/lib/api/money";
import type { MoneyAccountRow } from "@/types";
import { NONE } from "./ColumnSelectField";

interface MappingDefaultsFieldsProps {
  variant: "direction" | "account";
  mapping: ImportMapping;
  accounts: MoneyAccountRow[];
  onMappingChange: (updater: (m: ImportMapping) => ImportMapping) => void;
}

/** Fallback-value dropdowns used when a CSV has no per-row direction/account column. */
export default function MappingDefaultsFields({
  variant,
  mapping,
  accounts,
  onMappingChange,
}: MappingDefaultsFieldsProps) {
  if (variant === "direction") {
    return (
      <FormControl size="small" fullWidth sx={{ mb: 2 }}>
        <InputLabel>Default direction</InputLabel>
        <Select
          label="Default direction"
          value={mapping.defaultDirection ?? NONE}
          onChange={(e) =>
            onMappingChange((m) => ({
              ...m,
              defaultDirection:
                e.target.value === NONE ? undefined : (e.target.value as "CREDIT" | "DEBIT"),
            }))
          }
        >
          <MenuItem value={NONE}>— none —</MenuItem>
          <MenuItem value="DEBIT">Expense (DEBIT)</MenuItem>
          <MenuItem value="CREDIT">Income (CREDIT)</MenuItem>
        </Select>
      </FormControl>
    );
  }

  return (
    <FormControl size="small" fullWidth sx={{ mb: 2 }}>
      <InputLabel>Default account</InputLabel>
      <Select
        label="Default account"
        value={mapping.defaultAccountId ?? NONE}
        onChange={(e) =>
          onMappingChange((m) => ({
            ...m,
            defaultAccountId: e.target.value === NONE ? undefined : e.target.value,
          }))
        }
      >
        <MenuItem value={NONE}>— none —</MenuItem>
        {accounts.map((a) => (
          <MenuItem key={a.id} value={a.id}>
            {a.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
