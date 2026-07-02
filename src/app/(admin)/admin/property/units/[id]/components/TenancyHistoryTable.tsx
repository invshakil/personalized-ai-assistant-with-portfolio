import {
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
import type { TenantHistory } from "../types";
import TenancyHistoryRow from "./TenancyHistoryRow";

interface TenancyHistoryTableProps {
  tenants: TenantHistory[];
}

export default function TenancyHistoryTable({ tenants }: TenancyHistoryTableProps) {
  if (tenants.length === 0) {
    return (
      <Card sx={{ bgcolor: "background.paper" }}>
        <CardContent>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 3 }}>
            No past tenants for this unit.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <TableContainer component={Card} sx={{ bgcolor: "background.paper" }}>
      <Table size="small" sx={mobileCardTableSx}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700 }}>Code</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Phone</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Move-in</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Move-out</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Lease End</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Advance</TableCell>
            <TableCell />
          </TableRow>
        </TableHead>
        <TableBody>
          {tenants.map((t) => (
            <TenancyHistoryRow key={t.id} tenant={t} />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
