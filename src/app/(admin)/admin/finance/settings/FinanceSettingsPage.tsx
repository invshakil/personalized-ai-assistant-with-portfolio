"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Drawer,
  TextField,
  FormControlLabel,
  Switch,
  Chip,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Snackbar,
} from "@mui/material";
import { Plus, Pencil, Trash2 } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import type { EmployeeRow, SourceRow, CategoryRow } from "../types";
import { fmt } from "../format";

type Kind = "employee" | "source" | "category";

const ENDPOINT: Record<Kind, string> = {
  employee: "/api/admin/finance/employees",
  source: "/api/admin/finance/sources",
  category: "/api/admin/finance/categories",
};
const TITLE: Record<Kind, string> = {
  employee: "Employees",
  source: "Income Sources",
  category: "Expense Categories",
};

type DrawerState = {
  kind: Kind;
  editingId: string | null;
  name: string;
  notes: string;
  isActive: boolean;
};

export default function FinanceSettingsPage() {
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawer, setDrawer] = useState<DrawerState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ kind: Kind; id: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [e, s, c] = await Promise.all([
        fetch(ENDPOINT.employee).then((r) => r.json()),
        fetch(ENDPOINT.source).then((r) => r.json()),
        fetch(ENDPOINT.category).then((r) => r.json()),
      ]);
      setEmployees(e.data ?? []);
      setSources(s.data ?? []);
      setCategories(c.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = (kind: Kind) => {
    setError(null);
    setDrawer({ kind, editingId: null, name: "", notes: "", isActive: true });
  };
  const openEdit = (kind: Kind, item: EmployeeRow | SourceRow | CategoryRow) => {
    setError(null);
    setDrawer({
      kind,
      editingId: item.id,
      name: item.name,
      notes: "notes" in item ? (item.notes ?? "") : "",
      isActive: "isActive" in item ? item.isActive : true,
    });
  };

  const save = async () => {
    if (!drawer) return;
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { name: drawer.name };
      if (drawer.kind === "employee") {
        body.notes = drawer.notes || null;
        body.isActive = drawer.isActive;
      } else if (drawer.kind === "source") {
        body.notes = drawer.notes || null;
      }
      const base = ENDPOINT[drawer.kind];
      const url = drawer.editingId ? `${base}/${drawer.editingId}` : base;
      const res = await fetch(url, {
        method: drawer.editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setDrawer(null);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const { kind, id } = pendingDelete;
    setDeleting(true);
    try {
      const res = await fetch(`${ENDPOINT[kind]}/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setToast(json.error ?? "Cannot delete — it is still referenced.");
        return;
      }
      load();
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  };

  if (loading) {
    return (
      <Box>
        <PageHeader title="Financial Tracker Settings" subtitle="Manage employees, clients & categories" />
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader title="Financial Tracker Settings" subtitle="Manage employees, clients & categories" />

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" }, gap: 3 }}>
        {/* Employees */}
        <Card sx={{ bgcolor: "background.paper" }}>
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", mb: 1.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, flex: 1 }}>
                {TITLE.employee}
              </Typography>
              <Button size="small" startIcon={<Plus size={14} />} onClick={() => openAdd("employee")}>
                Add
              </Button>
            </Box>
            <List dense disablePadding>
              {employees.map((emp) => (
                <ListItem
                  key={emp.id}
                  disableGutters
                  secondaryAction={
                    <Box>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => openEdit("employee", emp)}>
                          <Pencil size={13} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                        size="small"
                        color="error"
                        onClick={() => setPendingDelete({ kind: "employee", id: emp.id })}
                      >
                          <Trash2 size={13} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  }
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        {emp.name}
                        {!emp.isActive && (
                          <Chip size="small" label="Inactive" variant="outlined" color="default" />
                        )}
                      </Box>
                    }
                    secondary={`${emp.paymentCount} payments · ${fmt(emp.totalPaid)}`}
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>

        {/* Income sources */}
        <Card sx={{ bgcolor: "background.paper" }}>
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", mb: 1.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, flex: 1 }}>
                {TITLE.source}
              </Typography>
              <Button size="small" startIcon={<Plus size={14} />} onClick={() => openAdd("source")}>
                Add
              </Button>
            </Box>
            <List dense disablePadding>
              {sources.map((s) => (
                <ListItem
                  key={s.id}
                  disableGutters
                  secondaryAction={
                    <Box>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => openEdit("source", s)}>
                          <Pencil size={13} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                        size="small"
                        color="error"
                        onClick={() => setPendingDelete({ kind: "source", id: s.id })}
                      >
                          <Trash2 size={13} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  }
                >
                  <ListItemText primary={s.name} secondary={`${s.earningCount} earnings`} />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>

        {/* Expense categories */}
        <Card sx={{ bgcolor: "background.paper" }}>
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", mb: 1.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, flex: 1 }}>
                {TITLE.category}
              </Typography>
              <Button size="small" startIcon={<Plus size={14} />} onClick={() => openAdd("category")}>
                Add
              </Button>
            </Box>
            <List dense disablePadding>
              {categories.map((c) => (
                <ListItem
                  key={c.id}
                  disableGutters
                  secondaryAction={
                    <Box>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => openEdit("category", c)}>
                          <Pencil size={13} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                        size="small"
                        color="error"
                        onClick={() => setPendingDelete({ kind: "category", id: c.id })}
                      >
                          <Trash2 size={13} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  }
                >
                  <ListItemText primary={c.name} secondary={`${c.expenseCount} expenses`} />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      </Box>

      <Drawer
        anchor="right"
        open={!!drawer}
        onClose={() => setDrawer(null)}
        slotProps={{ paper: { sx: { width: { xs: "100%", sm: 380 } } } }}
      >
        {drawer && (
          <Box sx={{ width: "100%", p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              {drawer.editingId ? "Edit" : "Add"} {TITLE[drawer.kind].replace(/s$/, "")}
            </Typography>
            <TextField
              label="Name"
              size="small"
              fullWidth
              value={drawer.name}
              onChange={(e) => setDrawer((d) => (d ? { ...d, name: e.target.value } : d))}
              sx={{ mb: 2 }}
            />
            {(drawer.kind === "employee" || drawer.kind === "source") && (
              <TextField
                label="Notes"
                size="small"
                fullWidth
                multiline
                rows={2}
                value={drawer.notes}
                onChange={(e) => setDrawer((d) => (d ? { ...d, notes: e.target.value } : d))}
                sx={{ mb: 2 }}
              />
            )}
            {drawer.kind === "employee" && (
              <FormControlLabel
                control={
                  <Switch
                    checked={drawer.isActive}
                    onChange={(e) => setDrawer((d) => (d ? { ...d, isActive: e.target.checked } : d))}
                  />
                }
                label="Active"
                sx={{ mb: 1, display: "block" }}
              />
            )}
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <Button variant="contained" fullWidth onClick={save} disabled={saving || !drawer.name.trim()}>
              {saving ? "Saving…" : drawer.editingId ? "Save Changes" : "Add"}
            </Button>
          </Box>
        )}
      </Drawer>

      <ConfirmDialog
        open={!!pendingDelete}
        title={`Delete ${pendingDelete?.kind ?? ""}`}
        message="This is only possible if nothing references it yet. This cannot be undone."
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />

      <Snackbar
        open={!!toast}
        autoHideDuration={5000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="warning" onClose={() => setToast(null)} variant="filled">
          {toast}
        </Alert>
      </Snackbar>
    </Box>
  );
}
