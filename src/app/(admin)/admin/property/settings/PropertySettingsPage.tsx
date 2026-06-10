"use client";

import { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Divider,
  Alert,
  Snackbar,
  InputAdornment,
} from "@mui/material";
import { Save, Building2, User, Phone, MapPin, CreditCard } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import type { PropertySettings } from "@/types";

interface Props {
  initial: PropertySettings;
}

export default function PropertySettingsPage({ initial }: Props) {
  const [form, setForm] = useState({
    propertyName: initial.propertyName,
    ownerName: initial.ownerName,
    ownerPhone: initial.ownerPhone,
    address: initial.address,
    bankAccount: initial.bankAccount ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({
    open: false,
    message: "",
    severity: "success",
  });

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [field]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/property/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyName: form.propertyName,
          ownerName: form.ownerName,
          ownerPhone: form.ownerPhone,
          address: form.address,
          bankAccount: form.bankAccount || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      setToast({ open: true, message: "Settings saved successfully", severity: "success" });
    } catch (err) {
      setToast({ open: true, message: (err as Error).message, severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <PageHeader
        title="Property Settings"
        subtitle="Property name, owner details, and bank account — used on PDF receipts"
      />

      <Card sx={{ bgcolor: "background.paper", maxWidth: 600 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: "text.secondary" }}>
            Property & Owner Details
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            <TextField
              label="Property Name"
              value={form.propertyName}
              onChange={set("propertyName")}
              size="small"
              fullWidth
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Building2 size={15} />
                    </InputAdornment>
                  ),
                },
              }}
            />

            <TextField
              label="Owner Name"
              value={form.ownerName}
              onChange={set("ownerName")}
              size="small"
              fullWidth
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <User size={15} />
                    </InputAdornment>
                  ),
                },
              }}
            />

            <TextField
              label="Owner Phone"
              value={form.ownerPhone}
              onChange={set("ownerPhone")}
              size="small"
              fullWidth
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Phone size={15} />
                    </InputAdornment>
                  ),
                },
              }}
            />

            <TextField
              label="Address"
              value={form.address}
              onChange={set("address")}
              size="small"
              fullWidth
              multiline
              minRows={2}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start" sx={{ alignSelf: "flex-start", mt: 1 }}>
                      <MapPin size={15} />
                    </InputAdornment>
                  ),
                },
              }}
            />

            <Divider />

            <TextField
              label="Bank Account (optional)"
              value={form.bankAccount}
              onChange={set("bankAccount")}
              size="small"
              fullWidth
              placeholder="e.g. Dutch-Bangla Bank · 123-456-789"
              helperText="Printed on receipts for tenant reference"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <CreditCard size={15} />
                    </InputAdornment>
                  ),
                },
              }}
            />

            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
              <Button
                variant="contained"
                size="small"
                startIcon={<Save size={14} />}
                onClick={save}
                disabled={saving}
                sx={{ minWidth: 120 }}
              >
                {saving ? "Saving…" : "Save Changes"}
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Snackbar
        open={toast.open}
        autoHideDuration={3500}
        onClose={() => setToast((p) => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={toast.severity}
          onClose={() => setToast((p) => ({ ...p, open: false }))}
          sx={{ width: "100%" }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
