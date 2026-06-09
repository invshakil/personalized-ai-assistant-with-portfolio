"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Box, Card, CardContent, Typography, Chip, Grid, Tabs, Tab,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Drawer, IconButton, Divider, CircularProgress, Tooltip,
  TextField, Switch, FormControlLabel,
} from "@mui/material";
import {
  Building2, X, Phone, Calendar, DollarSign, UserCheck, UserX,
  ExternalLink, Plus, Pencil, TrendingUp,
} from "lucide-react";
import Link from "next/link";
import PageHeader from "@/components/admin/PageHeader";
import type { UnitWithTenant } from "@/types";

function fmt(n: number) { return `৳${n.toLocaleString()}`; }

function StatusChip({ isOccupied }: { isOccupied: boolean }) {
  return (
    <Chip
      label={isOccupied ? "Occupied" : "Vacant"}
      size="small"
      sx={{ bgcolor: isOccupied ? "success.main" : "warning.main", color: "#fff", fontWeight: 600, fontSize: "0.6875rem", height: 20 }}
    />
  );
}

interface UnitForm { unitNumber: string; floor: string; monthlyRent: string; description: string; notes: string; }
interface TenantForm { name: string; phone: string; moveInDate: string; leaseEndDate: string; advancePaid: boolean; advanceAmount: string; }
interface RentChangeForm { effectiveDate: string; newRent: string; reason: string; }

export default function PropertyPage() {
  const [tab, setTab] = useState(0);
  const [units, setUnits] = useState<UnitWithTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Unit drawer
  const [drawerUnit, setDrawerUnit] = useState<UnitWithTenant | null>(null);
  const [unitEditMode, setUnitEditMode] = useState(false);
  const [unitForm, setUnitForm] = useState<UnitForm>({ unitNumber: "", floor: "", monthlyRent: "", description: "", notes: "" });

  // Tenant edit drawer
  const [editTenantRow, setEditTenantRow] = useState<UnitWithTenant | null>(null);
  const [tenantForm, setTenantForm] = useState<TenantForm>({ name: "", phone: "", moveInDate: "", leaseEndDate: "", advancePaid: false, advanceAmount: "0" });
  const [showRcForm, setShowRcForm] = useState(false);
  const [rcForm, setRcForm] = useState<RentChangeForm>({ effectiveDate: "", newRent: "", reason: "" });

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

  const openUnitDrawer = (unit: UnitWithTenant) => {
    setDrawerUnit(unit);
    setUnitEditMode(false);
    setUnitForm({
      unitNumber: unit.unitNumber,
      floor: unit.floor,
      monthlyRent: String(unit.monthlyRent),
      description: unit.description ?? "",
      notes: unit.notes ?? "",
    });
  };

  const saveUnit = async () => {
    if (!drawerUnit) return;
    setSaving(true);
    try {
      await fetch(`/api/admin/property/units/${drawerUnit.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitNumber: unitForm.unitNumber,
          floor: unitForm.floor,
          monthlyRent: Number(unitForm.monthlyRent),
          description: unitForm.description || null,
          notes: unitForm.notes || null,
        }),
      });
      setUnitEditMode(false);
      setDrawerUnit(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const openTenantEdit = (row: UnitWithTenant) => {
    const t = row.tenant!;
    setEditTenantRow(row);
    setTenantForm({
      name: t.name,
      phone: t.phone ?? "",
      moveInDate: t.moveInDate.split("T")[0],
      leaseEndDate: t.leaseEndDate ? t.leaseEndDate.split("T")[0] : "",
      advancePaid: t.advancePaid,
      advanceAmount: String(t.advanceAmount),
    });
    setShowRcForm(false);
    setRcForm({ effectiveDate: "", newRent: String(row.monthlyRent), reason: "" });
  };

  const saveTenant = async () => {
    if (!editTenantRow?.tenant) return;
    setSaving(true);
    try {
      await fetch(`/api/admin/property/tenants/${editTenantRow.tenant.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: tenantForm.name,
          phone: tenantForm.phone || null,
          moveInDate: tenantForm.moveInDate,
          leaseEndDate: tenantForm.leaseEndDate || null,
          advancePaid: tenantForm.advancePaid,
          advanceAmount: Number(tenantForm.advanceAmount),
        }),
      });
      setEditTenantRow(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const saveRentChange = async () => {
    if (!editTenantRow?.tenant || !rcForm.effectiveDate || !rcForm.newRent) return;
    setSaving(true);
    try {
      await fetch(`/api/admin/property/tenants/${editTenantRow.tenant.id}/rent-change`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          effectiveDate: rcForm.effectiveDate,
          newRent: Number(rcForm.newRent),
          reason: rcForm.reason || null,
        }),
      });
      setShowRcForm(false);
      setRcForm({ effectiveDate: "", newRent: String(editTenantRow.monthlyRent), reason: "" });
    } finally {
      setSaving(false);
    }
  };

  const activeTenants = units.filter((u) => u.tenant && !u.tenant.isExternal).map((u) => u.tenant!);
  const externalTenants = units.filter((u) => u.tenant?.isExternal).map((u) => u.tenant!);

  return (
    <Box>
      <PageHeader title="Property Management" subtitle="Manage units, tenants, and occupancy" />

      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        {[
          { label: "Total Units", value: units.length, color: "text.primary" },
          { label: "Occupied", value: units.filter((u) => u.isOccupied).length, color: "success.main" },
          { label: "Vacant", value: units.filter((u) => !u.isOccupied).length, color: "warning.main" },
          { label: "Active Tenants", value: activeTenants.length, color: "primary.main" },
        ].map((s) => (
          <Card key={s.label} sx={{ minWidth: 120, flex: "1 1 120px", bgcolor: "background.paper" }}>
            <CardContent sx={{ py: "12px !important", px: 2 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, color: s.color }}>{s.value}</Typography>
              <Typography variant="caption" color="text.secondary">{s.label}</Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: "1px solid", borderColor: "divider" }}>
        <Tab label={`Units (${units.length})`} />
        <Tab label={`Tenants (${activeTenants.length})`} />
        <Tab label={`External Members (${externalTenants.length})`} />
      </Tabs>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>
      ) : (
        <>
          {tab === 0 && (
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
                    onClick={() => openUnitDrawer(unit)}
                  >
                    <CardContent sx={{ p: "14px !important" }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{unit.unitNumber}</Typography>
                        <StatusChip isOccupied={unit.isOccupied} />
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem" }}>{unit.floor}</Typography>
                      <Box sx={{ mt: 1.5 }}>
                        {unit.tenant ? (
                          <>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{unit.tenant.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {unit.tenant.tenantCode} · {fmt(unit.monthlyRent)}/mo
                            </Typography>
                          </>
                        ) : (
                          <Typography variant="body2" color="text.secondary">{fmt(unit.monthlyRent)}/mo</Typography>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

          {tab === 1 && (
            <TenantTable
              tenants={units.filter((u) => u.tenant && !u.tenant.isExternal && u.tenant.isActive)}
              showUnit
              onEdit={openTenantEdit}
            />
          )}

          {tab === 2 && (
            <TenantTable
              tenants={units.filter((u) => u.tenant?.isExternal)}
              showUnit={false}
              onEdit={openTenantEdit}
            />
          )}
        </>
      )}

      {/* ── Unit info / edit drawer ─────────────────────────────────── */}
      <Drawer anchor="right" open={!!drawerUnit} onClose={() => setDrawerUnit(null)}>
        {drawerUnit && (
          <Box sx={{ width: 360, p: 3 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {unitEditMode ? "Edit Unit" : drawerUnit.unitNumber}
              </Typography>
              <IconButton onClick={() => setDrawerUnit(null)} size="small"><X size={18} /></IconButton>
            </Box>

            {unitEditMode ? (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <TextField label="Unit Number" value={unitForm.unitNumber}
                  onChange={(e) => setUnitForm((p) => ({ ...p, unitNumber: e.target.value }))}
                  size="small" fullWidth />
                <TextField label="Floor" value={unitForm.floor}
                  onChange={(e) => setUnitForm((p) => ({ ...p, floor: e.target.value }))}
                  size="small" fullWidth />
                <TextField label="Monthly Rent (৳)" type="number" value={unitForm.monthlyRent}
                  onChange={(e) => setUnitForm((p) => ({ ...p, monthlyRent: e.target.value }))}
                  size="small" fullWidth />
                <TextField label="Description" value={unitForm.description}
                  onChange={(e) => setUnitForm((p) => ({ ...p, description: e.target.value }))}
                  size="small" fullWidth multiline rows={2} />
                <TextField label="Notes" value={unitForm.notes}
                  onChange={(e) => setUnitForm((p) => ({ ...p, notes: e.target.value }))}
                  size="small" fullWidth multiline rows={2} />
                <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                  <Button variant="outlined" size="small" fullWidth onClick={() => setUnitEditMode(false)} disabled={saving}>Cancel</Button>
                  <Button variant="contained" size="small" fullWidth onClick={saveUnit} disabled={saving}>
                    {saving ? "Saving…" : "Save"}
                  </Button>
                </Box>
              </Box>
            ) : (
              <>
                <Chip label={drawerUnit.floor} size="small" variant="outlined" sx={{ mb: 2, fontSize: "0.75rem" }} />
                <Divider sx={{ mb: 2 }} />
                {drawerUnit.tenant ? (
                  <Box>
                    <Typography variant="overline" color="text.secondary" sx={{ fontSize: "0.6875rem" }}>Current Tenant</Typography>
                    <Box sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 1.5 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <UserCheck size={16} color="var(--mui-palette-success-main)" />
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{drawerUnit.tenant.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{drawerUnit.tenant.tenantCode}</Typography>
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
                          <Typography variant="body2">Move-in: {new Date(drawerUnit.tenant.moveInDate).toLocaleDateString()}</Typography>
                        </Box>
                      )}
                      {drawerUnit.tenant.advancePaid && (
                        <Chip label={`Advance: ${fmt(drawerUnit.tenant.advanceAmount)}`} size="small"
                          sx={{ bgcolor: "primary.main", color: "#fff", alignSelf: "flex-start" }} />
                      )}
                    </Box>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: 3 }}>
                      <Button variant="outlined" size="small" fullWidth startIcon={<Pencil size={14} />}
                        onClick={() => setUnitEditMode(true)}>
                        Edit Unit
                      </Button>
                      <Button component={Link} href={`/admin/property/tenants/${drawerUnit.tenant.id}`}
                        variant="contained" size="small" fullWidth startIcon={<ExternalLink size={14} />}>
                        View Profile
                      </Button>
                      <Button component={Link} href="/admin/property/payments" variant="outlined" size="small" fullWidth>
                        Record Payment
                      </Button>
                    </Box>
                  </Box>
                ) : (
                  <Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                      <UserX size={16} color="var(--mui-palette-warning-main)" />
                      <Typography variant="body2" color="text.secondary">This unit is currently vacant</Typography>
                    </Box>
                    <Typography variant="body2" sx={{ mb: 2 }}>Base rent: {fmt(drawerUnit.monthlyRent)}/month</Typography>
                    <Button variant="outlined" size="small" fullWidth startIcon={<Pencil size={14} />}
                      onClick={() => setUnitEditMode(true)} sx={{ mb: 1 }}>
                      Edit Unit
                    </Button>
                    <Button variant="outlined" size="small" fullWidth startIcon={<Plus size={14} />}>
                      Add Tenant
                    </Button>
                  </Box>
                )}
              </>
            )}
          </Box>
        )}
      </Drawer>

      {/* ── Tenant edit drawer ──────────────────────────────────────── */}
      <Drawer anchor="right" open={!!editTenantRow} onClose={() => setEditTenantRow(null)}>
        {editTenantRow?.tenant && (
          <Box sx={{ width: 380, p: 3 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Edit Tenant</Typography>
              <IconButton onClick={() => setEditTenantRow(null)} size="small"><X size={18} /></IconButton>
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <TextField label="Full Name" value={tenantForm.name}
                onChange={(e) => setTenantForm((p) => ({ ...p, name: e.target.value }))}
                size="small" fullWidth />
              <TextField label="Phone" value={tenantForm.phone}
                onChange={(e) => setTenantForm((p) => ({ ...p, phone: e.target.value }))}
                size="small" fullWidth />
              <TextField label="Move-in Date" type="date" value={tenantForm.moveInDate}
                onChange={(e) => setTenantForm((p) => ({ ...p, moveInDate: e.target.value }))}
                size="small" fullWidth slotProps={{ inputLabel: { shrink: true } }} />
              <TextField label="Lease End Date" type="date" value={tenantForm.leaseEndDate}
                onChange={(e) => setTenantForm((p) => ({ ...p, leaseEndDate: e.target.value }))}
                size="small" fullWidth slotProps={{ inputLabel: { shrink: true } }} />
              <FormControlLabel
                control={<Switch checked={tenantForm.advancePaid}
                  onChange={(e) => setTenantForm((p) => ({ ...p, advancePaid: e.target.checked }))} />}
                label="Advance Paid" />
              {tenantForm.advancePaid && (
                <TextField label="Advance Amount (৳)" type="number" value={tenantForm.advanceAmount}
                  onChange={(e) => setTenantForm((p) => ({ ...p, advanceAmount: e.target.value }))}
                  size="small" fullWidth />
              )}
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button variant="outlined" size="small" fullWidth onClick={() => setEditTenantRow(null)} disabled={saving}>Cancel</Button>
                <Button variant="contained" size="small" fullWidth onClick={saveTenant} disabled={saving}>
                  {saving ? "Saving…" : "Save Changes"}
                </Button>
              </Box>
            </Box>

            <Divider sx={{ my: 2.5 }} />

            {/* Rent change scheduling */}
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <TrendingUp size={15} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Schedule Rent Change</Typography>
              </Box>
              {!showRcForm && (
                <Button size="small" startIcon={<Plus size={13} />} onClick={() => setShowRcForm(true)}>Add</Button>
              )}
            </Box>

            {showRcForm ? (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                <Typography variant="caption" color="text.secondary">
                  Current rent: {fmt(editTenantRow.monthlyRent)}
                </Typography>
                <TextField label="Effective Date" type="date" value={rcForm.effectiveDate}
                  onChange={(e) => setRcForm((p) => ({ ...p, effectiveDate: e.target.value }))}
                  size="small" fullWidth slotProps={{ inputLabel: { shrink: true } }} />
                <TextField label="New Rent (৳)" type="number" value={rcForm.newRent}
                  onChange={(e) => setRcForm((p) => ({ ...p, newRent: e.target.value }))}
                  size="small" fullWidth />
                <TextField label="Reason (optional)" value={rcForm.reason}
                  onChange={(e) => setRcForm((p) => ({ ...p, reason: e.target.value }))}
                  size="small" fullWidth />
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Button variant="outlined" size="small" fullWidth onClick={() => setShowRcForm(false)} disabled={saving}>Cancel</Button>
                  <Button variant="contained" size="small" fullWidth onClick={saveRentChange}
                    disabled={saving || !rcForm.effectiveDate || !rcForm.newRent}>
                    {saving ? "Saving…" : "Schedule"}
                  </Button>
                </Box>
              </Box>
            ) : (
              <Typography variant="caption" color="text.secondary">
                Changes scheduled here are applied automatically when payments are generated for the effective month.
              </Typography>
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
  onEdit,
}: {
  tenants: UnitWithTenant[];
  showUnit: boolean;
  onEdit: (row: UnitWithTenant) => void;
}) {
  if (tenants.length === 0) {
    return (
      <Box sx={{ textAlign: "center", py: 8 }}>
        <Building2 size={40} style={{ opacity: 0.3 }} />
        <Typography color="text.secondary" sx={{ mt: 1 }}>No records found</Typography>
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
            <TableCell sx={{ fontWeight: 700 }}>Move-in</TableCell>
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
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{t.name}</Typography>
                  {t.phone && <Typography variant="caption" color="text.secondary">{t.phone}</Typography>}
                </TableCell>
                {showUnit && (
                  <TableCell>
                    <Typography variant="body2">{row.unitNumber}</Typography>
                    <Typography variant="caption" color="text.secondary">{row.floor}</Typography>
                  </TableCell>
                )}
                <TableCell>
                  <Typography variant="body2">{fmt(row.monthlyRent)}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {new Date(t.moveInDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                  </Typography>
                </TableCell>
                <TableCell>
                  {t.advancePaid ? (
                    <Typography variant="body2" color="primary.main" sx={{ fontWeight: 600 }}>{fmt(t.advanceAmount)}</Typography>
                  ) : (
                    <Typography variant="caption" color="text.secondary">None</Typography>
                  )}
                </TableCell>
                <TableCell>
                  {t.leaseEndDate ? (
                    <Typography variant="body2">{new Date(t.leaseEndDate).toLocaleDateString()}</Typography>
                  ) : (
                    <Typography variant="caption" color="text.secondary">—</Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    label={t.isActive ? "Active" : "Inactive"} size="small"
                    sx={{ bgcolor: t.isActive ? "success.main" : "error.main", color: "#fff", fontWeight: 600, fontSize: "0.6875rem" }}
                  />
                </TableCell>
                <TableCell>
                  <Tooltip title="Edit tenant">
                    <IconButton size="small" onClick={() => onEdit(row)}>
                      <Pencil size={15} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="View profile">
                    <IconButton component={Link} href={`/admin/property/tenants/${t.id}`} size="small">
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
