"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
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
  InputAdornment,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
} from "@mui/material";
import { Plus, Pencil, Trash2, Search, X } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import SearchableSelect, { type SelectOption } from "@/components/admin/SearchableSelect";
import { propertyApi } from "@/lib/api/property";
import { moneyApi } from "@/lib/api/money";
import { mobileCardTableSx } from "@/lib/mobileTableSx";
import type {
  PropertyExpense,
  ExpenseCategory,
  Payee,
  PropertyServiceType,
  MoneyAccountRow,
} from "@/types";

// Sentinel for the optional "don't deduct from wallet" choice.
const NO_ACCOUNT = "";

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
const CATEGORIES: ExpenseCategory[] = [
  "MAINTENANCE",
  "UTILITY",
  "SALARY",
  "SUBSCRIPTION",
  "CONSTRUCTION",
  "OTHER",
];
const CAT_LABELS: Record<ExpenseCategory, string> = {
  MAINTENANCE: "Maintenance",
  UTILITY: "Utility",
  SALARY: "Salary",
  SUBSCRIPTION: "Subscription",
  CONSTRUCTION: "Construction",
  OTHER: "Other",
};
const CAT_COLORS: Record<ExpenseCategory, string> = {
  MAINTENANCE: "warning.main",
  UTILITY: "info.main",
  SALARY: "success.main",
  SUBSCRIPTION: "primary.main",
  CONSTRUCTION: "error.main",
  OTHER: "text.secondary",
};

function fmt(n: number) {
  return `৳${n.toLocaleString()}`;
}

type ExpenseForm = {
  description: string;
  amount: string;
  category: ExpenseCategory;
  expenseDate: string;
  paidTo: string;
  paymentMode: string;
  payeeId: string;
  serviceTypeId: string;
  notes: string;
};

const BLANK: ExpenseForm = {
  description: "",
  amount: "",
  category: "OTHER",
  expenseDate: new Date().toISOString().split("T")[0],
  paidTo: "",
  paymentMode: "Cash",
  payeeId: "",
  serviceTypeId: "",
  notes: "",
};

export default function ExpensesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const now = new Date();

  // ── Filter state lives in the URL (deep-linkable, restored on reload) ──
  const month = searchParams.get("month") ? Number(searchParams.get("month")) : now.getMonth() + 1;
  const year = searchParams.get("year") ? Number(searchParams.get("year")) : now.getFullYear();
  const payeeFilter = searchParams.get("payee") ?? "ALL";
  const categoryFilter = searchParams.get("category") ?? "ALL";
  const serviceTypeFilter = searchParams.get("serviceType") ?? "ALL";
  const q = searchParams.get("q") ?? "";

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

  const [expenses, setExpenses] = useState<PropertyExpense[]>([]);
  const [payees, setPayees] = useState<Payee[]>([]);
  const [serviceTypes, setServiceTypes] = useState<PropertyServiceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<ExpenseForm>(BLANK);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Optional Money-Manager wallet to debit when adding an expense. Linking is
  // create-only (no back-sync), so this is only used on Add, never on Edit.
  const [accounts, setAccounts] = useState<MoneyAccountRow[]>([]);
  const [expenseAccountId, setExpenseAccountId] = useState<string>(NO_ACCOUNT);

  // Debounced search box: local input mirrors ?q, pushed to the URL after a pause.
  const [searchInput, setSearchInput] = useState(q);
  useEffect(() => {
    setSearchInput(q);
  }, [q]);
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput !== q) setParams({ q: searchInput || undefined });
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput, q, setParams]);

  // Load payees and service types once on mount
  useEffect(() => {
    Promise.all([propertyApi.listPayees(), propertyApi.listServiceTypes()]).then(([p, s]) => {
      setPayees(p ?? []);
      setServiceTypes((s ?? []).filter((t) => t.isActive));
    });
  }, []);

  // Money accounts for the optional wallet link (loaded once).
  useEffect(() => {
    moneyApi.listAccounts().then((a) => setAccounts(a ?? []));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const filters = {
        month,
        year,
        ...(payeeFilter !== "ALL" && { payeeId: payeeFilter }),
        ...(categoryFilter !== "ALL" && { category: categoryFilter }),
        ...(serviceTypeFilter !== "ALL" && { serviceTypeId: serviceTypeFilter }),
        ...(q && { q }),
      };
      setExpenses((await propertyApi.listExpenses(filters)) ?? []);
    } finally {
      setLoading(false);
    }
  }, [month, year, payeeFilter, categoryFilter, serviceTypeFilter, q]);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...BLANK, expenseDate: new Date().toISOString().split("T")[0] });
    // Default to the first CASH account (mode defaults to Cash); user can clear.
    setExpenseAccountId(accounts.find((a) => a.type === "CASH")?.id ?? NO_ACCOUNT);
    setError(null);
    setDrawerOpen(true);
  };

  const openEdit = (e: PropertyExpense) => {
    setEditing(e.id);
    setExpenseAccountId(NO_ACCOUNT);
    setForm({
      description: e.description,
      amount: String(e.amount),
      category: e.category,
      expenseDate: e.expenseDate ? e.expenseDate.split("T")[0] : "",
      paidTo: e.paidTo ?? "",
      paymentMode: e.paymentMode ?? "Cash",
      payeeId: e.payeeId ?? "",
      serviceTypeId: e.serviceTypeId ?? "",
      notes: e.notes ?? "",
    });
    setError(null);
    setDrawerOpen(true);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const body = {
        description: form.description,
        amount: parseFloat(form.amount),
        category: form.category,
        month,
        year,
        expenseDate: form.expenseDate || null,
        paidTo: form.paidTo || null,
        paymentMode: form.paymentMode || null,
        payeeId: form.payeeId || null,
        serviceTypeId: form.serviceTypeId || null,
        notes: form.notes || null,
      };
      if (editing) await propertyApi.updateExpense(editing, body);
      // Linking is create-only: pass the chosen wallet to debit (if any).
      else
        await propertyApi.createExpense({
          ...body,
          ...(expenseAccountId ? { accountId: expenseAccountId } : {}),
        });
      setDrawerOpen(false);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const del = async (id: string) => {
    if (!confirm("Delete this expense?")) return;
    await propertyApi.deleteExpense(id);
    load();
  };

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  // ── Dropdown options (rendered via SearchableSelect) ──
  const monthOptions: SelectOption[] = MONTHS.map((m, i) => ({ value: String(i + 1), label: m }));
  const yearOptions: SelectOption[] = [2025, 2026, 2027, 2028].map((y) => ({
    value: String(y),
    label: String(y),
  }));
  const categoryOptions: SelectOption[] = [
    { value: "ALL", label: "All categories" },
    ...CATEGORIES.map((c) => ({ value: c, label: CAT_LABELS[c] })),
  ];
  const serviceTypeOptions: SelectOption[] = [
    { value: "ALL", label: "All service types" },
    ...serviceTypes.map((t) => ({ value: t.id, label: t.name })),
  ];
  const serviceTypeValue = serviceTypeOptions.some((o) => o.value === serviceTypeFilter)
    ? serviceTypeFilter
    : "ALL";
  const payeeOptions: SelectOption[] = [
    { value: "ALL", label: "All payees" },
    ...payees
      .filter((p) => p.isActive)
      .map((p) => ({ value: p.id, label: `${p.name} · ${p.role}` })),
  ];
  const payeeValue = payeeOptions.some((o) => o.value === payeeFilter) ? payeeFilter : "ALL";

  const hasActiveFilters =
    payeeFilter !== "ALL" || categoryFilter !== "ALL" || serviceTypeFilter !== "ALL" || Boolean(q);

  return (
    <Box>
      <PageHeader title="Property Expenses" subtitle="Track monthly property costs" />

      <Box sx={{ display: "flex", gap: 2, mb: 3, alignItems: "center", flexWrap: "wrap" }}>
        <SearchableSelect
          label="Month"
          value={String(month)}
          options={monthOptions}
          onChange={(v) => setParams({ month: v === String(now.getMonth() + 1) ? undefined : v })}
          sx={{ minWidth: 150 }}
        />
        <SearchableSelect
          label="Year"
          value={String(year)}
          options={yearOptions}
          onChange={(v) => setParams({ year: v === String(now.getFullYear()) ? undefined : v })}
          sx={{ minWidth: 110 }}
        />
        <SearchableSelect
          label="Category"
          value={categoryFilter}
          options={categoryOptions}
          onChange={(v) => setParams({ category: v === "ALL" ? undefined : v })}
          sx={{ minWidth: 160 }}
        />
        <SearchableSelect
          label="Service Type"
          value={serviceTypeValue}
          options={serviceTypeOptions}
          onChange={(v) => setParams({ serviceType: v === "ALL" ? undefined : v })}
          sx={{ minWidth: 170 }}
        />
        <SearchableSelect
          label="Payee"
          value={payeeValue}
          options={payeeOptions}
          onChange={(v) => setParams({ payee: v === "ALL" ? undefined : v })}
          sx={{ minWidth: 170 }}
        />
        <TextField
          label="Search notes / description"
          size="small"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          sx={{ minWidth: 220 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={16} />
                </InputAdornment>
              ),
              endAdornment: searchInput ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchInput("")} edge="end">
                    <X size={14} />
                  </IconButton>
                </InputAdornment>
              ) : null,
            },
          }}
        />
        {hasActiveFilters && (
          <Button
            size="small"
            color="inherit"
            onClick={() =>
              setParams({
                payee: undefined,
                category: undefined,
                serviceType: undefined,
                q: undefined,
              })
            }
          >
            Clear
          </Button>
        )}
        <Box sx={{ ml: "auto" }}>
          <Button variant="contained" startIcon={<Plus size={16} />} onClick={openAdd}>
            Add Expense
          </Button>
        </Box>
      </Box>

      {expenses.length > 0 && (
        <Card
          sx={{ bgcolor: "background.paper", mb: 2, display: "inline-flex", px: 3, py: 1.5, mr: 2 }}
        >
          <Box>
            <Typography variant="caption" color="text.secondary">
              Total Expenses
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "error.main" }}>
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
                <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Service Type</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Amount</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Payee</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Mode</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Notes</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} sx={{ textAlign: "center", py: 4 }}>
                    <Typography color="text.secondary">No expenses for this period</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                expenses.map((e) => (
                  <TableRow key={e.id} hover>
                    <TableCell data-label="Date">
                      <Typography variant="body2">
                        {e.expenseDate
                          ? new Date(e.expenseDate).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                            })
                          : `${MONTHS[e.month - 1]} ${e.year}`}
                      </Typography>
                    </TableCell>
                    <TableCell data-label="Category">
                      <Chip
                        label={CAT_LABELS[e.category]}
                        size="small"
                        sx={{
                          bgcolor: CAT_COLORS[e.category],
                          color: "#fff",
                          fontSize: "0.6875rem",
                        }}
                      />
                    </TableCell>
                    <TableCell data-label="Service Type">
                      {e.serviceTypeName ? (
                        <Chip
                          label={e.serviceTypeName}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: "0.7rem" }}
                        />
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          —
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell data-label="Description">
                      <Typography variant="body2">{e.description}</Typography>
                    </TableCell>
                    <TableCell data-label="Amount">
                      <Typography variant="body2" sx={{ fontWeight: 600, color: "error.main" }}>
                        {fmt(e.amount)}
                      </Typography>
                    </TableCell>
                    <TableCell data-label="Payee">
                      {e.payeeId ? (
                        <Chip
                          label={e.payeeName ?? "—"}
                          size="small"
                          clickable
                          sx={{ fontSize: "0.7rem", cursor: "pointer" }}
                          onClick={() => router.push(`/admin/property/payees/${e.payeeId}`)}
                        />
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          {e.paidTo ?? "—"}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell data-label="Mode">{e.paymentMode ?? "—"}</TableCell>
                    <TableCell data-label="Notes">
                      <Typography variant="caption" color="text.secondary">
                        {e.notes ?? "—"}
                      </Typography>
                    </TableCell>
                    <TableCell data-label="Actions">
                      <Box sx={{ display: "flex" }}>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => openEdit(e)}>
                            <Pencil size={14} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" color="error" onClick={() => del(e.id)}>
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

      {/* Add/Edit Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        slotProps={{ paper: { sx: { width: { xs: "100%", sm: 420 } } } }}
      >
        <Box sx={{ width: "100%", p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            {editing ? "Edit Expense" : "Add Expense"}
          </Typography>

          <TextField
            label="Description"
            size="small"
            fullWidth
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
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

          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Category</InputLabel>
            <Select
              label="Category"
              value={form.category}
              onChange={(e) =>
                setForm((f) => ({ ...f, category: e.target.value as ExpenseCategory }))
              }
            >
              {CATEGORIES.map((c) => (
                <MenuItem key={c} value={c}>
                  {CAT_LABELS[c]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Service Type</InputLabel>
            <Select
              label="Service Type"
              value={form.serviceTypeId}
              onChange={(e) => setForm((f) => ({ ...f, serviceTypeId: e.target.value }))}
            >
              <MenuItem value="">— None —</MenuItem>
              {serviceTypes.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Payee</InputLabel>
            <Select
              label="Payee"
              value={form.payeeId}
              onChange={(e) => setForm((f) => ({ ...f, payeeId: e.target.value }))}
            >
              <MenuItem value="">— None —</MenuItem>
              {payees
                .filter((p) => p.isActive)
                .map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name} · {p.role}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>

          <TextField
            label="Date"
            type="date"
            size="small"
            fullWidth
            value={form.expenseDate}
            onChange={(e) => setForm((f) => ({ ...f, expenseDate: e.target.value }))}
            sx={{ mb: 2 }}
          />

          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Payment Mode</InputLabel>
            <Select
              label="Payment Mode"
              value={form.paymentMode}
              onChange={(e) => setForm((f) => ({ ...f, paymentMode: e.target.value }))}
            >
              {["Cash", "Bank Transfer", "Mobile Banking", "Other"].map((m) => (
                <MenuItem key={m} value={m}>
                  {m}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Optional wallet link — create-only (no back-sync on edit) */}
          {!editing && accounts.length > 0 && (
            <SearchableSelect
              label="Pay from wallet/account (optional)"
              value={expenseAccountId}
              options={[
                { value: NO_ACCOUNT, label: "— none / don't deduct from wallet —" },
                ...accounts.map((a) => ({ value: a.id, label: a.name })),
              ]}
              onChange={setExpenseAccountId}
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
            disabled={saving || !form.description || !form.amount}
          >
            {saving ? "Saving…" : editing ? "Save Changes" : "Add Expense"}
          </Button>
        </Box>
      </Drawer>
    </Box>
  );
}
