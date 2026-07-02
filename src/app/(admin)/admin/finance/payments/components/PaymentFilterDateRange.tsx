import { Button, TextField } from "@mui/material";

interface PaymentFilterDateRangeProps {
  from?: string;
  to?: string;
  hasActiveFilters: boolean;
  setParams: (patch: Record<string, string | undefined>) => void;
}

export default function PaymentFilterDateRange({
  from,
  to,
  hasActiveFilters,
  setParams,
}: PaymentFilterDateRangeProps) {
  return (
    <>
      <TextField
        label="From"
        type="date"
        size="small"
        value={from ?? ""}
        onChange={(e) => setParams({ from: e.target.value || undefined, period: undefined })}
        slotProps={{ inputLabel: { shrink: true } }}
        sx={{ minWidth: 150 }}
      />
      <TextField
        label="To"
        type="date"
        size="small"
        value={to ?? ""}
        onChange={(e) => setParams({ to: e.target.value || undefined, period: undefined })}
        slotProps={{ inputLabel: { shrink: true } }}
        sx={{ minWidth: 150 }}
      />
      {hasActiveFilters && (
        <Button
          size="small"
          color="inherit"
          onClick={() =>
            setParams({
              fy: undefined,
              employee: undefined,
              type: undefined,
              client: undefined,
              period: undefined,
              from: undefined,
              to: undefined,
            })
          }
        >
          Clear
        </Button>
      )}
    </>
  );
}
