"use client";

import { usePathname } from "next/navigation";
import { Box, Typography } from "@mui/material";
import { ChevronRight } from "lucide-react";

const routeLabels: Record<string, string> = {
  "/admin": "Overview",
  "/admin/property": "Property",
  "/admin/finance": "Finance",
  "/admin/renovation": "Renovation",
  "/admin/ai-assistant": "AI Assistant",
  "/admin/settings": "Settings",
  "/admin/account": "Account",
};

export default function AdminBreadcrumb() {
  const pathname = usePathname();
  const label = routeLabels[pathname] ?? "Admin";

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
      <Typography variant="body2" color="text.secondary">
        sshakil
      </Typography>
      <ChevronRight size={14} style={{ color: "rgba(134,146,168,0.5)" }} />
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {label}
      </Typography>
    </Box>
  );
}
