import { Box, Button, IconButton, InputAdornment, TextField } from "@mui/material";
import { Search, X } from "lucide-react";
import MultiSearchableSelect from "@/components/admin/MultiSearchableSelect";
import SearchableSelect, { type SelectOption } from "@/components/admin/SearchableSelect";

interface TenantFiltersProps {
  unitFilter: string[];
  unitOptions: SelectOption[];
  stateFilter: string;
  stateOptions: SelectOption[];
  disabled: boolean;
  searchInput: string;
  onSearchChange: (v: string) => void;
  hasActiveFilters: boolean;
  setParams: (patch: Record<string, string | undefined>) => void;
}

export default function TenantFilters({
  unitFilter,
  unitOptions,
  stateFilter,
  stateOptions,
  disabled,
  searchInput,
  onSearchChange,
  hasActiveFilters,
  setParams,
}: TenantFiltersProps) {
  return (
    <Box sx={{ display: "flex", gap: 2, mb: 2, alignItems: "center", flexWrap: "wrap" }}>
      <MultiSearchableSelect
        label="Unit"
        value={unitFilter}
        options={unitOptions}
        disabled={disabled}
        onChange={(v) => setParams({ tunit: v.length ? v.join(",") : undefined })}
        sx={{ minWidth: 150 }}
      />
      <SearchableSelect
        label="Status"
        value={stateFilter}
        options={stateOptions}
        disabled={disabled}
        onChange={(v) => setParams({ tstate: v === "ALL" ? undefined : v })}
        sx={{ minWidth: 150 }}
      />
      <TextField
        label="Search name / phone"
        size="small"
        value={searchInput}
        onChange={(e) => onSearchChange(e.target.value)}
        sx={{ minWidth: 200 }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Search size={16} />
              </InputAdornment>
            ),
            endAdornment: searchInput ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => onSearchChange("")} edge="end">
                  <X size={14} />
                </IconButton>
              </InputAdornment>
            ) : null,
          },
        }}
      />
      {hasActiveFilters && (
        <Button
          size="small"
          color="inherit"
          onClick={() => setParams({ tunit: undefined, tstate: undefined, tq: undefined })}
        >
          Clear
        </Button>
      )}
    </Box>
  );
}
