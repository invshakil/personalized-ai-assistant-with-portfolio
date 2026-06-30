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
  Checkbox,
  Divider,
} from "@mui/material";
import { Plus, Pencil, Trash2, Download, Search, X, ArrowLeftRight, RotateCcw } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import SearchableSelect, { type SelectOption } from "@/components/admin/SearchableSelect";
import MultiSearchableSelect from "@/components/admin/MultiSearchableSelect";
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
  fmtCurrency,
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
  const fyFilter = searchParams.get("fy")?.split(",").filter(Boolean) ?? [];
  const sourceFilter = searchParams.get("source")?.split(",").filter(Boolean) ?? [];
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
  // All-time pending foreign earnings (for the convert flow + summary), independent of filters.
  const [pendingEarnings, setPendingEarnings] = useState<EarningRow[]>([]);

  // ── Convert / withdraw foreign earnings → BDT ──
  const [convertOpen, setConvertOpen] = useState(false);
  const [convCurrency, setConvCurrency] = useState("");
  const [convSelected, setConvSelected] = useState<Set<string>>(new Set());
  const [convFrom, setConvFrom] = useState("");
  const [convTo, setConvTo] = useState("");
  const [convDate, setConvDate] = useState(todayInput());
  const [convToAmount, setConvToAmount] = useState("");
  const [convSaving, setConvSaving] = useState(false);
  const [convError, setConvError] = useState<string | null>(null);
  const [convRateLoading, setConvRateLoading] = useState(false);
  const [reversingId, setReversingId] = useState<string | null>(null);

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
        fiscalYears: fyFilter,
        sourceIds: sourceFilter,
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
    setPendingEarnings((allEarnings ?? []).filter((e) => e.pendingConversion));
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

  // ── Dropdown option lists ──────────────────────────────────────────────────────
  const periodSelectOptions: SelectOption[] = [
    ...FILTER_RANGE_PRESETS.map((p) => ({ value: p, label: FILTER_RANGE_LABELS[p] })),
    ...(activePreset === "CUSTOM"
      ? [{ value: "CUSTOM", label: "Custom range", disabled: true }]
      : []),
  ];
  const fySelectOptions: SelectOption[] = allFiscalYears.map((fy) => ({ value: fy, label: fy }));
  const sourceSelectOptions: SelectOption[] = sources.map((s) => ({ value: s.id, label: s.name }));

  const hasActiveFilters =
    fyFilter.length > 0 ||
    sourceFilter.length > 0 ||
    hasCustomRange ||
    Boolean(period) ||
    Boolean(q);

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
  // Use the first selected FY if exactly one is chosen; otherwise no FY param.
  const downloadHref = `/api/admin/finance/earnings/pdf${
    fyFilter.length === 1 ? `?fiscalYear=${fyFilter[0]}` : ""
  }`;

  // ── Pending-conversion summary (all-time, original currency) ──
  const pendingByCurrency = (() => {
    const m = new Map<string, { original: number; count: number }>();
    for (const e of pendingEarnings) {
      const c = m.get(e.currency) ?? { original: 0, count: 0 };
      c.original += e.originalAmount;
      c.count += 1;
      m.set(e.currency, c);
    }
    return [...m.entries()].map(([currency, v]) => ({ currency, ...v }));
  })();
  const pendingCurrencies = pendingByCurrency.map((p) => p.currency);

  // Convert-drawer derived values
  const convList = pendingEarnings.filter((e) => e.currency === convCurrency);
  const convChosen = convList.filter((e) => convSelected.has(e.id));
  const convTotalOriginal = convChosen.reduce((s, e) => s + e.originalAmount, 0);
  const convIndicativeBdt = convChosen.reduce((s, e) => s + e.amount, 0); // earn-time estimate
  const convToAmountNum = parseFloat(convToAmount);
  const convRate =
    convTotalOriginal > 0 && convToAmountNum > 0 ? convToAmountNum / convTotalOriginal : 0;
  const convVariance = convToAmountNum > 0 ? convToAmountNum - convIndicativeBdt : 0;
  const fromAccountOptions = accounts.filter((a) => a.currency === convCurrency);
  const toAccountOptions = accounts.filter((a) => a.currency === "BDT");

  // Prefill the BDT-received field from the live rate × selected foreign total.
  const prefillConvAmount = useCallback(async (currency: string, totalOriginal: number) => {
    if (currency === "" || totalOriginal <= 0) return;
    setConvRateLoading(true);
    try {
      const res = await financeApi.getFxRate(currency);
      if (res && res.rate > 0) {
        setConvToAmount(String(Math.round(totalOriginal * res.rate * 100) / 100));
      }
    } catch {
      /* leave blank — user enters the actual amount */
    } finally {
      setConvRateLoading(false);
    }
  }, []);

  const openConvert = (currency?: string, preselectId?: string) => {
    const cur = currency ?? pendingCurrencies[0] ?? "";
    const list = pendingEarnings.filter((e) => e.currency === cur);
    const sel = new Set(preselectId ? [preselectId] : list.map((e) => e.id));
    setConvCurrency(cur);
    setConvSelected(sel);
    setConvFrom(accounts.find((a) => a.currency === cur)?.id ?? "");
    setConvTo(
      accounts.find((a) => a.currency === "BDT" && a.type === "BANK")?.id ??
        accounts.find((a) => a.currency === "BDT")?.id ??
        ""
    );
    setConvDate(todayInput());
    setConvToAmount("");
    setConvError(null);
    setConvertOpen(true);
    const total = list.filter((e) => sel.has(e.id)).reduce((s, e) => s + e.originalAmount, 0);
    prefillConvAmount(cur, total);
  };

  const onConvCurrencyChange = (cur: string) => {
    const list = pendingEarnings.filter((e) => e.currency === cur);
    const sel = new Set(list.map((e) => e.id));
    setConvCurrency(cur);
    setConvSelected(sel);
    setConvFrom(accounts.find((a) => a.currency === cur)?.id ?? "");
    setConvToAmount("");
    prefillConvAmount(
      cur,
      list.reduce((s, e) => s + e.originalAmount, 0)
    );
  };

  const toggleConvSelect = (id: string) => {
    setConvSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const doConvert = async () => {
    setConvSaving(true);
    setConvError(null);
    try {
      await financeApi.convertEarnings({
        earningIds: [...convSelected],
        fromAccountId: convFrom,
        toAccountId: convTo,
        date: convDate,
        toAmount: parseFloat(convToAmount),
      });
      setConvertOpen(false);
      load();
      loadRefData();
    } catch (e: unknown) {
      setConvError(e instanceof Error ? e.message : "Conversion failed");
    } finally {
      setConvSaving(false);
    }
  };

  const doReverse = async (id: string) => {
    setReversingId(id);
    try {
      await financeApi.reverseConversion(id);
      load();
      loadRefData();
    } catch {
      /* surfaced on reload */
    } finally {
      setReversingId(null);
    }
  };

  const convReady = convChosen.length > 0 && !!convFrom && !!convTo && parseFloat(convToAmount) > 0;

  return (
    <Box>
      <PageHeader title="Earnings" subtitle="Client income log" />

      <Box sx={{ display: "flex", gap: 2, mb: 2, alignItems: "center", flexWrap: "wrap" }}>
        <MultiSearchableSelect
          label="Fiscal Year"
          value={fyFilter}
          options={fySelectOptions}
          onChange={(ids) => setParams({ fy: ids.length ? ids.join(",") : undefined })}
          sx={{ minWidth: 160 }}
        />
        <MultiSearchableSelect
          label="Client"
          value={sourceFilter}
          options={sourceSelectOptions}
          onChange={(ids) => setParams({ source: ids.length ? ids.join(",") : undefined })}
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
                fy: undefined,
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
          <Button
            variant="outlined"
            color="warning"
            startIcon={<ArrowLeftRight size={16} />}
            disabled={pendingEarnings.length === 0}
            onClick={() => openConvert()}
          >
            Convert to BDT
          </Button>
          <Button variant="contained" startIcon={<Plus size={16} />} onClick={openAdd}>
            Add Earning
          </Button>
        </Box>
      </Box>

      {!loading && (earnings.length > 0 || pendingByCurrency.length > 0) && (
        <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
          {earnings.length > 0 && (
            <Card sx={{ bgcolor: "background.paper", display: "inline-flex", px: 3, py: 1.5 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Total Income
                  {fyFilter.length === 1
                    ? ` · ${fyFilter[0]}`
                    : fyFilter.length > 1
                      ? ` · ${fyFilter.join(", ")}`
                      : ""}{" "}
                  ({earnings.length})
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: "info.main" }}>
                  {fmt(total)}
                </Typography>
              </Box>
            </Card>
          )}
          {pendingByCurrency.length > 0 && (
            <Card sx={{ bgcolor: "background.paper", display: "inline-flex", px: 3, py: 1.5 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Pending conversion (not yet in BDT income)
                </Typography>
                <Box sx={{ display: "flex", gap: 2, alignItems: "baseline" }}>
                  {pendingByCurrency.map((p) => (
                    <Typography
                      key={p.currency}
                      variant="h6"
                      sx={{ fontWeight: 700, color: "warning.main" }}
                    >
                      {fmtCurrency(p.original, p.currency)}
                      <Typography
                        component="span"
                        variant="caption"
                        color="text.secondary"
                        sx={{ ml: 0.5 }}
                      >
                        ({p.count})
                      </Typography>
                    </Typography>
                  ))}
                </Box>
              </Box>
            </Card>
          )}
        </Box>
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
                    <TableCell align="right" data-label="Amount" sx={{ fontWeight: 600 }}>
                      {e.currency === "BDT" ? (
                        <Box sx={{ color: "info.main" }}>{fmt(e.amount)}</Box>
                      ) : e.pendingConversion ? (
                        <Box>
                          <Box sx={{ color: "warning.main" }}>
                            {fmtCurrency(e.originalAmount, e.currency)}
                          </Box>
                          <Chip
                            size="small"
                            label="Pending"
                            color="warning"
                            variant="outlined"
                            sx={{ height: 18, fontSize: "0.65rem", mt: 0.25 }}
                          />
                        </Box>
                      ) : (
                        <Box>
                          <Box sx={{ color: "success.main" }}>
                            {fmt(e.realizedAmount ?? e.amount)}
                          </Box>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: "block", fontWeight: 400 }}
                          >
                            {fmtForeign(e.currency, e.originalAmount, e.realizedRate ?? e.fxRate)}
                          </Typography>
                        </Box>
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
                        {e.pendingConversion && (
                          <Tooltip title="Convert to BDT">
                            <IconButton
                              size="small"
                              color="warning"
                              onClick={() => openConvert(e.currency, e.id)}
                            >
                              <ArrowLeftRight size={14} />
                            </IconButton>
                          </Tooltip>
                        )}
                        {e.currency !== "BDT" && e.realizedAt && (
                          <Tooltip title="Reverse conversion (back to pending)">
                            <IconButton
                              size="small"
                              disabled={reversingId === e.id}
                              onClick={() => doReverse(e.id)}
                            >
                              <RotateCcw size={14} />
                            </IconButton>
                          </Tooltip>
                        )}
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
          <SearchableSelect
            label="Currency"
            value={form.currency}
            options={CURRENCY_OPTIONS}
            onChange={onCurrencyChange}
            sx={{ mb: 2 }}
          />
          <TextField
            label={`Amount (${currencySymbol(form.currency)})`}
            type="number"
            size="small"
            fullWidth
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            sx={{ mb: 2 }}
          />
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

      <Drawer
        anchor="right"
        open={convertOpen}
        onClose={() => setConvertOpen(false)}
        slotProps={{ paper: { sx: { width: { xs: "100%", sm: 460 } } } }}
      >
        <Box sx={{ width: "100%", p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
            Convert to BDT
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: "block" }}>
            Realize foreign earnings at the actual rate. Posts one transfer (foreign account → BDT
            account); the received BDT is booked as income on the conversion date.
          </Typography>

          {pendingCurrencies.length === 0 ? (
            <Alert severity="info">No pending foreign earnings to convert.</Alert>
          ) : (
            <>
              <SearchableSelect
                label="Currency"
                value={convCurrency}
                options={pendingCurrencies.map((c) => ({ value: c, label: c }))}
                onChange={onConvCurrencyChange}
                sx={{ mb: 2 }}
              />

              <Typography variant="caption" color="text.secondary">
                Earnings to convert
              </Typography>
              <Box
                sx={{
                  maxHeight: 200,
                  overflowY: "auto",
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1,
                  mb: 2,
                  mt: 0.5,
                }}
              >
                {convList.map((e) => (
                  <Box
                    key={e.id}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      px: 1,
                      py: 0.25,
                      borderBottom: 1,
                      borderColor: "divider",
                      "&:last-of-type": { borderBottom: 0 },
                    }}
                  >
                    <Checkbox
                      size="small"
                      checked={convSelected.has(e.id)}
                      onChange={() => toggleConvSelect(e.id)}
                    />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" noWrap>
                        {e.sourceName} · {fmtCurrency(e.originalAmount, e.currency)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {fmtDate(e.date)}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>

              <SearchableSelect
                label={`From account (${convCurrency})`}
                value={convFrom}
                options={fromAccountOptions.map((a) => ({ value: a.id, label: a.name }))}
                onChange={setConvFrom}
                sx={{ mb: 2 }}
              />
              {fromAccountOptions.length === 0 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  No {convCurrency} account exists — create one in Money → Accounts and deposit the
                  foreign income there first.
                </Alert>
              )}
              <SearchableSelect
                label="To account (BDT)"
                value={convTo}
                options={toAccountOptions.map((a) => ({ value: a.id, label: a.name }))}
                onChange={setConvTo}
                sx={{ mb: 2 }}
              />
              <TextField
                label="Conversion date"
                type="date"
                size="small"
                fullWidth
                value={convDate}
                onChange={(e) => setConvDate(e.target.value)}
                sx={{ mb: 2 }}
              />
              <TextField
                label="BDT received (৳)"
                type="number"
                size="small"
                fullWidth
                value={convToAmount}
                onChange={(e) => setConvToAmount(e.target.value)}
                helperText={
                  convRateLoading
                    ? "Fetching live rate…"
                    : "Prefilled from the live rate — set the actual BDT your bank credited."
                }
                sx={{ mb: 1 }}
              />
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                <Typography variant="caption" color="text.secondary">
                  Converting {fmtCurrency(convTotalOriginal, convCurrency || "BDT")}
                  {convChosen.length > 1 ? ` (${convChosen.length} earnings)` : ""}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {convRate > 0
                    ? `@ ${convRate.toLocaleString("en-US", { maximumFractionDigits: 4 })} ৳/${convCurrency}`
                    : ""}
                </Typography>
              </Box>
              {convToAmountNum > 0 && (
                <Typography
                  variant="caption"
                  sx={{
                    display: "block",
                    mb: 2,
                    color: convVariance >= 0 ? "success.main" : "error.main",
                  }}
                >
                  FX variance vs entry estimate: {convVariance >= 0 ? "+" : "−"}
                  {fmt(Math.abs(convVariance))}
                </Typography>
              )}
              {convError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {convError}
                </Alert>
              )}
              <Button
                variant="contained"
                fullWidth
                onClick={doConvert}
                disabled={convSaving || !convReady}
              >
                {convSaving ? "Converting…" : "Convert to BDT"}
              </Button>
            </>
          )}
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
