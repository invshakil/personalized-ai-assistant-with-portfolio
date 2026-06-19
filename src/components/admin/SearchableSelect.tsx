"use client";

// Searchable single-select dropdown for the admin surface. Wraps MUI Autocomplete
// so every dropdown can be type-to-filter. Works on plain string values + a
// label, so it drops in wherever a <Select> was used. Include any "All …" /
// "— none —" sentinel as an explicit option; clearing (when `clearable`) emits "".
import { Autocomplete, TextField } from "@mui/material";
import type { SxProps, Theme } from "@mui/material";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SearchableSelectProps {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  /** Show the clear (✕) affordance; clearing emits "". Defaults to false. */
  clearable?: boolean;
  size?: "small" | "medium";
  fullWidth?: boolean;
  sx?: SxProps<Theme>;
}

export default function SearchableSelect({
  label,
  value,
  options,
  onChange,
  disabled = false,
  clearable = false,
  size = "small",
  fullWidth = false,
  sx,
}: SearchableSelectProps) {
  const selected = options.find((o) => o.value === value) ?? null;
  return (
    <Autocomplete
      size={size}
      fullWidth={fullWidth}
      disabled={disabled}
      disableClearable={!clearable}
      options={options}
      value={selected}
      onChange={(_e, opt) => onChange(opt?.value ?? "")}
      getOptionLabel={(o) => o.label}
      getOptionDisabled={(o) => Boolean(o.disabled)}
      isOptionEqualToValue={(o, v) => o.value === v.value}
      renderInput={(params) => <TextField {...params} label={label} />}
      sx={sx}
    />
  );
}
