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
} from "@mui/material";
import { Plus, Pencil, Trash2, Download } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { fiscalYearOf } from "@/lib/fiscalYear";
import { financeApi } from "@/lib/api/finance";
import type { EarningRow, SourceRow, RemittanceType } from "../types";
import { fmt, fmtDate, todayInput, currentFiscalYear } from "../format";

const REMITTANCE_LABEL: Record<RemittanceType, string> = {
  REM: "Remittance",
  NON_REM: "Non-rem",
};

type EarningForm = {
  date: string;
  sourceId: string;
  remittance: RemittanceType;
  amount: string;
  fiscalYear: string;
  notes: string;
};

const BLANK: EarningForm = {
  date: todayInput(),
  sourceId: "",
  remittance: "REM",
  amount: "",
  fiscalYear: fiscalYearOf(new Date()),
  notes: "",
};

export default function EarningsPage() {
  const [earnings, setEarnings] = useState<EarningRow[]>([]);
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [fyFilter, setFyFilter] = useState(currentFiscalYear());
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<EarningForm>(BLANK);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [earningsData, clientsData] = await Promise.all([
        financeApi.listEarnings(),
        financeApi.listClients(),
      ]);
      setEarnings(earningsData ?? []);
      setSources(clientsData ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const fiscalYears = useMemo(
    () =>
      Array.from(new Set([currentFiscalYear(), ...earnings.map((e) => e.fiscalYear)]))
        .sort()
        .reverse(),
    [earnings]
  );
  const filtered = useMemo(
    () => (fyFilter === "ALL" ? earnings : earnings.filter((e) => e.fiscalYear === fyFilter)),
    [earnings, fyFilter]
  );
  const total = filtered.reduce((s, e) => s + e.amount, 0);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...BLANK, date: todayInput(), fiscalYear: fiscalYearOf(new Date()), sourceId: sources[0]?.id ?? "" });
    setError(null);
    setDrawerOpen(true);
  };

  const openEdit = (e: EarningRow) => {
    setEditing(e.id);
    setForm({
      date: e.date ? e.date.split("T")[0] : todayInput(),
      sourceId: e.sourceId,
      remittance: e.remittance,
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
        sourceId: form.sourceId,
        remittance: form.remittance,
        amount: parseFloat(form.amount),
        fiscalYear: form.fiscalYear,
        notes: form.notes || null,
      };
      if (editing) await financeApi.updateEarning(editing, body);
      else await financeApi.createEarning(body);
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
      await financeApi.deleteEarning(pendingDelete);
      setPendingDelete(null);
      load();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box>
      <PageHeader title="Earnings" subtitle="Client income log" />

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
            Add Earning
          </Button>
        </Box>
      </Box>

      {filtered.length > 0 && (
        <Card sx={{ bgcolor: "background.paper", mb: 2, display: "inline-flex", px: 3, py: 1.5 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Total Income{fyFilter !== "ALL" ? ` · ${fyFilter}` : ""} ({filtered.length})
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
          <Table size="small">
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
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ textAlign: "center", py: 4 }}>
                    <Typography color="text.secondary">No earnings yet</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((e) => (
                  <TableRow key={e.id} hover>
                    <TableCell>{fmtDate(e.date)}</TableCell>
                    <TableCell>{e.sourceName}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={REMITTANCE_LABEL[e.remittance]}
                        color={e.remittance === "REM" ? "success" : "default"}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: "info.main" }}>
                      {fmt(e.amount)}
                    </TableCell>
                    <TableCell>{e.fiscalYear}</TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {e.notes ?? "—"}
                      </Typography>
                    </TableCell>
                    <TableCell>
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
                          <IconButton size="small" color="error" onClick={() => setPendingDelete(e.id)}>
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
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Client</InputLabel>
            <Select
              label="Client"
              value={form.sourceId}
              onChange={(e) => setForm((f) => ({ ...f, sourceId: e.target.value }))}
            >
              {sources.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Type</InputLabel>
            <Select
              label="Type"
              value={form.remittance}
              onChange={(e) => setForm((f) => ({ ...f, remittance: e.target.value as RemittanceType }))}
            >
              <MenuItem value="REM">Remittance</MenuItem>
              <MenuItem value="NON_REM">Non-remittance</MenuItem>
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
            disabled={saving || !form.sourceId || !form.amount}
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
