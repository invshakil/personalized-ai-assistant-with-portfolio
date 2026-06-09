"use client";

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
  return (
    <AppRouterCacheProvider>
      <ThemeProvider theme={adminTheme}>
        <CssBaseline />
        <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
          <AdminSidebar />
          <Box
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minWidth: 0,
              overflow: "hidden",
            }}
          >
            <AdminHeader userName={userName} userEmail={userEmail} />
            <Box
              component="main"
              sx={{
                flex: 1,
                overflow: "auto",
                p: 4,
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
