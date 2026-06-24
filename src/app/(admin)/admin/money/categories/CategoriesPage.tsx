"use client";

import { useState, useEffect, useCallback } from "react";
import NextLink from "next/link";
import {
  Box,
  Card,
  Typography,
  Button,
  Link,
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
  InputAdornment,
  Tooltip,
} from "@mui/material";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { moneyApi } from "@/lib/api/money";
import { mobileCardTableSx } from "@/lib/mobileTableSx";
import type { MoneyCategoryRow, MoneyCategoryKind } from "@/types";

type CategoryForm = { name: string; kind: MoneyCategoryKind };

const BLANK: CategoryForm = { name: "", kind: "EXPENSE" };

export default function CategoriesPage() {
  const [categories, setCategories] = useState<MoneyCategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<CategoryForm>(BLANK);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<MoneyCategoryRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCategories((await moneyApi.listCategories()) ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm(BLANK);
    setError(null);
    setDrawerOpen(true);
  };

  const openEdit = (c: MoneyCategoryRow) => {
    setEditing(c.id);
    setForm({ name: c.name, kind: c.kind });
    setError(null);
    setDrawerOpen(true);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      if (editing) await moneyApi.updateCategory(editing, { name: form.name, kind: form.kind });
      else await moneyApi.createCategory({ name: form.name, kind: form.kind });
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
    setDeleteError(null);
    try {
      const res = await moneyApi.deleteCategory(pendingDelete.id);
      if (res && res.deleted === false) {
        setDeleteError(res.error ?? "Cannot delete this category.");
        return;
      }
      setPendingDelete(null);
      load();
    } catch (e: unknown) {
      setDeleteError(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box>
      <PageHeader title="Categories" subtitle="Income & expense categories for your ledger" />

      <Box sx={{ display: "flex", gap: 2, mb: 3, alignItems: "center", flexWrap: "wrap" }}>
        <TextField
          placeholder="Search categories"
          size="small"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={16} />
                </InputAdornment>
              ),
            },
          }}
          sx={{ minWidth: 240 }}
        />
        <Button
          variant="contained"
          startIcon={<Plus size={16} />}
          onClick={openAdd}
          sx={{ ml: "auto" }}
        >
          Add Category
        </Button>
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
                <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Kind</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  Entries
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} sx={{ textAlign: "center", py: 4 }}>
                    <Typography color="text.secondary">
                      {categories.length === 0
                        ? "No categories yet"
                        : `No categories match "${query}"`}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((c) => (
                  <TableRow key={c.id} hover>
                    <TableCell data-label="Name" sx={{ fontWeight: 600 }}>
                      <Link
                        component={NextLink}
                        href={`/admin/money/entries?category=${c.id}&period=all`}
                        underline="hover"
                        color="primary"
                        title="View this category's entries in the ledger"
                      >
                        {c.name}
                      </Link>
                    </TableCell>
                    <TableCell data-label="Kind">
                      <Chip
                        size="small"
                        label={c.kind === "INCOME" ? "Income" : "Expense"}
                        color={c.kind === "INCOME" ? "success" : "warning"}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right" data-label="Entries">
                      {c.entryCount}
                    </TableCell>
                    <TableCell data-label="Actions">
                      <Box sx={{ display: "flex" }}>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => openEdit(c)}>
                            <Pencil size={14} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              setDeleteError(null);
                              setPendingDelete(c);
                            }}
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
            {editing ? "Edit Category" : "Add Category"}
          </Typography>
          <TextField
            label="Name"
            size="small"
            fullWidth
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Kind</InputLabel>
            <Select
              label="Kind"
              value={form.kind}
              onChange={(e) =>
                setForm((f) => ({ ...f, kind: e.target.value as MoneyCategoryKind }))
              }
            >
              <MenuItem value="EXPENSE">Expense</MenuItem>
              <MenuItem value="INCOME">Income</MenuItem>
            </Select>
          </FormControl>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Button variant="contained" fullWidth onClick={save} disabled={saving || !form.name}>
            {saving ? "Saving…" : editing ? "Save Changes" : "Add Category"}
          </Button>
        </Box>
      </Drawer>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete category"
        message={deleteError ?? `Delete "${pendingDelete?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </Box>
  );
}
