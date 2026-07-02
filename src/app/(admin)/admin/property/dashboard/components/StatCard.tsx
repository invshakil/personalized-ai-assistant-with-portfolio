import { Card, CardContent, Typography } from "@mui/material";

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}

export default function StatCard({ label, value, sub, color }: StatCardProps) {
  return (
    <Card sx={{ flex: "1 1 140px", minWidth: 140, bgcolor: "background.paper" }}>
      <CardContent sx={{ py: "14px !important", px: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: color ?? "text.primary" }}>
          {value}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        {sub && (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
            {sub}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
