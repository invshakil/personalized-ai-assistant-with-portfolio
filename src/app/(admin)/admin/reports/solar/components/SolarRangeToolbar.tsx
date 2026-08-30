import { Box, FormControl, MenuItem, Select, ToggleButton, ToggleButtonGroup } from "@mui/material";
import type { RangePreset } from "../types";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

interface SolarRangeToolbarProps {
  range: RangePreset;
  onRangeChange: (range: RangePreset) => void;
  pickMonth: number;
  onPickMonthChange: (month: number) => void;
  pickYear: number;
  onPickYearChange: (year: number) => void;
  /** Selectable years, newest first — bounded by the install date. */
  yearOptions: number[];
}

/** Preset selector, plus the month/year picker the "Month" preset reveals. */
export default function SolarRangeToolbar({
  range,
  onRangeChange,
  pickMonth,
  onPickMonthChange,
  pickYear,
  onPickYearChange,
  yearOptions,
}: SolarRangeToolbarProps) {
  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        gap: 2,
        alignItems: "center",
        mb: { xs: 2, md: 3 },
      }}
    >
      <ToggleButtonGroup
        size="small"
        exclusive
        value={range}
        onChange={(_, v) => v && onRangeChange(v as RangePreset)}
      >
        <ToggleButton value="1M">1M</ToggleButton>
        <ToggleButton value="3M">3M</ToggleButton>
        <ToggleButton value="6M">6M</ToggleButton>
        <ToggleButton value="12M">12M</ToggleButton>
        <ToggleButton value="ALL">All</ToggleButton>
        <ToggleButton value="MONTH">Month</ToggleButton>
      </ToggleButtonGroup>
      {range === "MONTH" && (
        <Box sx={{ display: "flex", gap: 1.5 }}>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <Select value={pickMonth} onChange={(e) => onPickMonthChange(Number(e.target.value))}>
              {MONTH_NAMES.map((m, i) => (
                <MenuItem key={i + 1} value={i + 1}>
                  {m}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <Select value={pickYear} onChange={(e) => onPickYearChange(Number(e.target.value))}>
              {yearOptions.map((y) => (
                <MenuItem key={y} value={y}>
                  {y}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}
    </Box>
  );
}
