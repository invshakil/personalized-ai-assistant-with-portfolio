import { Box, Button } from "@mui/material";
import { Download } from "lucide-react";
import MultiSearchableSelect from "@/components/admin/MultiSearchableSelect";
import SearchableSelect, { type SelectOption } from "@/components/admin/SearchableSelect";

interface PaymentFiltersProps {
  now: Date;
  month: number | "all";
  year: number;
  isAllMonths: boolean;
  unitFilter: string[];
  tenantFilter: string[];
  unitOptions: SelectOption[];
  tenantOptions: SelectOption[];
  monthOptions: SelectOption[];
  yearOptions: SelectOption[];
  hasActiveFilters: boolean;
  setParams: (patch: Record<string, string | undefined>) => void;
  generating: boolean;
  onRegenerate: () => void;
  hasPayments: boolean;
}

export default function PaymentFilters({
  now,
  month,
  year,
  isAllMonths,
  unitFilter,
  tenantFilter,
  unitOptions,
  tenantOptions,
  monthOptions,
  yearOptions,
  hasActiveFilters,
  setParams,
  generating,
  onRegenerate,
  hasPayments,
}: PaymentFiltersProps) {
  return (
    <Box sx={{ display: "flex", gap: 2, mb: 3, alignItems: "center", flexWrap: "wrap" }}>
      <SearchableSelect
        label="Month"
        value={isAllMonths ? "all" : String(month)}
        options={monthOptions}
        onChange={(v) => setParams({ month: v === String(now.getMonth() + 1) ? undefined : v })}
        sx={{ minWidth: 150 }}
      />
      <SearchableSelect
        label="Year"
        value={String(year)}
        options={yearOptions}
        disabled={isAllMonths}
        onChange={(v) => setParams({ year: v === String(now.getFullYear()) ? undefined : v })}
        sx={{ minWidth: 110 }}
      />
      <MultiSearchableSelect
        label="Unit"
        value={unitFilter}
        options={unitOptions}
        onChange={(v) => setParams({ unit: v.length ? v.join(",") : undefined })}
        sx={{ minWidth: 150 }}
      />
      <MultiSearchableSelect
        label="Tenant"
        value={tenantFilter}
        options={tenantOptions}
        onChange={(v) => setParams({ tenant: v.length ? v.join(",") : undefined })}
        sx={{ minWidth: 170 }}
      />
      {hasActiveFilters && (
        <Button
          size="small"
          color="inherit"
          onClick={() => setParams({ unit: undefined, tenant: undefined, month: undefined })}
        >
          Clear
        </Button>
      )}
      {!isAllMonths && (
        <Button variant="outlined" size="small" onClick={onRegenerate} disabled={generating}>
          {generating ? "Generating…" : "Re-Generate Month"}
        </Button>
      )}
      <Box sx={{ ml: "auto" }}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<Download size={16} />}
          disabled={!hasPayments || isAllMonths}
          onClick={() =>
            window.open(`/api/admin/property/payments/pdf?month=${month}&year=${year}`, "_blank")
          }
        >
          Download all
        </Button>
      </Box>
    </Box>
  );
}
