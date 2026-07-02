import { Box, Chip, Typography } from "@mui/material";
import type { UnitWithTenant } from "@/types";

interface TenantStatusCellProps {
  tenant: NonNullable<UnitWithTenant["tenant"]>;
}

export default function TenantStatusCell({ tenant: t }: TenantStatusCellProps) {
  if (t.tenantStatus === "FUTURE") {
    return (
      <Chip
        label="Scheduled"
        size="small"
        sx={{ bgcolor: "warning.main", color: "#fff", fontWeight: 600, fontSize: "0.6875rem" }}
      />
    );
  }
  if (t.isActive) {
    return (
      <Chip
        label="Active"
        size="small"
        sx={{ bgcolor: "success.main", color: "#fff", fontWeight: 600, fontSize: "0.6875rem" }}
      />
    );
  }
  return (
    <Box>
      <Chip
        label="Inactive"
        size="small"
        sx={{
          bgcolor: "action.selected",
          color: "text.secondary",
          fontWeight: 600,
          fontSize: "0.6875rem",
        }}
      />
      {t.moveOutDate && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
          Out: {new Date(t.moveOutDate).toLocaleDateString()}
        </Typography>
      )}
    </Box>
  );
}
