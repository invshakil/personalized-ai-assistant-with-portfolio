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
} from "@mui/material";
import { Plus, Pencil, Trash2 } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import type { PropertyExpense, ExpenseCategory } from "@/types";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const CATEGORIES: ExpenseCategory[] = [
  "MAINTENANCE", "UTILITY", "SALARY", "SUBSCRIPTION", "CONSTRUCTION", "OTHER",
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

function fmt(n: number) { return `৳${n.toLocaleString()}`; }

type ExpenseForm = {
  description: string;
  amount: string;
  category: ExpenseCategory;
  expenseDate: string;
  paidTo: string;
  paymentMode: string;
  notes: string;
};

const BLANK: ExpenseForm = {
  description: "",
  amount: "",
  category: "OTHER",
  expenseDate: new Date().toISOString().split("T")[0],
  paidTo: "",
  paymentMode: "Cash",
  notes: "",
};

export default function ExpensesPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [expenses, setExpenses] = useState<PropertyExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<ExpenseForm>(BLANK);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/property/expenses?month=${month}&year=${year}`);
      const json = await res.json();
      setExpenses(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...BLANK, expenseDate: new Date().toISOString().split("T")[0] });
    setError(null);
    setDrawerOpen(true);
  };

  const openEdit = (e: PropertyExpense) => {
    setEditing(e.id);
    setForm({
      description: e.description,
      amount: String(e.amount),
      category: e.category,
      expenseDate: e.expenseDate ? e.expenseDate.split("T")[0] : "",
      paidTo: e.paidTo ?? "",
      paymentMode: e.paymentMode ?? "Cash",
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
        notes: form.notes || null,
      };
      const url = editing ? `/api/admin/property/expenses/${editing}` : "/api/admin/property/expenses";
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

  const del = async (id: string) => {
    if (!confirm("Delete this expense?")) return;
    await fetch(`/api/admin/property/expenses/${id}`, { method: "DELETE" });
    load();
  };

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <Box>
      <PageHeader title="Property Expenses" subtitle="Track monthly property costs" />

      <Box sx={{ display: "flex", gap: 2, mb: 3, alignItems: "center", flexWrap: "wrap" }}>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Month</InputLabel>
          <Select label="Month" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => <MenuItem key={i + 1} value={i + 1}>{m}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 100 }}>
          <InputLabel>Year</InputLabel>
          <Select label="Year" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {[2025, 2026, 2027, 2028].map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
          </Select>
        </FormControl>
        <Box sx={{ ml: "auto" }}>
          <Button variant="contained" startIcon={<Plus size={16} />} onClick={openAdd}>
            Add Expense
          </Button>
        </Box>
      </Box>

      {/* Total */}
      {expenses.length > 0 && (
        <Card sx={{ bgcolor: "background.paper", mb: 2, display: "inline-flex", px: 3, py: 1.5, mr: 2 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">Total Expenses</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "error.main" }}>{fmt(total)}</Typography>
          </Box>
        </Card>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Card} sx={{ bgcolor: "background.paper" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Amount</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Paid To</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Mode</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Notes</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} sx={{ textAlign: "center", py: 4 }}>
                    <Typography color="text.secondary">No expenses for this period</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                expenses.map((e) => (
                  <TableRow key={e.id} hover>
                    <TableCell>
                      <Typography variant="body2">
                        {e.expenseDate ? new Date(e.expenseDate).toLocaleDateString() : `${MONTHS[e.month - 1]} ${e.year}`}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={CAT_LABELS[e.category]}
                        size="small"
                        sx={{ bgcolor: CAT_COLORS[e.category], color: "#fff", fontSize: "0.6875rem" }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{e.description}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: "error.main" }}>
                        {fmt(e.amount)}
                      </Typography>
                    </TableCell>
                    <TableCell>{e.paidTo ?? "—"}</TableCell>
                    <TableCell>{e.paymentMode ?? "—"}</TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">{e.notes ?? "—"}</Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex" }}>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => openEdit(e)}><Pencil size={14} /></IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" color="error" onClick={() => del(e.id)}><Trash2 size={14} /></IconButton>
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
      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 360, p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            {editing ? "Edit Expense" : "Add Expense"}
          </Typography>
          <TextField
            label="Description" size="small" fullWidth
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Amount (৳)" type="number" size="small" fullWidth
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Category</InputLabel>
            <Select label="Category" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as ExpenseCategory }))}>
              {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{CAT_LABELS[c]}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField
            label="Date" type="date" size="small" fullWidth
            value={form.expenseDate}
            onChange={(e) => setForm((f) => ({ ...f, expenseDate: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Paid To" size="small" fullWidth
            value={form.paidTo}
            onChange={(e) => setForm((f) => ({ ...f, paidTo: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Payment Mode</InputLabel>
            <Select label="Payment Mode" value={form.paymentMode} onChange={(e) => setForm((f) => ({ ...f, paymentMode: e.target.value }))}>
              {["Cash", "Bank Transfer", "Mobile Banking", "Other"].map((m) => (
                <MenuItem key={m} value={m}>{m}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Notes" size="small" fullWidth multiline rows={2}
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            sx={{ mb: 2 }}
          />
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Button
            variant="contained" fullWidth
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
