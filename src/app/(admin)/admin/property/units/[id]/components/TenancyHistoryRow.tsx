import { Box, Button, Chip, TableCell, TableRow, Typography } from "@mui/material";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import EntityLink from "@/components/admin/EntityLink";
import type { TenantHistory } from "../types";
import { fmt } from "../types";

interface TenancyHistoryRowProps {
  tenant: TenantHistory;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function TenancyHistoryRow({ tenant: t }: TenancyHistoryRowProps) {
  return (
    <TableRow hover>
      <TableCell data-label="Code">
        <Chip label={t.tenantCode ?? "—"} size="small" variant="outlined" />
      </TableCell>
      <TableCell data-label="Name">
        <EntityLink href={`/admin/property/tenants/${t.id}`} sx={{ fontWeight: 600 }}>
          {t.name}
        </EntityLink>
      </TableCell>
      <TableCell data-label="Phone">
        <Typography variant="body2" color="text.secondary">
          {t.phone ?? "—"}
        </Typography>
      </TableCell>
      <TableCell data-label="Move-in">
        <Typography variant="body2">{fmtDate(t.moveInDate)}</Typography>
      </TableCell>
      <TableCell data-label="Move-out">
        {t.moveOutDate ? (
          <Typography variant="body2">{fmtDate(t.moveOutDate)}</Typography>
        ) : (
          <Typography variant="caption" color="text.secondary">
            —
          </Typography>
        )}
      </TableCell>
      <TableCell data-label="Lease End">
        {t.leaseEndDate ? (
          <Typography variant="body2">{fmtDate(t.leaseEndDate)}</Typography>
        ) : (
          <Typography variant="caption" color="text.secondary">
            —
          </Typography>
        )}
      </TableCell>
      <TableCell data-label="Advance">
        {t.advancePaid ? (
          <Box>
            <Typography variant="body2" color="primary.main" sx={{ fontWeight: 600 }}>
              {fmt(t.advanceAmount)}
            </Typography>
            {t.advanceSettled && (
              <Typography variant="caption" color="success.main">
                Settled
              </Typography>
            )}
          </Box>
        ) : (
          <Typography variant="caption" color="text.secondary">
            None
          </Typography>
        )}
      </TableCell>
      <TableCell data-label="Actions">
        <Button
          component={Link}
          href={`/admin/property/tenants/${t.id}`}
          size="small"
          startIcon={<ExternalLink size={13} />}
          sx={{ fontSize: "0.75rem" }}
        >
          View
        </Button>
      </TableCell>
    </TableRow>
  );
}
