"use client";

import { ComponentType, useState } from "react";
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
  Drawer,
} from "@mui/material";
import Logo from "@/components/shared/Logo";

const PORTFOLIO_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sshakil.com";
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
  ChevronDown,
  ChevronRight,
  SlidersHorizontal,
  TrendingUp,
  RefreshCw,
  UserCircle,
  Tag,
  Palette,
  FileBarChart,
  Database,
  Wallet,
  HandCoins,
  Landmark,
  Upload,
  ListChecks,
  CalendarClock,
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
          { href: "/admin/property/settings", label: "Settings", icon: SlidersHorizontal },
        ],
      },
      {
        href: "/admin/finance",
        label: "Financial Tracker",
        icon: BarChart3,
        exact: false,
        children: [
          { href: "/admin/finance", label: "Dashboard", icon: LayoutDashboard },
          { href: "/admin/finance/earnings", label: "Earnings", icon: TrendingUp },
          { href: "/admin/finance/payments", label: "Salaries", icon: Users },
          { href: "/admin/finance/expenses", label: "Expenses", icon: Receipt },
          { href: "/admin/finance/subscriptions", label: "Subscriptions", icon: RefreshCw },
          { href: "/admin/finance/settings", label: "Settings", icon: SlidersHorizontal },
        ],
      },
      {
        href: "/admin/money",
        label: "Money Manager",
        icon: Wallet,
        exact: false,
        children: [
          { href: "/admin/money", label: "Overview", icon: TrendingUp },
          { href: "/admin/money/entries", label: "Ledger", icon: ListChecks },
          { href: "/admin/money/people", label: "People & Loans", icon: HandCoins },
          { href: "/admin/money/accounts", label: "Accounts", icon: Landmark },
          { href: "/admin/money/categories", label: "Categories", icon: Tag },
          { href: "/admin/money/import", label: "Import CSV", icon: Upload },
        ],
      },
      {
        href: "/admin/reports",
        label: "Reports",
        icon: FileBarChart,
        exact: false,
        children: [
          { href: "/admin/reports", label: "Overview", icon: LayoutDashboard },
          { href: "/admin/reports/financial", label: "Financial Tracker Reports", icon: BarChart3 },
          { href: "/admin/reports/property", label: "Property Reports", icon: Building2 },
        ],
      },
      { href: "/admin/renovation", label: "Renovation", icon: Wrench, exact: false },
      { href: "/admin/bookings", label: "Bookings", icon: CalendarClock, exact: false },
    ],
  },
  {
    label: "Tools",
    items: [
      { href: "/admin/ai-assistant", label: "AI Assistant", icon: Sparkles, exact: false },
      { href: "/admin/settings/ai", label: "AI Settings", icon: Cpu, exact: true },
      {
        href: "/admin/settings",
        label: "Settings",
        icon: Settings,
        exact: false,
        children: [
          { href: "/admin/settings", label: "Site Settings", icon: SlidersHorizontal },
          { href: "/admin/settings/appearance", label: "Appearance", icon: Palette },
          { href: "/admin/settings/backup", label: "Backups", icon: Database },
          { href: "/admin/settings/booking", label: "Booking", icon: CalendarClock },
        ],
      },
    ],
  },
];

interface AdminSidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

function SidebarContents({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();

  // Which parent groups are manually expanded. A parent defaults to open when
  // the current route is inside it; toggling stores an explicit override so you
  // can expand any section to reach its children without navigating first.
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

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
      {/* Brand — opens public portfolio in a new tab */}
      <Box sx={{ px: 3, py: 2.5 }}>
        <Box
          component="a"
          href={PORTFOLIO_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open sshakil.com portfolio in a new tab"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            textDecoration: "none",
            color: "inherit",
            borderRadius: 1,
            "&:hover .brand-subtitle": { color: "primary.main" },
          }}
        >
          <Logo size={36} />
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
              sshakil
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              className="brand-subtitle"
              sx={{ lineHeight: 1, transition: "color 0.15s" }}
            >
              sshakil.com ↗
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
                // Default open when the route is inside this section; an explicit
                // toggle (override) wins so any section can be expanded in place.
                const defaultOpen = hasChildren && pathname.startsWith(item.href);
                const expanded = hasChildren && (overrides[item.href] ?? defaultOpen);
                const ChevronIcon = expanded ? ChevronDown : ChevronRight;

                const row = (
                  <ListItemButton
                    selected={hasChildren ? active && !expanded : active}
                    sx={{ px: 1.5, py: 0.875 }}
                  >
                    <ListItemIcon>
                      <Icon size={17} />
                    </ListItemIcon>
                    <ListItemText primary={item.label} />
                    {hasChildren && <ChevronIcon size={14} />}
                  </ListItemButton>
                );

                return (
                  <Box key={item.href}>
                    <ListItem disablePadding sx={{ mb: 0.25 }}>
                      {hasChildren ? (
                        // Parent rows toggle their child list in place — they do
                        // not navigate (each child, incl. the section index, is a link).
                        <Box
                          onClick={() =>
                            setOverrides((m) => ({
                              ...m,
                              [item.href]: !(m[item.href] ?? defaultOpen),
                            }))
                          }
                          sx={{ width: "100%", cursor: "pointer" }}
                        >
                          {row}
                        </Box>
                      ) : (
                        <Link
                          href={item.href}
                          style={{ width: "100%", textDecoration: "none", color: "inherit" }}
                          onClick={handleNavClick}
                        >
                          {row}
                        </Link>
                      )}
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
