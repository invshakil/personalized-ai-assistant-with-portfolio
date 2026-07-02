import type { ReactNode } from "react";
import { Card, CardContent, Typography } from "@mui/material";

interface StatCardProps {
  label: string;
  value: string;
  color?: string;
  sub?: ReactNode;
}

export default function StatCard({ label, value, color, sub }: StatCardProps) {
  return (
    <Card sx={{ flex: "1 1 150px", minWidth: 150, bgcolor: "background.paper" }}>
      <CardContent sx={{ py: "14px !important", px: 2 }}>
        <Typography variant="h5" noWrap sx={{ fontWeight: 700, color: color ?? "text.primary" }}>
          {value}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
          {label}
        </Typography>
        {sub != null && (
          <Typography
            variant="caption"
            color="text.secondary"
            noWrap
            sx={{ display: "block", mt: 0.25, opacity: 0.85 }}
          >
            {sub}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
