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
  InputAdornment,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
} from "@mui/material";
import { Plus, Pencil, Trash2, Download, Search, X } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import SearchableSelect, { type SelectOption } from "@/components/admin/SearchableSelect";
import { fiscalYearOf } from "@/lib/fiscalYear";
import { financeApi, type EarningFilters } from "@/lib/api/finance";
import { moneyApi } from "@/lib/api/money";
import { mobileCardTableSx } from "@/lib/mobileTableSx";
import { SUPPORTED_CURRENCIES, type MoneyAccountRow } from "@/types";
import type { EarningRow, SourceRow, RemittanceType } from "../types";
import {
  fmt,
  fmtDate,
  fmtForeign,
  currencySymbol,
  todayInput,
  currentFiscalYear,
  FILTER_RANGE_PRESETS,
  FILTER_RANGE_LABELS,
  FILTER_RANGE_TOKEN,
  TOKEN_TO_FILTER_RANGE,
  type FilterRangePreset,
} from "../format";

const REMITTANCE_LABEL: Record<RemittanceType, string> = {
  REM: "Remittance",
  NON_REM: "Non-rem",
};

// Sentinel for "don't post a ledger entry" in the optional account dropdown.
const NO_ACCOUNT = "";

type EarningForm = {
  date: string;
  sourceId: string;
  remittance: RemittanceType;
  /** Amount in the chosen currency (= BDT amount when currency is BDT). */
  amount: string;
  currency: string;
  /** BDT per 1 unit of `currency`; "1" for BDT. */
  fxRate: string;
  fiscalYear: string;
  notes: string;
  /** Optional Money account to post a linked CREDIT to (opt-in; create only). */
  accountId: string;
};

const BLANK: EarningForm = {
  date: todayInput(),
  sourceId: "",
  remittance: "REM",
  amount: "",
  currency: "BDT",
  fxRate: "1",
  fiscalYear: fiscalYearOf(new Date()),
  notes: "",
  accountId: NO_ACCOUNT,
};

const CURRENCY_OPTIONS = SUPPORTED_CURRENCIES.map((c) => ({ value: c, label: c }));

export default function EarningsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // ── Filter state lives entirely in the URL (deep-linkable, restored on reload) ──
  const fyFilter = searchParams.get("fy") ?? currentFiscalYear();
  const sourceFilter = searchParams.get("source") ?? "ALL";
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

  const [earnings, setEarnings] = useState<EarningRow[]>([]);
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [accounts, setAccounts] = useState<MoneyAccountRow[]>([]);
  // Full fiscal-year set for the dropdown — derived from an unfiltered list so
  // the option set doesn't shrink as the user narrows the table.
  const [allFiscalYears, setAllFiscalYears] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<EarningForm>(BLANK);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [rateLoading, setRateLoading] = useState(false);
  const [rateNote, setRateNote] = useState<string | null>(null);

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
      const filters: EarningFilters = {
        ...(fyFilter !== "ALL" && { fiscalYear: fyFilter }),
        ...(sourceFilter !== "ALL" && { sourceId: sourceFilter }),
        ...(hasCustomRange ? { from, to } : { period: period ?? "this_month" }),
        ...(q && { q }),
      };
      setEarnings((await financeApi.listEarnings(filters)) ?? []);
    } finally {
      setLoading(false);
    }
  }, [fyFilter, sourceFilter, hasCustomRange, from, to, period, q]);

  const loadRefData = useCallback(async () => {
    const [clientsData, accountsData, allEarnings] = await Promise.all([
      financeApi.listClients(),
      moneyApi.listAccounts(),
      financeApi.listEarnings(),
    ]);
    setSources(clientsData ?? []);
    setAccounts(accountsData ?? []);
    setAllFiscalYears(
      Array.from(new Set([currentFiscalYear(), ...(allEarnings ?? []).map((e) => e.fiscalYear)]))
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

  const total = earnings.reduce((s, e) => s + e.amount, 0);

  // ── Dropdown option lists (all rendered via SearchableSelect) ──
  const periodSelectOptions: SelectOption[] = [
    ...FILTER_RANGE_PRESETS.map((p) => ({ value: p, label: FILTER_RANGE_LABELS[p] })),
    ...(activePreset === "CUSTOM"
      ? [{ value: "CUSTOM", label: "Custom range", disabled: true }]
      : []),
  ];
  const fySelectOptions: SelectOption[] = [
    { value: "ALL", label: "All fiscal years" },
    ...allFiscalYears.map((fy) => ({ value: fy, label: fy })),
  ];
  const sourceSelectOptions: SelectOption[] = [
    { value: "ALL", label: "All clients" },
    ...sources.map((s) => ({ value: s.id, label: s.name })),
  ];

  const hasActiveFilters =
    fyFilter !== "ALL" || sourceFilter !== "ALL" || hasCustomRange || Boolean(period) || Boolean(q);

  const onPresetChange = (preset: FilterRangePreset) =>
    setParams({
      period: FILTER_RANGE_TOKEN[preset],
      from: undefined,
      to: undefined,
    });

  // Optional account dropdown (post a linked CREDIT). "— none —" = no ledger entry.
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
      sourceId: sources[0]?.id ?? "",
      accountId: defaultAccountId(),
    });
    setError(null);
    setDrawerOpen(true);
  };

  const openEdit = (e: EarningRow) => {
    setEditing(e.id);
    setForm({
      date: e.date ? e.date.split("T")[0] : todayInput(),
      sourceId: e.sourceId,
      remittance: e.remittance,
      amount: String(e.originalAmount),
      currency: e.currency,
      fxRate: String(e.fxRate),
      fiscalYear: e.fiscalYear,
      notes: e.notes ?? "",
      accountId: NO_ACCOUNT,
    });
    setRateNote(null);
    setError(null);
    setDrawerOpen(true);
  };

  const onDateChange = (date: string) =>
    setForm((f) => ({
      ...f,
      date,
      fiscalYear: date ? fiscalYearOf(new Date(date)) : f.fiscalYear,
    }));

  // Fetch the live BDT rate for a currency and prefill the editable field.
  const fetchRate = useCallback(async (currency: string) => {
    setRateLoading(true);
    setRateNote(null);
    try {
      const res = await financeApi.getFxRate(currency);
      if (res && res.rate > 0) {
        setForm((f) => ({ ...f, fxRate: String(res.rate) }));
        setRateNote(
          res.source === "live" || res.source === "cache"
            ? `Live rate ৳${res.rate} / ${currency}${res.asOf ? ` (as of ${fmtDate(res.asOf)})` : ""}`
            : null
        );
      } else {
        setRateNote("Couldn't fetch a rate — enter it manually.");
      }
    } catch {
      setRateNote("Couldn't fetch a rate — enter it manually.");
    } finally {
      setRateLoading(false);
    }
  }, []);

  const onCurrencyChange = (currency: string) => {
    if (currency === "BDT") {
      setForm((f) => ({ ...f, currency, fxRate: "1" }));
      setRateNote(null);
      return;
    }
    setForm((f) => ({ ...f, currency }));
    fetchRate(currency);
  };

  // BDT-equivalent preview from the current form (originalAmount × rate).
  const previewBdt = (() => {
    const amt = parseFloat(form.amount);
    const rate = parseFloat(form.fxRate);
    if (!Number.isFinite(amt) || !Number.isFinite(rate)) return null;
    return amt * rate;
  })();
  const rateMissing = form.currency !== "BDT" && !(parseFloat(form.fxRate) > 0);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const isBdt = form.currency === "BDT";
      const body = {
        date: form.date,
        sourceId: form.sourceId,
        remittance: form.remittance,
        currency: form.currency,
        originalAmount: parseFloat(form.amount),
        fxRate: isBdt ? 1 : parseFloat(form.fxRate),
        fiscalYear: form.fiscalYear,
        notes: form.notes || null,
      };
      if (editing) await financeApi.updateEarning(editing, body);
      // accountId is create-only (opt-in link; no back-sync on edit).
      else await financeApi.createEarning({ ...body, accountId: form.accountId || undefined });
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
      await financeApi.deleteEarning(pendingDelete);
      setPendingDelete(null);
      load();
      loadRefData();
    } finally {
      setDeleting(false);
    }
  };

  // Download mirrors the active fiscal-year filter (the PDF route filters by FY).
  const downloadHref = `/api/admin/finance/earnings/pdf${
    fyFilter !== "ALL" ? `?fiscalYear=${fyFilter}` : ""
  }`;

  return (
    <Box>
      <PageHeader title="Earnings" subtitle="Client income log" />

      <Box sx={{ display: "flex", gap: 2, mb: 2, alignItems: "center", flexWrap: "wrap" }}>
        <SearchableSelect
          label="Fiscal Year"
          value={fyFilter}
          options={fySelectOptions}
          onChange={(v) => setParams({ fy: v })}
          sx={{ minWidth: 160 }}
        />
        <SearchableSelect
          label="Client"
          value={sourceFilter}
          options={sourceSelectOptions}
          onChange={(v) => setParams({ source: v === "ALL" ? undefined : v })}
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
          label="Search notes / type"
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
                fy: "ALL",
                source: undefined,
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
            disabled={earnings.length === 0}
            onClick={() => window.open(downloadHref, "_blank")}
          >
            Download all
          </Button>
          <Button variant="contained" startIcon={<Plus size={16} />} onClick={openAdd}>
            Add Earning
          </Button>
        </Box>
      </Box>

      {!loading && earnings.length > 0 && (
        <Card sx={{ bgcolor: "background.paper", mb: 2, display: "inline-flex", px: 3, py: 1.5 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Total Income{fyFilter !== "ALL" ? ` · ${fyFilter}` : ""} ({earnings.length})
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "info.main" }}>
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
                <TableCell sx={{ fontWeight: 700 }}>Client</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  Amount
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Fiscal Year</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Notes</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {earnings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ textAlign: "center", py: 4 }}>
                    <Typography color="text.secondary">
                      {hasActiveFilters ? "No earnings match these filters" : "No earnings yet"}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                earnings.map((e) => (
                  <TableRow key={e.id} hover>
                    <TableCell data-label="Date">{fmtDate(e.date)}</TableCell>
                    <TableCell data-label="Client">{e.sourceName}</TableCell>
                    <TableCell data-label="Type">
                      <Chip
                        size="small"
                        label={REMITTANCE_LABEL[e.remittance]}
                        color={e.remittance === "REM" ? "success" : "default"}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell
                      align="right"
                      data-label="Amount"
                      sx={{ fontWeight: 600, color: "info.main" }}
                    >
                      {fmt(e.amount)}
                      {e.currency !== "BDT" && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: "block", fontWeight: 400 }}
                        >
                          {fmtForeign(e.currency, e.originalAmount, e.fxRate)}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell data-label="Fiscal Year">{e.fiscalYear}</TableCell>
                    <TableCell data-label="Notes">
                      <Typography variant="caption" color="text.secondary">
                        {e.notes ?? "—"}
                      </Typography>
                    </TableCell>
                    <TableCell data-label="Actions">
                      <Box sx={{ display: "flex" }}>
                        <Tooltip title="Download receipt">
                          <IconButton
                            size="small"
                            onClick={() =>
                              window.open(`/api/admin/finance/earnings/${e.id}/receipt`, "_blank")
                            }
                          >
                            <Download size={14} />
                          </IconButton>
                        </Tooltip>
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
            {editing ? "Edit Earning" : "Add Earning"}
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
            label="Client"
            value={form.sourceId}
            options={sources.map((s) => ({ value: s.id, label: s.name }))}
            onChange={(v) => setForm((f) => ({ ...f, sourceId: v }))}
            sx={{ mb: 2 }}
          />
          <SearchableSelect
            label="Type"
            value={form.remittance}
            options={[
              { value: "REM", label: "Remittance" },
              { value: "NON_REM", label: "Non-remittance" },
            ]}
            onChange={(v) => setForm((f) => ({ ...f, remittance: v as RemittanceType }))}
            sx={{ mb: 2 }}
          />
          <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
            <SearchableSelect
              label="Currency"
              value={form.currency}
              options={CURRENCY_OPTIONS}
              onChange={onCurrencyChange}
              sx={{ width: 120 }}
            />
            <TextField
              label={`Amount (${currencySymbol(form.currency)})`}
              type="number"
              size="small"
              fullWidth
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            />
          </Box>
          {form.currency !== "BDT" && (
            <>
              <TextField
                label={`FX rate (৳ per 1 ${form.currency})`}
                type="number"
                size="small"
                fullWidth
                value={form.fxRate}
                onChange={(e) => setForm((f) => ({ ...f, fxRate: e.target.value }))}
                helperText={
                  rateLoading
                    ? "Fetching live rate…"
                    : (rateNote ?? "Editable — use your bank's actual rate.")
                }
                sx={{ mb: 1 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
                {previewBdt != null
                  ? `= ${fmt(previewBdt)} (stored as BDT)`
                  : "Enter amount and rate to see the BDT value."}
              </Typography>
            </>
          )}
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
              label="Deposit to account (optional)"
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
            disabled={saving || !form.sourceId || !form.amount || rateMissing}
          >
            {saving ? "Saving…" : editing ? "Save Changes" : "Add Earning"}
          </Button>
        </Box>
      </Drawer>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete earning"
        message="This permanently removes this earning entry. This cannot be undone."
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </Box>
  );
}
