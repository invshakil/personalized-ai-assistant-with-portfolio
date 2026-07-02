import { Alert } from "@mui/material";
import { AlertTriangle } from "lucide-react";
import { MONTHS } from "../types";

interface OverdueAlertProps {
  overdueCount: number;
  isAllMonths: boolean;
  month: number | "all";
  year: number;
}

export default function OverdueAlert({
  overdueCount,
  isAllMonths,
  month,
  year,
}: OverdueAlertProps) {
  if (overdueCount === 0) return null;

  return (
    <Alert severity="warning" icon={<AlertTriangle size={18} />} sx={{ mb: 2 }}>
      {overdueCount} tenant{overdueCount > 1 ? "s have" : " has"} outstanding dues
      {isAllMonths ? " across all months" : ` for ${MONTHS[(month as number) - 1]} ${year}`}
    </Alert>
  );
}
