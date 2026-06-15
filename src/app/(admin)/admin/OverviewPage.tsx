"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { keyframes } from "@emotion/react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  LinearProgress,
  Avatar,
  Divider,
  CircularProgress,
} from "@mui/material";
import {
  Building2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Wallet,
  FileBarChart,
} from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import AiSpendPanel from "./AiSpendPanel";
import { adminApi } from "@/lib/api/admin";
import { fmt } from "./finance/format";
import type { AdminOverview } from "@/types";

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0); }
`;
const animated = (delay: number) => ({
  animation: `${fadeUp} 0.45s ease-out both`,
  animationDelay: `${delay}s`,
});

const quickLinks = [
  {
    href: "/admin/reports/financial",
    label: "Reports",
    desc: "Financial & property reports",
    icon: FileBarChart,
    solidBg: "#7367f0",
  },
  {
    href: "/admin/ai-assistant",
    label: "AI Assistant",
    desc: "Ask about your finances",
    icon: Sparkles,
    solidBg: "#00cfe8",
  },
  {
    href: "/admin/property",
    label: "Property",
    desc: "Units, tenants & payments",
    icon: Building2,
    solidBg: "#28c76f",
  },
];

/** Compact metric line: label left, value right (coloured). */
function Metric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 700, color: color ?? "text.primary" }}>
        {value}
      </Typography>
    </Box>
  );
}

export default function OverviewPage() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    adminApi
      .getOverview()
      .then((d) => active && setData(d))
      .catch(() => active && setData(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  const net = (n: number) => (n >= 0 ? "success.main" : "error.main");
  const f = data?.finance;
  const p = data?.property;

  const kpis = data
    ? [
        {
          label: `Business net · ${data.monthLabel}`,
          value: fmt(f!.month.net),
          icon: f!.month.net >= 0 ? TrendingUp : TrendingDown,
          solidBg: "#7367f0",
          borderColor: "rgba(115,103,240,0.35)",
          cardBg: "rgba(115,103,240,0.08)",
        },
        {
          label: `Property net · ${data.monthLabel}`,
          value: fmt(p!.net),
          icon: Building2,
          solidBg: "#28c76f",
          borderColor: "rgba(40,199,111,0.35)",
          cardBg: "rgba(40,199,111,0.08)",
        },
        {
          label: `Subscriptions · ${f!.subscriptionCount} active`,
          value: `${fmt(f!.subscriptionRunRate)}/mo`,
          icon: RefreshCw,
          solidBg: "#ff9f43",
          borderColor: "rgba(255,159,67,0.35)",
          cardBg: "rgba(255,159,67,0.08)",
        },
        {
          label: `Rent due · ${p!.overdueCount} overdue`,
          value: fmt(p!.totalDue),
          icon: AlertTriangle,
          solidBg: "#ea5455",
          borderColor: "rgba(234,84,85,0.35)",
          cardBg: "rgba(234,84,85,0.08)",
        },
      ]
    : [];

  const collectionPct =
    p && p.expected > 0 ? Math.min(100, Math.round((p.collected / p.expected) * 100)) : 0;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Box sx={animated(0)}>
        <PageHeader title="Overview" subtitle="Welcome back, Shakil." />
      </Box>

      {!data ? (
        <Card>
          <CardContent>
            <Typography color="text.secondary">Couldn’t load your overview. Try again.</Typography>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ── KPI row ── */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" },
              gap: 2.5,
              ...animated(0.05),
            }}
          >
            {kpis.map(({ label, value, icon: Icon, solidBg, borderColor, cardBg }, i) => (
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
                  <Avatar
                    sx={{
                      width: 42,
                      height: 42,
                      borderRadius: "10px",
                      bgcolor: solidBg,
                      boxShadow: `0 4px 14px ${solidBg}55`,
                      mb: 2,
                    }}
                  >
                    <Icon size={20} color="#fff" />
                  </Avatar>
                  <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                    {value}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {label}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>

          {/* ── Financial + Property quick views ── */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 2.5,
              ...animated(0.2),
            }}
          >
            {/* Financial Tracker */}
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                  <Wallet size={16} style={{ color: "#7367f0" }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Financial Tracker
                  </Typography>
                  <Chip
                    component={Link}
                    href="/admin/reports/financial"
                    clickable
                    label="Report"
                    size="small"
                    variant="outlined"
                    sx={{ ml: "auto", height: 22, fontSize: "0.68rem" }}
                  />
                </Box>

                <Typography variant="overline" color="text.secondary">
                  {data.monthLabel}
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, mb: 2, mt: 0.5 }}>
                  <Metric label="Income" value={fmt(f!.month.income)} color="success.main" />
                  <Metric label="Salaries" value={fmt(f!.month.salaries)} />
                  <Metric label="Tools & subscriptions" value={fmt(f!.month.expenses)} />
                  <Divider sx={{ my: 0.5 }} />
                  <Metric label="Net" value={fmt(f!.month.net)} color={net(f!.month.net)} />
                </Box>

                <Typography variant="overline" color="text.secondary">
                  Fiscal year {data.fiscalYear}
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, mt: 0.5 }}>
                  <Metric label="Income" value={fmt(f!.fiscalYear.income)} color="success.main" />
                  <Metric label="Costs" value={fmt(f!.fiscalYear.costs)} />
                  <Metric
                    label="Net profit"
                    value={fmt(f!.fiscalYear.net)}
                    color={net(f!.fiscalYear.net)}
                  />
                </Box>
              </CardContent>
            </Card>

            {/* Property */}
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                  <Building2 size={16} style={{ color: "#28c76f" }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Property · {data.monthLabel}
                  </Typography>
                  <Chip
                    component={Link}
                    href="/admin/reports/property"
                    clickable
                    label="Report"
                    size="small"
                    variant="outlined"
                    sx={{ ml: "auto", height: 22, fontSize: "0.68rem" }}
                  />
                </Box>

                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    Rent collected
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {fmt(p!.collected)} / {fmt(p!.expected)}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={collectionPct}
                  color="success"
                  sx={{ mb: 1.5 }}
                />

                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, mb: 2 }}>
                  <Metric label="Expenses" value={fmt(p!.expenses)} color="error.main" />
                  <Metric label="Net" value={fmt(p!.net)} color={net(p!.net)} />
                  <Metric label="Occupancy" value={`${p!.occupiedUnits}/${p!.totalUnits} units`} />
                </Box>

                <Divider sx={{ mb: 1 }} />
                <Typography variant="overline" color="text.secondary">
                  Top dues
                </Typography>
                {p!.topDue.length === 0 ? (
                  <Typography variant="body2" color="success.main" sx={{ mt: 0.5 }}>
                    All rent collected — nothing outstanding.
                  </Typography>
                ) : (
                  <List dense disablePadding sx={{ mt: 0.5 }}>
                    {p!.topDue.map((d) => (
                      <ListItem
                        key={`${d.tenantName}-${d.unitNumber}`}
                        disablePadding
                        sx={{ mb: 0.25 }}
                      >
                        <ListItemText
                          primary={
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {d.tenantName}
                              {d.unitNumber ? ` · ${d.unitNumber}` : ""}
                            </Typography>
                          }
                          secondary={
                            <Typography variant="caption" color="text.secondary">
                              {d.monthsUnpaid} mo unpaid
                            </Typography>
                          }
                        />
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: "error.main" }}>
                            {fmt(d.totalDue)}
                          </Typography>
                          <Chip
                            label={d.alert === "OVERDUE" ? "Overdue" : "Pending"}
                            size="small"
                            color={d.alert === "OVERDUE" ? "error" : "warning"}
                            variant="outlined"
                            sx={{ height: 20, fontSize: "0.62rem" }}
                          />
                        </Box>
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Box>

          {/* ── AI spend ── */}
          <Box sx={animated(0.35)}>
            <AiSpendPanel />
          </Box>

          {/* ── Quick access ── */}
          <Card sx={animated(0.45)}>
            <CardContent sx={{ p: 3, "&:last-child": { pb: 2 } }}>
              <Typography
                variant="overline"
                color="text.secondary"
                sx={{ mb: 1.5, display: "block" }}
              >
                Quick Access
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
                  gap: 1,
                }}
              >
                {quickLinks.map(({ href, label, desc, icon: Icon, solidBg }) => (
                  <Link key={href} href={href} style={{ textDecoration: "none", color: "inherit" }}>
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
                        primary={
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {label}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="caption" color="text.secondary">
                            {desc}
                          </Typography>
                        }
                      />
                      <ArrowRight
                        size={14}
                        style={{ color: "rgba(134,146,168,0.5)", flexShrink: 0 }}
                      />
                    </ListItemButton>
                  </Link>
                ))}
              </Box>
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  );
}
