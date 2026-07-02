import { Alert, Typography } from "@mui/material";
import { TrendingUp } from "lucide-react";
import type { PropertyDashboardStats } from "@/types";
import { fmt } from "../format";

interface PendingRentChangesAlertProps {
  changes: PropertyDashboardStats["pendingRentChanges"];
}

export default function PendingRentChangesAlert({ changes }: PendingRentChangesAlertProps) {
  if (changes.length === 0) return null;

  return (
    <Alert severity="info" icon={<TrendingUp size={18} />} sx={{ mb: 3 }}>
      <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
        Upcoming Rent Changes
      </Typography>
      {changes.map((rc) => (
        <Typography key={rc.id} variant="caption" sx={{ display: "block" }}>
          {rc.tenantName}
          {rc.unitNumber ? ` (${rc.unitNumber})` : ""}: {fmt(rc.previousRent)} → {fmt(rc.newRent)} (
          {rc.increase >= 0 ? "+" : ""}
          {fmt(rc.increase)}) from {new Date(rc.effectiveDate).toLocaleDateString()}
          {rc.reason ? ` — ${rc.reason}` : ""}
        </Typography>
      ))}
    </Alert>
  );
}
