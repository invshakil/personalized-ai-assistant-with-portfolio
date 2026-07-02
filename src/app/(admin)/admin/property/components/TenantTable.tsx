import {
  Box,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { Building2 } from "lucide-react";
import type { UnitWithTenant } from "@/types";
import { mobileCardTableSx } from "@/lib/mobileTableSx";
import TenantTableRow from "./TenantTableRow";

interface TenantTableProps {
  tenants: UnitWithTenant[];
  showUnit: boolean;
  onEdit: (row: UnitWithTenant) => void;
  onDeactivate: (id: string, name: string) => void;
  onActivate: (id: string, name: string) => void;
  onAssignUnit?: (tenantId: string, tenantName: string, moveInDate: string) => void;
}

export default function TenantTable({
  tenants,
  showUnit,
  onEdit,
  onDeactivate,
  onActivate,
  onAssignUnit,
}: TenantTableProps) {
  if (tenants.length === 0) {
    return (
      <Box sx={{ textAlign: "center", py: 8 }}>
        <Building2 size={40} style={{ opacity: 0.3 }} />
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          No records found
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Card} sx={{ bgcolor: "background.paper" }}>
      <Table size="small" sx={mobileCardTableSx}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700 }}>Code</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
            {showUnit && <TableCell sx={{ fontWeight: 700 }}>Unit</TableCell>}
            <TableCell sx={{ fontWeight: 700 }}>Rent</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Services</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Move-in</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Advance Held</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Lease End</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {tenants.map((row) => (
            <TenantTableRow
              key={row.tenant!.id}
              row={row}
              showUnit={showUnit}
              onEdit={onEdit}
              onDeactivate={onDeactivate}
              onActivate={onActivate}
              onAssignUnit={onAssignUnit}
            />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
