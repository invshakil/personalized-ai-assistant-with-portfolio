"use client";

import { Fragment, useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
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
import SearchableSelect, { type SelectOption } from "@/components/admin/SearchableSelect";
import { propertyApi } from "@/lib/api/property";
import { moneyApi } from "@/lib/api/money";
import { mobileCardTableSx } from "@/lib/mobileTableSx";
import type {
  PaymentWithTenant,
  PaymentTransaction,
  UnitWithTenant,
  MoneyAccountRow,
} from "@/types";

// Sentinel for the optional "don't add to wallet" choice in account dropdowns.
const NO_ACCOUNT = "";

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
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // ── Filter state lives in the URL (deep-linkable, restored on reload) ──
  // month="all" (or absent → defaults to current month). When "all", payments
  // are fetched across every month via the period range.
  const monthParam = searchParams.get("month");
  const month = monthParam === "all" ? "all" : monthParam ? Number(monthParam) : now.getMonth() + 1;
  const year = searchParams.get("year") ? Number(searchParams.get("year")) : now.getFullYear();
  const unitFilter = searchParams.get("unit") ?? "ALL";
  const tenantFilter = searchParams.get("tenant") ?? "ALL";
  const isAllMonths = month === "all";

  /** Merge a patch into the URL query (undefined/"" removes the key). */
  const setParams = useCallback(
    (patch: Record<string, string | undefined>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined || v === "") next.delete(k);
        else next.set(k, v);
      }
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [searchParams, pathname, router]
  );

  const [payments, setPayments] = useState<PaymentWithTenant[]>([]);
  const [units, setUnits] = useState<UnitWithTenant[]>([]);
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
  const [txAccountId, setTxAccountId] = useState<string>(NO_ACCOUNT);
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);

  // Money-Manager accounts for the optional "add to wallet" link on cash/bank
  // receipts. Loaded once; empty when the Money module has no accounts yet.
  const [accounts, setAccounts] = useState<MoneyAccountRow[]>([]);

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

  // Build the API filter object from current URL state. "All months" fetches
  // every month via period=all; a specific month/year filters exactly. Unit and
  // tenant filters are applied server-side in the `where`.
  const buildFilters = useCallback(() => {
    const f: {
      month?: number;
      year?: number;
      unitId?: string;
      tenantId?: string;
      period?: string;
    } = {};
    if (isAllMonths) f.period = "all";
    else {
      f.month = month as number;
      f.year = year;
    }
    if (unitFilter !== "ALL") f.unitId = unitFilter;
    if (tenantFilter !== "ALL") f.tenantId = tenantFilter;
    return f;
  }, [isAllMonths, month, year, unitFilter, tenantFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPayments((await propertyApi.listPayments(buildFilters())) ?? []);
    } finally {
      setLoading(false);
    }
  }, [buildFilters]);

  // Auto-generate on load if no payments exist for a specific month. Skipped
  // when viewing "All months" (a cross-month read, nothing to generate for).
  const autoGenerate = useCallback(async () => {
    if (isAllMonths) {
      await load();
      return;
    }
    const data = (await propertyApi.listPayments(buildFilters())) ?? [];
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
  }, [isAllMonths, buildFilters, month, year, load]);

  useEffect(() => {
    setLoading(true);
    autoGenerate();
  }, [autoGenerate]);

  // Units for the Unit filter dropdown (loaded once).
  useEffect(() => {
    propertyApi.listUnits().then((u) => setUnits(u ?? []));
  }, []);

  // Money accounts for the optional wallet link (loaded once).
  useEffect(() => {
    moneyApi.listAccounts().then((a) => setAccounts(a ?? []));
  }, []);

  // Pick a sensible default account for a transaction type: first CASH account
  // for cash, first BANK account for bank transfer; "" (none) otherwise.
  const defaultAccountForType = useCallback(
    (type: string): string => {
      if (type === "CASH") return accounts.find((a) => a.type === "CASH")?.id ?? NO_ACCOUNT;
      if (type === "BANK_TRANSFER")
        return accounts.find((a) => a.type === "BANK")?.id ?? NO_ACCOUNT;
      return NO_ACCOUNT;
    },
    [accounts]
  );

  // Account dropdown options: a "none" sentinel plus every account.
  const accountOptions: SelectOption[] = useMemo(
    () => [
      { value: NO_ACCOUNT, label: "— none / don't add to wallet —" },
      ...accounts.map((a) => ({ value: a.id, label: a.name })),
    ],
    [accounts]
  );

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
    const initialType = mode === "advance" ? "ADVANCE_APPLIED" : "CASH";
    setTxType(initialType);
    setTxAmount(String(maxApplicable > 0 ? maxApplicable : ""));
    setTxDate(new Date().toISOString().split("T")[0]);
    setTxNotes("");
    setTxAccountId(defaultAccountForType(initialType));
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
        // Only link to the wallet for real cash/bank receipts when one is chosen.
        accountId:
          (txType === "CASH" || txType === "BANK_TRANSFER") && txAccountId
            ? txAccountId
            : undefined,
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
  // Total Paid = cash/bank received (amountPaid). Collected also counts advance
  // drawn down; Outstanding is what is still due across the filtered set.
  const totalPaid = payments.reduce((s, p) => s + p.amountPaid, 0);
  const totalCollected = payments.reduce((s, p) => s + p.amountPaid + p.advanceApplied, 0);
  const totalOutstanding = payments.reduce((s, p) => s + p.balance, 0);

  // ── Dropdown options (rendered via SearchableSelect) ──
  const unitOptions: SelectOption[] = useMemo(
    () => [
      { value: "ALL", label: "All units" },
      ...units.map((u) => ({ value: u.id, label: u.unitNumber })),
    ],
    [units]
  );
  // Tenant options come from units (current + future) so a tenant is selectable
  // even before their payment rows load; deduped by id.
  const tenantOptions: SelectOption[] = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of units) {
      if (u.tenant) map.set(u.tenant.id, u.tenant.name);
      if (u.futureTenant) map.set(u.futureTenant.id, u.futureTenant.name);
    }
    for (const p of payments) map.set(p.tenantId, p.tenantName);
    return [
      { value: "ALL", label: "All tenants" },
      ...[...map.entries()]
        .sort((a, b) => a[1].localeCompare(b[1]))
        .map(([id, name]) => ({ value: id, label: name })),
    ];
  }, [units, payments]);
  // Keep the tenant value valid if it isn't in the options list.
  const tenantValue = tenantOptions.some((o) => o.value === tenantFilter) ? tenantFilter : "ALL";

  const monthOptions: SelectOption[] = [
    { value: "all", label: "All months" },
    ...MONTHS.map((m, i) => ({ value: String(i + 1), label: m })),
  ];
  const yearOptions: SelectOption[] = [2025, 2026, 2027, 2028].map((y) => ({
    value: String(y),
    label: String(y),
  }));

  const hasActiveFilters = unitFilter !== "ALL" || tenantFilter !== "ALL" || isAllMonths;

  return (
    <Box>
      <PageHeader title="Monthly Payments" subtitle="Track and record rent payments" />

      {/* Filters */}
      <Box sx={{ display: "flex", gap: 2, mb: 3, alignItems: "center", flexWrap: "wrap" }}>
        <SearchableSelect
          label="Month"
          value={isAllMonths ? "all" : String(month)}
          options={monthOptions}
          onChange={(v) => setParams({ month: v === String(now.getMonth() + 1) ? undefined : v })}
          sx={{ minWidth: 150 }}
        />
        <SearchableSelect
          label="Year"
          value={String(year)}
          options={yearOptions}
          disabled={isAllMonths}
          onChange={(v) => setParams({ year: v === String(now.getFullYear()) ? undefined : v })}
          sx={{ minWidth: 110 }}
        />
        <SearchableSelect
          label="Unit"
          value={unitFilter}
          options={unitOptions}
          onChange={(v) => setParams({ unit: v === "ALL" ? undefined : v })}
          sx={{ minWidth: 150 }}
        />
        <SearchableSelect
          label="Tenant"
          value={tenantValue}
          options={tenantOptions}
          onChange={(v) => setParams({ tenant: v === "ALL" ? undefined : v })}
          sx={{ minWidth: 170 }}
        />
        {hasActiveFilters && (
          <Button
            size="small"
            color="inherit"
            onClick={() => setParams({ unit: undefined, tenant: undefined, month: undefined })}
          >
            Clear
          </Button>
        )}
        {!isAllMonths && (
          <Button
            variant="outlined"
            size="small"
            onClick={async () => {
              setGenerating(true);
              const gen = (await propertyApi.generatePayments({
                month: month as number,
                year,
              })) as {
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
        )}
        <Box sx={{ ml: "auto" }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Download size={16} />}
            disabled={payments.length === 0 || isAllMonths}
            onClick={() =>
              window.open(`/api/admin/property/payments/pdf?month=${month}&year=${year}`, "_blank")
            }
          >
            Download all
          </Button>
        </Box>
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
          { label: "Total Paid", value: fmt(totalPaid), color: "success.main" },
          { label: "Collected", value: fmt(totalCollected), color: "success.main" },
          { label: "Outstanding", value: fmt(totalOutstanding), color: "error.main" },
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
          {overdueCount} tenant{overdueCount > 1 ? "s have" : " has"} outstanding dues
          {isAllMonths ? " across all months" : ` for ${MONTHS[(month as number) - 1]} ${year}`}
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
                          {isAllMonths ? ` · ${MONTHS[p.month - 1]} ${p.year}` : ""}
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
                {drawer.payment.tenantName} · {MONTHS[drawer.payment.month - 1]}{" "}
                {drawer.payment.year}
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
                  <Select
                    label="Type"
                    value={txType}
                    onChange={(e) => {
                      const next = e.target.value;
                      setTxType(next);
                      setTxAccountId(defaultAccountForType(next));
                    }}
                  >
                    <MenuItem value="CASH">Cash</MenuItem>
                    <MenuItem value="BANK_TRANSFER">Bank Transfer</MenuItem>
                    <MenuItem value="ADJUSTMENT">Adjustment</MenuItem>
                    <MenuItem value="OTHER">Other</MenuItem>
                  </Select>
                </FormControl>
              )}

              {/* Optional wallet link — only for real cash/bank receipts */}
              {drawer.mode === "pay" &&
                (txType === "CASH" || txType === "BANK_TRANSFER") &&
                accounts.length > 0 && (
                  <SearchableSelect
                    label="Add to wallet/account (optional)"
                    value={txAccountId}
                    options={accountOptions}
                    onChange={setTxAccountId}
                    sx={{ mb: 2 }}
                  />
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
