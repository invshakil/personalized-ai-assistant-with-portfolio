import { TextField } from "@mui/material";

interface ExpenseDateRangeFieldsProps {
  from?: string;
  to?: string;
  setParams: (patch: Record<string, string | undefined>) => void;
}

export default function ExpenseDateRangeFields({
  from,
  to,
  setParams,
}: ExpenseDateRangeFieldsProps) {
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
    </>
  );
}
