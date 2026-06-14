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
  Drawer,
  TextField,
  Alert,
  CircularProgress,
  Avatar,
} from "@mui/material";
import { Plus } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import { propertyApi } from "@/lib/api/property";
import type { Payee } from "@/types";

type PayeeForm = {
  name: string;
  role: string;
  phone: string;
  email: string;
  address: string;
  nidNumber: string;
  notes: string;
};

const EMPTY_FORM: PayeeForm = {
  name: "",
  role: "",
  phone: "",
  email: "",
  address: "",
  nidNumber: "",
  notes: "",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function PayeesPage() {
  const router = useRouter();
  const [payees, setPayees] = useState<Payee[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<PayeeForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPayees((await propertyApi.listPayees()) ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    if (!form.name || !form.role) return;
    setSaving(true);
    setError(null);
    try {
      await propertyApi.createPayee(form);
      setDrawerOpen(false);
      setForm(EMPTY_FORM);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function field(key: keyof PayeeForm, label: string, multiline = false) {
    return (
      <TextField
        key={key}
        label={label}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        size="small"
        fullWidth
        multiline={multiline}
        rows={multiline ? 3 : undefined}
        sx={{ mb: 2 }}
      />
    );
  }

  return (
    <Box>
      <PageHeader title="Payees" subtitle="Manage profiles for people and vendors you pay" />

      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<Plus size={16} />}
          onClick={() => {
            setForm(EMPTY_FORM);
            setError(null);
            setDrawerOpen(true);
          }}
        >
          Add Payee
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
          <CircularProgress />
        </Box>
      ) : payees.length === 0 ? (
        <Card sx={{ bgcolor: "background.paper" }}>
          <CardContent>
            <Typography color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
              No payees yet. Add your first payee to get started.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "1fr 1fr 1fr" },
            gap: 2,
          }}
        >
          {payees.map((p) => (
            <Card
              key={p.id}
              sx={{
                bgcolor: "background.paper",
                cursor: "pointer",
                "&:hover": { bgcolor: "action.hover" },
              }}
              onClick={() => router.push(`/admin/property/payees/${p.id}`)}
            >
              <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Avatar sx={{ bgcolor: "primary.main", width: 48, height: 48, fontSize: "1rem" }}>
                  {initials(p.name)}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }} noWrap>
                    {p.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {p.role}
                  </Typography>
                  {p.phone && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block" }}
                      noWrap
                    >
                      {p.phone}
                    </Typography>
                  )}
                </Box>
                <Chip
                  label={p.isActive ? "Active" : "Inactive"}
                  size="small"
                  sx={{
                    bgcolor: p.isActive ? "success.main" : "text.disabled",
                    color: "#fff",
                    fontSize: "0.65rem",
                  }}
                />
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        slotProps={{ paper: { sx: { width: { xs: "100%", sm: 420 }, p: 3 } } }}
      >
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 700 }}>
          Add Payee
        </Typography>

        {field("name", "Full Name *")}
        {field("role", "Role / Title *")}
        {field("phone", "Phone")}
        {field("email", "Email")}
        {field("address", "Address")}
        {field("nidNumber", "NID Number")}
        {field("notes", "Notes", true)}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Button
          variant="contained"
          fullWidth
          disabled={!form.name || !form.role || saving}
          onClick={save}
        >
          {saving ? "Saving…" : "Save Payee"}
        </Button>
      </Drawer>
    </Box>
  );
}
