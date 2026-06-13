"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
  FormControlLabel,
  Switch,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
} from "@mui/material";
import { Plus, Pencil, Trash2, Download } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { fiscalYearOf } from "@/lib/fiscalYear";
import type { BizExpenseRow, CategoryRow } from "../types";
import { fmt, fmtDate, todayInput, currentFiscalYear } from "../format";

type ExpenseForm = {
  date: string;
  name: string;
  categoryId: string;
  isRecurring: boolean;
  amount: string;
  fiscalYear: string;
  notes: string;
};

const BLANK: ExpenseForm = {
  date: todayInput(),
  name: "",
  categoryId: "",
  isRecurring: false,
  amount: "",
  fiscalYear: fiscalYearOf(new Date()),
  notes: "",
};

export default function BizExpensesPage() {
  const [expenses, setExpenses] = useState<BizExpenseRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [fyFilter, setFyFilter] = useState(currentFiscalYear());
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<ExpenseForm>(BLANK);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [eRes, cRes] = await Promise.all([
        fetch("/api/admin/finance/expenses"),
        fetch("/api/admin/finance/categories"),
      ]);
      const eJson = await eRes.json();
      const cJson = await cRes.json();
      setExpenses(eJson.data ?? []);
      setCategories(cJson.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const fiscalYears = useMemo(
    () =>
      Array.from(new Set([currentFiscalYear(), ...expenses.map((e) => e.fiscalYear)]))
        .sort()
        .reverse(),
    [expenses]
  );
  const filtered = useMemo(
    () => (fyFilter === "ALL" ? expenses : expenses.filter((e) => e.fiscalYear === fyFilter)),
    [expenses, fyFilter]
  );
  const total = filtered.reduce((s, e) => s + e.amount, 0);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...BLANK, date: todayInput(), fiscalYear: fiscalYearOf(new Date()), categoryId: categories[0]?.id ?? "" });
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
    });
    setError(null);
    setDrawerOpen(true);
  };

  const onDateChange = (date: string) =>
    setForm((f) => ({ ...f, date, fiscalYear: date ? fiscalYearOf(new Date(date)) : f.fiscalYear }));

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
      const url = editing ? `/api/admin/finance/expenses/${editing}` : "/api/admin/finance/expenses";
      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
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
    setDeleting(true);
    try {
      await fetch(`/api/admin/finance/expenses/${pendingDelete}`, { method: "DELETE" });
      setPendingDelete(null);
      load();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box>
      <PageHeader title="Business Expenses" subtitle="Tools, subscriptions & operating costs" />

      <Box sx={{ display: "flex", gap: 2, mb: 3, alignItems: "center", flexWrap: "wrap" }}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Fiscal Year</InputLabel>
          <Select label="Fiscal Year" value={fyFilter} onChange={(e) => setFyFilter(e.target.value)}>
            <MenuItem value="ALL">All fiscal years</MenuItem>
            {fiscalYears.map((fy) => (
              <MenuItem key={fy} value={fy}>
                {fy}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Box sx={{ ml: "auto" }}>
          <Button variant="contained" startIcon={<Plus size={16} />} onClick={openAdd}>
            Add Expense
          </Button>
        </Box>
      </Box>

      {filtered.length > 0 && (
        <Card sx={{ bgcolor: "background.paper", mb: 2, display: "inline-flex", px: 3, py: 1.5 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Total Expenses ({filtered.length})
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
          <Table size="small">
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
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ textAlign: "center", py: 4 }}>
                    <Typography color="text.secondary">No expenses yet</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((e) => (
                  <TableRow key={e.id} hover>
                    <TableCell>{fmtDate(e.date)}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{e.name}</TableCell>
                    <TableCell>
                      <Chip size="small" label={e.categoryName} variant="outlined" />
                    </TableCell>
                    <TableCell>
                      {e.subscriptionId ? (
                        <Chip size="small" label="Subscription" color="primary" variant="outlined" />
                      ) : e.isRecurring ? (
                        <Chip size="small" label="Recurring" color="info" variant="outlined" />
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          One-off
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: "error.main" }}>
                      {fmt(e.amount)}
                    </TableCell>
                    <TableCell>{e.fiscalYear}</TableCell>
                    <TableCell>
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
