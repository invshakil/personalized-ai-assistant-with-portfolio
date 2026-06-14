"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Drawer,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
} from "@mui/material";
import { Plus, Pencil, ToggleLeft, ToggleRight } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import { propertyApi } from "@/lib/api/property";
import { mobileCardTableSx } from "@/lib/mobileTableSx";
import type { PropertyServiceType, ExpenseCategory } from "@/types";

const CATEGORIES: ExpenseCategory[] = [
  "MAINTENANCE",
  "UTILITY",
  "SALARY",
  "SUBSCRIPTION",
  "CONSTRUCTION",
  "OTHER",
];

const CATEGORY_COLOR: Record<ExpenseCategory, string> = {
  MAINTENANCE: "warning.main",
  UTILITY: "info.main",
  SALARY: "success.main",
  SUBSCRIPTION: "primary.main",
  CONSTRUCTION: "error.main",
  OTHER: "text.secondary",
};

type ServiceTypeForm = { name: string; category: ExpenseCategory; description: string };
const EMPTY_FORM: ServiceTypeForm = { name: "", category: "OTHER", description: "" };

export default function ServiceTypesPage() {
  const [types, setTypes] = useState<PropertyServiceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<ServiceTypeForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTypes((await propertyApi.listServiceTypes()) ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openAdd() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError(null);
    setDrawerOpen(true);
  }

  function openEdit(t: PropertyServiceType) {
    setEditing(t.id);
    setForm({ name: t.name, category: t.category, description: t.description ?? "" });
    setError(null);
    setDrawerOpen(true);
  }

  async function save() {
    if (!form.name) return;
    setSaving(true);
    setError(null);
    try {
      if (editing) await propertyApi.updateServiceType(editing, form);
      else await propertyApi.createServiceType(form);
      setDrawerOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(t: PropertyServiceType) {
    await propertyApi.updateServiceType(t.id, { isActive: !t.isActive });
    await load();
  }

  return (
    <Box>
      <PageHeader
        title="Service Types"
        subtitle="Categories for property expense classification"
      />

      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 3 }}>
        <Button variant="contained" startIcon={<Plus size={16} />} onClick={openAdd}>
          Add Service Type
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Card sx={{ bgcolor: "background.paper" }}>
          <CardContent sx={{ p: "0 !important" }}>
            <TableContainer>
              <Table size="small" sx={mobileCardTableSx}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, pl: 3 }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {types.map((t) => (
                    <TableRow key={t.id} hover sx={{ opacity: t.isActive ? 1 : 0.5 }}>
                      <TableCell data-label="Name" sx={{ pl: 3 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {t.name}
                        </Typography>
                      </TableCell>
                      <TableCell data-label="Category">
                        <Chip
                          label={t.category}
                          size="small"
                          sx={{
                            bgcolor: CATEGORY_COLOR[t.category],
                            color: "#fff",
                            fontSize: "0.7rem",
                          }}
                        />
                      </TableCell>
                      <TableCell data-label="Description">
                        <Typography variant="caption" color="text.secondary">
                          {t.description ?? "—"}
                        </Typography>
                      </TableCell>
                      <TableCell data-label="Status">
                        <Chip
                          label={t.isActive ? "Active" : "Inactive"}
                          size="small"
                          sx={{
                            bgcolor: t.isActive ? "success.main" : "text.disabled",
                            color: "#fff",
                            fontSize: "0.65rem",
                          }}
                        />
                      </TableCell>
                      <TableCell data-label="Actions">
                        <Box sx={{ display: "flex", gap: 0.5 }}>
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => openEdit(t)}>
                              <Pencil size={14} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={t.isActive ? "Deactivate" : "Activate"}>
                            <IconButton size="small" onClick={() => toggleActive(t)}>
                              {t.isActive ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        slotProps={{ paper: { sx: { width: { xs: "100%", sm: 380 }, p: 3 } } }}
      >
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 700 }}>
          {editing ? "Edit Service Type" : "Add Service Type"}
        </Typography>

        <TextField
          label="Name *"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          size="small"
          fullWidth
          sx={{ mb: 2 }}
        />

        <FormControl size="small" fullWidth sx={{ mb: 2 }}>
          <InputLabel>Category *</InputLabel>
          <Select
            label="Category *"
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as ExpenseCategory }))}
          >
            {CATEGORIES.map((c) => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label="Description"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          size="small"
          fullWidth
          multiline
          rows={2}
          sx={{ mb: 2 }}
        />

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Button
          variant="contained"
          fullWidth
          disabled={!form.name || saving}
          onClick={save}
        >
          {saving ? "Saving…" : editing ? "Save Changes" : "Add Service Type"}
        </Button>
      </Drawer>
    </Box>
  );
}
