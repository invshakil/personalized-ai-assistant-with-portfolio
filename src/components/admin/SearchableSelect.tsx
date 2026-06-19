"use client";

// Searchable single-select dropdown for the admin surface. Wraps MUI Autocomplete
// so every dropdown can be type-to-filter. Works on plain string values + a
// label, so it drops in wherever a <Select> was used. Include any "All …" /
// "— none —" sentinel as an explicit option; clearing (when `clearable`) emits "".
//
// Sizing: the Autocomplete is always fullWidth so its input fills the wrapper
// (a bare Autocomplete lets the input collapse to ~30px and truncates the value).
// Control the box width via `sx` on the wrapper (e.g. { minWidth: 180 }). The
// dropdown list sizes to its widest option so labels show on one line.
import { Autocomplete, Box, TextField } from "@mui/material";
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
  sx,
}: SearchableSelectProps) {
  const selected = options.find((o) => o.value === value) ?? null;
  return (
    <Box sx={sx}>
      <Autocomplete
        fullWidth
        size={size}
        disabled={disabled}
        disableClearable={!clearable}
        options={options}
        value={selected}
        onChange={(_e, opt) => onChange(opt?.value ?? "")}
        getOptionLabel={(o) => o.label}
        getOptionDisabled={(o) => Boolean(o.disabled)}
        isOptionEqualToValue={(o, v) => o.value === v.value}
        renderInput={(params) => <TextField {...params} label={label} />}
        slotProps={{
          // Let the menu grow to the widest option (one line) instead of being
          // clamped to the (narrow) input width. !important overrides Popper's
          // inline width style.
          popper: {
            sx: { width: "fit-content !important", minWidth: 180 },
          },
          listbox: {
            sx: { "& .MuiAutocomplete-option": { whiteSpace: "nowrap" } },
          },
        }}
      />
    </Box>
  );
}
