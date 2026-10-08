import { Box, Button, TextField } from "@mui/material";
import SearchableSelect from "@/components/admin/SearchableSelect";
import { LEVEL_OPTIONS, PERIOD_OPTIONS } from "../types";

interface LogFiltersProps {
  level: string;
  source: string;
  period: string;
  from: string;
  to: string;
  searchInput: string;
  sources: string[];
  hasActiveFilters: boolean;
  setParams: (patch: Record<string, string | undefined>) => void;
  onSearchChange: (v: string) => void;
  onClear: () => void;
}

export default function LogFilters(p: LogFiltersProps) {
  const sourceOptions = [
    { value: "", label: "All sources" },
    ...p.sources.map((s) => ({ value: s, label: s })),
  ];
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mb: 2, alignItems: "center" }}>
      <SearchableSelect
        label="Level"
        value={p.level}
        options={LEVEL_OPTIONS}
        onChange={(v) => p.setParams({ level: v })}
        sx={{ minWidth: 150 }}
      />
      <SearchableSelect
        label="Source"
        value={p.source}
        options={sourceOptions}
        onChange={(v) => p.setParams({ source: v })}
        sx={{ minWidth: 150 }}
      />
      <SearchableSelect
        label="Period"
        value={p.period}
        options={PERIOD_OPTIONS}
        onChange={(v) => p.setParams({ period: v, from: undefined, to: undefined })}
        sx={{ minWidth: 160 }}
      />
      <TextField
        label="From"
        type="date"
        size="small"
        value={p.from}
        onChange={(e) => p.setParams({ from: e.target.value, period: undefined })}
        slotProps={{ inputLabel: { shrink: true } }}
        sx={{ minWidth: 150 }}
      />
      <TextField
        label="To"
        type="date"
        size="small"
        value={p.to}
        onChange={(e) => p.setParams({ to: e.target.value, period: undefined })}
        slotProps={{ inputLabel: { shrink: true } }}
        sx={{ minWidth: 150 }}
      />
      <TextField
        label="Search message"
        size="small"
        value={p.searchInput}
        onChange={(e) => p.onSearchChange(e.target.value)}
        sx={{ minWidth: 220 }}
      />
      {p.hasActiveFilters && (
        <Button size="small" color="inherit" onClick={p.onClear}>
          Clear
        </Button>
      )}
    </Box>
  );
}
