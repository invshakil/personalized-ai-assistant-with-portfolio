"use client";

import { useState } from "react";
import {
  Box, Card, CardContent, Typography, TextField,
  Switch, FormControlLabel, Button, Alert, Divider,
  CircularProgress, Chip,
} from "@mui/material";
import { Check } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import type { SettingsFormData } from "./types";

interface SettingsPageProps {
  initialData: SettingsFormData;
}

export default function SettingsPage({ initialData }: SettingsPageProps) {
  const [form, setForm] = useState<SettingsFormData>(initialData);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const set = (key: keyof SettingsFormData, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSaved(false);

    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to save. Try again.");
    }
    setSaving(false);
  };

  return (
    <Box sx={{ maxWidth: 680 }}>
      <PageHeader
        title="Site Settings"
        subtitle="Changes here reflect live on your public portfolio."
      />

      <Card>
        <CardContent sx={{ p: 3, "&:last-child": { pb: 3 } }}>
          {/* Available for work */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
              p: 2,
              borderRadius: 2,
              bgcolor: form.availableForWork
                ? "rgba(40,199,111,0.06)"
                : "rgba(231,227,252,0.03)",
              border: "1px solid",
              borderColor: form.availableForWork
                ? "rgba(40,199,111,0.2)"
                : "divider",
              transition: "all 0.2s ease",
            }}
          >
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Available for work
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Shows the availability badge on your portfolio
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              {form.availableForWork && (
                <Chip
                  label="Visible"
                  size="small"
                  color="success"
                  sx={{ height: 20, fontSize: "0.68rem" }}
                />
              )}
              <Switch
                checked={form.availableForWork}
                onChange={(e) => set("availableForWork", e.target.checked)}
                color="success"
              />
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Text fields */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            <TextField
              label="Hero tagline"
              fullWidth
              size="small"
              value={form.heroTagline}
              onChange={(e) => set("heroTagline", e.target.value)}
              placeholder="Tech Lead & Full-Stack Engineer"
              helperText="Shown as the main heading in your hero section"
            />

            <TextField
              label="Bio"
              fullWidth
              multiline
              minRows={3}
              value={form.heroBio}
              onChange={(e) => set("heroBio", e.target.value)}
              placeholder="A short bio shown in your hero section…"
            />

            <TextField
              label="Meta description"
              fullWidth
              multiline
              minRows={2}
              value={form.metaDescription}
              onChange={(e) => set("metaDescription", e.target.value)}
              placeholder="SEO meta description…"
              helperText="Used for search engine previews"
            />

            <TextField
              label="CV URL"
              fullWidth
              size="small"
              type="url"
              value={form.cvUrl}
              onChange={(e) => set("cvUrl", e.target.value)}
              placeholder="https://drive.google.com/…"
              helperText="Google Drive or direct link to your CV PDF"
            />
          </Box>

          {error && (
            <Alert severity="error" sx={{ mt: 2.5 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 3 }}>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saving}
              startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}
              sx={{ fontWeight: 600 }}
            >
              {saving ? "Saving…" : "Save changes"}
            </Button>
            {saved && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Check size={14} color="#28c76f" />
                <Typography variant="body2" color="success.main" sx={{ fontWeight: 500 }}>
                  Saved
                </Typography>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
