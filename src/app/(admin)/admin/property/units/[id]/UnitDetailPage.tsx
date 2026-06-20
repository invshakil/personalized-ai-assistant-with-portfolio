"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Button,
  CircularProgress,
  TextField,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert,
} from "@mui/material";
import {
  ArrowLeft,
  UserCheck,
  UserPlus,
  UserX,
  Pencil,
  ExternalLink,
  Calendar,
  Phone,
  DollarSign,
  Plus,
} from "lucide-react";
import Link from "next/link";
import PageHeader from "@/components/admin/PageHeader";
import { propertyApi } from "@/lib/api/property";
import { mobileCardTableSx } from "@/lib/mobileTableSx";

function fmt(n: number) {
  return `৳${n.toLocaleString()}`;
}

// Given a YYYY-MM-DD string, return the calendar day before it (also YYYY-MM-DD).
// Parse and step in UTC so the result is timezone-independent (a local parse +
// toISOString() can shift the date by a day in non-UTC zones).
function dayBefore(iso: string): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

type TenantHistory = {
  id: string;
  tenantCode: string | null;
  name: string;
  phone: string | null;
  isActive: boolean;
  tenantStatus: string;
  moveInDate: string;
  moveOutDate: string | null;
  leaseEndDate: string | null;
  advancePaid: boolean;
  advanceAmount: number;
  advanceSettled: boolean;
  scheduledRent?: number | null;
};

type UnitDetail = {
  id: string;
  unitNumber: string;
  floor: string;
  monthlyRent: number;
  description: string | null;
  notes: string | null;
  isOccupied: boolean;
  tenants: TenantHistory[];
};

interface AddFutureForm {
  name: string;
  phone: string;
  moveInDate: string;
  leaseEndDate: string;
  advancePaid: boolean;
  advanceAmount: string;
  newRent: string;
  outgoingMoveOutDate: string;
}

export default function UnitDetailPage({ unitId }: { unitId: string }) {
  const router = useRouter();
  const [unit, setUnit] = useState<UnitDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    unitNumber: "",
    floor: "",
    monthlyRent: "",
    description: "",
    notes: "",
  });
  const [addFutureOpen, setAddFutureOpen] = useState(false);
  const [addFutureForm, setAddFutureForm] = useState<AddFutureForm>({
    name: "",
    phone: "",
    moveInDate: "",
    leaseEndDate: "",
    advancePaid: false,
    advanceAmount: "",
    newRent: "",
    outgoingMoveOutDate: "",
  });
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    confirmColor: "error" | "warning" | "success" | "primary";
    onConfirm: () => Promise<void>;
  } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const u = await propertyApi.getUnit<UnitDetail>(unitId);
      setUnit(u);
      setEditForm({
        unitNumber: u.unitNumber,
        floor: u.floor,
        monthlyRent: String(u.monthlyRent),
        description: u.description ?? "",
        notes: u.notes ?? "",
      });
    } catch {
      router.push("/admin/property");
    } finally {
      setLoading(false);
    }
  }, [unitId, router]);

  useEffect(() => {
    load();
  }, [load]);

  const saveUnit = async () => {
    setSaving(true);
    try {
      await propertyApi.updateUnit(unitId, {
        unitNumber: editForm.unitNumber,
        floor: editForm.floor,
        monthlyRent: Number(editForm.monthlyRent),
        description: editForm.description || null,
        notes: editForm.notes || null,
      });
      setEditMode(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const openConfirm = (
    title: string,
    message: string,
    confirmLabel: string,
    confirmColor: "error" | "warning" | "success" | "primary",
    onConfirm: () => Promise<void>
  ) => setConfirmDialog({ title, message, confirmLabel, confirmColor, onConfirm });

  const runConfirm = async () => {
    if (!confirmDialog) return;
    setConfirmLoading(true);
    try {
      await confirmDialog.onConfirm();
    } finally {
      setConfirmLoading(false);
      setConfirmDialog(null);
    }
  };

  const moveOut = (t: TenantHistory) => {
    const hasFuture = !!unit?.tenants.find((x) => x.tenantStatus === "FUTURE" && x.isActive);
    openConfirm(
      "Move Out Tenant",
      hasFuture
        ? `Move out ${t.name}? The scheduled future tenant will automatically become current.`
        : `Move out ${t.name}? The unit will become vacant.`,
      "Move Out",
      "error",
      async () => {
        await propertyApi.deactivateTenant(t.id);
        await load();
      }
    );
  };

  const promoteNow = (current: TenantHistory, future: TenantHistory) => {
    openConfirm(
      "Promote to Current Tenant",
      `Promote ${future.name} to current tenant now? ${current.name} will be moved out.`,
      "Promote",
      "warning",
      async () => {
        await propertyApi.deactivateTenant(current.id);
        await load();
      }
    );
  };

  const addFutureTenant = async () => {
    if (!addFutureForm.name || !addFutureForm.moveInDate) return;
    setSaving(true);
    try {
      const newTenant = (await propertyApi.createTenant({
        name: addFutureForm.name,
        phone: addFutureForm.phone || null,
        unitId,
        moveInDate: addFutureForm.moveInDate,
        leaseEndDate: addFutureForm.leaseEndDate || null,
        advancePaid: addFutureForm.advancePaid,
        advanceAmount: addFutureForm.advancePaid ? Number(addFutureForm.advanceAmount) : 0,
        isExternal: false,
        // When a current tenant is being replaced, schedule their move-out.
        outgoingMoveOutDate: unit?.tenants.some((t) => t.tenantStatus === "CURRENT" && t.isActive)
          ? addFutureForm.outgoingMoveOutDate || dayBefore(addFutureForm.moveInDate) || null
          : null,
      })) as { id?: string } | null;
      // Schedule a rent change effective on move-in date if a custom rent was provided
      if (
        newTenant?.id &&
        addFutureForm.newRent &&
        unit &&
        Number(addFutureForm.newRent) !== unit.monthlyRent
      ) {
        await propertyApi.addRentChange(newTenant.id, {
          effectiveDate: addFutureForm.moveInDate,
          newRent: Number(addFutureForm.newRent),
          reason: "Scheduled with future tenant",
        });
      }
      setAddFutureOpen(false);
      setAddFutureForm({
        name: "",
        phone: "",
        moveInDate: "",
        leaseEndDate: "",
        advancePaid: false,
        advanceAmount: "",
        newRent: "",
        outgoingMoveOutDate: "",
      });
      await load();
    } finally {
      setSaving(false);
    }
  };

  if (loading || !unit) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 12 }}>
        <CircularProgress />
      </Box>
    );
  }

  const currentTenant =
    unit.tenants.find((t) => t.tenantStatus === "CURRENT" && t.isActive) ?? null;
  const futureTenant = unit.tenants.find((t) => t.tenantStatus === "FUTURE" && t.isActive) ?? null;
  const pastTenants = unit.tenants.filter((t) => t.tenantStatus === "PAST" || !t.isActive);

  return (
    <Box>
      <Button
        startIcon={<ArrowLeft size={16} />}
        onClick={() => router.push("/admin/property")}
        sx={{ mb: 2, color: "text.secondary" }}
        size="small"
      >
        Property Management
      </Button>

      <PageHeader
        title={unit.unitNumber}
        subtitle={`${unit.floor} · ${fmt(unit.monthlyRent)}/month`}
      />

      {/* Unit info / edit */}
      <Card sx={{ bgcolor: "background.paper", mb: 3 }}>
        <CardContent>
          {editMode ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: 480 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                Edit Unit
              </Typography>
              <TextField
                label="Unit Number"
                value={editForm.unitNumber}
                onChange={(e) => setEditForm((p) => ({ ...p, unitNumber: e.target.value }))}
                size="small"
                fullWidth
              />
              <TextField
                label="Floor"
                value={editForm.floor}
                onChange={(e) => setEditForm((p) => ({ ...p, floor: e.target.value }))}
                size="small"
                fullWidth
              />
              <TextField
                label="Monthly Rent (৳)"
                type="number"
                value={editForm.monthlyRent}
                onChange={(e) => setEditForm((p) => ({ ...p, monthlyRent: e.target.value }))}
                size="small"
                fullWidth
              />
              <TextField
                label="Description"
                value={editForm.description}
                onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                size="small"
                fullWidth
                multiline
                rows={2}
              />
              <TextField
                label="Notes"
                value={editForm.notes}
                onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))}
                size="small"
                fullWidth
                multiline
                rows={2}
              />
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setEditMode(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button variant="contained" size="small" onClick={saveUnit} disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </Button>
              </Box>
            </Box>
          ) : (
            <Box
              sx={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 2,
              }}
            >
              <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Floor
                  </Typography>
                  <Typography variant="body2">{unit.floor}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Monthly Rent
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {fmt(unit.monthlyRent)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Status
                  </Typography>
                  <Box sx={{ mt: 0.25 }}>
                    <Chip
                      label={unit.isOccupied ? "Occupied" : "Vacant"}
                      size="small"
                      sx={{
                        bgcolor: unit.isOccupied ? "success.main" : "warning.main",
                        color: "#fff",
                        fontSize: "0.6875rem",
                        fontWeight: 600,
                      }}
                    />
                  </Box>
                </Box>
                {unit.description && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Description
                    </Typography>
                    <Typography variant="body2">{unit.description}</Typography>
                  </Box>
                )}
              </Box>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Pencil size={14} />}
                onClick={() => setEditMode(true)}
              >
                Edit Unit
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

      <Box
        sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3, mb: 3 }}
      >
        {/* Current Tenant */}
        <Card
          sx={{
            bgcolor: "background.paper",
            borderLeft: "4px solid",
            borderColor: currentTenant ? "success.main" : "divider",
          }}
        >
          <CardContent>
            <Typography
              variant="overline"
              sx={{ color: "success.main", fontSize: "0.6875rem", fontWeight: 700 }}
            >
              Current Tenant
            </Typography>
            {currentTenant ? (
              <Box sx={{ mt: 1.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
                  <UserCheck size={18} color="var(--mui-palette-success-main)" />
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {currentTenant.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {currentTenant.tenantCode}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, mb: 2 }}>
                  {currentTenant.phone && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Phone size={13} />
                      <Typography variant="body2">{currentTenant.phone}</Typography>
                    </Box>
                  )}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Calendar size={13} />
                    <Typography variant="body2">
                      Move-in:{" "}
                      {new Date(currentTenant.moveInDate).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </Typography>
                  </Box>
                  {currentTenant.leaseEndDate && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Calendar size={13} />
                      <Typography variant="body2">
                        Lease ends:{" "}
                        {new Date(currentTenant.leaseEndDate).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </Typography>
                    </Box>
                  )}
                  {currentTenant.advancePaid && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <DollarSign size={13} />
                      <Typography variant="body2">
                        Advance: {fmt(currentTenant.advanceAmount)}
                      </Typography>
                    </Box>
                  )}
                </Box>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Button
                    component={Link}
                    href={`/admin/property/tenants/${currentTenant.id}`}
                    variant="outlined"
                    size="small"
                    startIcon={<ExternalLink size={13} />}
                    sx={{ flex: 1 }}
                  >
                    Profile
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    startIcon={<UserX size={13} />}
                    sx={{ flex: 1 }}
                    onClick={() => moveOut(currentTenant)}
                  >
                    Move Out{futureTenant ? ` (→ ${futureTenant.name})` : ""}
                  </Button>
                </Box>
              </Box>
            ) : (
              <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  This unit is currently vacant.
                </Typography>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<Plus size={14} />}
                  onClick={() => setAddFutureOpen(true)}
                  sx={{ alignSelf: "flex-start" }}
                >
                  Add Tenant
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Future Tenant */}
        <Card
          sx={{
            bgcolor: "background.paper",
            borderLeft: "4px solid",
            borderColor: futureTenant ? "warning.main" : "divider",
          }}
        >
          <CardContent>
            <Typography
              variant="overline"
              sx={{ color: "warning.main", fontSize: "0.6875rem", fontWeight: 700 }}
            >
              Scheduled Future Tenant
            </Typography>
            {futureTenant ? (
              <Box sx={{ mt: 1.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
                  <UserPlus size={18} color="var(--mui-palette-warning-main)" />
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {futureTenant.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {futureTenant.tenantCode}
                      {futureTenant.scheduledRent
                        ? ` · ${fmt(futureTenant.scheduledRent)}/mo`
                        : ` · ${fmt(unit.monthlyRent)}/mo (unchanged)`}
                    </Typography>
                  </Box>
                </Box>
                {futureTenant.scheduledRent && futureTenant.scheduledRent !== unit.monthlyRent && (
                  <Box
                    sx={{
                      bgcolor: "action.selected",
                      px: 1.5,
                      py: 1,
                      borderRadius: 1,
                      mb: 1.5,
                      display: "flex",
                      gap: 1,
                      alignItems: "center",
                    }}
                  >
                    <DollarSign size={13} />
                    <Typography variant="caption">
                      Rent changes from {fmt(unit.monthlyRent)} →{" "}
                      <strong>{fmt(futureTenant.scheduledRent)}</strong> on their move-in date
                    </Typography>
                  </Box>
                )}
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, mb: 2 }}>
                  {futureTenant.phone && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Phone size={13} />
                      <Typography variant="body2">{futureTenant.phone}</Typography>
                    </Box>
                  )}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Calendar size={13} />
                    <Typography variant="body2">
                      Move-in:{" "}
                      {new Date(futureTenant.moveInDate).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </Typography>
                  </Box>
                  {futureTenant.leaseEndDate && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Calendar size={13} />
                      <Typography variant="body2">
                        Lease ends:{" "}
                        {new Date(futureTenant.leaseEndDate).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </Typography>
                    </Box>
                  )}
                </Box>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Button
                    component={Link}
                    href={`/admin/property/tenants/${futureTenant.id}`}
                    variant="outlined"
                    size="small"
                    startIcon={<ExternalLink size={13} />}
                    sx={{ flex: 1 }}
                  >
                    Profile
                  </Button>
                  {currentTenant && (
                    <Button
                      variant="outlined"
                      color="warning"
                      size="small"
                      startIcon={<UserCheck size={13} />}
                      sx={{ flex: 1 }}
                      onClick={() => promoteNow(currentTenant, futureTenant)}
                    >
                      Promote Now
                    </Button>
                  )}
                </Box>
              </Box>
            ) : currentTenant ? (
              <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  No future tenant scheduled.
                </Typography>
                <Button
                  variant="outlined"
                  color="warning"
                  size="small"
                  startIcon={<Plus size={14} />}
                  onClick={() => setAddFutureOpen(true)}
                  sx={{ alignSelf: "flex-start" }}
                >
                  Schedule Future Tenant
                </Button>
              </Box>
            ) : (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Unit is vacant — add a current tenant first.
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Past Tenants History */}
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5, fontSize: "1rem" }}>
        Tenancy History
        {pastTenants.length > 0 && (
          <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
            {pastTenants.length} past tenant{pastTenants.length !== 1 ? "s" : ""}
          </Typography>
        )}
      </Typography>

      {pastTenants.length === 0 ? (
        <Card sx={{ bgcolor: "background.paper" }}>
          <CardContent>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 3 }}>
              No past tenants for this unit.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <TableContainer component={Card} sx={{ bgcolor: "background.paper" }}>
          <Table size="small" sx={mobileCardTableSx}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Code</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Phone</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Move-in</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Move-out</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Lease End</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Advance</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {pastTenants.map((t) => (
                <TableRow key={t.id} hover>
                  <TableCell data-label="Code">
                    <Chip label={t.tenantCode ?? "—"} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell data-label="Name">
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {t.name}
                    </Typography>
                  </TableCell>
                  <TableCell data-label="Phone">
                    <Typography variant="body2" color="text.secondary">
                      {t.phone ?? "—"}
                    </Typography>
                  </TableCell>
                  <TableCell data-label="Move-in">
                    <Typography variant="body2">
                      {new Date(t.moveInDate).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </Typography>
                  </TableCell>
                  <TableCell data-label="Move-out">
                    {t.moveOutDate ? (
                      <Typography variant="body2">
                        {new Date(t.moveOutDate).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </Typography>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        —
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell data-label="Lease End">
                    {t.leaseEndDate ? (
                      <Typography variant="body2">
                        {new Date(t.leaseEndDate).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </Typography>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        —
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell data-label="Advance">
                    {t.advancePaid ? (
                      <Box>
                        <Typography variant="body2" color="primary.main" sx={{ fontWeight: 600 }}>
                          {fmt(t.advanceAmount)}
                        </Typography>
                        {t.advanceSettled && (
                          <Typography variant="caption" color="success.main">
                            Settled
                          </Typography>
                        )}
                      </Box>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        None
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell data-label="Actions">
                    <Button
                      component={Link}
                      href={`/admin/property/tenants/${t.id}`}
                      size="small"
                      startIcon={<ExternalLink size={13} />}
                      sx={{ fontSize: "0.75rem" }}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add Future / Current Tenant dialog */}
      <Dialog
        open={addFutureOpen}
        onClose={() => setAddFutureOpen(false)}
        slotProps={{
          paper: { sx: { bgcolor: "background.paper", borderRadius: 2, minWidth: 360 } },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {currentTenant ? "Schedule Future Tenant" : "Add Tenant"}
        </DialogTitle>
        <DialogContent>
          {currentTenant && (
            <Alert severity="info" sx={{ mb: 2, fontSize: "0.8rem" }}>
              This unit is occupied by <strong>{currentTenant.name}</strong>. They will be moved out
              on the date below, and the new tenant becomes active from their move-in date.
            </Alert>
          )}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <TextField
              label="Full Name"
              value={addFutureForm.name}
              size="small"
              fullWidth
              required
              onChange={(e) => setAddFutureForm((p) => ({ ...p, name: e.target.value }))}
            />
            <TextField
              label="Phone"
              value={addFutureForm.phone}
              size="small"
              fullWidth
              onChange={(e) => setAddFutureForm((p) => ({ ...p, phone: e.target.value }))}
            />
            <TextField
              label="Move-in Date"
              type="date"
              value={addFutureForm.moveInDate}
              size="small"
              fullWidth
              required
              onChange={(e) =>
                setAddFutureForm((p) => {
                  const moveInDate = e.target.value;
                  // Keep the outgoing move-out in lockstep with move-in unless edited.
                  const autoOut =
                    !p.outgoingMoveOutDate || p.outgoingMoveOutDate === dayBefore(p.moveInDate);
                  return {
                    ...p,
                    moveInDate,
                    outgoingMoveOutDate: autoOut ? dayBefore(moveInDate) : p.outgoingMoveOutDate,
                  };
                })
              }
              slotProps={{ inputLabel: { shrink: true } }}
            />
            {currentTenant && (
              <TextField
                label={`${currentTenant.name}'s Move-out Date`}
                type="date"
                value={addFutureForm.outgoingMoveOutDate}
                size="small"
                fullWidth
                required
                onChange={(e) =>
                  setAddFutureForm((p) => ({ ...p, outgoingMoveOutDate: e.target.value }))
                }
                slotProps={{ inputLabel: { shrink: true } }}
                helperText={`Sets ${currentTenant.name}'s move-out and lease-end dates. Defaults to the day before the new tenant moves in.`}
              />
            )}
            <TextField
              label="Lease End Date"
              type="date"
              value={addFutureForm.leaseEndDate}
              size="small"
              fullWidth
              onChange={(e) => setAddFutureForm((p) => ({ ...p, leaseEndDate: e.target.value }))}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label={currentTenant ? "New Rent (৳)" : "Monthly Rent (৳)"}
              type="number"
              value={addFutureForm.newRent}
              onChange={(e) => setAddFutureForm((p) => ({ ...p, newRent: e.target.value }))}
              size="small"
              fullWidth
              placeholder={String(unit?.monthlyRent ?? "")}
              helperText={
                currentTenant
                  ? addFutureForm.newRent && Number(addFutureForm.newRent) !== unit?.monthlyRent
                    ? `Current rent is ${fmt(unit?.monthlyRent ?? 0)} — a rent change will be scheduled for their move-in date`
                    : `Current rent is ${fmt(unit?.monthlyRent ?? 0)} — leave blank to keep the same`
                  : "Leave blank to use current unit rent"
              }
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => setAddFutureOpen(false)}
            disabled={saving}
            sx={{ flex: 1 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={addFutureTenant}
            disabled={
              saving ||
              !addFutureForm.name ||
              !addFutureForm.moveInDate ||
              (!!currentTenant && !addFutureForm.outgoingMoveOutDate)
            }
            sx={{ flex: 1 }}
          >
            {saving ? "Adding…" : currentTenant ? "Schedule" : "Add Tenant"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation dialog */}
      <Dialog
        open={!!confirmDialog}
        onClose={() => !confirmLoading && setConfirmDialog(null)}
        slotProps={{
          paper: { sx: { bgcolor: "background.paper", borderRadius: 2, minWidth: 340 } },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: "1rem" }}>{confirmDialog?.title}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: "text.secondary" }}>
            {confirmDialog?.message}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => setConfirmDialog(null)}
            disabled={confirmLoading}
            sx={{ flex: 1 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            size="small"
            color={confirmDialog?.confirmColor ?? "primary"}
            onClick={runConfirm}
            disabled={confirmLoading}
            sx={{ flex: 1 }}
          >
            {confirmLoading ? "Please wait…" : (confirmDialog?.confirmLabel ?? "Confirm")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
