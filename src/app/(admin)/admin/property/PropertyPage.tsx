"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Grid,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Drawer,
  IconButton,
  Divider,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import {
  Building2,
  X,
  Phone,
  Calendar,
  DollarSign,
  UserCheck,
  UserX,
  ExternalLink,
  Plus,
} from "lucide-react";
import Link from "next/link";
import PageHeader from "@/components/admin/PageHeader";
import type { UnitWithTenant } from "@/types";

function fmt(n: number) {
  return `৳${n.toLocaleString()}`;
}

function FloorBadge({ floor }: { floor: string }) {
  return (
    <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem" }}>
      {floor}
    </Typography>
  );
}

function StatusChip({ isOccupied }: { isOccupied: boolean }) {
  return (
    <Chip
      label={isOccupied ? "Occupied" : "Vacant"}
      size="small"
      sx={{
        bgcolor: isOccupied ? "success.main" : "warning.main",
        color: "#fff",
        fontWeight: 600,
        fontSize: "0.6875rem",
        height: 20,
      }}
    />
  );
}

export default function PropertyPage() {
  const [tab, setTab] = useState(0);
  const [units, setUnits] = useState<UnitWithTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerUnit, setDrawerUnit] = useState<UnitWithTenant | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/property/units");
      const json = await res.json();
      setUnits(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const activeTenants = units
    .filter((u) => u.tenant && !u.tenant.isExternal)
    .map((u) => u.tenant!);
  const externalTenants = units
    .filter((u) => u.tenant?.isExternal)
    .map((u) => u.tenant!);

  return (
    <Box>
      <PageHeader
        title="Property Management"
        subtitle="Manage units, tenants, and occupancy"
      />

      {/* Summary strip */}
      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        {[
          { label: "Total Units", value: units.length, color: "text.primary" },
          { label: "Occupied", value: units.filter((u) => u.isOccupied).length, color: "success.main" },
          { label: "Vacant", value: units.filter((u) => !u.isOccupied).length, color: "warning.main" },
          { label: "Active Tenants", value: activeTenants.length, color: "primary.main" },
        ].map((s) => (
          <Card key={s.label} sx={{ minWidth: 120, flex: "1 1 120px", bgcolor: "background.paper" }}>
            <CardContent sx={{ py: "12px !important", px: 2 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, color: s.color }}>
                {s.value}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {s.label}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 3, borderBottom: "1px solid", borderColor: "divider" }}
      >
        <Tab label={`Units (${units.length})`} />
        <Tab label={`Tenants (${activeTenants.length})`} />
        <Tab label={`External Members (${externalTenants.length})`} />
      </Tabs>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* ── Units grid ─────────────────────────────────────────────── */}
          {tab === 0 && (
            <Box>
              <Grid container spacing={2}>
                {units.map((unit) => (
                  <Grid key={unit.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                    <Card
                      sx={{
                        cursor: "pointer",
                        borderLeft: "4px solid",
                        borderColor: unit.isOccupied ? "success.main" : "warning.main",
                        bgcolor: "background.paper",
                        "&:hover": { bgcolor: "action.hover" },
                        transition: "background-color 0.15s",
                      }}
                      onClick={() => setDrawerUnit(unit)}
                    >
                      <CardContent sx={{ p: "14px !important" }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {unit.unitNumber}
                          </Typography>
                          <StatusChip isOccupied={unit.isOccupied} />
                        </Box>
                        <FloorBadge floor={unit.floor} />
                        <Box sx={{ mt: 1.5 }}>
                          {unit.tenant ? (
                            <>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {unit.tenant.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {unit.tenant.tenantCode} · {fmt(unit.monthlyRent)}/mo
                              </Typography>
                            </>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              {fmt(unit.monthlyRent)}/mo
                            </Typography>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {/* ── Tenants table ───────────────────────────────────────────── */}
          {tab === 1 && (
            <TenantTable
              tenants={units.filter((u) => u.tenant && !u.tenant.isExternal && u.tenant.isActive)}
              showUnit
            />
          )}

          {/* ── External members table ──────────────────────────────────── */}
          {tab === 2 && (
            <TenantTable
              tenants={units.filter((u) => u.tenant?.isExternal)}
              showUnit={false}
            />
          )}
        </>
      )}

      {/* Unit drawer */}
      <Drawer anchor="right" open={!!drawerUnit} onClose={() => setDrawerUnit(null)}>
        {drawerUnit && (
          <Box sx={{ width: 340, p: 3 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {drawerUnit.unitNumber}
              </Typography>
              <IconButton onClick={() => setDrawerUnit(null)} size="small">
                <X size={18} />
              </IconButton>
            </Box>

            <Chip
              label={drawerUnit.floor}
              size="small"
              variant="outlined"
              sx={{ mb: 2, fontSize: "0.75rem" }}
            />
            <Divider sx={{ mb: 2 }} />

            {drawerUnit.tenant ? (
              <Box>
                <Typography variant="overline" color="text.secondary" sx={{ fontSize: "0.6875rem" }}>
                  Current Tenant
                </Typography>
                <Box sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 1.5 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <UserCheck size={16} color="var(--mui-palette-success-main)" />
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {drawerUnit.tenant.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {drawerUnit.tenant.tenantCode}
                      </Typography>
                    </Box>
                  </Box>
                  {drawerUnit.tenant.phone && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Phone size={14} />
                      <Typography variant="body2">{drawerUnit.tenant.phone}</Typography>
                    </Box>
                  )}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <DollarSign size={14} />
                    <Typography variant="body2">{fmt(drawerUnit.monthlyRent)}/month</Typography>
                  </Box>
                  {drawerUnit.tenant.moveInDate && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Calendar size={14} />
                      <Typography variant="body2">
                        Move-in: {new Date(drawerUnit.tenant.moveInDate).toLocaleDateString()}
                      </Typography>
                    </Box>
                  )}
                  {drawerUnit.tenant.advancePaid && (
                    <Chip
                      label={`Advance: ${fmt(drawerUnit.tenant.advanceAmount)}`}
                      size="small"
                      sx={{ bgcolor: "primary.main", color: "#fff", alignSelf: "flex-start" }}
                    />
                  )}
                </Box>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: 3 }}>
                  <Button
                    component={Link}
                    href={`/admin/property/tenants/${drawerUnit.tenant.id}`}
                    variant="contained"
                    size="small"
                    startIcon={<ExternalLink size={14} />}
                    fullWidth
                  >
                    View Profile
                  </Button>
                  <Button
                    component={Link}
                    href={`/admin/property/payments`}
                    variant="outlined"
                    size="small"
                    fullWidth
                  >
                    Record Payment
                  </Button>
                </Box>
              </Box>
            ) : (
              <Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                  <UserX size={16} color="var(--mui-palette-warning-main)" />
                  <Typography variant="body2" color="text.secondary">
                    This unit is currently vacant
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  Base rent: {fmt(drawerUnit.monthlyRent)}/month
                </Typography>
                <Button variant="outlined" size="small" startIcon={<Plus size={14} />} fullWidth>
                  Add Tenant
                </Button>
              </Box>
            )}
          </Box>
        )}
      </Drawer>
    </Box>
  );
}

function TenantTable({
  tenants,
  showUnit,
}: {
  tenants: UnitWithTenant[];
  showUnit: boolean;
}) {
  if (tenants.length === 0) {
    return (
      <Box sx={{ textAlign: "center", py: 8 }}>
        <Building2 size={40} style={{ opacity: 0.3 }} />
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          No records found
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Card} sx={{ bgcolor: "background.paper" }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700 }}>Code</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
            {showUnit && <TableCell sx={{ fontWeight: 700 }}>Unit</TableCell>}
            <TableCell sx={{ fontWeight: 700 }}>Rent</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Advance Held</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Lease End</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {tenants.map((row) => {
            const t = row.tenant!;
            return (
              <TableRow key={t.id} hover>
                <TableCell>
                  <Chip label={t.tenantCode ?? "—"} size="small" variant="outlined" />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {t.name}
                  </Typography>
                  {t.phone && (
                    <Typography variant="caption" color="text.secondary">
                      {t.phone}
                    </Typography>
                  )}
                </TableCell>
                {showUnit && (
                  <TableCell>
                    <Typography variant="body2">{row.unitNumber}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {row.floor}
                    </Typography>
                  </TableCell>
                )}
                <TableCell>
                  <Typography variant="body2">{fmt(row.monthlyRent)}</Typography>
                </TableCell>
                <TableCell>
                  {t.advancePaid ? (
                    <Typography variant="body2" color="primary.main" sx={{ fontWeight: 600 }}>
                      {fmt(t.advanceAmount)}
                    </Typography>
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      None
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  {t.leaseEndDate ? (
                    <Typography variant="body2">
                      {new Date(t.leaseEndDate).toLocaleDateString()}
                    </Typography>
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      —
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    label={t.isActive ? "Active" : "Inactive"}
                    size="small"
                    sx={{
                      bgcolor: t.isActive ? "success.main" : "error.main",
                      color: "#fff",
                      fontWeight: 600,
                      fontSize: "0.6875rem",
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Tooltip title="View profile">
                    <IconButton
                      component={Link}
                      href={`/admin/property/tenants/${t.id}`}
                      size="small"
                    >
                      <ExternalLink size={15} />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
