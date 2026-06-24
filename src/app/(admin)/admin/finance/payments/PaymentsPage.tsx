"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Box,
  Card,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Drawer,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  OutlinedInput,
  Stack,
} from "@mui/material";
import { Plus, Pencil, Trash2, Download } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import SearchableSelect, { type SelectOption } from "@/components/admin/SearchableSelect";
import { fiscalYearOf } from "@/lib/fiscalYear";
import { financeApi, type PaymentFilters } from "@/lib/api/finance";
import { moneyApi } from "@/lib/api/money";
import { mobileCardTableSx } from "@/lib/mobileTableSx";
import type { MoneyAccountRow } from "@/types";
import type { PaymentRow, EmployeeRow, SourceRow, PaymentKind } from "../types";
import {
  fmt,
  fmtDate,
  todayInput,
  currentFiscalYear,
  FILTER_RANGE_PRESETS,
  FILTER_RANGE_LABELS,
  FILTER_RANGE_TOKEN,
  TOKEN_TO_FILTER_RANGE,
  type FilterRangePreset,
} from "../format";

const KINDS: PaymentKind[] = ["SALARY", "BONUS", "ADVANCE", "OTHER"];
const KIND_LABEL: Record<PaymentKind, string> = {
  SALARY: "Salary",
  BONUS: "Bonus",
  ADVANCE: "Advance",
  OTHER: "Other",
};

// Sentinel for "don't post a ledger entry" in the optional account dropdown.
const NO_ACCOUNT = "";

type PaymentForm = {
  date: string;
  employeeId: string;
  type: PaymentKind;
  reference: string;
  clientIds: string[];
  amount: string;
  fiscalYear: string;
  notes: string;
  /** Optional Money account to post a linked DEBIT to (opt-in; create only). */
  accountId: string;
};

const BLANK: PaymentForm = {
  date: todayInput(),
  employeeId: "",
  type: "SALARY",
  reference: "",
  clientIds: [],
  amount: "",
  fiscalYear: fiscalYearOf(new Date()),
  notes: "",
  accountId: NO_ACCOUNT,
};

export default function PaymentsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // ── Filter state lives entirely in the URL (deep-linkable, restored on reload) ──
  const fyFilter = searchParams.get("fy") ?? currentFiscalYear();
  const empFilter = searchParams.get("employee") ?? "ALL";
  const typeFilter = (searchParams.get("type") as PaymentKind | "ALL" | null) ?? "ALL";
  const clientFilter = searchParams.get("client") ?? "ALL";
  const period = searchParams.get("period") ?? undefined;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  const hasCustomRange = Boolean(from || to);
  const activePreset: FilterRangePreset | "CUSTOM" = hasCustomRange
    ? "CUSTOM"
    : (period && TOKEN_TO_FILTER_RANGE[period]) || "M1";

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

  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [clients, setClients] = useState<SourceRow[]>([]);
  const [accounts, setAccounts] = useState<MoneyAccountRow[]>([]);
  // Full fiscal-year set for the dropdown — derived from an unfiltered list.
  const [allFiscalYears, setAllFiscalYears] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<PaymentForm>(BLANK);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const filters: PaymentFilters = {
        ...(fyFilter !== "ALL" && { fiscalYear: fyFilter }),
        ...(empFilter !== "ALL" && { employeeId: empFilter }),
        ...(typeFilter !== "ALL" && { type: typeFilter }),
        ...(clientFilter !== "ALL" && { clientId: clientFilter }),
        ...(hasCustomRange ? { from, to } : { period: period ?? "this_month" }),
      };
      setPayments((await financeApi.listPayments(filters)) ?? []);
    } finally {
      setLoading(false);
    }
  }, [fyFilter, empFilter, typeFilter, clientFilter, hasCustomRange, from, to, period]);

  const loadRefData = useCallback(async () => {
    const [employeesData, clientsData, accountsData, allPayments] = await Promise.all([
      financeApi.listEmployees(),
      financeApi.listClients(),
      moneyApi.listAccounts(),
      financeApi.listPayments(),
    ]);
    setEmployees(employeesData ?? []);
    setClients(clientsData ?? []);
    setAccounts(accountsData ?? []);
    setAllFiscalYears(
      Array.from(new Set([currentFiscalYear(), ...(allPayments ?? []).map((p) => p.fiscalYear)]))
        .sort()
        .reverse()
    );
  }, []);

  useEffect(() => {
    loadRefData();
  }, [loadRefData]);
  useEffect(() => {
    load();
  }, [load]);

  const total = payments.reduce((s, p) => s + p.amount, 0);

  // ── Dropdown option lists (all rendered via SearchableSelect) ──
  const fySelectOptions: SelectOption[] = [
    { value: "ALL", label: "All fiscal years" },
    ...allFiscalYears.map((fy) => ({ value: fy, label: fy })),
  ];
  const empSelectOptions: SelectOption[] = [
    { value: "ALL", label: "All employees" },
    ...employees.map((emp) => ({ value: emp.id, label: emp.name })),
  ];
  const typeSelectOptions: SelectOption[] = [
    { value: "ALL", label: "All types" },
    ...KINDS.map((k) => ({ value: k, label: KIND_LABEL[k] })),
  ];
  const clientSelectOptions: SelectOption[] = [
    { value: "ALL", label: "All clients" },
    ...clients.map((c) => ({ value: c.id, label: c.name })),
  ];
  const periodSelectOptions: SelectOption[] = [
    ...FILTER_RANGE_PRESETS.map((p) => ({ value: p, label: FILTER_RANGE_LABELS[p] })),
    ...(activePreset === "CUSTOM"
      ? [{ value: "CUSTOM", label: "Custom range", disabled: true }]
      : []),
  ];

  const hasActiveFilters =
    fyFilter !== "ALL" ||
    empFilter !== "ALL" ||
    typeFilter !== "ALL" ||
    clientFilter !== "ALL" ||
    hasCustomRange ||
    Boolean(period);

  const onPresetChange = (preset: FilterRangePreset) =>
    setParams({
      period: FILTER_RANGE_TOKEN[preset],
      from: undefined,
      to: undefined,
    });

  // Optional account dropdown (post a linked DEBIT). "— none —" = no ledger entry.
  const accountSelectOptions: SelectOption[] = [
    { value: NO_ACCOUNT, label: "— none —" },
    ...accounts.map((a) => ({ value: a.id, label: a.name })),
  ];
  const defaultAccountId = () => accounts.find((a) => a.type === "BANK")?.id ?? NO_ACCOUNT;

  const openAdd = () => {
    setEditing(null);
    setForm({
      ...BLANK,
      date: todayInput(),
      fiscalYear: fiscalYearOf(new Date()),
      employeeId: employees[0]?.id ?? "",
      accountId: defaultAccountId(),
    });
    setError(null);
    setDrawerOpen(true);
  };

  const openEdit = (p: PaymentRow) => {
    setEditing(p.id);
    setForm({
      date: p.date ? p.date.split("T")[0] : todayInput(),
      employeeId: p.employeeId,
      type: p.type,
      reference: p.reference ?? "",
      clientIds: p.clients.map((c) => c.id),
      amount: String(p.amount),
      fiscalYear: p.fiscalYear,
      notes: p.notes ?? "",
      accountId: NO_ACCOUNT,
    });
    setError(null);
    setDrawerOpen(true);
  };

  const onDateChange = (date: string) =>
    setForm((f) => ({
      ...f,
      date,
      fiscalYear: date ? fiscalYearOf(new Date(date)) : f.fiscalYear,
    }));

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const body = {
        date: form.date,
        employeeId: form.employeeId,
        type: form.type,
        reference: form.reference || null,
        clientIds: form.clientIds,
        amount: parseFloat(form.amount),
        fiscalYear: form.fiscalYear,
        notes: form.notes || null,
      };
      if (editing) await financeApi.updatePayment(editing, body);
      // accountId is create-only (opt-in link; no back-sync on edit).
      else await financeApi.createPayment({ ...body, accountId: form.accountId || undefined });
      setDrawerOpen(false);
      load();
      loadRefData();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await financeApi.deletePayment(pendingDelete);
      setPendingDelete(null);
      load();
      loadRefData();
    } finally {
      setDeleting(false);
    }
  };

  // Download mirrors the FY + employee filters (the PDF route supports both).
  const downloadAll = () => {
    const qs = new URLSearchParams();
    if (fyFilter !== "ALL") qs.set("fiscalYear", fyFilter);
    if (empFilter !== "ALL") qs.set("employeeId", empFilter);
    window.open(`/api/admin/finance/payments/pdf?${qs.toString()}`, "_blank");
  };

  return (
    <Box>
      <PageHeader title="Employee Salaries" subtitle="Salary & bonus payments to employees" />

      <Box sx={{ display: "flex", gap: 2, mb: 2, alignItems: "center", flexWrap: "wrap" }}>
        <SearchableSelect
          label="Fiscal Year"
          value={fyFilter}
          options={fySelectOptions}
          onChange={(v) => setParams({ fy: v })}
          sx={{ minWidth: 160 }}
        />
        <SearchableSelect
          label="Employee"
          value={empFilter}
          options={empSelectOptions}
          onChange={(v) => setParams({ employee: v === "ALL" ? undefined : v })}
          sx={{ minWidth: 180 }}
        />
        <SearchableSelect
          label="Type"
          value={typeFilter}
          options={typeSelectOptions}
          onChange={(v) => setParams({ type: v === "ALL" ? undefined : v })}
          sx={{ minWidth: 140 }}
        />
        <SearchableSelect
          label="Client"
          value={clientFilter}
          options={clientSelectOptions}
          onChange={(v) => setParams({ client: v === "ALL" ? undefined : v })}
          sx={{ minWidth: 180 }}
        />
        <SearchableSelect
          label="Period"
          value={activePreset}
          options={periodSelectOptions}
          onChange={(v) => onPresetChange(v as FilterRangePreset)}
          sx={{ minWidth: 170 }}
        />
        <TextField
          label="From"
          type="date"
          size="small"
          value={from ?? ""}
          onChange={(e) => setParams({ from: e.target.value || undefined, period: undefined })}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ minWidth: 150 }}
        />
        <TextField
          label="To"
          type="date"
          size="small"
          value={to ?? ""}
          onChange={(e) => setParams({ to: e.target.value || undefined, period: undefined })}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ minWidth: 150 }}
        />
        {hasActiveFilters && (
          <Button
            size="small"
            color="inherit"
            onClick={() =>
              setParams({
                fy: "ALL",
                employee: undefined,
                type: undefined,
                client: undefined,
                period: undefined,
                from: undefined,
                to: undefined,
              })
            }
          >
            Clear
          </Button>
        )}
        <Box sx={{ ml: "auto", display: "flex", gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Download size={16} />}
            disabled={payments.length === 0}
            onClick={downloadAll}
          >
            Download all
          </Button>
          <Button variant="contained" startIcon={<Plus size={16} />} onClick={openAdd}>
            Add Payment
          </Button>
        </Box>
      </Box>

      {!loading && payments.length > 0 && (
        <Card sx={{ bgcolor: "background.paper", mb: 2, display: "inline-flex", px: 3, py: 1.5 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Total Paid ({payments.length})
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "warning.main" }}>
              {fmt(total)}
            </Typography>
          </Box>
        </Card>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Card} sx={{ bgcolor: "background.paper" }}>
          <Table size="small" sx={mobileCardTableSx}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Employee</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Clients</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  Amount
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Fiscal Year</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ textAlign: "center", py: 4 }}>
                    <Typography color="text.secondary">
                      {hasActiveFilters ? "No payments match these filters" : "No payments yet"}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((p) => (
                  <TableRow key={p.id} hover>
                    <TableCell data-label="Date">{fmtDate(p.date)}</TableCell>
                    <TableCell data-label="Employee">{p.employeeName}</TableCell>
                    <TableCell data-label="Type">
                      <Chip
                        size="small"
                        label={KIND_LABEL[p.type]}
                        color={
                          p.type === "SALARY"
                            ? "primary"
                            : p.type === "BONUS"
                              ? "success"
                              : "default"
                        }
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell data-label="Clients">
                      {p.clients.length > 0 ? (
                        <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap", gap: 0.5 }}>
                          {p.clients.map((c) => (
                            <Chip key={c.id} size="small" label={c.name} variant="outlined" />
                          ))}
                        </Stack>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          —
                        </Typography>
                      )}
                      {p.reference && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: "block", mt: p.clients.length ? 0.5 : 0 }}
                        >
                          {p.reference}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell
                      align="right"
                      data-label="Amount"
                      sx={{ fontWeight: 600, color: "warning.main" }}
                    >
                      {fmt(p.amount)}
                    </TableCell>
                    <TableCell data-label="Fiscal Year">{p.fiscalYear}</TableCell>
                    <TableCell data-label="Actions">
                      <Box sx={{ display: "flex" }}>
                        <Tooltip title="Download salary receipt">
                          <IconButton
                            size="small"
                            onClick={() =>
                              window.open(`/api/admin/finance/payments/${p.id}/receipt`, "_blank")
                            }
                          >
                            <Download size={14} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => openEdit(p)}>
                            <Pencil size={14} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setPendingDelete(p.id)}
                          >
                            <Trash2 size={14} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        slotProps={{ paper: { sx: { width: { xs: "100%", sm: 420 } } } }}
      >
        <Box sx={{ width: "100%", p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            {editing ? "Edit Payment" : "Add Payment"}
          </Typography>
          <TextField
            label="Date"
            type="date"
            size="small"
            fullWidth
            value={form.date}
            onChange={(e) => onDateChange(e.target.value)}
            sx={{ mb: 2 }}
          />
          <SearchableSelect
            label="Employee"
            value={form.employeeId}
            options={employees.map((emp) => ({ value: emp.id, label: emp.name }))}
            onChange={(v) => setForm((f) => ({ ...f, employeeId: v }))}
            sx={{ mb: 2 }}
          />
          <SearchableSelect
            label="Type"
            value={form.type}
            options={KINDS.map((k) => ({ value: k, label: KIND_LABEL[k] }))}
            onChange={(v) => setForm((f) => ({ ...f, type: v as PaymentKind }))}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Client(s)</InputLabel>
            <Select
              multiple
              label="Client(s)"
              value={form.clientIds}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  clientIds:
                    typeof e.target.value === "string" ? e.target.value.split(",") : e.target.value,
                }))
              }
              input={<OutlinedInput label="Client(s)" />}
              renderValue={(selected) => (
                <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap", gap: 0.5 }}>
                  {(selected as string[]).map((id) => {
                    const c = clients.find((x) => x.id === id);
                    return <Chip key={id} size="small" label={c?.name ?? id} />;
                  })}
                </Stack>
              )}
            >
              {clients.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Note (optional)"
            size="small"
            fullWidth
            value={form.reference}
            onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
            placeholder="e.g. wedding bonus"
            sx={{ mb: 2 }}
          />
          <TextField
            label="Amount (৳)"
            type="number"
            size="small"
            fullWidth
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Fiscal Year"
            size="small"
            fullWidth
            value={form.fiscalYear}
            onChange={(e) => setForm((f) => ({ ...f, fiscalYear: e.target.value }))}
            helperText="Auto-set from the date (July–June); override if needed."
            sx={{ mb: 2 }}
          />
          {!editing && (
            <SearchableSelect
              label="Pay from account (optional)"
              value={form.accountId}
              options={accountSelectOptions}
              onChange={(v) => setForm((f) => ({ ...f, accountId: v }))}
              clearable
              sx={{ mb: 2 }}
            />
          )}
          <TextField
            label="Notes"
            size="small"
            fullWidth
            multiline
            rows={2}
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            sx={{ mb: 2 }}
          />
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Button
            variant="contained"
            fullWidth
            onClick={save}
            disabled={saving || !form.employeeId || !form.amount}
          >
            {saving ? "Saving…" : editing ? "Save Changes" : "Add Payment"}
          </Button>
        </Box>
      </Drawer>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete payment"
        message="This permanently removes this salary payment record. This cannot be undone."
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </Box>
  );
}
