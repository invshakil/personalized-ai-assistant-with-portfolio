"use client";

import { Fragment, useState, useEffect, useCallback } from "react";
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
  Drawer,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  IconButton,
  Collapse,
  Divider,
  Tooltip,
} from "@mui/material";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Wallet,
  AlertTriangle,
  Download,
  Trash2,
  Pencil,
} from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import { propertyApi } from "@/lib/api/property";
import { mobileCardTableSx } from "@/lib/mobileTableSx";
import type { PaymentWithTenant, PaymentTransaction } from "@/types";

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  PAID: { bg: "success.main", color: "#fff" },
  PARTIAL: { bg: "warning.main", color: "#fff" },
  PENDING: { bg: "action.selected", color: "text.primary" },
  OVERDUE: { bg: "error.main", color: "#fff" },
};

function fmt(n: number) {
  return `৳${n.toLocaleString()}`;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function PaymentsPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [payments, setPayments] = useState<PaymentWithTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genMsg, setGenMsg] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [drawer, setDrawer] = useState<{
    payment: PaymentWithTenant;
    mode: "pay" | "advance";
  } | null>(null);

  // Form state for payment drawer
  const [txType, setTxType] = useState("CASH");
  const [txAmount, setTxAmount] = useState("");
  const [txDate, setTxDate] = useState(new Date().toISOString().split("T")[0]);
  const [txNotes, setTxNotes] = useState("");
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);

  // Edit payment state
  const [editPayment, setEditPayment] = useState<{
    id: string;
    tenantName: string;
    rentDue: string;
    notes: string;
  } | null>(null);
  const [editPaymentLoading, setEditPaymentLoading] = useState(false);
  const [editPaymentError, setEditPaymentError] = useState<string | null>(null);

  // Edit transaction state
  const [editTx, setEditTx] = useState<{ id: string; paymentId: string } | null>(null);
  const [editTxType, setEditTxType] = useState("CASH");
  const [editTxAmount, setEditTxAmount] = useState("");
  const [editTxDate, setEditTxDate] = useState("");
  const [editTxNotes, setEditTxNotes] = useState("");
  const [editTxLoading, setEditTxLoading] = useState(false);
  const [editTxError, setEditTxError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPayments((await propertyApi.listPayments({ month, year })) ?? []);
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  // Auto-generate on load if no payments exist for this month
  const autoGenerate = useCallback(async () => {
    const data = (await propertyApi.listPayments({ month, year })) ?? [];
    if (data.length === 0) {
      setGenerating(true);
      const gen = (await propertyApi.generatePayments({ month, year })) as {
        created?: number;
        message?: string;
      } | null;
      if (gen?.created && gen.created > 0) {
        setGenMsg(gen.message ?? null);
      }
      setGenerating(false);
      await load();
    } else {
      setPayments(data);
      setLoading(false);
    }
  }, [month, year, load]);

  useEffect(() => {
    setLoading(true);
    autoGenerate();
  }, [autoGenerate]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openPayDrawer = (payment: PaymentWithTenant, mode: "pay" | "advance") => {
    const outstanding = payment.balance;
    const maxApplicable =
      mode === "advance" ? Math.min(payment.advanceBalance, outstanding) : outstanding;
    setTxType(mode === "advance" ? "ADVANCE_APPLIED" : "CASH");
    setTxAmount(String(maxApplicable > 0 ? maxApplicable : ""));
    setTxDate(new Date().toISOString().split("T")[0]);
    setTxNotes("");
    setTxError(null);
    setDrawer({ payment, mode });
  };

  const submitTransaction = async () => {
    if (!drawer) return;
    setTxLoading(true);
    setTxError(null);
    try {
      await propertyApi.addPaymentTransaction(drawer.payment.id, {
        type: txType,
        amount: parseFloat(txAmount),
        date: txDate,
        notes: txNotes || null,
      });
      setDrawer(null);
      load();
    } catch (e: unknown) {
      setTxError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setTxLoading(false);
    }
  };

  const submitEditPayment = async () => {
    if (!editPayment) return;
    setEditPaymentLoading(true);
    setEditPaymentError(null);
    try {
      await propertyApi.updatePayment(editPayment.id, {
        rentDue: parseFloat(editPayment.rentDue),
        notes: editPayment.notes || null,
      });
      setEditPayment(null);
      load();
    } catch (e: unknown) {
      setEditPaymentError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setEditPaymentLoading(false);
    }
  };

  const deletePayment = async (id: string, tenantName: string) => {
    if (
      !window.confirm(
        `Delete the payment record for ${tenantName}? All transactions will be removed and any advance applied will be restored.`
      )
    )
      return;
    await propertyApi.deletePayment(id);
    load();
  };

  const openEditTx = (tx: PaymentTransaction) => {
    setEditTx({ id: tx.id, paymentId: tx.paymentId });
    setEditTxType(tx.type);
    setEditTxAmount(String(tx.amount));
    setEditTxDate(tx.date.split("T")[0]);
    setEditTxNotes(tx.notes ?? "");
    setEditTxError(null);
  };

  const deleteTransaction = async (txId: string, isAdvance: boolean) => {
    const msg = isAdvance
      ? "Delete this advance entry? The advance amount will be restored to the tenant's balance."
      : "Delete this transaction?";
    if (!window.confirm(msg)) return;
    await propertyApi.deletePaymentTransaction(txId);
    load();
  };

  const submitEditTransaction = async () => {
    if (!editTx) return;
    setEditTxLoading(true);
    setEditTxError(null);
    try {
      await propertyApi.updatePaymentTransaction(editTx.id, {
        type: editTxType,
        amount: parseFloat(editTxAmount),
        date: editTxDate,
        notes: editTxNotes || null,
      });
      setEditTx(null);
      load();
    } catch (e: unknown) {
      setEditTxError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setEditTxLoading(false);
    }
  };

  const overdueCount = payments.filter(
    (p) => p.status === "OVERDUE" || (p.status === "PENDING" && p.balance > 0)
  ).length;
  const totalExpected = payments.reduce((s, p) => s + p.rentDue, 0);
  const totalCollected = payments.reduce((s, p) => s + p.amountPaid + p.advanceApplied, 0);

  return (
    <Box>
      <PageHeader title="Monthly Payments" subtitle="Track and record rent payments" />

      {/* Month/year selector */}
      <Box sx={{ display: "flex", gap: 2, mb: 3, alignItems: "center", flexWrap: "wrap" }}>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Month</InputLabel>
          <Select label="Month" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => (
              <MenuItem key={i + 1} value={i + 1}>
                {m}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 100 }}>
          <InputLabel>Year</InputLabel>
          <Select label="Year" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {[2025, 2026, 2027, 2028].map((y) => (
              <MenuItem key={y} value={y}>
                {y}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          variant="outlined"
          size="small"
          onClick={async () => {
            setGenerating(true);
            const gen = (await propertyApi.generatePayments({ month, year })) as {
              message?: string;
            } | null;
            setGenMsg(gen?.message ?? null);
            setGenerating(false);
            load();
          }}
          disabled={generating}
        >
          {generating ? "Generating…" : "Re-Generate Month"}
        </Button>
      </Box>

      {genMsg && (
        <Alert severity="success" onClose={() => setGenMsg(null)} sx={{ mb: 2 }}>
          {genMsg}
        </Alert>
      )}

      {/* Summary strip */}
      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        {[
          { label: "Expected", value: fmt(totalExpected), color: "text.primary" },
          { label: "Collected", value: fmt(totalCollected), color: "success.main" },
          { label: "Outstanding", value: fmt(totalExpected - totalCollected), color: "error.main" },
          {
            label: "Unpaid Tenants",
            value: String(overdueCount),
            color: overdueCount > 0 ? "warning.main" : "text.secondary",
          },
        ].map((s) => (
          <Card
            key={s.label}
            sx={{ minWidth: 130, flex: "1 1 130px", bgcolor: "background.paper" }}
          >
            <CardContent sx={{ py: "10px !important", px: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: s.color }}>
                {s.value}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {s.label}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Due tracker alert */}
      {overdueCount > 0 && (
        <Alert severity="warning" icon={<AlertTriangle size={18} />} sx={{ mb: 2 }}>
          {overdueCount} tenant{overdueCount > 1 ? "s have" : " has"} outstanding dues for{" "}
          {MONTHS[month - 1]} {year}
        </Alert>
      )}

      {loading || generating ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Card} sx={{ bgcolor: "background.paper" }}>
          <Table size="small" sx={mobileCardTableSx}>
            <TableHead>
              <TableRow>
                <TableCell />
                <TableCell sx={{ fontWeight: 700 }}>Tenant</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Unit</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Rent Due</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Cash Paid</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Advance</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Balance</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} sx={{ textAlign: "center", py: 4 }}>
                    <Typography color="text.secondary">
                      No payment records for this period
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((p) => (
                  <Fragment key={p.id}>
                    <TableRow hover>
                      <TableCell sx={{ width: 32 }}>
                        <IconButton size="small" onClick={() => toggleExpand(p.id)}>
                          {expanded.has(p.id) ? (
                            <ChevronDown size={14} />
                          ) : (
                            <ChevronRight size={14} />
                          )}
                        </IconButton>
                      </TableCell>
                      <TableCell data-label="Tenant">
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {p.tenantName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {p.tenantCode}
                        </Typography>
                      </TableCell>
                      <TableCell data-label="Unit">
                        <Typography variant="body2">{p.unitNumber ?? "—"}</Typography>
                      </TableCell>
                      <TableCell data-label="Rent Due">{fmt(p.rentDue)}</TableCell>
                      <TableCell data-label="Cash Paid">{fmt(p.amountPaid)}</TableCell>
                      <TableCell data-label="Advance">
                        {p.advanceApplied > 0 ? (
                          <Typography variant="body2" color="primary.main" sx={{ fontWeight: 600 }}>
                            {fmt(p.advanceApplied)}
                          </Typography>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell data-label="Balance">
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 600 }}
                          color={p.balance > 0 ? "error.main" : "success.main"}
                        >
                          {fmt(p.balance)}
                        </Typography>
                      </TableCell>
                      <TableCell data-label="Status">
                        <Chip
                          label={p.status}
                          size="small"
                          sx={{
                            bgcolor: STATUS_COLORS[p.status]?.bg ?? "action.selected",
                            color: STATUS_COLORS[p.status]?.color ?? "text.primary",
                            fontWeight: 600,
                            fontSize: "0.6875rem",
                          }}
                        />
                      </TableCell>
                      <TableCell data-label="Actions">
                        <Box sx={{ display: "flex", gap: 0.5 }}>
                          <Tooltip title="Edit payment">
                            <IconButton
                              size="small"
                              onClick={() =>
                                setEditPayment({
                                  id: p.id,
                                  tenantName: p.tenantName,
                                  rentDue: String(p.rentDue),
                                  notes: p.notes ?? "",
                                })
                              }
                            >
                              <Pencil size={15} />
                            </IconButton>
                          </Tooltip>
                          {p.balance > 0 && (
                            <Tooltip title="Record Payment">
                              <IconButton size="small" onClick={() => openPayDrawer(p, "pay")}>
                                <Plus size={15} />
                              </IconButton>
                            </Tooltip>
                          )}
                          {p.advanceBalance > 0 && p.balance > 0 && (
                            <Tooltip title="Apply Advance">
                              <IconButton size="small" onClick={() => openPayDrawer(p, "advance")}>
                                <Wallet size={15} />
                              </IconButton>
                            </Tooltip>
                          )}
                          {p.receiptNumber && (
                            <Tooltip title={`Download Receipt ${p.receiptNumber}`}>
                              <IconButton
                                size="small"
                                component="a"
                                href={`/api/admin/property/payments/${p.id}/receipt`}
                                target="_blank"
                              >
                                <Download size={15} />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="Delete payment record">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => deletePayment(p.id, p.tenantName)}
                            >
                              <Trash2 size={15} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>

                    {/* Transaction log */}
                    <TableRow key={`${p.id}-exp`}>
                      <TableCell colSpan={9} sx={{ p: 0, border: 0 }}>
                        <Collapse in={expanded.has(p.id)}>
                          <Box sx={{ bgcolor: "action.hover", px: 5, py: 1.5 }}>
                            {/* Bill breakdown */}
                            {p.rentDue > 0 && (
                              <Box
                                sx={{
                                  mb: 1.5,
                                  pb: 1.5,
                                  borderBottom: "1px solid",
                                  borderColor: "divider",
                                }}
                              >
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ fontWeight: 600, display: "block", mb: 0.5 }}
                                >
                                  Bill Breakdown
                                </Typography>
                                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                                  <Typography variant="caption" color="text.secondary">
                                    Base Rent
                                  </Typography>
                                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                    {fmt(
                                      p.rentDue -
                                        p.services.reduce((s, sv) => s + sv.monthlyFee, 0) -
                                        p.carryForward
                                    )}
                                  </Typography>
                                </Box>
                                {p.services.map((sv) => (
                                  <Box
                                    key={sv.name}
                                    sx={{ display: "flex", justifyContent: "space-between" }}
                                  >
                                    <Typography variant="caption" color="text.secondary">
                                      {sv.name}
                                    </Typography>
                                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                      {fmt(sv.monthlyFee)}
                                    </Typography>
                                  </Box>
                                ))}
                                {p.carryForward > 0 && (
                                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                                    <Typography variant="caption" color="warning.main">
                                      Previous Balance
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      sx={{ fontWeight: 600, color: "warning.main" }}
                                    >
                                      {fmt(p.carryForward)}
                                    </Typography>
                                  </Box>
                                )}
                                <Box
                                  sx={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    mt: 0.5,
                                    pt: 0.5,
                                    borderTop: "1px dashed",
                                    borderColor: "divider",
                                  }}
                                >
                                  <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                    Total Due
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    sx={{ fontWeight: 700, color: "primary.main" }}
                                  >
                                    {fmt(p.rentDue)}
                                  </Typography>
                                </Box>
                              </Box>
                            )}
                            {p.transactions.length > 0 ? (
                              p.transactions.map((tx) => (
                                <Box
                                  key={tx.id}
                                  sx={{ display: "flex", gap: 1.5, py: 0.5, alignItems: "center" }}
                                >
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ width: 86, flexShrink: 0 }}
                                  >
                                    {new Date(tx.date).toLocaleDateString()}
                                  </Typography>
                                  <Chip
                                    label={tx.type.replace(/_/g, " ")}
                                    size="small"
                                    variant="outlined"
                                    sx={{ fontSize: "0.65rem", height: 18 }}
                                  />
                                  <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                    {fmt(tx.amount)}
                                  </Typography>
                                  {tx.notes && (
                                    <Typography variant="caption" color="text.secondary">
                                      · {tx.notes}
                                    </Typography>
                                  )}
                                  <Box sx={{ ml: "auto", display: "flex", gap: 0 }}>
                                    <Tooltip title="Edit transaction">
                                      <IconButton size="small" onClick={() => openEditTx(tx)}>
                                        <Pencil size={12} />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Delete transaction">
                                      <IconButton
                                        size="small"
                                        color="error"
                                        onClick={() =>
                                          deleteTransaction(tx.id, tx.type === "ADVANCE_APPLIED")
                                        }
                                      >
                                        <Trash2 size={12} />
                                      </IconButton>
                                    </Tooltip>
                                  </Box>
                                </Box>
                              ))
                            ) : (
                              <Typography variant="caption" color="text.secondary">
                                No transactions yet
                              </Typography>
                            )}
                            {p.balance > 0 && (
                              <Button
                                size="small"
                                startIcon={<Plus size={12} />}
                                sx={{ mt: 1, fontSize: "0.75rem" }}
                                onClick={() => openPayDrawer(p, "pay")}
                              >
                                Add transaction
                              </Button>
                            )}
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Edit payment drawer */}
      <Drawer
        anchor="right"
        open={!!editPayment}
        onClose={() => setEditPayment(null)}
        slotProps={{ paper: { sx: { width: { xs: "100%", sm: 400 } } } }}
      >
        <Box sx={{ width: "100%", p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
            Edit Payment
          </Typography>
          {editPayment && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {editPayment.tenantName}
            </Typography>
          )}
          <Alert severity="info" sx={{ mb: 2, fontSize: "0.8rem" }}>
            Editing Rent Due recalculates the balance and status. Use this to correct the billed
            amount — e.g. to split embedded service fees from base rent.
          </Alert>
          <TextField
            label="Rent Due (৳)"
            type="number"
            size="small"
            fullWidth
            value={editPayment?.rentDue ?? ""}
            onChange={(e) => setEditPayment((p) => (p ? { ...p, rentDue: e.target.value } : p))}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Notes (optional)"
            size="small"
            fullWidth
            multiline
            rows={2}
            value={editPayment?.notes ?? ""}
            onChange={(e) => setEditPayment((p) => (p ? { ...p, notes: e.target.value } : p))}
            sx={{ mb: 2 }}
          />
          {editPaymentError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {editPaymentError}
            </Alert>
          )}
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              fullWidth
              onClick={() => setEditPayment(null)}
              disabled={editPaymentLoading}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              size="small"
              fullWidth
              onClick={submitEditPayment}
              disabled={
                editPaymentLoading || !editPayment?.rentDue || parseFloat(editPayment.rentDue) <= 0
              }
            >
              {editPaymentLoading ? "Saving…" : "Save"}
            </Button>
          </Box>
        </Box>
      </Drawer>

      {/* Edit transaction drawer */}
      <Drawer
        anchor="right"
        open={!!editTx}
        onClose={() => setEditTx(null)}
        slotProps={{ paper: { sx: { width: { xs: "100%", sm: 400 } } } }}
      >
        <Box sx={{ width: "100%", p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Edit Transaction
          </Typography>
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Type</InputLabel>
            <Select label="Type" value={editTxType} onChange={(e) => setEditTxType(e.target.value)}>
              <MenuItem value="CASH">Cash</MenuItem>
              <MenuItem value="BANK_TRANSFER">Bank Transfer</MenuItem>
              <MenuItem value="ADVANCE_APPLIED">Advance Applied</MenuItem>
              <MenuItem value="ADJUSTMENT">Adjustment</MenuItem>
              <MenuItem value="OTHER">Other</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Amount (৳)"
            type="number"
            size="small"
            fullWidth
            value={editTxAmount}
            onChange={(e) => setEditTxAmount(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Date"
            type="date"
            size="small"
            fullWidth
            value={editTxDate}
            onChange={(e) => setEditTxDate(e.target.value)}
            sx={{ mb: 2 }}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="Notes (optional)"
            size="small"
            fullWidth
            value={editTxNotes}
            onChange={(e) => setEditTxNotes(e.target.value)}
            sx={{ mb: 2 }}
          />
          {editTxError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {editTxError}
            </Alert>
          )}
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              fullWidth
              onClick={() => setEditTx(null)}
              disabled={editTxLoading}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              size="small"
              fullWidth
              onClick={submitEditTransaction}
              disabled={editTxLoading || !editTxAmount || parseFloat(editTxAmount) <= 0}
            >
              {editTxLoading ? "Saving…" : "Save Changes"}
            </Button>
          </Box>
        </Box>
      </Drawer>

      {/* Payment / Advance drawer */}
      <Drawer
        anchor="right"
        open={!!drawer}
        onClose={() => setDrawer(null)}
        slotProps={{ paper: { sx: { width: { xs: "100%", sm: 420 } } } }}
      >
        <Box sx={{ width: "100%", p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            {drawer?.mode === "advance" ? "Apply Advance" : "Record Payment"}
          </Typography>
          {drawer && (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {drawer.payment.tenantName} · {MONTHS[month - 1]} {year}
              </Typography>
              <Box sx={{ bgcolor: "action.selected", px: 2, py: 1.5, borderRadius: 1, mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Balance due
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: "error.main" }}>
                  {fmt(drawer.payment.balance)}
                </Typography>
                {drawer.mode === "advance" && (
                  <>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="caption" color="text.secondary">
                      Available advance
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: "primary.main" }}>
                      {fmt(drawer.payment.advanceBalance)}
                    </Typography>
                  </>
                )}
              </Box>

              {drawer.mode === "pay" && (
                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                  <InputLabel>Type</InputLabel>
                  <Select label="Type" value={txType} onChange={(e) => setTxType(e.target.value)}>
                    <MenuItem value="CASH">Cash</MenuItem>
                    <MenuItem value="BANK_TRANSFER">Bank Transfer</MenuItem>
                    <MenuItem value="ADJUSTMENT">Adjustment</MenuItem>
                    <MenuItem value="OTHER">Other</MenuItem>
                  </Select>
                </FormControl>
              )}

              <TextField
                label="Amount (৳)"
                type="number"
                size="small"
                fullWidth
                value={txAmount}
                onChange={(e) => setTxAmount(e.target.value)}
                sx={{ mb: 2 }}
                slotProps={{
                  htmlInput: {
                    max:
                      drawer.mode === "advance"
                        ? Math.min(drawer.payment.advanceBalance, drawer.payment.balance)
                        : undefined,
                  },
                }}
              />
              <TextField
                label="Date"
                type="date"
                size="small"
                fullWidth
                value={txDate}
                onChange={(e) => setTxDate(e.target.value)}
                sx={{ mb: 2 }}
              />
              <TextField
                label="Notes (optional)"
                size="small"
                fullWidth
                value={txNotes}
                onChange={(e) => setTxNotes(e.target.value)}
                sx={{ mb: 2 }}
              />

              {txError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {txError}
                </Alert>
              )}

              <Button
                variant="contained"
                fullWidth
                onClick={submitTransaction}
                disabled={txLoading || !txAmount || parseFloat(txAmount) <= 0}
              >
                {txLoading
                  ? "Saving…"
                  : drawer.mode === "advance"
                    ? "Apply Advance"
                    : "Record Payment"}
              </Button>
            </>
          )}
        </Box>
      </Drawer>
    </Box>
  );
}
