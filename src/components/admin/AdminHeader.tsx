"use client";

import { Box, Typography, Avatar, Tooltip } from "@mui/material";
import AdminBreadcrumb from "@/components/admin/AdminBreadcrumb";

interface AdminHeaderProps {
  userName: string | null;
  userEmail: string | null;
}

export default function AdminHeader({ userName, userEmail }: AdminHeaderProps) {
  const displayName = userName ?? userEmail ?? "Admin";
  const initials = displayName
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Box
      component="header"
      sx={{
        height: 64,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        px: 4,
        bgcolor: "background.paper",
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      <AdminBreadcrumb />

      <Tooltip title={displayName} placement="bottom-end">
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            cursor: "pointer",
            borderRadius: 1.5,
            px: 1.5,
            py: 0.75,
            "&:hover": { bgcolor: "action.hover" },
          }}
        >
          <Typography variant="body2" color="text.secondary">
            {displayName}
          </Typography>
          <Avatar sx={{ bgcolor: "primary.main" }}>{initials}</Avatar>
        </Box>
      </Tooltip>
    </Box>
  );
}
