"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
  InputAdornment,
  FormControlLabel,
  Switch,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
} from "@mui/material";
import { Plus, Pencil, Trash2, Download, Search, X } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import SearchableSelect, { type SelectOption } from "@/components/admin/SearchableSelect";
import MultiSearchableSelect from "@/components/admin/MultiSearchableSelect";
import { fiscalYearOf } from "@/lib/fiscalYear";
import { financeApi, type BizExpenseFilters } from "@/lib/api/finance";
import { moneyApi } from "@/lib/api/money";
import { mobileCardTableSx } from "@/lib/mobileTableSx";
import type { MoneyAccountRow } from "@/types";
import type { BizExpenseRow, CategoryRow } from "../types";
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

// Sentinel for "don't post a ledger entry" in the optional account dropdown.
const NO_ACCOUNT = "";

type ExpenseForm = {
  date: string;
  name: string;
  categoryId: string;
  isRecurring: boolean;
  amount: string;
  fiscalYear: string;
  notes: string;
  /** Optional Money account to post a linked DEBIT to (opt-in; create only). */
  accountId: string;
};

const BLANK: ExpenseForm = {
  date: todayInput(),
  name: "",
  categoryId: "",
  isRecurring: false,
  amount: "",
  fiscalYear: fiscalYearOf(new Date()),
  notes: "",
  accountId: NO_ACCOUNT,
};

export default function BizExpensesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // ── Filter state lives entirely in the URL (deep-linkable, restored on reload) ──
  const fyParam = searchParams.get("fy") ?? "";
  const fyFilter = useMemo(() => fyParam.split(",").filter(Boolean), [fyParam]);
  const categoryParam = searchParams.get("category") ?? "";
  const categoryFilter = useMemo(() => categoryParam.split(",").filter(Boolean), [categoryParam]);
  const period = searchParams.get("period") ?? undefined;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const q = searchParams.get("q") ?? "";

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

  const [expenses, setExpenses] = useState<BizExpenseRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [accounts, setAccounts] = useState<MoneyAccountRow[]>([]);
  // Full fiscal-year set for the dropdown — derived from an unfiltered list.
  const [allFiscalYears, setAllFiscalYears] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<ExpenseForm>(BLANK);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const filters: BizExpenseFilters = {
        fiscalYears: fyFilter,
        categoryIds: categoryFilter,
        ...(hasCustomRange ? { from, to } : { period: period ?? "this_month" }),
        ...(q && { q }),
      };
      setExpenses((await financeApi.listExpenses(filters)) ?? []);
    } finally {
      setLoading(false);
    }
  }, [fyFilter, categoryFilter, hasCustomRange, from, to, period, q]);

  const loadRefData = useCallback(async () => {
    const [categoriesData, accountsData, allExpenses] = await Promise.all([
      financeApi.listCategories(),
      moneyApi.listAccounts(),
      financeApi.listExpenses(),
    ]);
    setCategories(categoriesData ?? []);
    setAccounts(accountsData ?? []);
    setAllFiscalYears(
      Array.from(new Set([currentFiscalYear(), ...(allExpenses ?? []).map((e) => e.fiscalYear)]))
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

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  // ── Dropdown option lists ──────────────────────────────────────────────────────
  const fySelectOptions: SelectOption[] = allFiscalYears.map((fy) => ({ value: fy, label: fy }));
  const categorySelectOptions: SelectOption[] = categories.map((c) => ({
    value: c.id,
    label: c.name,
  }));
  const periodSelectOptions: SelectOption[] = [
    ...FILTER_RANGE_PRESETS.map((p) => ({ value: p, label: FILTER_RANGE_LABELS[p] })),
    ...(activePreset === "CUSTOM"
      ? [{ value: "CUSTOM", label: "Custom range", disabled: true }]
      : []),
  ];

  const hasActiveFilters =
    fyFilter.length > 0 ||
    categoryFilter.length > 0 ||
    hasCustomRange ||
    Boolean(period) ||
    Boolean(q);

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
      categoryId: categories[0]?.id ?? "",
      accountId: defaultAccountId(),
    });
    setError(null);
    setDrawerOpen(true);
  };

  const openEdit = (e: BizExpenseRow) => {
    setEditing(e.id);
    setForm({
      date: e.date ? e.date.split("T")[0] : todayInput(),
      name: e.name,
      categoryId: e.categoryId,
      isRecurring: e.isRecurring,
      amount: String(e.amount),
      fiscalYear: e.fiscalYear,
      notes: e.notes ?? "",
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
        name: form.name,
        categoryId: form.categoryId,
        isRecurring: form.isRecurring,
        amount: parseFloat(form.amount),
        fiscalYear: form.fiscalYear,
        notes: form.notes || null,
      };
      if (editing) await financeApi.updateExpense(editing, body);
      // accountId is create-only (opt-in link; no back-sync on edit).
      else await financeApi.createExpense({ ...body, accountId: form.accountId || undefined });
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
      await financeApi.deleteExpense(pendingDelete);
      setPendingDelete(null);
      load();
      loadRefData();
    } finally {
      setDeleting(false);
    }
  };

  // Download mirrors the active fiscal-year filter (the PDF route filters by FY).
  // Use the first selected FY if exactly one is chosen; otherwise no FY param.
  const downloadHref = `/api/admin/finance/expenses/pdf${
    fyFilter.length === 1 ? `?fiscalYear=${fyFilter[0]}` : ""
  }`;

  return (
    <Box>
      <PageHeader title="Business Expenses" subtitle="Tools, subscriptions & operating costs" />

      <Box sx={{ display: "flex", gap: 2, mb: 2, alignItems: "center", flexWrap: "wrap" }}>
        <MultiSearchableSelect
          label="Fiscal Year"
          value={fyFilter}
          options={fySelectOptions}
          onChange={(ids) => setParams({ fy: ids.length ? ids.join(",") : undefined })}
          sx={{ minWidth: 160 }}
        />
        <MultiSearchableSelect
          label="Category"
          value={categoryFilter}
          options={categorySelectOptions}
          onChange={(ids) => setParams({ category: ids.length ? ids.join(",") : undefined })}
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
        <TextField
          label="Search tool / service"
          size="small"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          sx={{ minWidth: 200 }}
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
                fy: undefined,
                category: undefined,
                period: undefined,
                from: undefined,
                to: undefined,
                q: undefined,
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
            disabled={expenses.length === 0}
            onClick={() => window.open(downloadHref, "_blank")}
          >
            Download all
          </Button>
          <Button variant="contained" startIcon={<Plus size={16} />} onClick={openAdd}>
            Add Expense
          </Button>
        </Box>
      </Box>

      {!loading && expenses.length > 0 && (
        <Card sx={{ bgcolor: "background.paper", mb: 2, display: "inline-flex", px: 3, py: 1.5 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Total Expenses ({expenses.length})
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
                <TableCell sx={{ fontWeight: 700 }}>Tool / Service</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Recurring</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  Amount
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Fiscal Year</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ textAlign: "center", py: 4 }}>
                    <Typography color="text.secondary">
                      {hasActiveFilters ? "No expenses match these filters" : "No expenses yet"}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                expenses.map((e) => (
                  <TableRow key={e.id} hover>
                    <TableCell data-label="Date">{fmtDate(e.date)}</TableCell>
                    <TableCell data-label="Tool / Service" sx={{ fontWeight: 600 }}>
                      {e.name}
                    </TableCell>
                    <TableCell data-label="Category">
                      <Chip size="small" label={e.categoryName} variant="outlined" />
                    </TableCell>
                    <TableCell data-label="Recurring">
                      {e.subscriptionId ? (
                        <Chip
                          size="small"
                          label="Subscription"
                          color="primary"
                          variant="outlined"
                        />
                      ) : e.isRecurring ? (
                        <Chip size="small" label="Recurring" color="info" variant="outlined" />
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          One-off
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell
                      align="right"
                      data-label="Amount"
                      sx={{ fontWeight: 600, color: "error.main" }}
                    >
                      {fmt(e.amount)}
                    </TableCell>
                    <TableCell data-label="Fiscal Year">{e.fiscalYear}</TableCell>
                    <TableCell data-label="Actions">
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <Tooltip title="Download voucher">
                          <IconButton
                            size="small"
                            onClick={() =>
                              window.open(`/api/admin/finance/expenses/${e.id}/receipt`, "_blank")
                            }
                          >
                            <Download size={14} />
                          </IconButton>
                        </Tooltip>
                        {e.subscriptionId ? (
                          <Tooltip title="Managed on the Subscriptions page">
                            <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                              via subscription
                            </Typography>
                          </Tooltip>
                        ) : (
                          <>
                            <Tooltip title="Edit">
                              <IconButton size="small" onClick={() => openEdit(e)}>
                                <Pencil size={14} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => setPendingDelete(e.id)}
                              >
                                <Trash2 size={14} />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
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
            {editing ? "Edit Expense" : "Add Expense"}
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
          <TextField
            label="Tool / Service"
            size="small"
            fullWidth
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <SearchableSelect
            label="Category"
            value={form.categoryId}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
            onChange={(v) => setForm((f) => ({ ...f, categoryId: v }))}
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
          <FormControlLabel
            control={
              <Switch
                checked={form.isRecurring}
                onChange={(e) => setForm((f) => ({ ...f, isRecurring: e.target.checked }))}
              />
            }
            label="Recurring subscription"
            sx={{ mb: 1, display: "block" }}
          />
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
            disabled={saving || !form.name || !form.categoryId || !form.amount}
          >
            {saving ? "Saving…" : editing ? "Save Changes" : "Add Expense"}
          </Button>
        </Box>
      </Drawer>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete expense"
        message="This permanently removes this expense entry. This cannot be undone."
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </Box>
  );
}
