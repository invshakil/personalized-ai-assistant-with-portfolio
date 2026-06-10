"use client";

import { Fragment, useState, useEffect, useCallback, use } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  IconButton,
  Collapse,
  Tooltip,
  TextField,
} from "@mui/material";
import {
  ArrowLeft,
  Phone,
  Calendar,
  Home,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  TrendingUp,
  Wifi,
  Trash2,
  Pencil,
  Check,
  X,
  FileDown,
} from "lucide-react";
import Link from "next/link";
import PageHeader from "@/components/admin/PageHeader";
import TenantDocuments from "@/components/admin/TenantDocuments";
import type { TenantWithUnit, PaymentWithTenant } from "@/types";

const STATUS_COLORS: Record<string, string> = {
  PAID: "success.main",
  PARTIAL: "warning.main",
  PENDING: "text.secondary",
  OVERDUE: "error.main",
};

function fmt(n: number) {
  return `৳${n.toLocaleString()}`;
}

export default function TenantProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [tenant, setTenant] = useState<(TenantWithUnit & { payments: PaymentWithTenant[] }) | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [expandedPayments, setExpandedPayments] = useState<Set<string>>(new Set());
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);
  const [editRcId, setEditRcId] = useState<string | null>(null);
  const [editRcDate, setEditRcDate] = useState("");
  const [editRcRent, setEditRcRent] = useState("");
  const [editRcReason, setEditRcReason] = useState("");
  const [rcSaving, setRcSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/property/tenants/${id}`);
      const json = await res.json();
      setTenant(json.data ?? null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const togglePayment = (pid: string) => {
    setExpandedPayments((prev) => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid);
      else next.add(pid);
      return next;
    });
  };

  const deletePayment = async (pid: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this payment record? This cannot be undone.")) return;
    setDeletingPaymentId(pid);
    try {
      await fetch(`/api/admin/property/payments/${pid}`, { method: "DELETE" });
      await load();
    } finally {
      setDeletingPaymentId(null);
    }
  };

  const openEditRc = (rc: {
    id: string;
    effectiveDate: string;
    newRent: number;
    reason: string | null;
  }) => {
    setEditRcId(rc.id);
    setEditRcDate(rc.effectiveDate.split("T")[0]);
    setEditRcRent(String(rc.newRent));
    setEditRcReason(rc.reason ?? "");
  };

  const saveEditRc = async () => {
    if (!editRcId) return;
    setRcSaving(true);
    try {
      await fetch(`/api/admin/property/rent-changes/${editRcId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          effectiveDate: editRcDate,
          newRent: Number(editRcRent),
          reason: editRcReason || null,
        }),
      });
      setEditRcId(null);
      await load();
    } finally {
      setRcSaving(false);
    }
  };

  const deleteRc = async (rcId: string) => {
    if (!confirm("Delete this scheduled rent change?")) return;
    await fetch(`/api/admin/property/rent-changes/${rcId}`, { method: "DELETE" });
    await load();
  };

  const isBeforeMoveIn = (month: number, year: number, moveInDate: string) => {
    const d = new Date(moveInDate);
    const moveInYear = d.getFullYear();
    const moveInMonth = d.getMonth() + 1;
    return year < moveInYear || (year === moveInYear && month < moveInMonth);
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!tenant) {
    return <Typography color="error">Tenant not found.</Typography>;
  }

  const monthLabels = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const activeServices = tenant.services.filter((s) => s.isActive);
  const serviceTotal = activeServices.reduce((sum, s) => sum + s.monthlyFee, 0);
  const pendingChanges = tenant.rentChanges.filter((rc) => !rc.appliedAt);

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Button
          component={Link}
          href="/admin/property"
          startIcon={<ArrowLeft size={16} />}
          size="small"
          sx={{ color: "text.secondary" }}
        >
          Back to Property
        </Button>
      </Box>

      <PageHeader
        title={tenant.name}
        subtitle={`${tenant.tenantCode ?? ""} · ${tenant.unit?.unitNumber ?? "External Member"}`}
      />

      <Box
        sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3, mb: 3 }}
      >
        {/* Info card */}
        <Card sx={{ bgcolor: "background.paper" }}>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, fontWeight: 600 }}>
              Tenant Info
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {tenant.phone && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Phone size={15} />
                  <Typography variant="body2">{tenant.phone}</Typography>
                </Box>
              )}
              {tenant.unit && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Home size={15} />
                  <Typography variant="body2">
                    {tenant.unit.unitNumber} · {tenant.unit.floor}
                  </Typography>
                </Box>
              )}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Calendar size={15} />
                <Typography variant="body2">
                  Move-in: {new Date(tenant.moveInDate).toLocaleDateString()}
                </Typography>
              </Box>
              {tenant.leaseEndDate && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Calendar size={15} />
                  <Typography variant="body2">
                    Lease end: {new Date(tenant.leaseEndDate).toLocaleDateString()}
                  </Typography>
                </Box>
              )}
              {tenant.notes && (
                <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic" }}>
                  {tenant.notes}
                </Typography>
              )}
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 0.5 }}>
                <Chip
                  label={tenant.isActive ? "Active" : "Inactive"}
                  size="small"
                  sx={{
                    bgcolor: tenant.isActive ? "success.main" : "error.main",
                    color: "#fff",
                    fontWeight: 600,
                    fontSize: "0.6875rem",
                  }}
                />
                {tenant.isExternal && (
                  <Chip label="External Member" size="small" variant="outlined" />
                )}
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Advance card */}
        <Card sx={{ bgcolor: "background.paper" }}>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, fontWeight: 600 }}>
              Advance Rent
            </Typography>
            {tenant.advancePaid ? (
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 700, color: "primary.main", mb: 0.5 }}>
                  {fmt(tenant.advanceAmount ? Number(tenant.advanceAmount) : 0)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Available advance balance
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Chip
                    label={tenant.advanceSettled ? "Settled" : "Held"}
                    size="small"
                    sx={{
                      bgcolor: tenant.advanceSettled ? "text.disabled" : "primary.main",
                      color: "#fff",
                      fontWeight: 600,
                    }}
                  />
                </Box>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No advance on record
              </Typography>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Active services */}
      {activeServices.length > 0 && (
        <Card sx={{ bgcolor: "background.paper", mb: 3 }}>
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <Wifi size={16} />
              <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
                Active Services
              </Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              {activeServices.map((s) => (
                <Box
                  key={s.id}
                  sx={{
                    px: 1.5,
                    py: 0.75,
                    bgcolor: "action.selected",
                    borderRadius: 1,
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {s.serviceName}
                  </Typography>
                  <Typography variant="caption" color="primary.main">
                    {fmt(s.monthlyFee)}/mo
                  </Typography>
                </Box>
              ))}
              <Box
                sx={{
                  px: 1.5,
                  py: 0.75,
                  bgcolor: "primary.main",
                  borderRadius: 1,
                  ml: "auto",
                }}
              >
                <Typography variant="caption" sx={{ color: "#fff", fontWeight: 600 }}>
                  Services total: {fmt(serviceTotal)}/mo
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Pending rent changes */}
      {pendingChanges.length > 0 && (
        <Card
          sx={{
            bgcolor: "background.paper",
            mb: 3,
            border: "1px solid",
            borderColor: "warning.main",
          }}
        >
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <TrendingUp size={16} color="var(--mui-palette-warning-main)" />
              <Typography variant="subtitle2" color="warning.main" sx={{ fontWeight: 600 }}>
                Pending Rent Changes
              </Typography>
            </Box>
            {pendingChanges.map((rc) => (
              <Box key={rc.id} sx={{ mt: 1.5 }}>
                {editRcId === rc.id ? (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <TextField
                        label="Effective Date"
                        type="date"
                        size="small"
                        sx={{ flex: 1 }}
                        value={editRcDate}
                        onChange={(e) => setEditRcDate(e.target.value)}
                        slotProps={{ inputLabel: { shrink: true } }}
                      />
                      <TextField
                        label="New Rent (৳)"
                        type="number"
                        size="small"
                        sx={{ flex: 1 }}
                        value={editRcRent}
                        onChange={(e) => setEditRcRent(e.target.value)}
                      />
                    </Box>
                    <TextField
                      label="Reason (optional)"
                      size="small"
                      fullWidth
                      value={editRcReason}
                      onChange={(e) => setEditRcReason(e.target.value)}
                    />
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<X size={13} />}
                        onClick={() => setEditRcId(null)}
                        disabled={rcSaving}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<Check size={13} />}
                        onClick={saveEditRc}
                        disabled={rcSaving || !editRcDate || !editRcRent}
                      >
                        {rcSaving ? "Saving…" : "Save"}
                      </Button>
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
                    <Typography variant="body2">
                      {fmt(rc.previousRent)} → {fmt(rc.newRent)}
                    </Typography>
                    <Chip
                      label={`Effective ${new Date(rc.effectiveDate).toLocaleDateString()}`}
                      size="small"
                      sx={{ bgcolor: "warning.main", color: "#fff", fontSize: "0.6875rem" }}
                    />
                    {rc.reason && (
                      <Typography variant="caption" color="text.secondary">
                        {rc.reason}
                      </Typography>
                    )}
                    <Box sx={{ ml: "auto", display: "flex", gap: 0.5 }}>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => openEditRc(rc)}>
                          <Pencil size={13} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => deleteRc(rc.id)}>
                          <Trash2 size={13} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                )}
              </Box>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Documents */}
      <Card sx={{ bgcolor: "background.paper" }}>
        <CardContent>
          <TenantDocuments tenantId={tenant.id} />
        </CardContent>
      </Card>

      {/* Payment history */}
      <Card sx={{ bgcolor: "background.paper" }}>
        <CardContent>
          <Box
            sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}
          >
            <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
              Payment History
            </Typography>
            <Button
              component={Link}
              href="/admin/property/payments"
              size="small"
              variant="outlined"
            >
              Go to Payments
            </Button>
          </Box>

          {tenant.payments && tenant.payments.length > 0 ? (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell />
                    <TableCell sx={{ fontWeight: 700 }}>Period</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Rent Due</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Cash Paid</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Advance Applied</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Balance</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(tenant.payments as PaymentWithTenant[]).map((p) => {
                    const beforeMoveIn = isBeforeMoveIn(p.month, p.year, tenant.moveInDate);
                    return (
                      <Fragment key={p.id}>
                        <TableRow
                          hover
                          sx={{ cursor: "pointer" }}
                          onClick={() => togglePayment(p.id)}
                        >
                          <TableCell sx={{ width: 32 }}>
                            <IconButton size="small">
                              {expandedPayments.has(p.id) ? (
                                <ChevronDown size={14} />
                              ) : (
                                <ChevronRight size={14} />
                              )}
                            </IconButton>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <Typography variant="body2">
                                {monthLabels[p.month - 1]} {p.year}
                              </Typography>
                              {beforeMoveIn && (
                                <Tooltip title="This period is before the tenant's move-in date">
                                  <AlertTriangle
                                    size={13}
                                    color="var(--mui-palette-warning-main)"
                                  />
                                </Tooltip>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <Typography variant="body2">{fmt(p.rentDue)}</Typography>
                              {p.carryForward > 0 && (
                                <Tooltip
                                  title={`Includes ${fmt(p.carryForward)} carried forward from previous month`}
                                >
                                  <Chip
                                    label={`+${fmt(p.carryForward)} carry`}
                                    size="small"
                                    sx={{
                                      bgcolor: "warning.main",
                                      color: "#fff",
                                      fontSize: "0.6rem",
                                      height: 16,
                                    }}
                                  />
                                </Tooltip>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>{fmt(p.amountPaid)}</TableCell>
                          <TableCell>
                            {p.advanceApplied > 0 ? (
                              <Typography variant="body2" color="primary.main">
                                {fmt(p.advanceApplied)}
                              </Typography>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography
                              variant="body2"
                              color={p.balance > 0 ? "error.main" : "success.main"}
                              sx={{ fontWeight: 600 }}
                            >
                              {fmt(p.balance)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={p.status}
                              size="small"
                              sx={{
                                bgcolor: STATUS_COLORS[p.status] ?? "text.secondary",
                                color: p.status === "PENDING" ? "text.primary" : "#fff",
                                fontWeight: 600,
                                fontSize: "0.6875rem",
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ width: 80 }}>
                            <Box sx={{ display: "flex", gap: 0.5 }}>
                              <Tooltip title="Download receipt">
                                <IconButton
                                  size="small"
                                  color="primary"
                                  component="a"
                                  href={`/api/admin/property/payments/${p.id}/receipt`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                >
                                  <FileDown size={14} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete payment">
                                <IconButton
                                  size="small"
                                  color="error"
                                  disabled={deletingPaymentId === p.id}
                                  onClick={(e) => deletePayment(p.id, e)}
                                >
                                  <Trash2 size={14} />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>

                        {/* Transaction log */}
                        <TableRow>
                          <TableCell colSpan={8} sx={{ p: 0, border: 0 }}>
                            <Collapse in={expandedPayments.has(p.id)}>
                              <Box sx={{ bgcolor: "action.hover", px: 4, py: 1.5 }}>
                                {p.transactions && p.transactions.length > 0 ? (
                                  p.transactions.map((tx) => (
                                    <Box
                                      key={tx.id}
                                      sx={{
                                        display: "flex",
                                        gap: 2,
                                        py: 0.5,
                                        alignItems: "center",
                                      }}
                                    >
                                      <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{ width: 90 }}
                                      >
                                        {new Date(tx.date).toLocaleDateString()}
                                      </Typography>
                                      <Chip
                                        label={tx.type.replace("_", " ")}
                                        size="small"
                                        variant="outlined"
                                        sx={{ fontSize: "0.6875rem", height: 18 }}
                                      />
                                      <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                        {fmt(tx.amount)}
                                      </Typography>
                                      {tx.notes && (
                                        <Typography variant="caption" color="text.secondary">
                                          · {tx.notes}
                                        </Typography>
                                      )}
                                    </Box>
                                  ))
                                ) : (
                                  <Typography variant="caption" color="text.secondary">
                                    No transactions logged
                                  </Typography>
                                )}
                              </Box>
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <AlertTriangle size={32} style={{ opacity: 0.3 }} />
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                No payment records yet
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
