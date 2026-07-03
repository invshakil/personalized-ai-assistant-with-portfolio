import { FormControl, InputLabel, Select, MenuItem } from "@mui/material";

const NONE = "__none__";

interface ColumnSelectFieldProps {
  label: string;
  value: string | undefined;
  headers: string[];
  onChange: (v: string | undefined) => void;
  optional?: boolean;
}

/** A single "map this CSV column to..." dropdown, shared by every mapping field. */
export default function ColumnSelectField({
  label,
  value,
  headers,
  onChange,
  optional = true,
}: ColumnSelectFieldProps) {
  return (
    <FormControl size="small" fullWidth sx={{ mb: 2 }}>
      <InputLabel>{label}</InputLabel>
      <Select
        label={label}
        value={value ?? NONE}
        onChange={(e) => onChange(e.target.value === NONE ? undefined : e.target.value)}
      >
        {optional && <MenuItem value={NONE}>— none —</MenuItem>}
        {headers.map((h) => (
          <MenuItem key={h} value={h}>
            {h}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

export { NONE };
