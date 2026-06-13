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
import { fiscalYearOf } from "@/lib/fiscalYear";
import type { PaymentRow, EmployeeRow, SourceRow, PaymentKind } from "../types";
import { fmt, fmtDate, todayInput, currentFiscalYear } from "../format";

const KINDS: PaymentKind[] = ["SALARY", "BONUS", "ADVANCE", "OTHER"];
const KIND_LABEL: Record<PaymentKind, string> = {
  SALARY: "Salary",
  BONUS: "Bonus",
  ADVANCE: "Advance",
  OTHER: "Other",
};

type PaymentForm = {
  date: string;
  employeeId: string;
  type: PaymentKind;
  reference: string;
  clientIds: string[];
  amount: string;
  fiscalYear: string;
  notes: string;
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
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [clients, setClients] = useState<SourceRow[]>([]);
  const [fyFilter, setFyFilter] = useState(currentFiscalYear());
  const [empFilter, setEmpFilter] = useState("ALL");
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
      const [pRes, eRes] = await Promise.all([
        fetch("/api/admin/finance/payments"),
        fetch("/api/admin/finance/employees"),
      ]);
      const pJson = await pRes.json();
      const eJson = await eRes.json();
      setPayments(pJson.data ?? []);
      setEmployees(eJson.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const fiscalYears = useMemo(
    () =>
      Array.from(new Set([currentFiscalYear(), ...payments.map((p) => p.fiscalYear)]))
        .sort()
        .reverse(),
    [payments]
  );
  const filtered = useMemo(
    () =>
      payments.filter(
        (p) =>
          (fyFilter === "ALL" || p.fiscalYear === fyFilter) &&
          (empFilter === "ALL" || p.employeeId === empFilter)
      ),
    [payments, fyFilter, empFilter]
  );
  const total = filtered.reduce((s, p) => s + p.amount, 0);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...BLANK, date: todayInput(), fiscalYear: fiscalYearOf(new Date()), employeeId: employees[0]?.id ?? "" });
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
      amount: String(p.amount),
      fiscalYear: p.fiscalYear,
      notes: p.notes ?? "",
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
        employeeId: form.employeeId,
        type: form.type,
        reference: form.reference || null,
        amount: parseFloat(form.amount),
        fiscalYear: form.fiscalYear,
        notes: form.notes || null,
      };
      const url = editing ? `/api/admin/finance/payments/${editing}` : "/api/admin/finance/payments";
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
      await fetch(`/api/admin/finance/payments/${pendingDelete}`, { method: "DELETE" });
      setPendingDelete(null);
      load();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box>
      <PageHeader title="Employee Salaries" subtitle="Salary & bonus payments to employees" />

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
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Employee</InputLabel>
          <Select label="Employee" value={empFilter} onChange={(e) => setEmpFilter(e.target.value)}>
            <MenuItem value="ALL">All employees</MenuItem>
            {employees.map((emp) => (
              <MenuItem key={emp.id} value={emp.id}>
                {emp.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Box sx={{ ml: "auto" }}>
          <Button variant="contained" startIcon={<Plus size={16} />} onClick={openAdd}>
            Add Payment
          </Button>
        </Box>
      </Box>

      {filtered.length > 0 && (
        <Card sx={{ bgcolor: "background.paper", mb: 2, display: "inline-flex", px: 3, py: 1.5 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Total Paid ({filtered.length})
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
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Employee</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Reference</TableCell>
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
                    <Typography color="text.secondary">No payments yet</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => (
                  <TableRow key={p.id} hover>
                    <TableCell>{fmtDate(p.date)}</TableCell>
                    <TableCell>{p.employeeName}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={KIND_LABEL[p.type]}
                        color={p.type === "SALARY" ? "primary" : p.type === "BONUS" ? "success" : "default"}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {p.reference ?? "—"}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: "warning.main" }}>
                      {fmt(p.amount)}
                    </TableCell>
                    <TableCell>{p.fiscalYear}</TableCell>
                    <TableCell>
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
                          <IconButton size="small" color="error" onClick={() => setPendingDelete(p.id)}>
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
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Employee</InputLabel>
            <Select
              label="Employee"
              value={form.employeeId}
              onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))}
            >
              {employees.map((emp) => (
                <MenuItem key={emp.id} value={emp.id}>
                  {emp.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Type</InputLabel>
            <Select
              label="Type"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as PaymentKind }))}
            >
              {KINDS.map((k) => (
                <MenuItem key={k} value={k}>
                  {KIND_LABEL[k]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Reference (funding client)"
            size="small"
            fullWidth
            value={form.reference}
            onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
            placeholder="e.g. savannah, Christopher"
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
