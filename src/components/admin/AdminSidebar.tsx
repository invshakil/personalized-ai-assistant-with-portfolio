"use client";

import { ComponentType } from "react";
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
  Drawer,
} from "@mui/material";
import {
  LayoutDashboard,
  Building2,
  BarChart3,
  Wrench,
  Sparkles,
  Settings,
  Cpu,
  User,
  LogOut,
  Users,
  CreditCard,
  Receipt,
  Wifi,
  PieChart,
  ChevronDown,
  ChevronRight,
  SlidersHorizontal,
  TrendingUp,
  RefreshCw,
  UserCircle,
  Tag,
} from "lucide-react";

const SIDEBAR_WIDTH = 260;

type IconComponent = ComponentType<{ size?: number }>;

type NavItem = {
  href: string;
  label: string;
  icon: IconComponent;
  exact: boolean;
  children?: { href: string; label: string; icon: IconComponent }[];
};

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "Workspace",
    items: [
      { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
      {
        href: "/admin/property",
        label: "Property",
        icon: Building2,
        exact: true,
        children: [
          { href: "/admin/property", label: "Units & Tenants", icon: Users },
          { href: "/admin/property/payments", label: "Payments", icon: CreditCard },
          { href: "/admin/property/expenses", label: "Expenses", icon: Receipt },
          { href: "/admin/property/services", label: "Services", icon: Wifi },
          { href: "/admin/property/payees", label: "Payees", icon: UserCircle },
          { href: "/admin/property/service-types", label: "Service Types", icon: Tag },
          { href: "/admin/property/dashboard", label: "Dashboard", icon: PieChart },
          { href: "/admin/property/settings", label: "Settings", icon: SlidersHorizontal },
        ],
      },
      {
        href: "/admin/finance",
        label: "Financial Tracker",
        icon: BarChart3,
        exact: false,
        children: [
          { href: "/admin/finance", label: "Dashboard", icon: PieChart },
          { href: "/admin/finance/earnings", label: "Earnings", icon: TrendingUp },
          { href: "/admin/finance/payments", label: "Salaries", icon: Users },
          { href: "/admin/finance/expenses", label: "Expenses", icon: Receipt },
          { href: "/admin/finance/subscriptions", label: "Subscriptions", icon: RefreshCw },
          { href: "/admin/finance/settings", label: "Settings", icon: SlidersHorizontal },
        ],
      },
      { href: "/admin/renovation", label: "Renovation", icon: Wrench, exact: false },
    ],
  },
  {
    label: "Tools",
    items: [
      { href: "/admin/ai-assistant", label: "AI Assistant", icon: Sparkles, exact: false },
      { href: "/admin/settings/ai", label: "AI Settings", icon: Cpu, exact: true },
      { href: "/admin/settings", label: "Settings", icon: Settings, exact: true },
    ],
  },
];

interface AdminSidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

function SidebarContents({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const handleNavClick = () => {
    onClose?.();
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: SIDEBAR_WIDTH,
        bgcolor: "background.paper",
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
                const hasChildren = !!item.children?.length;
                const expanded = hasChildren && pathname.startsWith(item.href);
                const ChevronIcon = expanded ? ChevronDown : ChevronRight;

                return (
                  <Box key={item.href}>
                    <ListItem disablePadding sx={{ mb: 0.25 }}>
                      <Link
                        href={item.href}
                        style={{ width: "100%", textDecoration: "none", color: "inherit" }}
                        onClick={handleNavClick}
                      >
                        <ListItemButton
                          selected={active && !hasChildren}
                          sx={{ px: 1.5, py: 0.875 }}
                        >
                          <ListItemIcon>
                            <Icon size={17} />
                          </ListItemIcon>
                          <ListItemText primary={item.label} />
                          {hasChildren && <ChevronIcon size={14} />}
                        </ListItemButton>
                      </Link>
                    </ListItem>

                    {/* Sub-items (property section) */}
                    {hasChildren && expanded && (
                      <List dense disablePadding sx={{ pl: 2, mb: 0.5 }}>
                        {item.children!.map((child) => {
                          // The index child (same href as its parent) matches
                          // exactly; deeper children match by prefix.
                          const childActive =
                            child.href === item.href
                              ? pathname === child.href
                              : pathname.startsWith(child.href);
                          const ChildIcon = child.icon;
                          return (
                            <ListItem key={child.href} disablePadding sx={{ mb: 0.25 }}>
                              <Link
                                href={child.href}
                                style={{ width: "100%", textDecoration: "none", color: "inherit" }}
                                onClick={handleNavClick}
                              >
                                <ListItemButton
                                  selected={childActive}
                                  sx={{ px: 1.5, py: 0.625, borderRadius: 1 }}
                                >
                                  <ListItemIcon>
                                    <ChildIcon size={15} />
                                  </ListItemIcon>
                                  <ListItemText
                                    primary={child.label}
                                    slotProps={{ primary: { style: { fontSize: "0.8125rem" } } }}
                                  />
                                </ListItemButton>
                              </Link>
                            </ListItem>
                          );
                        })}
                      </List>
                    )}
                  </Box>
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
              onClick={handleNavClick}
            >
              <ListItemButton sx={{ px: 1.5, py: 0.875 }}>
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

export default function AdminSidebar({ mobileOpen, onClose }: AdminSidebarProps) {
  return (
    <>
      {/* Desktop — permanent sidebar */}
      <Box
        role="navigation"
        sx={{
          display: { xs: "none", md: "flex" },
          width: SIDEBAR_WIDTH,
          flexShrink: 0,
          borderRight: "1px solid",
          borderColor: "divider",
          height: "100vh",
          position: "sticky",
          top: 0,
        }}
      >
        <SidebarContents />
      </Box>

      {/* Mobile — temporary drawer */}
      <Drawer
        variant="temporary"
        anchor="left"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            width: SIDEBAR_WIDTH,
            bgcolor: "background.paper",
            borderRight: "1px solid",
            borderColor: "divider",
          },
        }}
      >
        <SidebarContents onClose={onClose} />
      </Drawer>
    </>
  );
}
