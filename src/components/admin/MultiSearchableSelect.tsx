"use client";

// Multi-select searchable dropdown for the admin surface. Wraps MUI Autocomplete
// in `multiple` mode with checkboxes + limitTags chip display. Same option shape
// as SearchableSelect (SelectOption). Empty array = no filter (no "All …" sentinel
// needed). Control box width via `sx` on the wrapper.
import { Autocomplete, Box, Checkbox, TextField } from "@mui/material";
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import type { SxProps, Theme } from "@mui/material";
import type { SelectOption } from "./SearchableSelect";

interface MultiSearchableSelectProps {
  label: string;
  value: string[];
  options: SelectOption[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  size?: "small" | "medium";
  /** How many selected tags to show before collapsing to "+N more". Default 2. */
  limitTags?: number;
  sx?: SxProps<Theme>;
}

const blankIcon = <CheckBoxOutlineBlankIcon fontSize="small" />;
const checkedIcon = <CheckBoxIcon fontSize="small" />;

export default function MultiSearchableSelect({
  label,
  value,
  options,
  onChange,
  disabled = false,
  size = "small",
  limitTags = 2,
  sx,
}: MultiSearchableSelectProps) {
  const selected = options.filter((o) => value.includes(o.value));
  return (
    <Box sx={sx}>
      <Autocomplete
        multiple
        fullWidth
        size={size}
        disabled={disabled}
        limitTags={limitTags}
        options={options}
        value={selected}
        onChange={(_e, opts) => onChange(opts.map((o) => o.value))}
        getOptionLabel={(o) => o.label}
        isOptionEqualToValue={(o, v) => o.value === v.value}
        disableCloseOnSelect
        renderOption={(props, option, { selected: sel }) => {
          const { key, ...rest } = props as React.HTMLAttributes<HTMLLIElement> & { key: string };
          return (
            <li key={key} {...rest}>
              <Checkbox
                icon={blankIcon}
                checkedIcon={checkedIcon}
                style={{ marginRight: 8 }}
                checked={sel}
              />
              {option.label}
            </li>
          );
        }}
        renderInput={(params) => <TextField {...params} label={label} />}
        slotProps={{
          popper: {
            sx: { width: "fit-content !important", minWidth: 200 },
          },
          listbox: {
            sx: { "& .MuiAutocomplete-option": { whiteSpace: "nowrap" } },
          },
        }}
      />
    </Box>
  );
}
