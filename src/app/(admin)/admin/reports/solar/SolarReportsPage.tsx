"use client";

import { useMemo } from "react";
import { Alert, Box, CircularProgress } from "@mui/material";
import PageHeader from "@/components/admin/PageHeader";
import { useSolarRange } from "./hooks/useSolarRange";
import { useSolarData } from "./hooks/useSolarData";
import { useSolarTotals } from "./hooks/useSolarTotals";
import SolarRangeToolbar from "./components/SolarRangeToolbar";
import SolarEmptyState from "./components/SolarEmptyState";
import PaybackHeroCard from "./components/PaybackHeroCard";
import SolarStatTiles from "./components/SolarStatTiles";
import PeriodSummaryCard from "./components/PeriodSummaryCard";
import MonthlyDetailTable from "./components/MonthlyDetailTable";
import WeatherForecastCard from "./components/WeatherForecastCard";

export default function SolarReportsPage() {
  const range = useSolarRange();
  const { report, overview, weather, weatherError, loading, error } = useSolarData(
    range.bounds.from,
    range.bounds.to
  );

  const months = useMemo(() => report?.months ?? [], [report]);
  const { totals, pctOf } = useSolarTotals(months);

  // Only offer years the system could have produced data in. Derived here
  // rather than inside useSolarRange, which would otherwise need the report it
  // does not fetch.
  const yearOptions = useMemo(() => {
    const thisYear = new Date().getFullYear();
    const installDate = report?.payback.installDate;
    const installYear = installDate ? new Date(installDate).getUTCFullYear() : thisYear;
    const years: number[] = [];
    for (let y = thisYear; y >= installYear; y--) years.push(y);
    return years;
  }, [report]);

  const header = (
    <PageHeader title="Solar Reports" subtitle="Generation, savings, battery, and payback." />
  );

  if (loading) {
    return (
      <Box>
        {header}
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        {header}
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  // Not configured, or configured but nothing synced yet.
  if (!overview?.hasData || !report) {
    return (
      <Box>
        {header}
        <SolarEmptyState configured={!!overview?.configured} />
      </Box>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        {header}
        <SolarRangeToolbar
          range={range.range}
          onRangeChange={range.setRange}
          pickMonth={range.pickMonth}
          onPickMonthChange={range.setPickMonth}
          pickYear={range.pickYear}
          onPickYearChange={range.setPickYear}
          yearOptions={yearOptions}
        />
      </Box>

      <PaybackHeroCard payback={report.payback} currency={overview.currency} />
      <SolarStatTiles overview={overview} />
      <PeriodSummaryCard
        totals={totals}
        monthCount={months.length}
        pctOf={pctOf}
        currency={overview.currency}
      />
      <MonthlyDetailTable months={months} currency={overview.currency} />
      <WeatherForecastCard weather={weather} error={weatherError} />
    </Box>
  );
}
