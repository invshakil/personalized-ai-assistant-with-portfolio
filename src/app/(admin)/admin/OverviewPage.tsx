"use client";

import Link from "next/link";
import { keyframes } from "@emotion/react";
import {
  Box, Card, CardContent, Typography, Chip,
  List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  LinearProgress, Avatar, Divider, Button,
} from "@mui/material";
import {
  Building2, Users, Banknote, AlertTriangle,
  Sparkles, Settings, ArrowRight,
  ShieldCheck, Database, Bot, Zap, Globe,
  Check, ExternalLink,
} from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0); }
`;

/* ── Stats ─────────────────────────────────────────────────── */
const stats = [
  {
    label: "Total Units",
    value: "—",
    icon: Building2,
    solidBg: "#7367f0",
    borderColor: "rgba(115,103,240,0.35)",
    cardBg: "rgba(115,103,240,0.08)",
  },
  {
    label: "Occupied",
    value: "—",
    icon: Users,
    solidBg: "#28c76f",
    borderColor: "rgba(40,199,111,0.35)",
    cardBg: "rgba(40,199,111,0.08)",
  },
  {
    label: "Rent This Month",
    value: "৳—",
    icon: Banknote,
    solidBg: "#ff9f43",
    borderColor: "rgba(255,159,67,0.35)",
    cardBg: "rgba(255,159,67,0.08)",
  },
  {
    label: "Overdue",
    value: "—",
    icon: AlertTriangle,
    solidBg: "#ea5455",
    borderColor: "rgba(234,84,85,0.35)",
    cardBg: "rgba(234,84,85,0.08)",
  },
];

/* ── Quick links ────────────────────────────────────────────── */
const quickLinks = [
  { href: "/admin/ai-assistant", label: "AI Assistant",  desc: "Chat with your personal assistant", icon: Sparkles,  solidBg: "#7367f0" },
  { href: "/admin/settings",     label: "Site Settings", desc: "Edit tagline, bio, availability",   icon: Settings,  solidBg: "#ff9f43" },
  { href: "/admin/property",     label: "Property",      desc: "Manage units and tenants",          icon: Building2, solidBg: "#28c76f" },
];

/* ── Module status ──────────────────────────────────────────── */
const modules = [
  { label: "AI Assistant",  active: true  },
  { label: "Site Settings", active: true  },
  { label: "Property",      active: false },
  { label: "Finance",       active: false },
  { label: "Renovation",    active: false },
];

/* ── System ─────────────────────────────────────────────────── */
const system = [
  { label: "Authentication", desc: "NextAuth v5 · JWT",     icon: ShieldCheck },
  { label: "Database",       desc: "PostgreSQL · Prisma 5", icon: Database    },
  { label: "AI API",         desc: "Claude Sonnet 4",       icon: Bot         },
];

/* ── Checklist ──────────────────────────────────────────────── */
const checklist = [
  { label: "Admin panel configured",   done: true  },
  { label: "AI Assistant ready",       done: true  },
  { label: "Site settings accessible", done: true  },
  { label: "Add your first property",  done: false },
  { label: "Track income & expenses",  done: false },
];

const animated = (delay: number) => ({
  animation: `${fadeUp} 0.45s ease-out both`,
  animationDelay: `${delay}s`,
});

export default function OverviewPage() {
  const doneCount = checklist.filter((c) => c.done).length;
  const pct = Math.round((doneCount / checklist.length) * 100);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Box sx={animated(0)}>
        <PageHeader title="Overview" subtitle="Welcome back, Shakil." />
      </Box>

      {/* ── Stats: 4 individual vivid cards ── */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" },
          gap: 2.5,
          ...animated(0.05),
        }}
      >
        {stats.map(({ label, value, icon: Icon, solidBg, borderColor, cardBg }, i) => {
          const empty = value === "—" || value === "৳—";
          return (
            <Card
              key={label}
              sx={{
                bgcolor: cardBg,
                border: "1px solid",
                borderColor,
                boxShadow: "none",
                animation: `${fadeUp} 0.45s ease-out both`,
                animationDelay: `${0.05 + i * 0.07}s`,
              }}
            >
              <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                  <Avatar
                    sx={{
                      width: 42,
                      height: 42,
                      borderRadius: "10px",
                      bgcolor: solidBg,
                      boxShadow: `0 4px 14px ${solidBg}55`,
                    }}
                  >
                    <Icon size={20} color="#fff" />
                  </Avatar>
                </Box>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 700,
                    color: empty ? "text.disabled" : "text.primary",
                    mb: 0.5,
                  }}
                >
                  {value}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {label}
                </Typography>
                {empty && (
                  <Typography variant="caption" color="text.disabled" sx={{ display: "block", mt: 0.25 }}>
                    No data yet
                  </Typography>
                )}
              </CardContent>
            </Card>
          );
        })}
      </Box>

      {/* ── Row 2: Quick Access + Module Status ── */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          gap: 2.5,
          ...animated(0.35),
        }}
      >
        {/* Quick Access */}
        <Card>
          <CardContent sx={{ p: 3, "&:last-child": { pb: 2 } }}>
            <Typography variant="overline" color="text.secondary" sx={{ mb: 1.5, display: "block" }}>
              Quick Access
            </Typography>
            <List disablePadding>
              {quickLinks.map(({ href, label, desc, icon: Icon, solidBg }) => (
                <ListItem key={href} disablePadding sx={{ mb: 0.5 }}>
                  <Link href={href} style={{ width: "100%", textDecoration: "none", color: "inherit" }}>
                    <ListItemButton sx={{ borderRadius: 1.5, px: 1.5 }}>
                      <ListItemIcon sx={{ minWidth: 44 }}>
                        <Avatar
                          sx={{
                            width: 34,
                            height: 34,
                            bgcolor: solidBg,
                            borderRadius: "8px",
                            boxShadow: `0 2px 8px ${solidBg}55`,
                          }}
                        >
                          <Icon size={16} color="#fff" />
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText
                        primary={<Typography variant="body2" sx={{ fontWeight: 500 }}>{label}</Typography>}
                        secondary={<Typography variant="caption" color="text.secondary">{desc}</Typography>}
                      />
                      <ArrowRight size={14} style={{ color: "rgba(134,146,168,0.5)", flexShrink: 0 }} />
                    </ListItemButton>
                  </Link>
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>

        {/* Module Status */}
        <Card>
          <CardContent sx={{ p: 3, "&:last-child": { pb: 2 } }}>
            <Typography variant="overline" color="text.secondary" sx={{ mb: 1.5, display: "block" }}>
              Module Status
            </Typography>
            <List disablePadding>
              {modules.map(({ label, active }) => (
                <ListItem
                  key={label}
                  disablePadding
                  sx={{ mb: 0.75 }}
                  secondaryAction={
                    <Chip
                      label={active ? "Active" : "Soon"}
                      size="small"
                      color={active ? "success" : "default"}
                      variant={active ? "filled" : "outlined"}
                      sx={{ height: 22, fontSize: "0.68rem" }}
                    />
                  }
                >
                  <ListItemIcon sx={{ minWidth: 28 }}>
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        bgcolor: active ? "success.main" : "action.disabled",
                        boxShadow: active ? "0 0 6px #28c76f99" : "none",
                      }}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="body2" color={active ? "text.primary" : "text.secondary"}>
                        {label}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
            <Divider sx={{ my: 1.5 }} />
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Zap size={15} style={{ color: "#7367f0" }} />
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 500, color: "text.primary" }}>
                  Powered by Claude Sonnet 4
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                  AI available across all modules
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* ── Row 3: System + Getting Started ── */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          gap: 2.5,
          ...animated(0.5),
        }}
      >
        {/* System */}
        <Card>
          <CardContent sx={{ p: 3, "&:last-child": { pb: 2 } }}>
            <Typography variant="overline" color="text.secondary" sx={{ mb: 2, display: "block" }}>
              System
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {system.map(({ label, desc, icon: Icon }) => (
                <Box
                  key={label}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: "rgba(231,227,252,0.04)",
                    border: "1px solid rgba(231,227,252,0.06)",
                  }}
                >
                  <Avatar sx={{ width: 36, height: 36, borderRadius: "8px", bgcolor: "rgba(40,199,111,0.12)" }}>
                    <Icon size={16} color="#28c76f" />
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{label}</Typography>
                    <Typography variant="caption" color="text.secondary">{desc}</Typography>
                  </Box>
                  <Chip
                    label="OK"
                    size="small"
                    color="success"
                    sx={{ height: 22, fontSize: "0.68rem", fontWeight: 700 }}
                  />
                </Box>
              ))}
            </Box>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Globe size={15} style={{ color: "rgba(134,146,168,0.7)" }} />
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>sshakil.com</Typography>
                  <Typography variant="caption" color="text.secondary">Public portfolio · Live</Typography>
                </Box>
              </Box>
              <Button
                component="a"
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                size="small"
                variant="outlined"
                color="inherit"
                endIcon={<ExternalLink size={12} />}
                sx={{ fontSize: "0.75rem", color: "text.secondary", borderColor: "divider" }}
              >
                View
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Getting Started */}
        <Card>
          <CardContent sx={{ p: 3, "&:last-child": { pb: 3 } }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
              <Typography variant="overline" color="text.secondary">Getting Started</Typography>
              <Chip
                label={`${doneCount}/${checklist.length}`}
                size="small"
                color="primary"
                sx={{ height: 22, fontSize: "0.68rem" }}
              />
            </Box>
            <List disablePadding>
              {checklist.map(({ label, done }) => (
                <ListItem key={label} disablePadding sx={{ mb: 1 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <Box
                      sx={{
                        width: 20,
                        height: 20,
                        borderRadius: 0.75,
                        border: "1.5px solid",
                        borderColor: done ? "success.main" : "divider",
                        bgcolor: done ? "rgba(40,199,111,0.12)" : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {done && <Check size={12} color="#28c76f" />}
                    </Box>
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography
                        variant="body2"
                        color={done ? "text.secondary" : "text.primary"}
                        sx={done ? { textDecoration: "line-through" } : {}}
                      >
                        {label}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
            <Box
              sx={{
                mt: 2,
                p: 2,
                borderRadius: 2,
                bgcolor: "rgba(231,227,252,0.04)",
                border: "1px solid rgba(231,227,252,0.06)",
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                <Typography variant="caption" color="text.secondary">Setup progress</Typography>
                <Typography variant="caption" sx={{ fontWeight: 700 }}>{pct}%</Typography>
              </Box>
              <LinearProgress variant="determinate" value={pct} color="primary" sx={{ mb: 1 }} />
              <Typography variant="caption" color="text.secondary">
                {doneCount} of {checklist.length} steps complete
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
