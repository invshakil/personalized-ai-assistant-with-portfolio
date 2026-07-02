import {
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { PowerOff } from "lucide-react";
import EntityLink from "@/components/admin/EntityLink";
import { mobileCardTableSx } from "@/lib/mobileTableSx";
import type { ServiceEntry } from "../types";
import { fmt } from "../types";

interface ServiceTenantsTableProps {
  tenants: ServiceEntry["tenants"];
  onEndAssignment: (tenantServiceId: string) => void;
}

export default function ServiceTenantsTable({
  tenants,
  onEndAssignment,
}: ServiceTenantsTableProps) {
  if (tenants.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No tenants currently subscribed.
      </Typography>
    );
  }

  return (
    <TableContainer>
      <Table size="small" sx={mobileCardTableSx}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700 }}>Tenant</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Monthly Fee</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Start Date</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {tenants.map((t) => (
            <TableRow key={t.id}>
              <TableCell data-label="Tenant">
                <EntityLink href={`/admin/property/tenants/${t.tenantId}`} sx={{ fontWeight: 600 }}>
                  {t.tenantName}
                </EntityLink>
                <Typography variant="caption" color="text.secondary">
                  {t.tenantCode}
                </Typography>
              </TableCell>
              <TableCell data-label="Monthly Fee">
                <Typography variant="body2" sx={{ fontWeight: 600, color: "primary.main" }}>
                  {fmt(t.monthlyFee)}/mo
                </Typography>
              </TableCell>
              <TableCell data-label="Start Date">
                <Typography variant="body2">
                  {new Date(t.startDate).toLocaleDateString()}
                </Typography>
              </TableCell>
              <TableCell data-label="Actions">
                <Tooltip title="End subscription">
                  <IconButton size="small" color="error" onClick={() => onEndAssignment(t.id)}>
                    <PowerOff size={14} />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
