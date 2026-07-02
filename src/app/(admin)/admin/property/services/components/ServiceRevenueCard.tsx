import {
  Box,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { mobileCardTableSx } from "@/lib/mobileTableSx";
import type { ServiceEntry } from "../types";
import { fmt, serviceRevenue } from "../types";

interface ServiceRevenueCardProps {
  services: ServiceEntry[];
}

export default function ServiceRevenueCard({ services }: ServiceRevenueCardProps) {
  const totalMonthlyRevenue = services.reduce((sum, s) => sum + serviceRevenue(s), 0);
  const revenueRanking = services
    .map((s) => ({ name: s.name, revenue: serviceRevenue(s), activeTenants: s.tenants.length }))
    .sort((a, b) => b.revenue - a.revenue);

  return (
    <Card sx={{ bgcolor: "background.paper" }}>
      <CardContent>
        <Box
          sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", mb: 2 }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Monthly Service Revenue
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 700, color: "success.main" }}>
            {fmt(totalMonthlyRevenue)}/mo
          </Typography>
        </Box>
        <TableContainer>
          <Table size="small" sx={mobileCardTableSx}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Service</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">
                  Active Tenants
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">
                  Monthly Revenue
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {revenueRanking.map((r) => (
                <TableRow key={r.name}>
                  <TableCell data-label="Service">
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {r.name}
                    </Typography>
                  </TableCell>
                  <TableCell data-label="Active Tenants" align="right">
                    <Typography variant="body2">{r.activeTenants}</Typography>
                  </TableCell>
                  <TableCell data-label="Monthly Revenue" align="right">
                    <Typography variant="body2" sx={{ fontWeight: 600, color: "primary.main" }}>
                      {fmt(r.revenue)}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}
