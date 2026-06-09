"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  Avatar,
} from "@mui/material";
import {
  LayoutDashboard,
  Building2,
  BarChart3,
  Wrench,
  Sparkles,
  Settings,
  User,
  LogOut,
} from "lucide-react";

const SIDEBAR_WIDTH = 260;

const navGroups = [
  {
    label: "Workspace",
    items: [
      { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
      { href: "/admin/property", label: "Property", icon: Building2, exact: false },
      { href: "/admin/finance", label: "Finance", icon: BarChart3, exact: false },
      { href: "/admin/renovation", label: "Renovation", icon: Wrench, exact: false },
    ],
  },
  {
    label: "Tools",
    items: [
      { href: "/admin/ai-assistant", label: "AI Assistant", icon: Sparkles, exact: false },
      { href: "/admin/settings", label: "Settings", icon: Settings, exact: false },
    ],
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <Box
      role="navigation"
      sx={{
        width: SIDEBAR_WIDTH,
        flexShrink: 0,
        bgcolor: "background.paper",
        borderRight: "1px solid",
        borderColor: "divider",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        position: "sticky",
        top: 0,
      }}
    >
      {/* Brand */}
      <Box sx={{ px: 3, py: 2.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Avatar
            sx={{
              bgcolor: "primary.main",
              width: 36,
              height: 36,
              fontSize: "0.8125rem",
              fontWeight: 700,
              borderRadius: "8px",
            }}
          >
            SS
          </Avatar>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
              sshakil
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1 }}>
              Admin Panel
            </Typography>
          </Box>
        </Box>
      </Box>

      <Divider />

      {/* Nav */}
      <Box sx={{ flex: 1, overflow: "auto", px: 2, py: 2 }}>
        {navGroups.map((group) => (
          <Box key={group.label} sx={{ mb: 2.5 }}>
            <Typography
              variant="overline"
              sx={{
                px: 1.5,
                mb: 0.75,
                display: "block",
                fontSize: "0.6875rem",
                letterSpacing: "0.08em",
                color: "text.secondary",
              }}
            >
              {group.label}
            </Typography>
            <List dense disablePadding>
              {group.items.map((item) => {
                const active = isActive(item.href, item.exact);
                const Icon = item.icon;
                return (
                  <ListItem key={item.href} disablePadding sx={{ mb: 0.25 }}>
                    <Link
                      href={item.href}
                      style={{ width: "100%", textDecoration: "none", color: "inherit" }}
                    >
                      <ListItemButton selected={active} sx={{ px: 1.5, py: 0.875 }}>
                        <ListItemIcon>
                          <Icon size={17} />
                        </ListItemIcon>
                        <ListItemText primary={item.label} />
                      </ListItemButton>
                    </Link>
                  </ListItem>
                );
              })}
            </List>
          </Box>
        ))}
      </Box>

      <Divider />

      {/* Footer */}
      <Box sx={{ px: 2, py: 1.5 }}>
        <List dense disablePadding>
          <ListItem disablePadding sx={{ mb: 0.25 }}>
            <Link
              href="/admin/account"
              style={{ width: "100%", textDecoration: "none", color: "inherit" }}
            >
              <ListItemButton selected={pathname === "/admin/account"} sx={{ px: 1.5, py: 0.875 }}>
                <ListItemIcon>
                  <User size={17} />
                </ListItemIcon>
                <ListItemText primary="Account" />
              </ListItemButton>
            </Link>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => signOut({ callbackUrl: "/admin/login" })}
              sx={{ px: 1.5, py: 0.875, color: "text.secondary" }}
            >
              <ListItemIcon>
                <LogOut size={17} />
              </ListItemIcon>
              <ListItemText primary="Sign out" />
            </ListItemButton>
          </ListItem>
        </List>
      </Box>
    </Box>
  );
}
