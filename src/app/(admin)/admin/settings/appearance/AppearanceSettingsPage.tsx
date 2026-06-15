"use client";

import { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Switch,
  Slider,
  ToggleButton,
  ToggleButtonGroup,
  TextField,
  Alert,
  Divider,
  Chip,
  LinearProgress,
  CircularProgress,
} from "@mui/material";
import { Sun, Moon, Monitor, Check, RotateCcw } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import { useAdminTheme } from "@/components/admin/AdminThemeProvider";
import type { AdminThemeSettings } from "@/types";

const COLOR_PRESETS = [
  { label: "Indigo", value: "#7367f0" },
  { label: "Blue", value: "#3d5a80" },
  { label: "Teal", value: "#00cfe8" },
  { label: "Green", value: "#28c76f" },
  { label: "Amber", value: "#ff9f43" },
  { label: "Rose", value: "#ea5455" },
  { label: "Purple", value: "#6b4d8f" },
];

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** Reusable labelled section block. */
function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Box>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
        {description}
      </Typography>
      {children}
    </Box>
  );
}

export default function AppearanceSettingsPage() {
  const { settings, previewSettings, saveSettings, resetSettings } = useAdminTheme();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [hexInput, setHexInput] = useState(settings.primaryColor);

  const set = (patch: Partial<AdminThemeSettings>) => {
    setSaved(false);
    previewSettings(patch);
  };

  const handleHex = (value: string) => {
    setHexInput(value);
    if (HEX.test(value)) set({ primaryColor: value });
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      await saveSettings();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save. Try again.");
    }
    setSaving(false);
  };

  const handleReset = () => {
    resetSettings();
    setHexInput("#7367f0");
    setSaved(false);
  };

  return (
    <Box sx={{ maxWidth: 760 }}>
      <PageHeader
        title="Appearance"
        subtitle="Customise the admin dashboard theme. Changes preview live — Save to keep them."
      />

      <Card>
        <CardContent
          sx={{ p: 3, "&:last-child": { pb: 3 }, display: "flex", flexDirection: "column", gap: 3 }}
        >
          {/* Mode */}
          <Section title="Theme mode" description="Light, dark, or follow your operating system.">
            <ToggleButtonGroup
              exclusive
              size="small"
              value={settings.mode}
              onChange={(_, v) => v && set({ mode: v })}
            >
              <ToggleButton value="light" sx={{ gap: 1, px: 2 }}>
                <Sun size={15} /> Light
              </ToggleButton>
              <ToggleButton value="dark" sx={{ gap: 1, px: 2 }}>
                <Moon size={15} /> Dark
              </ToggleButton>
              <ToggleButton value="system" sx={{ gap: 1, px: 2 }}>
                <Monitor size={15} /> System
              </ToggleButton>
            </ToggleButtonGroup>
          </Section>

          <Divider />

          {/* Primary colour */}
          <Section
            title="Primary colour"
            description="Accent used for buttons, links and active states."
          >
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
              {COLOR_PRESETS.map((c) => {
                const active = settings.primaryColor.toLowerCase() === c.value.toLowerCase();
                return (
                  <Box
                    key={c.value}
                    role="button"
                    aria-label={c.label}
                    onClick={() => {
                      set({ primaryColor: c.value });
                      setHexInput(c.value);
                    }}
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: "8px",
                      bgcolor: c.value,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      outline: active ? "2px solid" : "2px solid transparent",
                      outlineColor: active ? "text.primary" : "transparent",
                      outlineOffset: 2,
                      transition: "outline-color 0.15s ease",
                    }}
                  >
                    {active && <Check size={16} color="#fff" />}
                  </Box>
                );
              })}
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Box
                component="input"
                type="color"
                value={settings.primaryColor}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  set({ primaryColor: e.target.value });
                  setHexInput(e.target.value);
                }}
                sx={{
                  width: 40,
                  height: 36,
                  p: 0,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                  bgcolor: "transparent",
                  cursor: "pointer",
                }}
              />
              <TextField
                size="small"
                label="Hex"
                value={hexInput}
                onChange={(e) => handleHex(e.target.value)}
                error={!HEX.test(hexInput)}
                helperText={!HEX.test(hexInput) ? "Use #RGB or #RRGGBB" : " "}
                sx={{ width: 160 }}
              />
            </Box>
          </Section>

          <Divider />

          {/* Card style */}
          <Section title="Card style" description="Shadow depth and border for cards and panels.">
            <ToggleButtonGroup
              exclusive
              size="small"
              value={settings.cardShadow}
              onChange={(_, v) => v && set({ cardShadow: v })}
              sx={{ mb: 1.5 }}
            >
              <ToggleButton value="none" sx={{ px: 2 }}>
                None
              </ToggleButton>
              <ToggleButton value="soft" sx={{ px: 2 }}>
                Soft
              </ToggleButton>
              <ToggleButton value="elevated" sx={{ px: 2 }}>
                Elevated
              </ToggleButton>
            </ToggleButtonGroup>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Switch
                checked={settings.cardBorder}
                onChange={(e) => set({ cardBorder: e.target.checked })}
              />
              <Typography variant="body2">Show card border</Typography>
            </Box>
          </Section>

          <Divider />

          {/* Border radius */}
          <Section
            title={`Corner radius — ${settings.borderRadius}px`}
            description="Roundness of cards, buttons and inputs."
          >
            <Slider
              value={settings.borderRadius}
              onChange={(_, v) => set({ borderRadius: v as number })}
              min={0}
              max={24}
              step={1}
              marks={[
                { value: 0, label: "Sharp" },
                { value: 8, label: "Default" },
                { value: 24, label: "Round" },
              ]}
              sx={{ maxWidth: 420 }}
            />
          </Section>

          <Divider />

          {/* Density + font size */}
          <Section
            title="Density & text size"
            description="Spacing of lists/tables and the base font size."
          >
            <ToggleButtonGroup
              exclusive
              size="small"
              value={settings.density}
              onChange={(_, v) => v && set({ density: v })}
              sx={{ mb: 2.5 }}
            >
              <ToggleButton value="compact" sx={{ px: 2 }}>
                Compact
              </ToggleButton>
              <ToggleButton value="comfortable" sx={{ px: 2 }}>
                Comfortable
              </ToggleButton>
            </ToggleButtonGroup>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
              Base font size — {settings.fontSize}px
            </Typography>
            <Slider
              value={settings.fontSize}
              onChange={(_, v) => set({ fontSize: v as number })}
              min={12}
              max={18}
              step={1}
              marks
              sx={{ maxWidth: 420 }}
            />
          </Section>

          <Divider />

          {/* Live preview */}
          <Section title="Preview" description="A sample of the current theme.">
            <Card>
              <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                <Typography variant="subtitle2">Sample card</Typography>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
                  <Button variant="contained" size="small">
                    Primary
                  </Button>
                  <Button variant="outlined" size="small">
                    Outlined
                  </Button>
                  <Chip label="Active" color="success" size="small" />
                  <Chip label="Overdue" color="error" size="small" />
                </Box>
                <LinearProgress variant="determinate" value={65} />
              </CardContent>
            </Card>
          </Section>

          {error && <Alert severity="error">{error}</Alert>}

          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saving}
              startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}
              sx={{ fontWeight: 600 }}
            >
              {saving ? "Saving…" : "Save changes"}
            </Button>
            <Button
              variant="text"
              color="inherit"
              onClick={handleReset}
              startIcon={<RotateCcw size={14} />}
            >
              Reset to defaults
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
