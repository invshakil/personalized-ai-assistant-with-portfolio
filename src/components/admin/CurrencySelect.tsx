"use client";

// Shared searchable currency dropdown for the admin surface. Loads the DYNAMIC
// currency list (all FX-feed-supported currencies, via useCurrencyOptions) and
// renders it through SearchableSelect, so every currency picker is type-to-filter
// and covers every currency — not a hardcoded trio. Drop-in wherever a currency
// <Select> was used. Until the list arrives it falls back to the quick-pick set,
// and the current value is always kept selectable even if outside the list.
import SearchableSelect from "./SearchableSelect";
import { useCurrencyOptions } from "@/hooks/useCurrencyOptions";
import { SUPPORTED_CURRENCIES } from "@/types";
import type { SxProps, Theme } from "@mui/material";

interface CurrencySelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  clearable?: boolean;
  size?: "small" | "medium";
  sx?: SxProps<Theme>;
  /** Sentinel shown first, e.g. { value: "", label: "All currencies" } for filters. */
  sentinel?: { value: string; label: string };
}

export default function CurrencySelect({
  label = "Currency",
  value,
  onChange,
  disabled,
  clearable,
  size = "small",
  sx,
  sentinel,
}: CurrencySelectProps) {
  const { options, loading } = useCurrencyOptions();

  const base = options.length
    ? options.map((o) => ({ value: o.code, label: o.label }))
    : (SUPPORTED_CURRENCIES as readonly string[]).map((c) => ({ value: c, label: c }));

  const withValue =
    value && !base.some((o) => o.value === value) ? [{ value, label: value }, ...base] : base;

  const finalOptions = sentinel
    ? [{ value: sentinel.value, label: sentinel.label }, ...withValue]
    : withValue;

  return (
    <SearchableSelect
      label={loading && !options.length ? `${label}…` : label}
      value={value}
      options={finalOptions}
      onChange={onChange}
      disabled={disabled}
      clearable={clearable}
      size={size}
      sx={sx}
    />
  );
}
