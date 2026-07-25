"use client";

// Shared searchable MULTI currency select (dynamic list) — the multi sibling of
// CurrencySelect, for filters that take several currencies. Self-contained: loads
// the currency list via useCurrencyOptions and renders MultiSearchableSelect.
import MultiSearchableSelect from "./MultiSearchableSelect";
import { useCurrencyOptions } from "@/hooks/useCurrencyOptions";
import { SUPPORTED_CURRENCIES } from "@/types";
import type { SxProps, Theme } from "@mui/material";

interface CurrencyMultiSelectProps {
  label?: string;
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  size?: "small" | "medium";
  sx?: SxProps<Theme>;
}

export default function CurrencyMultiSelect({
  label = "Currency",
  value,
  onChange,
  disabled,
  size = "small",
  sx,
}: CurrencyMultiSelectProps) {
  const { options } = useCurrencyOptions();
  const base = options.length
    ? options.map((o) => ({ value: o.code, label: o.label }))
    : (SUPPORTED_CURRENCIES as readonly string[]).map((c) => ({ value: c, label: c }));
  // Keep any already-selected value visible even if outside the loaded list.
  const extra = value
    .filter((v) => !base.some((o) => o.value === v))
    .map((v) => ({ value: v, label: v }));
  return (
    <MultiSearchableSelect
      label={label}
      value={value}
      options={[...extra, ...base]}
      onChange={onChange}
      disabled={disabled}
      size={size}
      sx={sx}
    />
  );
}
