"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Drawer,
  TextField,
  Divider,
} from "@mui/material";
import { ArrowLeft, Pencil } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import PayeeDocuments from "@/components/admin/PayeeDocuments";
import { propertyApi } from "@/lib/api/property";
import { mobileCardTableSx } from "@/lib/mobileTableSx";
import type { Payee, PropertyExpense } from "@/types";

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function fmt(n: number) {
  return `৳${n.toLocaleString()}`;
}

interface Props {
  id: string;
}

export default function PayeeProfilePage({ id }: Props) {
  const router = useRouter();
  const [payee, setPayee] = useState<Payee | null>(null);
  const [expenses, setExpenses] = useState<PropertyExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Payee>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [payeeData, expensesData] = await Promise.all([
        propertyApi.getPayee<Payee>(id),
        propertyApi.listExpenses({ payeeId: id }),
      ]);
      setPayee(payeeData);
      setExpenses(expensesData ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveEdit() {
    if (!payee) return;
    setSaving(true);
    setSaveError(null);
    try {
      await propertyApi.updatePayee(id, editForm);
      setEditOpen(false);
      await load();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function openEdit() {
    if (!payee) return;
    setEditForm({
      name: payee.name,
      role: payee.role,
      phone: payee.phone ?? "",
      email: payee.email ?? "",
      address: payee.address ?? "",
      nidNumber: payee.nidNumber ?? "",
      notes: payee.notes ?? "",
    });
    setSaveError(null);
    setEditOpen(true);
  }

  const totalPaid = expenses.reduce((s, e) => s + e.amount, 0);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !payee) {
    return <Alert severity="error">{error ?? "Payee not found"}</Alert>;
  }

  return (
    <Box>
      {/* Back nav */}
      <Button
        startIcon={<ArrowLeft size={16} />}
        onClick={() => router.push("/admin/property/payees")}
        sx={{ mb: 2, color: "text.secondary" }}
      >
        Back to Payees
      </Button>

      <PageHeader title={payee.name} subtitle={payee.role} />

      {/* Info card */}
      <Card sx={{ bgcolor: "background.paper", mb: 3 }}>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2, mb: 2 }}>
            <Avatar sx={{ bgcolor: "primary.main", width: 56, height: 56, fontSize: "1.25rem" }}>
              {initials(payee.name)}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {payee.name}
                </Typography>
                <Chip
                  label={payee.isActive ? "Active" : "Inactive"}
                  size="small"
                  sx={{
                    bgcolor: payee.isActive ? "success.main" : "text.disabled",
                    color: "#fff",
                    fontSize: "0.65rem",
                  }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                {payee.role}
              </Typography>
            </Box>
            <Button size="small" startIcon={<Pencil size={14} />} onClick={openEdit}>
              Edit
            </Button>
          </Box>

          <Divider sx={{ my: 1.5 }} />

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
            {[
              ["Phone", payee.phone],
              ["Email", payee.email],
              ["Address", payee.address],
              ["NID Number", payee.nidNumber],
            ].map(([label, val]) =>
              val ? (
                <Box key={label as string}>
                  <Typography variant="caption" color="text.secondary">
                    {label}
                  </Typography>
                  <Typography variant="body2">{val}</Typography>
                </Box>
              ) : null
            )}
            {payee.notes && (
              <Box sx={{ gridColumn: "1 / -1" }}>
                <Typography variant="caption" color="text.secondary">
                  Notes
                </Typography>
                <Typography variant="body2">{payee.notes}</Typography>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Documents */}
      <Card sx={{ bgcolor: "background.paper", mb: 3 }}>
        <CardContent>
          <PayeeDocuments payeeId={id} />
        </CardContent>
      </Card>

      {/* Payment history */}
      <Card sx={{ bgcolor: "background.paper" }}>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
              Payment History
            </Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "error.main" }}>
              Total: {fmt(totalPaid)}
            </Typography>
          </Box>

          {expenses.length === 0 ? (
            <Typography variant="caption" color="text.secondary">
              No payments recorded yet.
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small" sx={mobileCardTableSx}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Service Type</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Amount</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Mode</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Notes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {expenses.map((e) => (
                    <TableRow key={e.id} hover>
                      <TableCell data-label="Date">
                        {e.expenseDate
                          ? new Date(e.expenseDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                          : `${e.month}/${e.year}`}
                      </TableCell>
                      <TableCell data-label="Service Type">
                        {e.serviceTypeName ? (
                          <Chip label={e.serviceTypeName} size="small" sx={{ fontSize: "0.7rem" }} />
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            {e.category}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell data-label="Description">{e.description}</TableCell>
                      <TableCell data-label="Amount">
                        <Typography variant="body2" sx={{ fontWeight: 700, color: "error.main" }}>
                          {fmt(e.amount)}
                        </Typography>
                      </TableCell>
                      <TableCell data-label="Mode">{e.paymentMode ?? "—"}</TableCell>
                      <TableCell data-label="Notes">
                        <Typography variant="caption" color="text.secondary">
                          {e.notes ?? "—"}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Edit drawer */}
      <Drawer
        anchor="right"
        open={editOpen}
        onClose={() => setEditOpen(false)}
        slotProps={{ paper: { sx: { width: { xs: "100%", sm: 420 }, p: 3 } } }}
      >
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 700 }}>
          Edit Payee
        </Typography>

        {(["name", "role", "phone", "email", "address", "nidNumber"] as const).map((key) => (
          <TextField
            key={key}
            label={key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1")}
            value={(editForm[key] as string) ?? ""}
            onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))}
            size="small"
            fullWidth
            sx={{ mb: 2 }}
          />
        ))}
        <TextField
          label="Notes"
          value={(editForm.notes as string) ?? ""}
          onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
          size="small"
          fullWidth
          multiline
          rows={3}
          sx={{ mb: 2 }}
        />

        {saveError && <Alert severity="error" sx={{ mb: 2 }}>{saveError}</Alert>}

        <Box sx={{ display: "flex", gap: 1 }}>
          <Button variant="outlined" fullWidth onClick={() => setEditOpen(false)}>
            Cancel
          </Button>
          <Button variant="contained" fullWidth disabled={saving} onClick={saveEdit}>
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </Box>
      </Drawer>
    </Box>
  );
}
