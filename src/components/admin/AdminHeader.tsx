"use client";

import { Box, Typography, Avatar, Tooltip, IconButton, useTheme } from "@mui/material";
import { Menu, Sun, Moon } from "lucide-react";
import AdminBreadcrumb from "@/components/admin/AdminBreadcrumb";
import { useAdminTheme } from "@/components/admin/AdminThemeProvider";

interface AdminHeaderProps {
  userName: string | null;
  userEmail: string | null;
  onMenuToggle: () => void;
}

export default function AdminHeader({ userName, userEmail, onMenuToggle }: AdminHeaderProps) {
  const theme = useTheme();
  const { updateAndSave } = useAdminTheme();
  const isDark = theme.palette.mode === "dark";

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
        px: { xs: 2, md: 4 },
        bgcolor: "background.paper",
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {/* Hamburger — mobile only */}
        <IconButton
          onClick={onMenuToggle}
          size="small"
          sx={{ display: { xs: "flex", md: "none" }, mr: 0.5 }}
          aria-label="Open menu"
        >
          <Menu size={20} />
        </IconButton>
        <AdminBreadcrumb />
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Tooltip title={isDark ? "Switch to light mode" : "Switch to dark mode"}>
          <IconButton
            onClick={() => updateAndSave({ mode: isDark ? "light" : "dark" })}
            size="small"
            aria-label="Toggle colour mode"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </IconButton>
        </Tooltip>

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
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ display: { xs: "none", sm: "block" } }}
            >
              {displayName}
            </Typography>
            <Avatar sx={{ bgcolor: "primary.main", width: 32, height: 32, fontSize: "0.8rem" }}>
              {initials}
            </Avatar>
          </Box>
        </Tooltip>
      </Box>
    </Box>
  );
}
