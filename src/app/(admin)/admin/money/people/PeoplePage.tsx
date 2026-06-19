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
  Divider,
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
import { Plus, Pencil, Trash2, Eye, HandCoins } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { moneyApi } from "@/lib/api/money";
import { mobileCardTableSx } from "@/lib/mobileTableSx";
import type {
  BeneficiaryRow,
  BeneficiaryDetail,
  MoneyAccountRow,
  ObligationDirection,
  ObligationType,
} from "@/types";
import { fmt, fmtDate, todayInput } from "../format";

const DIR_LABEL: Record<ObligationDirection, string> = {
  OWED_BY_ME: "I owe them",
  OWED_TO_ME: "They owe me",
};

type PersonForm = { name: string; relationship: string; phone: string; notes: string };
const BLANK_PERSON: PersonForm = { name: "", relationship: "", phone: "", notes: "" };

type ObligationForm = {
  type: ObligationType;
  direction: ObligationDirection;
  amount: string;
  frequency: string;
  startDate: string;
  notes: string;
};
const BLANK_OBLIGATION: ObligationForm = {
  type: "LOAN",
  direction: "OWED_BY_ME",
  amount: "",
  frequency: "monthly",
  startDate: todayInput(),
  notes: "",
};

type PaymentForm = {
  amount: string;
  date: string;
  accountId: string;
  obligationId: string;
  direction: "DEBIT" | "CREDIT";
};
const BLANK_PAYMENT: PaymentForm = {
  amount: "",
  date: todayInput(),
  accountId: "",
  obligationId: "",
  direction: "DEBIT",
};

export default function PeoplePage() {
  const [people, setPeople] = useState<BeneficiaryRow[]>([]);
  const [accounts, setAccounts] = useState<MoneyAccountRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Add/edit person
  const [personDrawer, setPersonDrawer] = useState(false);
  const [editingPerson, setEditingPerson] = useState<string | null>(null);
  const [personForm, setPersonForm] = useState<PersonForm>(BLANK_PERSON);
  const [savingPerson, setSavingPerson] = useState(false);
  const [personError, setPersonError] = useState<string | null>(null);

  // Detail
  const [detail, setDetail] = useState<BeneficiaryDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [obForm, setObForm] = useState<ObligationForm>(BLANK_OBLIGATION);
  const [obSaving, setObSaving] = useState(false);
  const [payForm, setPayForm] = useState<PaymentForm>(BLANK_PAYMENT);
  const [paySaving, setPaySaving] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [pendingDelete, setPendingDelete] = useState<BeneficiaryRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ppl, acc] = await Promise.all([moneyApi.listBeneficiaries(), moneyApi.listAccounts()]);
      setPeople(ppl ?? []);
      setAccounts(acc ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totalOwedByMe = people.reduce((s, b) => s + b.outstandingByMe, 0);
  const totalOwedToMe = people.reduce((s, b) => s + b.outstandingToMe, 0);

  // ── Person CRUD ──
  const openAddPerson = () => {
    setEditingPerson(null);
    setPersonForm(BLANK_PERSON);
    setPersonError(null);
    setPersonDrawer(true);
  };
  const openEditPerson = (b: BeneficiaryRow) => {
    setEditingPerson(b.id);
    setPersonForm({
      name: b.name,
      relationship: b.relationship ?? "",
      phone: b.phone ?? "",
      notes: b.notes ?? "",
    });
    setPersonError(null);
    setPersonDrawer(true);
  };
  const savePerson = async () => {
    setSavingPerson(true);
    setPersonError(null);
    try {
      const body = {
        name: personForm.name,
        relationship: personForm.relationship || null,
        phone: personForm.phone || null,
        notes: personForm.notes || null,
      };
      if (editingPerson) await moneyApi.updateBeneficiary(editingPerson, body);
      else await moneyApi.createBeneficiary(body);
      setPersonDrawer(false);
      load();
    } catch (e: unknown) {
      setPersonError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSavingPerson(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await moneyApi.deleteBeneficiary(pendingDelete.id);
      if (res && res.deleted === false) {
        setDeleteError(res.error ?? "Cannot delete this person.");
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

  // ── Detail ──
  const openDetail = async (id: string) => {
    setDetailLoading(true);
    setDetailError(null);
    setObForm({ ...BLANK_OBLIGATION, startDate: todayInput() });
    setPayForm({ ...BLANK_PAYMENT, date: todayInput(), accountId: accounts[0]?.id ?? "" });
    try {
      setDetail(await moneyApi.getBeneficiary(id));
    } finally {
      setDetailLoading(false);
    }
  };
  const refreshDetail = async () => {
    if (!detail) return;
    setDetail(await moneyApi.getBeneficiary(detail.id));
    load();
  };

  const addObligation = async () => {
    if (!detail) return;
    setObSaving(true);
    setDetailError(null);
    try {
      await moneyApi.createObligation(detail.id, {
        type: obForm.type,
        direction: obForm.direction,
        amount: parseFloat(obForm.amount),
        frequency: obForm.type === "RECURRING" ? obForm.frequency || null : null,
        startDate: obForm.startDate,
      });
      setObForm({ ...BLANK_OBLIGATION, startDate: todayInput() });
      await refreshDetail();
    } catch (e: unknown) {
      setDetailError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setObSaving(false);
    }
  };

  const recordPayment = async () => {
    if (!detail) return;
    setPaySaving(true);
    setDetailError(null);
    try {
      await moneyApi.recordPayment(detail.id, {
        amount: parseFloat(payForm.amount),
        date: payForm.date,
        accountId: payForm.accountId || null,
        obligationId: payForm.obligationId || null,
        direction: payForm.direction,
      });
      setPayForm({ ...BLANK_PAYMENT, date: todayInput(), accountId: accounts[0]?.id ?? "" });
      await refreshDetail();
    } catch (e: unknown) {
      setDetailError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setPaySaving(false);
    }
  };

  return (
    <Box>
      <PageHeader title="People & Loans" subtitle="Allowances, loans and who owes whom" />

      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        <Card sx={{ bgcolor: "background.paper", px: 3, py: 1.5 }}>
          <Typography variant="caption" color="text.secondary">
            I still owe
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 700, color: "error.main" }}>
            {fmt(totalOwedByMe)}
          </Typography>
        </Card>
        <Card sx={{ bgcolor: "background.paper", px: 3, py: 1.5 }}>
          <Typography variant="caption" color="text.secondary">
            Owed to me
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 700, color: "success.main" }}>
            {fmt(totalOwedToMe)}
          </Typography>
        </Card>
        <Button
          variant="contained"
          startIcon={<Plus size={16} />}
          onClick={openAddPerson}
          sx={{ ml: "auto", alignSelf: "center" }}
        >
          Add Person
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
                <TableCell sx={{ fontWeight: 700 }}>Relationship</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  I owe
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  Owes me
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  Total paid
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {people.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} sx={{ textAlign: "center", py: 4 }}>
                    <Typography color="text.secondary">No people yet</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                people.map((b) => (
                  <TableRow key={b.id} hover>
                    <TableCell data-label="Name" sx={{ fontWeight: 600 }}>
                      {b.name}
                      {!b.isActive && (
                        <Chip size="small" label="Inactive" sx={{ ml: 1 }} variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell data-label="Relationship">{b.relationship ?? "—"}</TableCell>
                    <TableCell align="right" data-label="I owe" sx={{ color: "error.main" }}>
                      {b.outstandingByMe > 0 ? fmt(b.outstandingByMe) : "—"}
                    </TableCell>
                    <TableCell align="right" data-label="Owes me" sx={{ color: "success.main" }}>
                      {b.outstandingToMe > 0 ? fmt(b.outstandingToMe) : "—"}
                    </TableCell>
                    <TableCell align="right" data-label="Total paid">
                      {fmt(b.totalPaid)}
                    </TableCell>
                    <TableCell data-label="Actions">
                      <Box sx={{ display: "flex" }}>
                        <Tooltip title="View / record payment">
                          <IconButton size="small" onClick={() => openDetail(b.id)}>
                            <Eye size={14} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => openEditPerson(b)}>
                            <Pencil size={14} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              setDeleteError(null);
                              setPendingDelete(b);
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

      {/* Add / edit person */}
      <Drawer
        anchor="right"
        open={personDrawer}
        onClose={() => setPersonDrawer(false)}
        slotProps={{ paper: { sx: { width: { xs: "100%", sm: 420 } } } }}
      >
        <Box sx={{ width: "100%", p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            {editingPerson ? "Edit Person" : "Add Person"}
          </Typography>
          <TextField
            label="Name"
            size="small"
            fullWidth
            value={personForm.name}
            onChange={(e) => setPersonForm((f) => ({ ...f, name: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Relationship"
            size="small"
            fullWidth
            placeholder="brother, house help, lender…"
            value={personForm.relationship}
            onChange={(e) => setPersonForm((f) => ({ ...f, relationship: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Phone"
            size="small"
            fullWidth
            value={personForm.phone}
            onChange={(e) => setPersonForm((f) => ({ ...f, phone: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Notes"
            size="small"
            fullWidth
            multiline
            rows={2}
            value={personForm.notes}
            onChange={(e) => setPersonForm((f) => ({ ...f, notes: e.target.value }))}
            sx={{ mb: 2 }}
          />
          {personError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {personError}
            </Alert>
          )}
          <Button
            variant="contained"
            fullWidth
            onClick={savePerson}
            disabled={savingPerson || !personForm.name}
          >
            {savingPerson ? "Saving…" : editingPerson ? "Save Changes" : "Add Person"}
          </Button>
        </Box>
      </Drawer>

      {/* Detail */}
      <Drawer
        anchor="right"
        open={!!detail || detailLoading}
        onClose={() => setDetail(null)}
        slotProps={{ paper: { sx: { width: { xs: "100%", sm: 520 } } } }}
      >
        <Box sx={{ width: "100%", p: 3 }}>
          {detailLoading || !detail ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {detail.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {detail.relationship ?? "—"} · paid {fmt(detail.totalPaid)} lifetime
              </Typography>

              {/* Obligations */}
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 3, mb: 1 }}>
                Obligations
              </Typography>
              {detail.obligations.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  None yet.
                </Typography>
              ) : (
                detail.obligations.map((o) => (
                  <Card key={o.id} sx={{ bgcolor: "background.default", p: 1.5, mb: 1 }}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Box>
                        <Chip
                          size="small"
                          label={o.type === "LOAN" ? "Loan" : "Recurring"}
                          color={o.type === "LOAN" ? "info" : "default"}
                          variant="outlined"
                          sx={{ mr: 1 }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {DIR_LABEL[o.direction]} · {fmt(o.amount)}
                          {o.type === "RECURRING" && o.frequency ? ` / ${o.frequency}` : ""}
                        </Typography>
                      </Box>
                      {o.type === "LOAN" && (
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 700,
                            color: o.outstanding > 0 ? "error.main" : "success.main",
                          }}
                        >
                          {o.outstanding > 0 ? `${fmt(o.outstanding)} left` : "settled"}
                        </Typography>
                      )}
                    </Box>
                  </Card>
                ))
              )}

              {/* Add obligation */}
              <Card sx={{ bgcolor: "background.default", p: 1.5, mb: 2, mt: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                  Add obligation
                </Typography>
                <Box sx={{ display: "flex", gap: 1, mt: 1, flexWrap: "wrap" }}>
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Type</InputLabel>
                    <Select
                      label="Type"
                      value={obForm.type}
                      onChange={(e) =>
                        setObForm((f) => ({ ...f, type: e.target.value as ObligationType }))
                      }
                    >
                      <MenuItem value="LOAN">Loan</MenuItem>
                      <MenuItem value="RECURRING">Recurring</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Direction</InputLabel>
                    <Select
                      label="Direction"
                      value={obForm.direction}
                      onChange={(e) =>
                        setObForm((f) => ({
                          ...f,
                          direction: e.target.value as ObligationDirection,
                        }))
                      }
                    >
                      <MenuItem value="OWED_BY_ME">I owe them</MenuItem>
                      <MenuItem value="OWED_TO_ME">They owe me</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    label={obForm.type === "LOAN" ? "Principal (৳)" : "Per-period (৳)"}
                    type="number"
                    size="small"
                    sx={{ width: 140 }}
                    value={obForm.amount}
                    onChange={(e) => setObForm((f) => ({ ...f, amount: e.target.value }))}
                  />
                  <TextField
                    label="Start"
                    type="date"
                    size="small"
                    sx={{ width: 150 }}
                    value={obForm.startDate}
                    onChange={(e) => setObForm((f) => ({ ...f, startDate: e.target.value }))}
                  />
                </Box>
                <Button
                  size="small"
                  variant="outlined"
                  sx={{ mt: 1 }}
                  onClick={addObligation}
                  disabled={obSaving || !obForm.amount}
                >
                  {obSaving ? "Adding…" : "Add obligation"}
                </Button>
              </Card>

              <Divider sx={{ my: 2 }} />

              {/* Record payment */}
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Record a payment
              </Typography>
              <Box sx={{ display: "flex", gap: 1, mb: 1, flexWrap: "wrap" }}>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Direction</InputLabel>
                  <Select
                    label="Direction"
                    value={payForm.direction}
                    onChange={(e) =>
                      setPayForm((f) => ({ ...f, direction: e.target.value as "DEBIT" | "CREDIT" }))
                    }
                  >
                    <MenuItem value="DEBIT">I paid them</MenuItem>
                    <MenuItem value="CREDIT">They paid me</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  label="Amount (৳)"
                  type="number"
                  size="small"
                  sx={{ width: 130 }}
                  value={payForm.amount}
                  onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))}
                />
                <TextField
                  label="Date"
                  type="date"
                  size="small"
                  sx={{ width: 150 }}
                  value={payForm.date}
                  onChange={(e) => setPayForm((f) => ({ ...f, date: e.target.value }))}
                />
                <FormControl size="small" sx={{ minWidth: 130 }}>
                  <InputLabel>Account</InputLabel>
                  <Select
                    label="Account"
                    value={payForm.accountId}
                    onChange={(e) => setPayForm((f) => ({ ...f, accountId: e.target.value }))}
                  >
                    <MenuItem value="">— none —</MenuItem>
                    {accounts.map((a) => (
                      <MenuItem key={a.id} value={a.id}>
                        {a.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Against loan</InputLabel>
                  <Select
                    label="Against loan"
                    value={payForm.obligationId}
                    onChange={(e) => setPayForm((f) => ({ ...f, obligationId: e.target.value }))}
                  >
                    <MenuItem value="">— none —</MenuItem>
                    {detail.obligations.map((o) => (
                      <MenuItem key={o.id} value={o.id}>
                        {o.type === "LOAN" ? "Loan" : "Recurring"} · {fmt(o.amount)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Button
                size="small"
                variant="contained"
                startIcon={<HandCoins size={15} />}
                onClick={recordPayment}
                disabled={paySaving || !payForm.amount}
              >
                {paySaving ? "Saving…" : "Record payment"}
              </Button>

              {detailError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {detailError}
                </Alert>
              )}

              {/* Payment history */}
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 3, mb: 1 }}>
                Payment history
              </Typography>
              {detail.payments.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No payments recorded.
                </Typography>
              ) : (
                <TableContainer component={Card} sx={{ bgcolor: "background.paper" }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Direction</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          Amount
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {detail.payments.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>{fmtDate(p.date)}</TableCell>
                          <TableCell>{p.direction === "DEBIT" ? "I paid" : "They paid"}</TableCell>
                          <TableCell
                            align="right"
                            sx={{
                              fontWeight: 600,
                              color: p.direction === "DEBIT" ? "error.main" : "success.main",
                            }}
                          >
                            {fmt(p.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              <Button sx={{ mt: 3 }} fullWidth onClick={() => setDetail(null)}>
                Close
              </Button>
            </>
          )}
        </Box>
      </Drawer>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete person"
        message={deleteError ?? `Delete "${pendingDelete?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </Box>
  );
}
