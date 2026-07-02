import { Box, Card, CardContent, Chip, Typography } from "@mui/material";
import { AlertTriangle } from "lucide-react";
import type { PropertyDashboardStats } from "@/types";
import { fmt } from "../format";

interface OutstandingDuesCardProps {
  topDue: PropertyDashboardStats["topDue"];
}

export default function OutstandingDuesCard({ topDue }: OutstandingDuesCardProps) {
  if (topDue.length === 0) return null;

  return (
    <Card sx={{ bgcolor: "background.paper", flex: "1 1 360px", minWidth: 0 }}>
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
          <AlertTriangle size={16} color="var(--mui-palette-warning-main)" />
          <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
            Outstanding Dues
          </Typography>
        </Box>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
          {topDue.map((d) => (
            <Box key={d.tenantId} sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {d.tenantName}
                  {d.unitNumber ? ` · ${d.unitNumber}` : ""}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {d.tenantCode ? `${d.tenantCode} · ` : ""}
                  {d.monthsUnpaid} {d.monthsUnpaid === 1 ? "month" : "months"} unpaid
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 700, color: "error.main" }}>
                {fmt(d.totalDue)}
              </Typography>
              <Chip
                label={d.alert === "OVERDUE" ? "Overdue" : "Pending"}
                size="small"
                sx={{
                  bgcolor: d.alert === "OVERDUE" ? "error.main" : "warning.main",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: "0.625rem",
                  height: 20,
                }}
              />
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
}
