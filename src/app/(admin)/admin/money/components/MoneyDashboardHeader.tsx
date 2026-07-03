import { Box, FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import PageHeader from "@/components/admin/PageHeader";
import { MONEY_RANGE_LABELS, type MoneyRange } from "../format";

const RANGE_ORDER: MoneyRange[] = ["M1", "M3", "M6", "Y1", "ALL"];

interface MoneyDashboardHeaderProps {
  range: MoneyRange;
  onRangeChange: (range: MoneyRange) => void;
}

export default function MoneyDashboardHeader({ range, onRangeChange }: MoneyDashboardHeaderProps) {
  return (
    <>
      <PageHeader title="Money Manager" subtitle="Income, spending, savings & balances" />

      <Box sx={{ display: "flex", gap: 2, mb: 3, alignItems: "center", flexWrap: "wrap" }}>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Period</InputLabel>
          <Select
            label="Period"
            value={range}
            onChange={(e) => onRangeChange(e.target.value as MoneyRange)}
          >
            {RANGE_ORDER.map((r) => (
              <MenuItem key={r} value={r}>
                {MONEY_RANGE_LABELS[r]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    </>
  );
}
