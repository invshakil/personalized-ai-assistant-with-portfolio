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
  TableSortLabel,
  Chip,
  Drawer,
  TextField,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
} from "@mui/material";
import { Plus, Pencil, Trash2, ArrowLeftRight, Search, X } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import SearchableSelect, { type SelectOption } from "@/components/admin/SearchableSelect";
import { moneyApi, type EntryFilters } from "@/lib/api/money";
import { mobileCardTableSx } from "@/lib/mobileTableSx";
import type {
  MoneyAccountRow,
  MoneyCategoryRow,
  MoneyEntryRow,
  BeneficiaryRow,
  ObligationRow,
} from "@/types";
import {
  fmt,
  fmtCurrency,
  currencySymbol,
  fmtDate,
  todayInput,
  DIRECTION_LABEL,
  MONEY_RANGE_LABELS,
  MONEY_RANGE_PERIOD,
  type MoneyRange,
} from "../format";

type EntryDir = "CREDIT" | "DEBIT";
type DirFilter = "ALL" | "CREDIT" | "DEBIT" | "TRANSFER";
type SortBy = "date" | "amount" | "category";
type SortDir = "asc" | "desc";

// Reverse of MONEY_RANGE_PERIOD: dateRange token → UI preset key.
const PERIOD_TO_RANGE = Object.fromEntries(
  (Object.keys(MONEY_RANGE_PERIOD) as MoneyRange[]).map((r) => [MONEY_RANGE_PERIOD[r], r])
) as Record<string, MoneyRange>;
const DEFAULT_PERIOD = MONEY_RANGE_PERIOD.M1;

type EntryForm = {
  date: string;
  direction: EntryDir;
  amount: string;
  categoryId: string;
  accountId: string;
  description: string;
  notes: string;
  beneficiaryId: string;
  obligationId: string;
};

type TransferForm = {
  date: string;
  fromAccountId: string;
  toAccountId: string;
  amount: string;
  /** Destination amount (destination currency) for a cross-currency transfer. */
  toAmount: string;
  description: string;
};

const BLANK_ENTRY: EntryForm = {
  date: todayInput(),
  direction: "DEBIT",
  amount: "",
  categoryId: "",
  accountId: "",
  description: "",
  notes: "",
  beneficiaryId: "",
  obligationId: "",
};

// Entry direction → which side of an obligation it can settle.
const DIR_TO_OBLIGATION: Record<EntryDir, "OWED_BY_ME" | "OWED_TO_ME"> = {
  DEBIT: "OWED_BY_ME", // I paid them → reduces what I owe
  CREDIT: "OWED_TO_ME", // they paid me → reduces what they owe me
};

const BLANK_TRANSFER: TransferForm = {
  date: todayInput(),
  fromAccountId: "",
  toAccountId: "",
  amount: "",
  toAmount: "",
  description: "",
};

export default function EntriesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // ── Filter state lives entirely in the URL (deep-linkable, restored on reload) ──
  const period = searchParams.get("period") ?? undefined;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const dirFilter = (searchParams.get("type") as DirFilter | null) ?? "ALL";
  const categoryFilter = searchParams.get("category") ?? "ALL";
  const accountFilter = searchParams.get("account") ?? "ALL";
  const q = searchParams.get("q") ?? "";
  const sortBy = (searchParams.get("sort") as SortBy | null) ?? "date";
  const sortDir = (searchParams.get("order") as SortDir | null) ?? "desc";

  const hasCustomRange = Boolean(from || to);
  const activePreset: MoneyRange | "CUSTOM" = hasCustomRange
    ? "CUSTOM"
    : (period && PERIOD_TO_RANGE[period]) || "M1";

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

  const [entries, setEntries] = useState<MoneyEntryRow[]>([]);
  const [accounts, setAccounts] = useState<MoneyAccountRow[]>([]);
  const [categories, setCategories] = useState<MoneyCategoryRow[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<BeneficiaryRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Obligations of the person/shop currently selected in the entry form.
  const [linkObligations, setLinkObligations] = useState<ObligationRow[]>([]);
  const [linkLoading, setLinkLoading] = useState(false);

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

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<EntryForm>(BLANK_ENTRY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [transferOpen, setTransferOpen] = useState(false);
  const [transfer, setTransfer] = useState<TransferForm>(BLANK_TRANSFER);
  const [transferSaving, setTransferSaving] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const filters: EntryFilters = {
        ...(hasCustomRange ? { from, to } : { period: period ?? DEFAULT_PERIOD }),
        ...(dirFilter !== "ALL" && { direction: dirFilter }),
        ...(categoryFilter !== "ALL" && { categoryId: categoryFilter }),
        ...(accountFilter !== "ALL" && { accountId: accountFilter }),
        ...(q && { q }),
        sortBy,
        sortDir,
      };
      setEntries((await moneyApi.listEntries(filters)) ?? []);
    } finally {
      setLoading(false);
    }
  }, [
    hasCustomRange,
    from,
    to,
    period,
    dirFilter,
    categoryFilter,
    accountFilter,
    q,
    sortBy,
    sortDir,
  ]);

  const loadRefData = useCallback(async () => {
    const [acc, cat, ppl] = await Promise.all([
      moneyApi.listAccounts(),
      moneyApi.listCategories(),
      moneyApi.listBeneficiaries(),
    ]);
    setAccounts(acc ?? []);
    setCategories(cat ?? []);
    setBeneficiaries(ppl ?? []);
  }, []);

  useEffect(() => {
    loadRefData();
  }, [loadRefData]);
  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  // When a person/shop is chosen in the entry form, load their obligations so we
  // can offer the matching dues to settle. Cleared when no one is selected.
  useEffect(() => {
    let cancelled = false;
    if (!form.beneficiaryId) {
      setLinkObligations([]);
      return;
    }
    setLinkLoading(true);
    moneyApi
      .getBeneficiary(form.beneficiaryId)
      .then((detail) => {
        if (!cancelled) setLinkObligations(detail?.obligations ?? []);
      })
      .finally(() => {
        if (!cancelled) setLinkLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [form.beneficiaryId]);

  const accountName = useCallback(
    (id: string | null) => accounts.find((a) => a.id === id)?.name ?? "—",
    [accounts]
  );

  // Category filter options narrow to the matching kind when a type is chosen.
  const categoryOptions = useMemo(() => {
    if (dirFilter === "CREDIT") return categories.filter((c) => c.kind === "INCOME");
    if (dirFilter === "DEBIT") return categories.filter((c) => c.kind === "EXPENSE");
    return categories;
  }, [categories, dirFilter]);

  // ── Dropdown option lists (all rendered via the searchable SearchableSelect) ──
  const periodSelectOptions: SelectOption[] = [
    ...(Object.keys(MONEY_RANGE_LABELS) as MoneyRange[]).map((r) => ({
      value: r,
      label: MONEY_RANGE_LABELS[r],
    })),
    ...(activePreset === "CUSTOM"
      ? [{ value: "CUSTOM", label: "Custom range", disabled: true }]
      : []),
  ];
  const typeSelectOptions: SelectOption[] = [
    { value: "ALL", label: "All types" },
    { value: "CREDIT", label: "Income" },
    { value: "DEBIT", label: "Expense" },
    { value: "TRANSFER", label: "Transfer" },
  ];
  const categoryFilterOptions: SelectOption[] = [
    { value: "ALL", label: "All categories" },
    ...categoryOptions.map((c) => ({ value: c.id, label: c.name })),
  ];
  const categoryFilterValue = categoryOptions.some((c) => c.id === categoryFilter)
    ? categoryFilter
    : "ALL";
  const accountFilterOptions: SelectOption[] = [
    { value: "ALL", label: "All accounts" },
    ...accounts.map((a) => ({ value: a.id, label: a.name })),
  ];

  const hasActiveFilters =
    dirFilter !== "ALL" || categoryFilter !== "ALL" || accountFilter !== "ALL" || Boolean(q);

  // Changing the type may invalidate the selected category — clear it if so.
  const onTypeChange = (next: DirFilter) => {
    const patch: Record<string, string | undefined> = { type: next === "ALL" ? undefined : next };
    if (categoryFilter !== "ALL") {
      const stillValid =
        next === "ALL" ||
        next === "TRANSFER" ||
        categories.find((c) => c.id === categoryFilter)?.kind ===
          (next === "CREDIT" ? "INCOME" : "EXPENSE");
      if (!stillValid) patch.category = undefined;
    }
    setParams(patch);
  };

  const onPresetChange = (preset: MoneyRange) =>
    setParams({ period: MONEY_RANGE_PERIOD[preset], from: undefined, to: undefined });

  const toggleSort = (col: SortBy) => {
    if (sortBy === col) {
      setParams({ order: sortDir === "asc" ? "desc" : "asc" });
    } else {
      setParams({ sort: col, order: col === "category" ? "asc" : "desc" });
    }
  };

  const formCategories = useMemo(
    () => categories.filter((c) => c.kind === (form.direction === "CREDIT" ? "INCOME" : "EXPENSE")),
    [categories, form.direction]
  );

  // Open dues for the selected person that this entry's direction can settle.
  const linkObligationOptions = useMemo(
    () =>
      linkObligations.filter(
        (o) =>
          o.type === "LOAN" &&
          o.status === "ACTIVE" &&
          o.direction === DIR_TO_OBLIGATION[form.direction]
      ),
    [linkObligations, form.direction]
  );
  const selectedObligation = linkObligations.find((o) => o.id === form.obligationId) ?? null;

  // Totals for the currently-filtered set (the list is unpaged, so this is exact).
  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    let transfer = 0;
    for (const e of entries) {
      if (e.direction === "CREDIT") income += e.amount;
      else if (e.direction === "DEBIT") expense += e.amount;
      else transfer += e.amount;
    }
    return { income, expense, transfer, net: income - expense, count: entries.length };
  }, [entries]);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...BLANK_ENTRY, date: todayInput(), accountId: accounts[0]?.id ?? "" });
    setError(null);
    setDrawerOpen(true);
  };

  const openEdit = (e: MoneyEntryRow) => {
    if (e.direction === "TRANSFER") return;
    setEditing(e.id);
    setForm({
      date: e.date.split("T")[0],
      direction: e.direction,
      amount: String(e.amount),
      categoryId: e.categoryId ?? "",
      accountId: e.accountId ?? "",
      description: e.description ?? "",
      notes: e.notes ?? "",
      beneficiaryId: e.beneficiaryId ?? "",
      obligationId: e.obligationId ?? "",
    });
    setError(null);
    setDrawerOpen(true);
  };

  const setDirection = (direction: EntryDir) =>
    setForm((f) => ({
      ...f,
      direction,
      // Drop a category that no longer matches the new direction's kind.
      categoryId:
        categories.find((c) => c.id === f.categoryId)?.kind ===
        (direction === "CREDIT" ? "INCOME" : "EXPENSE")
          ? f.categoryId
          : "",
      // A due is direction-specific; clear it so it can't mismatch the new type.
      obligationId: "",
    }));

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const body = {
        date: form.date,
        direction: form.direction,
        amount: parseFloat(form.amount),
        categoryId: form.categoryId,
        accountId: form.accountId || null,
        description: form.description || null,
        notes: form.notes || null,
        beneficiaryId: form.beneficiaryId || null,
        // Only keep the due link when a person is selected and it still matches.
        obligationId: form.beneficiaryId ? form.obligationId || null : null,
      };
      if (editing) await moneyApi.updateEntry(editing, body);
      else await moneyApi.createEntry(body);
      setDrawerOpen(false);
      loadEntries();
      loadRefData();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const openTransfer = () => {
    setTransfer({ ...BLANK_TRANSFER, date: todayInput() });
    setTransferError(null);
    setTransferOpen(true);
  };

  const saveTransfer = async () => {
    setTransferSaving(true);
    setTransferError(null);
    try {
      await moneyApi.transfer({
        fromAccountId: transfer.fromAccountId,
        toAccountId: transfer.toAccountId,
        amount: parseFloat(transfer.amount),
        date: transfer.date,
        description: transfer.description || null,
        ...(transfer.toAmount !== "" && { toAmount: parseFloat(transfer.toAmount) }),
      });
      setTransferOpen(false);
      loadEntries();
      loadRefData();
    } catch (e: unknown) {
      setTransferError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setTransferSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await moneyApi.deleteEntry(pendingDelete);
      setPendingDelete(null);
      loadEntries();
      loadRefData();
    } finally {
      setDeleting(false);
    }
  };

  const amountColor = (d: MoneyEntryRow["direction"]) =>
    d === "CREDIT" ? "success.main" : d === "DEBIT" ? "error.main" : "text.secondary";
  const amountText = (e: MoneyEntryRow) => {
    if (e.direction === "CREDIT") return `+${fmtCurrency(e.amount, e.currency)}`;
    if (e.direction === "DEBIT") return `−${fmtCurrency(e.amount, e.currency)}`;
    // TRANSFER: show the cross-currency arrival amount when it differs.
    if (e.toAmount != null && e.toAmount !== e.amount) {
      return `${fmtCurrency(e.amount, e.currency)} → ${e.toAmount.toLocaleString("en-US")}`;
    }
    return fmtCurrency(e.amount, e.currency);
  };
  const dirColor = (d: MoneyEntryRow["direction"]) =>
    d === "CREDIT" ? "success" : d === "DEBIT" ? "warning" : "info";

  return (
    <Box>
      <PageHeader title="Ledger" subtitle="Every income, expense and transfer" />

      <Box sx={{ display: "flex", gap: 2, mb: 2, alignItems: "center", flexWrap: "wrap" }}>
        <SearchableSelect
          label="Period"
          value={activePreset}
          options={periodSelectOptions}
          onChange={(v) => onPresetChange(v as MoneyRange)}
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
        <SearchableSelect
          label="Type"
          value={dirFilter}
          options={typeSelectOptions}
          onChange={(v) => onTypeChange(v as DirFilter)}
          sx={{ minWidth: 140 }}
        />
        <SearchableSelect
          label="Category"
          value={categoryFilterValue}
          options={categoryFilterOptions}
          disabled={dirFilter === "TRANSFER"}
          onChange={(v) => setParams({ category: v === "ALL" ? undefined : v })}
          sx={{ minWidth: 180 }}
        />
        <SearchableSelect
          label="Account"
          value={accountFilter}
          options={accountFilterOptions}
          onChange={(v) => setParams({ account: v === "ALL" ? undefined : v })}
          sx={{ minWidth: 160 }}
        />
        <TextField
          label="Search description"
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
              setParams({ type: undefined, category: undefined, account: undefined, q: undefined })
            }
          >
            Clear
          </Button>
        )}
        <Box sx={{ ml: "auto", display: "flex", gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<ArrowLeftRight size={16} />}
            onClick={openTransfer}
          >
            Transfer
          </Button>
          <Button variant="contained" startIcon={<Plus size={16} />} onClick={openAdd}>
            Add Entry
          </Button>
        </Box>
      </Box>

      {!loading && totals.count > 0 && (
        <Card
          sx={{
            bgcolor: "background.paper",
            px: 2,
            py: 1.25,
            mb: 2,
            display: "flex",
            alignItems: "center",
            gap: 3,
            flexWrap: "wrap",
          }}
        >
          <Typography variant="body2" color="text.secondary">
            {totals.count} {totals.count === 1 ? "entry" : "entries"}
          </Typography>
          {totals.income > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                Income
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: "success.main" }}>
                +{fmt(totals.income)}
              </Typography>
            </Box>
          )}
          {totals.expense > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                Expense
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: "error.main" }}>
                −{fmt(totals.expense)}
              </Typography>
            </Box>
          )}
          {totals.income > 0 && totals.expense > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                Net
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontWeight: 700, color: totals.net >= 0 ? "success.main" : "error.main" }}
              >
                {totals.net >= 0 ? "+" : "−"}
                {fmt(Math.abs(totals.net))}
              </Typography>
            </Box>
          )}
          {totals.transfer > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                Transfers
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: "text.secondary" }}>
                {fmt(totals.transfer)}
              </Typography>
            </Box>
          )}
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
                <TableCell sx={{ fontWeight: 700 }}>
                  <TableSortLabel
                    active={sortBy === "date"}
                    direction={sortBy === "date" ? sortDir : "desc"}
                    onClick={() => toggleSort("date")}
                  >
                    Date
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>
                  <TableSortLabel
                    active={sortBy === "category"}
                    direction={sortBy === "category" ? sortDir : "asc"}
                    onClick={() => toggleSort("category")}
                  >
                    Category
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Account</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  <TableSortLabel
                    active={sortBy === "amount"}
                    direction={sortBy === "amount" ? sortDir : "desc"}
                    onClick={() => toggleSort("amount")}
                  >
                    Amount
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ textAlign: "center", py: 4 }}>
                    <Typography color="text.secondary">
                      {hasActiveFilters || hasCustomRange
                        ? "No entries match these filters"
                        : "No entries in this period"}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((e) => (
                  <TableRow key={e.id} hover>
                    <TableCell data-label="Date">{fmtDate(e.date)}</TableCell>
                    <TableCell data-label="Type">
                      <Chip
                        size="small"
                        label={DIRECTION_LABEL[e.direction]}
                        color={dirColor(e.direction)}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell data-label="Category">
                      {e.direction === "TRANSFER"
                        ? `${accountName(e.accountId)} → ${accountName(e.transferAccountId)}`
                        : (e.categoryName ?? "—")}
                      {e.beneficiaryName ? (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: "block" }}
                        >
                          {e.beneficiaryName}
                        </Typography>
                      ) : null}
                    </TableCell>
                    <TableCell data-label="Account">
                      {e.direction === "TRANSFER" ? "—" : accountName(e.accountId)}
                    </TableCell>
                    <TableCell
                      align="right"
                      data-label="Amount"
                      sx={{ fontWeight: 700, color: amountColor(e.direction) }}
                    >
                      {amountText(e)}
                    </TableCell>
                    <TableCell data-label="Description">
                      <Typography variant="caption" color="text.secondary">
                        {e.description ?? "—"}
                      </Typography>
                    </TableCell>
                    <TableCell data-label="Actions">
                      <Box sx={{ display: "flex" }}>
                        {e.direction !== "TRANSFER" && (
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => openEdit(e)}>
                              <Pencil size={14} />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setPendingDelete(e.id)}
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

      {/* Add / edit entry */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        slotProps={{ paper: { sx: { width: { xs: "100%", sm: 420 } } } }}
      >
        <Box sx={{ width: "100%", p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            {editing ? "Edit Entry" : "Add Entry"}
          </Typography>
          <ToggleButtonGroup
            exclusive
            fullWidth
            size="small"
            value={form.direction}
            onChange={(_e, v) => v && setDirection(v as EntryDir)}
            sx={{ mb: 2 }}
          >
            <ToggleButton value="DEBIT" color="warning">
              Expense
            </ToggleButton>
            <ToggleButton value="CREDIT" color="success">
              Income
            </ToggleButton>
          </ToggleButtonGroup>
          <TextField
            label="Date"
            type="date"
            size="small"
            fullWidth
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            label={`Amount (${currencySymbol(
              accounts.find((a) => a.id === form.accountId)?.currency ?? "BDT"
            )})`}
            type="number"
            size="small"
            fullWidth
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <SearchableSelect
            label="Category"
            value={form.categoryId}
            options={formCategories.map((c) => ({ value: c.id, label: c.name }))}
            onChange={(v) => setForm((f) => ({ ...f, categoryId: v }))}
            sx={{ mb: 2 }}
          />
          <SearchableSelect
            label="Account"
            value={form.accountId}
            options={[
              { value: "", label: "— none —" },
              ...accounts.map((a) => ({ value: a.id, label: a.name })),
            ]}
            onChange={(v) => setForm((f) => ({ ...f, accountId: v }))}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Description"
            size="small"
            fullWidth
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            sx={{ mb: 2 }}
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

          {/* Optional link to a person / shop — settles one of their dues. */}
          <Typography
            variant="caption"
            sx={{ fontWeight: 700, color: "text.secondary", display: "block", mb: 1 }}
          >
            Link to a person / shop (optional)
          </Typography>
          <Box sx={{ mb: 2 }}>
            <SearchableSelect
              label="Person / shop"
              value={form.beneficiaryId}
              options={[
                { value: "", label: "— none —" },
                ...beneficiaries.map((b) => ({ value: b.id, label: b.name })),
              ]}
              onChange={(v) => setForm((f) => ({ ...f, beneficiaryId: v, obligationId: "" }))}
            />
          </Box>
          {form.beneficiaryId && (
            <Box sx={{ mb: 2 }}>
              <SearchableSelect
                label={form.direction === "DEBIT" ? "Against which due" : "Against which loan"}
                value={form.obligationId}
                options={[
                  { value: "", label: "— none (just tag the person) —" },
                  ...linkObligationOptions.map((o) => ({
                    value: o.id,
                    label: `${fmt(o.outstanding)} left of ${fmt(o.amount)}`,
                  })),
                ]}
                onChange={(v) => setForm((f) => ({ ...f, obligationId: v }))}
              />
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 0.5, display: "block" }}
              >
                {linkLoading
                  ? "Loading dues…"
                  : linkObligationOptions.length === 0
                    ? form.direction === "DEBIT"
                      ? "No open dues for this person — the entry will just be tagged to them."
                      : "Nothing owed to you by this person — the entry will just be tagged to them."
                    : selectedObligation
                      ? `Remaining after this entry: ${fmt(
                          Math.max(
                            0,
                            selectedObligation.outstanding - (parseFloat(form.amount) || 0)
                          )
                        )}`
                      : "Pick a due to reduce it, or leave as “none” to only tag the person."}
              </Typography>
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Button
            variant="contained"
            fullWidth
            onClick={save}
            disabled={saving || !form.amount || !form.categoryId}
          >
            {saving ? "Saving…" : editing ? "Save Changes" : "Add Entry"}
          </Button>
        </Box>
      </Drawer>

      {/* Transfer */}
      <Drawer
        anchor="right"
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        slotProps={{ paper: { sx: { width: { xs: "100%", sm: 420 } } } }}
      >
        <Box sx={{ width: "100%", p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
            Transfer between accounts
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: "block" }}>
            e.g. bank → cash withdrawal, or paying a credit-card bill. Not counted as income or
            expense.
          </Typography>
          <TextField
            label="Date"
            type="date"
            size="small"
            fullWidth
            value={transfer.date}
            onChange={(e) => setTransfer((t) => ({ ...t, date: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <SearchableSelect
            label="From"
            value={transfer.fromAccountId}
            options={accounts.map((a) => ({ value: a.id, label: a.name }))}
            onChange={(v) => setTransfer((t) => ({ ...t, fromAccountId: v }))}
            sx={{ mb: 2 }}
          />
          <SearchableSelect
            label="To"
            value={transfer.toAccountId}
            options={accounts
              .filter((a) => a.id !== transfer.fromAccountId)
              .map((a) => ({ value: a.id, label: a.name }))}
            onChange={(v) => setTransfer((t) => ({ ...t, toAccountId: v }))}
            sx={{ mb: 2 }}
          />
          {(() => {
            const fromCur =
              accounts.find((a) => a.id === transfer.fromAccountId)?.currency ?? "BDT";
            const toCur = accounts.find((a) => a.id === transfer.toAccountId)?.currency ?? "BDT";
            const crossCurrency =
              !!transfer.fromAccountId && !!transfer.toAccountId && fromCur !== toCur;
            return (
              <>
                <TextField
                  label={`Amount (${currencySymbol(fromCur)})`}
                  type="number"
                  size="small"
                  fullWidth
                  value={transfer.amount}
                  onChange={(e) => setTransfer((t) => ({ ...t, amount: e.target.value }))}
                  sx={{ mb: 2 }}
                />
                {crossCurrency && (
                  <TextField
                    label={`Amount received (${currencySymbol(toCur)})`}
                    type="number"
                    size="small"
                    fullWidth
                    value={transfer.toAmount}
                    onChange={(e) => setTransfer((t) => ({ ...t, toAmount: e.target.value }))}
                    helperText={`Cross-currency: enter how much ${toCur} arrives in the destination.`}
                    sx={{ mb: 2 }}
                  />
                )}
                <TextField
                  label="Description"
                  size="small"
                  fullWidth
                  value={transfer.description}
                  onChange={(e) => setTransfer((t) => ({ ...t, description: e.target.value }))}
                  sx={{ mb: 2 }}
                />
                {transferError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {transferError}
                  </Alert>
                )}
                <Button
                  variant="contained"
                  fullWidth
                  onClick={saveTransfer}
                  disabled={
                    transferSaving ||
                    !transfer.fromAccountId ||
                    !transfer.toAccountId ||
                    !transfer.amount ||
                    (crossCurrency && !transfer.toAmount)
                  }
                >
                  {transferSaving ? "Saving…" : "Record Transfer"}
                </Button>
              </>
            );
          })()}
        </Box>
      </Drawer>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete entry"
        message="This permanently removes this ledger entry. This cannot be undone."
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </Box>
  );
}
