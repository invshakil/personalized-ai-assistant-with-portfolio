import { FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import type { ImportMapping } from "@/lib/api/money";
import { NONE } from "./ColumnSelectField";

interface MappingDefaultsFieldsProps {
  mapping: ImportMapping;
  onMappingChange: (updater: (m: ImportMapping) => ImportMapping) => void;
}

/** Fallback direction used when a CSV has no per-row direction column. (The
 * fallback account is the shared Account type → Account picker.) */
export default function MappingDefaultsFields({
  mapping,
  onMappingChange,
}: MappingDefaultsFieldsProps) {
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
