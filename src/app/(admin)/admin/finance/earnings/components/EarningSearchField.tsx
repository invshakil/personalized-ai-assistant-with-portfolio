import { IconButton, InputAdornment, TextField } from "@mui/material";
import { Search, X } from "lucide-react";

interface EarningSearchFieldProps {
  value: string;
  onChange: (v: string) => void;
}

export default function EarningSearchField({ value, onChange }: EarningSearchFieldProps) {
  return (
    <TextField
      label="Search notes / type"
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
