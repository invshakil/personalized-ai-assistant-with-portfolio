import { Box, Card, CardContent, Typography } from "@mui/material";

interface StatTileProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}

/** One headline figure in the stat row, with an icon and optional sub-line. */
export default function StatTile({ icon, label, value, sub }: StatTileProps) {
  return (
    <Card sx={{ bgcolor: "background.paper" }}>
      <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1, color: "text.secondary" }}>
          {icon}
          <Typography variant="caption" sx={{ fontWeight: 600 }}>
            {label}
          </Typography>
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
          {value}
        </Typography>
        {sub && (
          <Typography variant="caption" color="text.secondary">
            {sub}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
