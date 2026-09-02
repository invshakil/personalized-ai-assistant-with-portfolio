import {
  Box,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import { RotateCcw } from "lucide-react";
import SearchableSelect, { type SelectOption } from "@/components/admin/SearchableSelect";
import type { DefaultableField, DefaultMode } from "@/lib/formDefaults/registry";
import { NO_DEFAULT } from "../hooks/useDefaultOptions";

interface DefaultFieldRowProps {
  field: DefaultableField;
  /** "" when nothing is stored. */
  value: string;
  mode: DefaultMode;
  /** True when a row exists — only then is resetting meaningful. */
  stored: boolean;
  options: SelectOption[];
  disabled?: boolean;
  onValueChange: (value: string) => void;
  onModeChange: (mode: DefaultMode) => void;
  onReset: () => void;
}

/** One defaultable dropdown: what it starts as, and how that value is maintained. */
export default function DefaultFieldRow({
  field,
  value,
  mode,
  stored,
  options,
  disabled,
  onValueChange,
  onModeChange,
  onReset,
}: DefaultFieldRowProps) {
  const withSentinel: SelectOption[] = [{ value: NO_DEFAULT, label: "— no default —" }, ...options];

  const hint =
    mode === "lastUsed"
      ? "Follows whatever you save next — the value below is just the current one."
      : (field.hint ?? "Always starts with this value.");

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "minmax(0,1fr) auto auto" },
        gap: 2,
        alignItems: "start",
        py: 2,
        borderTop: 1,
        borderColor: "divider",
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <SearchableSelect
          label={field.label}
          value={value || NO_DEFAULT}
          options={withSentinel}
          disabled={disabled}
          onChange={(v) => onValueChange(v === NO_DEFAULT ? "" : v)}
        />
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75 }}>
          {hint}
        </Typography>
      </Box>

      <ToggleButtonGroup
        size="small"
        exclusive
        value={mode}
        disabled={disabled}
        onChange={(_, m) => m && onModeChange(m as DefaultMode)}
        sx={{ alignSelf: "start" }}
      >
        <ToggleButton value="fixed">Fixed</ToggleButton>
        <ToggleButton value="lastUsed">Last used</ToggleButton>
      </ToggleButtonGroup>

      <Tooltip title={stored ? "Reset to the built-in behaviour" : "Nothing to reset"}>
        <span>
          <IconButton size="small" onClick={onReset} disabled={disabled || !stored}>
            <RotateCcw size={15} />
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
}
