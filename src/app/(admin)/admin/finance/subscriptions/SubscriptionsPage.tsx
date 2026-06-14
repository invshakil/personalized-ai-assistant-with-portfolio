"use client";

import { useState, useEffect, useCallback } from "react";
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
  Divider,
} from "@mui/material";
import { Plus, Pencil, Trash2, CircleStop, Play, History } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { financeApi } from "@/lib/api/finance";
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

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<SubscriptionRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [subsData, categoriesData] = await Promise.all([
        financeApi.listSubscriptions(),
        financeApi.listCategories(),
      ]);
      setSubs(subsData ?? []);
      setCategories(categoriesData ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

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
      startMonth: s.startDate ? s.startDate.slice(0, 7) : thisMonthInput(),
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
    } finally {
      setBusy(false);
    }
  };

  const resume = async (id: string) => {
    await financeApi.resumeSubscription(id);
    load();
  };

  const openHistory = async (id: string) => {
    try {
      setDetail(await financeApi.getSubscription(id));
    } catch {
      // ignore — detail drawer simply won't open
    }
  };

  const activeMonthly = subs.filter((s) => s.isActive).reduce((sum, s) => sum + s.monthlyAmount, 0);

  return (
    <Box>
      <PageHeader title="Subscriptions" subtitle="Recurring tools & services — auto-charged monthly" />

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
          <Table size="small">
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
                    <Typography color="text.secondary">No subscriptions yet</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                subs.map((s) => (
                  <TableRow key={s.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{s.name}</TableCell>
                    <TableCell>
                      <Chip size="small" label={s.categoryName} variant="outlined" />
                    </TableCell>
                    <TableCell align="right">{fmt(s.monthlyAmount)}</TableCell>
                    <TableCell>{fmtMonth(s.startDate)}</TableCell>
                    <TableCell>
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
                    <TableCell align="right" sx={{ fontWeight: 600, color: "error.main" }}>
                      {fmt(s.totalSpent)}
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                        {s.monthsCharged} mo
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex" }}>
                        <Tooltip title="Monthly history">
                          <IconButton size="small" onClick={() => openHistory(s.id)}>
                            <History size={14} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => openEdit(s)}>
                            <Pencil size={14} />
                          </IconButton>
                        </Tooltip>
                        {s.isActive ? (
                          <Tooltip title="Stop subscription">
                            <IconButton size="small" color="warning" onClick={() => setPendingStop(s)}>
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
                          <IconButton size="small" color="error" onClick={() => setPendingDelete(s.id)}>
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
            label="Monthly amount (৳)"
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
              Editing the amount applies to future months only; past charges keep their original value.
            </Typography>
          )}
        </Box>
      </Drawer>

      {/* History drawer */}
      <Drawer
        anchor="right"
        open={!!detail}
        onClose={() => setDetail(null)}
        slotProps={{ paper: { sx: { width: { xs: "100%", sm: 420 } } } }}
      >
        {detail && (
          <Box sx={{ width: "100%", p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {detail.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {detail.categoryName} · {fmt(detail.monthlyAmount)}/mo · started {fmtMonth(detail.startDate)}
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
            <Divider sx={{ mb: 1 }} />
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Month</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Fiscal Year</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    Amount
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {detail.charges.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{fmtMonth(c.date)}</TableCell>
                    <TableCell>{c.fiscalYear}</TableCell>
                    <TableCell align="right">{fmt(c.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Drawer>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete subscription"
        message="This removes the subscription and all of its generated monthly charges from your history and reports. This cannot be undone."
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
