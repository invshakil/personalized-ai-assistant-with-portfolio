import { IconButton, InputAdornment, TextField } from "@mui/material";
import { Search, X } from "lucide-react";

interface EntrySearchFieldProps {
  value: string;
  onChange: (v: string) => void;
}

export default function EntrySearchField({ value, onChange }: EntrySearchFieldProps) {
  return (
    <TextField
      label="Search description"
      size="small"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      sx={{ minWidth: 200 }}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <Search size={16} />
            </InputAdornment>
          ),
          endAdornment: value ? (
            <InputAdornment position="end">
              <IconButton size="small" onClick={() => onChange("")} edge="end">
                <X size={14} />
              </IconButton>
            </InputAdornment>
          ) : null,
        },
      }}
    />
  );
}
