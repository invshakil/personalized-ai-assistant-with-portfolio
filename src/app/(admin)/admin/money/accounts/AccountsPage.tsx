"use client";

import { Fragment, useState, useEffect, useCallback } from "react";
import NextLink from "next/link";
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
  Collapse,
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
import { Plus, Pencil, Trash2, ChevronRight, ChevronDown } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { moneyApi } from "@/lib/api/money";
import { mobileCardTableSx } from "@/lib/mobileTableSx";
import type { MoneyAccountRow, MoneyAccountType, MoneyEntryRow } from "@/types";
import { fmt, fmtDate, ACCOUNT_TYPE_LABEL } from "../format";

const TYPES: MoneyAccountType[] = ["CASH", "BANK", "MOBILE_WALLET", "CREDIT_CARD", "OTHER"];

type AccountForm = {
  name: string;
  type: MoneyAccountType;
  openingBalance: string;
  creditLimit: string;
  isActive: boolean;
  notes: string;
};

const BLANK: AccountForm = {
  name: "",
  type: "BANK",
  openingBalance: "0",
  creditLimit: "",
  isActive: true,
  notes: "",
};

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<MoneyAccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<AccountForm>(BLANK);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<MoneyAccountRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  // Inline "recent transactions" expansion, fetched on demand and cached per account.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [txByAccount, setTxByAccount] = useState<Record<string, MoneyEntryRow[]>>({});
  const [txLoading, setTxLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setAccounts((await moneyApi.listAccounts()) ?? []);
      // Balances may have changed — drop cached rows and collapse.
      setExpandedId(null);
      setTxByAccount({});
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (!txByAccount[id]) {
      setTxLoading(id);
      try {
        const rows =
          (await moneyApi.listEntries({
            accountId: id,
            limit: 10,
            sortBy: "date",
            sortDir: "desc",
          })) ?? [];
        setTxByAccount((m) => ({ ...m, [id]: rows }));
      } finally {
        setTxLoading(null);
      }
    }
  };

  const amountColor = (d: MoneyEntryRow["direction"]) =>
    d === "CREDIT" ? "success.main" : d === "DEBIT" ? "error.main" : "text.secondary";
  const amountText = (e: MoneyEntryRow) =>
    e.direction === "CREDIT"
      ? `+${fmt(e.amount)}`
      : e.direction === "DEBIT"
        ? `−${fmt(e.amount)}`
        : fmt(e.amount);
  const entryLabel = (e: MoneyEntryRow) =>
    e.direction === "TRANSFER"
      ? `${e.accountName ?? "—"} → ${e.transferAccountName ?? "—"}`
      : (e.categoryName ?? e.description ?? "—");

  useEffect(() => {
    load();
  }, [load]);

  const cashPosition = accounts
    .filter((a) => a.type !== "CREDIT_CARD")
    .reduce((s, a) => s + a.balance, 0);
  const cardDebt = accounts
    .filter((a) => a.type === "CREDIT_CARD")
    .reduce((s, a) => s + Math.max(0, -a.balance), 0);

  const openAdd = () => {
    setEditing(null);
    setForm(BLANK);
    setError(null);
    setDrawerOpen(true);
  };

  const openEdit = (a: MoneyAccountRow) => {
    setEditing(a.id);
    setForm({
      name: a.name,
      type: a.type,
      openingBalance: String(a.openingBalance),
      creditLimit: a.creditLimit != null ? String(a.creditLimit) : "",
      isActive: a.isActive,
      notes: a.notes ?? "",
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
        type: form.type,
        openingBalance: parseFloat(form.openingBalance) || 0,
        creditLimit:
          form.type === "CREDIT_CARD" && form.creditLimit !== ""
            ? parseFloat(form.creditLimit)
            : null,
        isActive: form.isActive,
        notes: form.notes || null,
      };
      if (editing) await moneyApi.updateAccount(editing, body);
      else await moneyApi.createAccount(body);
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
      const res = await moneyApi.deleteAccount(pendingDelete.id);
      if (res && res.deleted === false) {
        setDeleteError(res.error ?? "Cannot delete this account.");
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

  const balanceColor = (a: MoneyAccountRow) => {
    if (a.type === "CREDIT_CARD") return a.balance < 0 ? "error.main" : "success.main";
    return a.balance < 0 ? "error.main" : "text.primary";
  };

  return (
    <Box>
      <PageHeader title="Accounts" subtitle="Cash, bank, mobile wallets & credit cards" />

      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        <Card sx={{ bgcolor: "background.paper", px: 3, py: 1.5 }}>
          <Typography variant="caption" color="text.secondary">
            Cash position
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 700, color: "success.main" }}>
            {fmt(cashPosition)}
          </Typography>
        </Card>
        <Card sx={{ bgcolor: "background.paper", px: 3, py: 1.5 }}>
          <Typography variant="caption" color="text.secondary">
            Credit-card debt
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 700, color: "error.main" }}>
            {fmt(cardDebt)}
          </Typography>
        </Card>
        <Button
          variant="contained"
          startIcon={<Plus size={16} />}
          onClick={openAdd}
          sx={{ ml: "auto", alignSelf: "center" }}
        >
          Add Account
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
                <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  Balance
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  Available credit
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {accounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} sx={{ textAlign: "center", py: 4 }}>
                    <Typography color="text.secondary">
                      No accounts yet — add your bank, cash and cards with their current balances.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                accounts.map((a) => (
                  <Fragment key={a.id}>
                    <TableRow hover onClick={() => toggleExpand(a.id)} sx={{ cursor: "pointer" }}>
                      <TableCell data-label="Name" sx={{ fontWeight: 600 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          {expandedId === a.id ? (
                            <ChevronDown size={15} />
                          ) : (
                            <ChevronRight size={15} />
                          )}
                          {a.name}
                        </Box>
                      </TableCell>
                      <TableCell data-label="Type">{ACCOUNT_TYPE_LABEL[a.type]}</TableCell>
                      <TableCell
                        align="right"
                        data-label="Balance"
                        sx={{ fontWeight: 700, color: balanceColor(a) }}
                      >
                        {fmt(a.balance)}
                      </TableCell>
                      <TableCell align="right" data-label="Available credit">
                        {a.availableCredit != null ? fmt(a.availableCredit) : "—"}
                      </TableCell>
                      <TableCell data-label="Status">
                        <Chip
                          size="small"
                          label={a.isActive ? "Active" : "Inactive"}
                          color={a.isActive ? "success" : "default"}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell data-label="Actions">
                        <Box sx={{ display: "flex" }} onClick={(e) => e.stopPropagation()}>
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => openEdit(a)}>
                              <Pencil size={14} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => {
                                setDeleteError(null);
                                setPendingDelete(a);
                              }}
                            >
                              <Trash2 size={14} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={6} sx={{ p: 0, border: 0, bgcolor: "action.hover" }}>
                        <Collapse in={expandedId === a.id} timeout="auto" unmountOnExit>
                          <Box sx={{ px: 2, py: 1.5 }}>
                            <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                              <Typography
                                variant="caption"
                                sx={{ fontWeight: 700, color: "text.secondary" }}
                              >
                                Recent transactions
                              </Typography>
                              <Button
                                component={NextLink}
                                href={`/admin/money/entries?account=${a.id}&period=all`}
                                size="small"
                                sx={{ ml: "auto", fontSize: "0.7rem", py: 0 }}
                              >
                                View all
                              </Button>
                            </Box>
                            {txLoading === a.id ? (
                              <Box sx={{ display: "flex", justifyContent: "center", py: 1 }}>
                                <CircularProgress size={18} />
                              </Box>
                            ) : (txByAccount[a.id]?.length ?? 0) === 0 ? (
                              <Typography variant="caption" color="text.secondary">
                                No transactions yet.
                              </Typography>
                            ) : (
                              <Box sx={{ display: "flex", flexDirection: "column" }}>
                                {txByAccount[a.id].map((e) => (
                                  <Box
                                    key={e.id}
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 1.5,
                                      py: 0.5,
                                      borderBottom: "1px solid",
                                      borderColor: "divider",
                                      "&:last-of-type": { borderBottom: 0 },
                                    }}
                                  >
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{ minWidth: 64, flexShrink: 0 }}
                                    >
                                      {fmtDate(e.date)}
                                    </Typography>
                                    <Typography
                                      variant="body2"
                                      sx={{
                                        flex: 1,
                                        minWidth: 0,
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      {entryLabel(e)}
                                    </Typography>
                                    <Typography
                                      variant="body2"
                                      sx={{ fontWeight: 700, color: amountColor(e.direction) }}
                                    >
                                      {amountText(e)}
                                    </Typography>
                                  </Box>
                                ))}
                              </Box>
                            )}
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </Fragment>
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
            {editing ? "Edit Account" : "Add Account"}
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
            <InputLabel>Type</InputLabel>
            <Select
              label="Type"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as MoneyAccountType }))}
            >
              {TYPES.map((t) => (
                <MenuItem key={t} value={t}>
                  {ACCOUNT_TYPE_LABEL[t]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label={
              form.type === "CREDIT_CARD"
                ? "Opening balance (৳, negative if owed)"
                : "Opening balance (৳)"
            }
            type="number"
            size="small"
            fullWidth
            value={form.openingBalance}
            onChange={(e) => setForm((f) => ({ ...f, openingBalance: e.target.value }))}
            helperText="The real balance you currently hold (or owe) in this account."
            sx={{ mb: 2 }}
          />
          {form.type === "CREDIT_CARD" && (
            <TextField
              label="Credit limit (৳)"
              type="number"
              size="small"
              fullWidth
              value={form.creditLimit}
              onChange={(e) => setForm((f) => ({ ...f, creditLimit: e.target.value }))}
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
          <FormControlLabel
            control={
              <Switch
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              />
            }
            label="Active"
            sx={{ mb: 2, display: "block" }}
          />
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Button variant="contained" fullWidth onClick={save} disabled={saving || !form.name}>
            {saving ? "Saving…" : editing ? "Save Changes" : "Add Account"}
          </Button>
        </Box>
      </Drawer>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete account"
        message={deleteError ?? `Delete "${pendingDelete?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </Box>
  );
}
