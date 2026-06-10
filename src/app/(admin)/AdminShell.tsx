"use client";

import { useState } from "react";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { ThemeProvider, Box, CssBaseline } from "@mui/material";
import { adminTheme } from "@/lib/adminTheme";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";

interface AdminShellProps {
  children: React.ReactNode;
  userName: string | null;
  userEmail: string | null;
}

export default function AdminShell({ children, userName, userEmail }: AdminShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <AppRouterCacheProvider>
      <ThemeProvider theme={adminTheme}>
        <CssBaseline />
        <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
          <AdminSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
          <Box
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minWidth: 0,
              overflow: "hidden",
            }}
          >
            <AdminHeader
              userName={userName}
              userEmail={userEmail}
              onMenuToggle={() => setMobileOpen((prev) => !prev)}
            />
            <Box
              component="main"
              sx={{
                flex: 1,
                overflow: "auto",
                p: { xs: 2, sm: 3, md: 4 },
                bgcolor: "background.default",
              }}
            >
              {children}
            </Box>
          </Box>
        </Box>
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
