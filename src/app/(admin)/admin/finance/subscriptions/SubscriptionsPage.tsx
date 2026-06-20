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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Divider,
} from "@mui/material";
import {
  Plus,
  Pencil,
  Trash2,
  CircleStop,
  Play,
  SlidersHorizontal,
  TrendingUp,
  Tag,
  Search,
  X,
} from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import SearchableSelect, { type SelectOption } from "@/components/admin/SearchableSelect";
import { financeApi, type SubscriptionFilters } from "@/lib/api/finance";
import { mobileCardTableSx } from "@/lib/mobileTableSx";
import type { SubscriptionRow, SubscriptionDetail, CategoryRow } from "../types";
import { fmt, fmtMonth, thisMonthInput } from "../format";

type SubForm = {
  name: string;
  categoryId: string;
  monthlyAmount: string;
  startMonth: string; // yyyy-mm
  notes: string;
};

const BLANK: SubForm = {
  name: "",
  categoryId: "",
  monthlyAmount: "",
  startMonth: thisMonthInput(),
  notes: "",
};

// Derive a "yyyy-mm" input value from a (UTC) ISO date using LOCAL components,
// so it matches how the month is displayed (fmtMonth) and round-trips back to
// the server correctly regardless of timezone. Slicing the raw ISO string is
// unsafe — it's UTC and shifts the month in non-UTC zones.
const monthInput = (iso: string | null): string => {
  if (!iso) return thisMonthInput();
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export default function SubscriptionsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // ── Filter state lives entirely in the URL (deep-linkable, restored on reload) ──
  const categoryFilter = searchParams.get("category") ?? "ALL";
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

  const [subs, setSubs] = useState<SubscriptionRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  // Active monthly run-rate is computed from ALL active subs (not the filtered
  // table), so the headline stat stays accurate while filters narrow the list.
  const [activeMonthly, setActiveMonthly] = useState(0);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<SubForm>(BLANK);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [detail, setDetail] = useState<SubscriptionDetail | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [pendingStop, setPendingStop] = useState<SubscriptionRow | null>(null);
  const [busy, setBusy] = useState(false);

  // Manage-drawer sub-forms
  const [rcForm, setRcForm] = useState<{
    effectiveMonth: string;
    monthlyAmount: string;
    note: string;
  }>({ effectiveMonth: thisMonthInput(), monthlyAmount: "", note: "" });
  const [showRcForm, setShowRcForm] = useState(false);
  const [adjusting, setAdjusting] = useState<{
    chargeId: string;
    amount: string;
    note: string;
  } | null>(null);
  const [manageError, setManageError] = useState<string | null>(null);

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
      const filters: SubscriptionFilters = {
        ...(categoryFilter !== "ALL" && { categoryId: categoryFilter }),
        ...(q && { q }),
      };
      setSubs((await financeApi.listSubscriptions(filters)) ?? []);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, q]);

  // Categories + the unfiltered run-rate — refreshed on mutations, not on filter changes.
  const loadRefData = useCallback(async () => {
    const [categoriesData, allSubs] = await Promise.all([
      financeApi.listCategories(),
      financeApi.listSubscriptions(),
    ]);
    setCategories(categoriesData ?? []);
    setActiveMonthly(
      (allSubs ?? []).filter((s) => s.isActive).reduce((sum, s) => sum + s.currentMonthlyAmount, 0)
    );
  }, []);

  useEffect(() => {
    loadRefData();
  }, [loadRefData]);
  useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...BLANK, startMonth: thisMonthInput(), categoryId: categories[0]?.id ?? "" });
    setError(null);
    setDrawerOpen(true);
  };

  const openEdit = (s: SubscriptionRow) => {
    setEditing(s.id);
    setForm({
      name: s.name,
      categoryId: s.categoryId,
      monthlyAmount: String(s.monthlyAmount),
      startMonth: monthInput(s.startDate),
      notes: s.notes ?? "",
    });
    setError(null);
    setDrawerOpen(true);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const body = {
        name: form.name,
        categoryId: form.categoryId,
        monthlyAmount: parseFloat(form.monthlyAmount),
        startDate: `${form.startMonth}-01`,
        notes: form.notes || null,
      };
      if (editing) await financeApi.updateSubscription(editing, body);
      else await financeApi.createSubscription(body);
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
    setBusy(true);
    try {
      await financeApi.deleteSubscription(pendingDelete);
      setPendingDelete(null);
      load();
      loadRefData();
    } finally {
      setBusy(false);
    }
  };

  const confirmStop = async () => {
    if (!pendingStop) return;
    setBusy(true);
    try {
      await financeApi.stopSubscription(pendingStop.id); // effective this month
      setPendingStop(null);
      load();
      loadRefData();
    } finally {
      setBusy(false);
    }
  };

  const resume = async (id: string) => {
    await financeApi.resumeSubscription(id);
    load();
    loadRefData();
  };

  // ── Manage drawer ──────────────────────────────────────────────────────────

  const openManage = async (id: string) => {
    setManageError(null);
    setShowRcForm(false);
    setAdjusting(null);
    setRcForm({ effectiveMonth: thisMonthInput(), monthlyAmount: "", note: "" });
    try {
      setDetail(await financeApi.getSubscription(id));
    } catch {
      // ignore — drawer simply won't open
    }
  };

  const refreshManage = async (id: string) => {
    const [d] = await Promise.all([financeApi.getSubscription(id), load(), loadRefData()]);
    setDetail(d);
  };

  const addRateChange = async () => {
    if (!detail) return;
    setBusy(true);
    setManageError(null);
    try {
      await financeApi.addRateChange(detail.id, {
        effectiveMonth: rcForm.effectiveMonth,
        monthlyAmount: parseFloat(rcForm.monthlyAmount),
        note: rcForm.note || null,
      });
      setRcForm({ effectiveMonth: thisMonthInput(), monthlyAmount: "", note: "" });
      setShowRcForm(false);
      await refreshManage(detail.id);
    } catch (e: unknown) {
      setManageError(e instanceof Error ? e.message : "Could not add price change");
    } finally {
      setBusy(false);
    }
  };

  const deleteRateChange = async (rcId: string) => {
    if (!detail) return;
    setBusy(true);
    try {
      await financeApi.deleteRateChange(detail.id, rcId);
      await refreshManage(detail.id);
    } finally {
      setBusy(false);
    }
  };

  const saveOverride = async () => {
    if (!detail || !adjusting) return;
    const charge = detail.charges.find((c) => c.id === adjusting.chargeId);
    if (!charge?.date) return;
    setBusy(true);
    setManageError(null);
    try {
      await financeApi.setOverride(detail.id, {
        month: monthInput(charge.date),
        amount: parseFloat(adjusting.amount),
        note: adjusting.note || null,
      });
      setAdjusting(null);
      await refreshManage(detail.id);
    } catch (e: unknown) {
      setManageError(e instanceof Error ? e.message : "Could not save adjustment");
    } finally {
      setBusy(false);
    }
  };

  const clearOverride = async (month: string | null) => {
    if (!detail || !month) return;
    setBusy(true);
    try {
      await financeApi.clearOverride(detail.id, monthInput(month));
      setAdjusting(null);
      await refreshManage(detail.id);
    } finally {
      setBusy(false);
    }
  };

  const categorySelectOptions: SelectOption[] = [
    { value: "ALL", label: "All categories" },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ];
  const hasActiveFilters = categoryFilter !== "ALL" || Boolean(q);

  return (
    <Box>
      <PageHeader
        title="Subscriptions"
        subtitle="Recurring tools & services — auto-charged monthly"
      />

      <Box sx={{ display: "flex", gap: 2, mb: 3, alignItems: "center", flexWrap: "wrap" }}>
        <Card sx={{ bgcolor: "background.paper", display: "inline-flex", px: 3, py: 1.5 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Active monthly run-rate
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "warning.main" }}>
              {fmt(activeMonthly)}/mo
            </Typography>
          </Box>
        </Card>
        <SearchableSelect
          label="Category"
          value={categoryFilter}
          options={categorySelectOptions}
          onChange={(v) => setParams({ category: v === "ALL" ? undefined : v })}
          sx={{ minWidth: 180 }}
        />
        <TextField
          label="Search service"
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
            onClick={() => setParams({ category: undefined, q: undefined })}
          >
            Clear
          </Button>
        )}
        <Box sx={{ ml: "auto" }}>
          <Button variant="contained" startIcon={<Plus size={16} />} onClick={openAdd}>
            Add Subscription
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Card} sx={{ bgcolor: "background.paper" }}>
          <Table size="small" sx={mobileCardTableSx}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Service</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  Monthly
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Started</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  Total Spent
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {subs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ textAlign: "center", py: 4 }}>
                    <Typography color="text.secondary">
                      {hasActiveFilters
                        ? "No subscriptions match these filters"
                        : "No subscriptions yet"}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                subs.map((s) => (
                  <TableRow key={s.id} hover>
                    <TableCell data-label="Service" sx={{ fontWeight: 600 }}>
                      {s.name}
                    </TableCell>
                    <TableCell data-label="Category">
                      <Chip size="small" label={s.categoryName} variant="outlined" />
                    </TableCell>
                    <TableCell align="right" data-label="Monthly">
                      {fmt(s.currentMonthlyAmount)}
                      {s.rateChangeCount > 0 && (
                        <Tooltip
                          title={`Started at ${fmt(s.monthlyAmount)} · ${s.rateChangeCount} price change${s.rateChangeCount > 1 ? "s" : ""}`}
                        >
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: "block" }}
                          >
                            was {fmt(s.monthlyAmount)}
                          </Typography>
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell data-label="Started">{fmtMonth(s.startDate)}</TableCell>
                    <TableCell data-label="Status">
                      {s.isActive ? (
                        <Chip size="small" label="Active" color="success" variant="outlined" />
                      ) : (
                        <Chip
                          size="small"
                          label={`Ended ${fmtMonth(s.endDate)}`}
                          color="default"
                          variant="outlined"
                        />
                      )}
                    </TableCell>
                    <TableCell
                      align="right"
                      data-label="Total Spent"
                      sx={{ fontWeight: 600, color: "error.main" }}
                    >
                      {fmt(s.totalSpent)}
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block" }}
                      >
                        {s.monthsCharged} mo
                      </Typography>
                    </TableCell>
                    <TableCell data-label="Actions">
                      <Box sx={{ display: "flex" }}>
                        <Tooltip title="Manage pricing & history">
                          <IconButton size="small" onClick={() => openManage(s.id)}>
                            <SlidersHorizontal size={14} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => openEdit(s)}>
                            <Pencil size={14} />
                          </IconButton>
                        </Tooltip>
                        {s.isActive ? (
                          <Tooltip title="Stop subscription">
                            <IconButton
                              size="small"
                              color="warning"
                              onClick={() => setPendingStop(s)}
                            >
                              <CircleStop size={14} />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Tooltip title="Resume subscription">
                            <IconButton size="small" color="success" onClick={() => resume(s.id)}>
                              <Play size={14} />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setPendingDelete(s.id)}
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

      {/* Add / edit drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        slotProps={{ paper: { sx: { width: { xs: "100%", sm: 420 } } } }}
      >
        <Box sx={{ width: "100%", p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            {editing ? "Edit Subscription" : "Add Subscription"}
          </Typography>
          <TextField
            label="Service name"
            size="small"
            fullWidth
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Category</InputLabel>
            <Select
              label="Category"
              value={form.categoryId}
              onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
            >
              {categories.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label={editing ? "Starting amount (৳)" : "Monthly amount (৳)"}
            type="number"
            size="small"
            fullWidth
            value={form.monthlyAmount}
            onChange={(e) => setForm((f) => ({ ...f, monthlyAmount: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Start month"
            type="month"
            size="small"
            fullWidth
            value={form.startMonth}
            onChange={(e) => setForm((f) => ({ ...f, startMonth: e.target.value }))}
            helperText="Charges are generated monthly from this month onward."
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
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Button
            variant="contained"
            fullWidth
            onClick={save}
            disabled={saving || !form.name || !form.categoryId || !form.monthlyAmount}
          >
            {saving ? "Saving…" : editing ? "Save Changes" : "Add Subscription"}
          </Button>
          {editing && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
              This is the starting rate. For a price hike from a later month, use “Manage pricing &
              history” → Add price change.
            </Typography>
          )}
        </Box>
      </Drawer>

      {/* Manage drawer — pricing + monthly history */}
      <Drawer
        anchor="right"
        open={!!detail}
        onClose={() => setDetail(null)}
        slotProps={{ paper: { sx: { width: { xs: "100%", sm: 480 } } } }}
      >
        {detail && (
          <Box sx={{ width: "100%", p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {detail.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {detail.categoryName} · {fmt(detail.currentMonthlyAmount)}/mo · started{" "}
              {fmtMonth(detail.startDate)}
              {detail.isActive ? " · active" : ` · ended ${fmtMonth(detail.endDate)}`}
            </Typography>
            <Box sx={{ display: "flex", justifyContent: "space-between", my: 1.5 }}>
              <Typography variant="body2" color="text.secondary">
                Total spent ({detail.charges.length} months)
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: "error.main" }}>
                {fmt(detail.totalSpent)}
              </Typography>
            </Box>

            {manageError && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setManageError(null)}>
                {manageError}
              </Alert>
            )}

            {/* Price changes */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mt: 1,
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700, display: "flex", gap: 0.75 }}>
                <TrendingUp size={16} /> Price changes
              </Typography>
              <Button
                size="small"
                startIcon={<Plus size={14} />}
                onClick={() => setShowRcForm((v) => !v)}
              >
                Add
              </Button>
            </Box>
            <Typography variant="caption" color="text.secondary">
              Base rate {fmt(detail.monthlyAmount)} from {fmtMonth(detail.startDate)}.
            </Typography>

            {showRcForm && (
              <Box
                sx={{
                  mt: 1.5,
                  p: 1.5,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 1.5,
                }}
              >
                <TextField
                  label="Effective from"
                  type="month"
                  size="small"
                  value={rcForm.effectiveMonth}
                  onChange={(e) => setRcForm((f) => ({ ...f, effectiveMonth: e.target.value }))}
                />
                <TextField
                  label="New monthly amount (৳)"
                  type="number"
                  size="small"
                  value={rcForm.monthlyAmount}
                  onChange={(e) => setRcForm((f) => ({ ...f, monthlyAmount: e.target.value }))}
                />
                <TextField
                  label="Note (optional)"
                  size="small"
                  placeholder="e.g. annual price increase"
                  value={rcForm.note}
                  onChange={(e) => setRcForm((f) => ({ ...f, note: e.target.value }))}
                />
                <Button
                  variant="contained"
                  size="small"
                  onClick={addRateChange}
                  disabled={busy || !rcForm.monthlyAmount}
                >
                  Apply price change
                </Button>
              </Box>
            )}

            {detail.rateChanges.length > 0 && (
              <Box sx={{ mt: 1.5, display: "flex", flexDirection: "column", gap: 0.75 }}>
                {detail.rateChanges.map((rc) => (
                  <Box
                    key={rc.id}
                    sx={{ display: "flex", alignItems: "center", gap: 1, fontSize: "0.85rem" }}
                  >
                    <Chip
                      size="small"
                      label={`from ${fmtMonth(rc.effectiveMonth)}`}
                      variant="outlined"
                    />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {fmt(rc.monthlyAmount)}
                    </Typography>
                    {rc.note && (
                      <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                        {rc.note}
                      </Typography>
                    )}
                    <Tooltip title="Remove price change">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => deleteRateChange(rc.id)}
                        disabled={busy}
                        sx={{ ml: "auto" }}
                      >
                        <Trash2 size={13} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                ))}
              </Box>
            )}

            <Divider sx={{ my: 2 }} />

            {/* Monthly charges */}
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 700, mb: 0.5, display: "flex", gap: 0.75 }}
            >
              <Tag size={16} /> Monthly charges
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Use “Adjust” for a discount or coupon on a single month.
            </Typography>
            <Table size="small" sx={{ ...mobileCardTableSx, mt: 1 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Month</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    Amount
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    Adjust
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {detail.charges.map((c) => {
                  const isEditing = adjusting?.chargeId === c.id;
                  return (
                    <TableRow key={c.id}>
                      <TableCell data-label="Month">
                        {fmtMonth(c.date)}
                        {c.isOverride && (
                          <Chip
                            size="small"
                            label="Adjusted"
                            color="info"
                            variant="outlined"
                            sx={{ ml: 0.75, height: 18, fontSize: "0.62rem" }}
                          />
                        )}
                        {c.note && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: "block" }}
                          >
                            {c.note}
                          </Typography>
                        )}
                      </TableCell>
                      {isEditing ? (
                        <TableCell colSpan={2}>
                          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                            <TextField
                              label="Amount (৳)"
                              type="number"
                              size="small"
                              value={adjusting!.amount}
                              onChange={(e) =>
                                setAdjusting((a) => (a ? { ...a, amount: e.target.value } : a))
                              }
                            />
                            <TextField
                              label="Note (optional)"
                              size="small"
                              placeholder="e.g. Coupon WELCOME50"
                              value={adjusting!.note}
                              onChange={(e) =>
                                setAdjusting((a) => (a ? { ...a, note: e.target.value } : a))
                              }
                            />
                            <Box sx={{ display: "flex", gap: 1 }}>
                              <Button
                                variant="contained"
                                size="small"
                                onClick={saveOverride}
                                disabled={busy || adjusting!.amount === ""}
                              >
                                Save
                              </Button>
                              {c.isOverride && (
                                <Button
                                  size="small"
                                  color="warning"
                                  onClick={() => clearOverride(c.date)}
                                  disabled={busy}
                                >
                                  Clear
                                </Button>
                              )}
                              <Button
                                size="small"
                                color="inherit"
                                onClick={() => setAdjusting(null)}
                                disabled={busy}
                              >
                                Cancel
                              </Button>
                            </Box>
                          </Box>
                        </TableCell>
                      ) : (
                        <>
                          <TableCell
                            align="right"
                            data-label="Amount"
                            sx={{ fontWeight: c.isOverride ? 700 : 400 }}
                          >
                            {fmt(c.amount)}
                          </TableCell>
                          <TableCell align="right" data-label="Adjust">
                            <Tooltip title={c.isOverride ? "Edit adjustment" : "Adjust this month"}>
                              <IconButton
                                size="small"
                                onClick={() =>
                                  setAdjusting({
                                    chargeId: c.id,
                                    amount: String(c.amount),
                                    note: c.note ?? "",
                                  })
                                }
                              >
                                {c.isOverride ? <X size={14} /> : <SlidersHorizontal size={14} />}
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        )}
      </Drawer>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete subscription"
        message="This removes the subscription and all of its generated monthly charges, price changes and adjustments from your history and reports. This cannot be undone."
        confirmLabel="Delete"
        loading={busy}
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />

      <ConfirmDialog
        open={!!pendingStop}
        title="Stop subscription"
        message={`Stop "${pendingStop?.name ?? ""}" effective this month? This month stays charged; no charges will be generated after it. You can resume later.`}
        confirmLabel="Stop"
        confirmColor="warning"
        loading={busy}
        onConfirm={confirmStop}
        onClose={() => setPendingStop(null)}
      />
    </Box>
  );
}
