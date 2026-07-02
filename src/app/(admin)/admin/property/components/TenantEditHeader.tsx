import { Alert, Box, IconButton, Typography } from "@mui/material";
import { X } from "lucide-react";
import type { UnitWithTenant } from "@/types";
import { fmt } from "../types";

interface TenantEditHeaderProps {
  row: UnitWithTenant;
  onClose: () => void;
}

export default function TenantEditHeader({ row, onClose }: TenantEditHeaderProps) {
  const tenant = row.tenant!;

  return (
    <>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Edit Tenant
        </Typography>
        <IconButton onClick={onClose} size="small">
          <X size={18} />
        </IconButton>
      </Box>

      {!tenant.isActive && (
        <Alert severity="warning" sx={{ mb: 2, fontSize: "0.8125rem" }}>
          Inactive — moved out. Changes save to their record only and won&apos;t affect any unit.
        </Alert>
      )}

      {!tenant.isActive && row.monthlyRent > 0 && (
        <Box sx={{ bgcolor: "action.selected", px: 2, py: 1.5, borderRadius: 1, mb: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Last Rent
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {fmt(row.monthlyRent)}/month
          </Typography>
          {tenant.moveOutDate && (
            <>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mt: 0.5 }}
              >
                Moved Out
              </Typography>
              <Typography variant="body2">
                {new Date(tenant.moveOutDate).toLocaleDateString()}
              </Typography>
            </>
          )}
        </Box>
      )}
    </>
  );
}
