import { Box } from "@mui/material";
import type { PropertyDashboardStats } from "@/types";
import { fmt } from "../format";
import StatCard from "./StatCard";

interface TenantStatsRowProps {
  data: PropertyDashboardStats;
}

export default function TenantStatsRow({ data }: TenantStatsRowProps) {
  return (
    <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
      <StatCard label="Active Tenants" value={String(data.activeTenantsCount)} />
      <StatCard
        label="Occupancy"
        value={`${data.occupiedUnits}/${data.totalUnits}`}
        sub={`${Math.round((data.occupiedUnits / Math.max(data.totalUnits, 1)) * 100)}% occupied`}
      />
      <StatCard
        label="Advance Held"
        value={fmt(data.totalAdvanceHeld)}
        sub={`${data.tenantsWithAdvance} tenants`}
        color="primary.main"
      />
      {data.overdueCount > 0 && (
        <StatCard
          label="Overdue"
          value={String(data.overdueCount)}
          color="error.main"
          sub="need attention"
        />
      )}
    </Box>
  );
}
