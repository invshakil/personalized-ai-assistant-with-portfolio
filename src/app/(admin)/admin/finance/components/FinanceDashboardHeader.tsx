import { Box, Button, FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import { Download } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import { RANGE_LABELS, type RangePreset } from "../format";

const RANGE_ORDER: RangePreset[] = ["M1", "M3", "M6", "FY", "Y1", "Y2", "ALL"];

interface FinanceDashboardHeaderProps {
  range: RangePreset;
  onRangeChange: (range: RangePreset) => void;
  reportPdfHref: string;
}

export default function FinanceDashboardHeader({
  range,
  onRangeChange,
  reportPdfHref,
}: FinanceDashboardHeaderProps) {
  return (
    <>
      <PageHeader
        title="Financial Tracker"
        subtitle="Business income, costs & profit by date range"
      />
      <Box sx={{ display: "flex", gap: 2, mb: 3, alignItems: "center", flexWrap: "wrap" }}>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Date range</InputLabel>
          <Select
            label="Date range"
            value={range}
            onChange={(e) => onRangeChange(e.target.value as RangePreset)}
          >
            {RANGE_ORDER.map((r) => (
              <MenuItem key={r} value={r}>
                {RANGE_LABELS[r]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Box sx={{ ml: "auto" }}>
          <a
            href={reportPdfHref}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: "none" }}
          >
            <Button variant="outlined" startIcon={<Download size={16} />}>
              Download report PDF
            </Button>
          </a>
        </Box>
      </Box>
    </>
  );
}
