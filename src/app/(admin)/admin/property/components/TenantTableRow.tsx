import { Box, Chip, TableCell, TableRow, Typography } from "@mui/material";
import type { UnitWithTenant } from "@/types";
import { fmt } from "../types";
import TenantStatusCell from "./TenantStatusCell";
import TenantRowActions from "./TenantRowActions";

interface TenantTableRowProps {
  row: UnitWithTenant;
  showUnit: boolean;
  onEdit: (row: UnitWithTenant) => void;
  onDeactivate: (id: string, name: string) => void;
  onActivate: (id: string, name: string) => void;
  onAssignUnit?: (tenantId: string, tenantName: string, moveInDate: string) => void;
}

export default function TenantTableRow({
  row,
  showUnit,
  onEdit,
  onDeactivate,
  onActivate,
  onAssignUnit,
}: TenantTableRowProps) {
  const t = row.tenant!;

  return (
    <TableRow hover>
      <TableCell data-label="Code">
        <Chip label={t.tenantCode ?? "—"} size="small" variant="outlined" />
      </TableCell>
      <TableCell data-label="Name">
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {t.name}
        </Typography>
        {t.phone && (
          <Typography variant="caption" color="text.secondary">
            {t.phone}
          </Typography>
        )}
      </TableCell>
      {showUnit && (
        <TableCell data-label="Unit">
          <Typography variant="body2">{row.unitNumber}</Typography>
          <Typography variant="caption" color="text.secondary">
            {row.floor}
          </Typography>
        </TableCell>
      )}
      <TableCell data-label="Rent">
        <Typography variant="body2">{fmt(row.monthlyRent)}</Typography>
      </TableCell>
      <TableCell data-label="Services">
        {t.services && t.services.length > 0 ? (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
            {t.services.map((sv) => (
              <Chip
                key={sv.serviceName}
                label={
                  sv.monthlyFee > 0 ? `${sv.serviceName} ${fmt(sv.monthlyFee)}` : sv.serviceName
                }
                size="small"
                variant="outlined"
                sx={{ fontSize: "0.65rem", height: 18 }}
              />
            ))}
          </Box>
        ) : (
          <Typography variant="caption" color="text.secondary">
            —
          </Typography>
        )}
      </TableCell>
      <TableCell data-label="Move-in">
        <Typography variant="body2">
          {new Date(t.moveInDate).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </Typography>
      </TableCell>
      <TableCell data-label="Advance Held">
        {t.advancePaid ? (
          <Typography variant="body2" color="primary.main" sx={{ fontWeight: 600 }}>
            {fmt(t.advanceAmount)}
          </Typography>
        ) : (
          <Typography variant="caption" color="text.secondary">
            None
          </Typography>
        )}
      </TableCell>
      <TableCell data-label="Lease End">
        {t.leaseEndDate ? (
          <Typography variant="body2">{new Date(t.leaseEndDate).toLocaleDateString()}</Typography>
        ) : (
          <Typography variant="caption" color="text.secondary">
            —
          </Typography>
        )}
      </TableCell>
      <TableCell data-label="Status">
        <TenantStatusCell tenant={t} />
      </TableCell>
      <TableCell data-label="Actions">
        <TenantRowActions
          row={row}
          onEdit={onEdit}
          onDeactivate={onDeactivate}
          onActivate={onActivate}
          onAssignUnit={onAssignUnit}
        />
      </TableCell>
    </TableRow>
  );
}
