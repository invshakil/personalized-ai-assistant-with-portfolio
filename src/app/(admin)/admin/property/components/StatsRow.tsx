import { Box, Card, CardContent, Typography } from "@mui/material";

interface StatsRowProps {
  totalUnits: number;
  occupiedCount: number;
  vacantCount: number;
  activeTenantsCount: number;
}

export default function StatsRow({
  totalUnits,
  occupiedCount,
  vacantCount,
  activeTenantsCount,
}: StatsRowProps) {
  const stats = [
    { label: "Total Units", value: totalUnits, color: "text.primary" },
    { label: "Occupied", value: occupiedCount, color: "success.main" },
    { label: "Vacant", value: vacantCount, color: "warning.main" },
    { label: "Active Tenants", value: activeTenantsCount, color: "primary.main" },
  ];

  return (
    <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
      {stats.map((s) => (
        <Card key={s.label} sx={{ minWidth: 120, flex: "1 1 120px", bgcolor: "background.paper" }}>
          <CardContent sx={{ py: "12px !important", px: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, color: s.color }}>
              {s.value}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {s.label}
            </Typography>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}
