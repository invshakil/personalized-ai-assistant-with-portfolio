"use client";

import { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  MenuItem,
  Switch,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Divider,
} from "@mui/material";
import { CheckCircle2, KeyRound } from "lucide-react";
import { aiApi } from "@/lib/api/ai";
import type { ProviderConfigView } from "@/services/ai/types";

interface ProviderCardProps {
  provider: ProviderConfigView;
  cryptoReady: boolean;
  onUpdated: (providers: ProviderConfigView[]) => void;
}

export default function ProviderCard({ provider, cryptoReady, onUpdated }: ProviderCardProps) {
  const [model, setModel] = useState(provider.defaultModel);
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState(provider.baseUrl ?? "");
  const [enabled, setEnabled] = useState(provider.enabled);
  const [busy, setBusy] = useState<"save" | "active" | "test" | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const disabled = !provider.supported;

  const run = async (kind: "save" | "active" | "test", fn: () => Promise<void>) => {
    setBusy(kind);
    setMsg(null);
    try {
      await fn();
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Something went wrong." });
    }
    setBusy(null);
  };

  const save = (setActive: boolean) =>
    run(setActive ? "active" : "save", async () => {
      const next = await aiApi.saveProvider({
        provider: provider.provider,
        defaultModel: model,
        apiKey: apiKey ? apiKey : undefined,
        baseUrl,
        enabled,
        setActive,
      });
      onUpdated(next);
      setApiKey("");
      setMsg({ kind: "ok", text: setActive ? "Saved and set as active." : "Saved." });
    });

  const test = () =>
    run("test", async () => {
      const res = await aiApi.testProvider(provider.provider);
      setMsg({ kind: "ok", text: `Connection OK (${res.model}).` });
    });

  return (
    <Card sx={{ opacity: disabled ? 0.6 : 1 }}>
      <CardContent sx={{ p: 3, "&:last-child": { pb: 3 } }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {provider.label}
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            {provider.isActive && provider.enabled && (
              <Chip label="Active" size="small" color="success" sx={{ height: 22 }} />
            )}
            {provider.hasKey && (
              <Chip
                icon={<KeyRound size={13} />}
                label="Key set"
                size="small"
                sx={{ height: 22 }}
              />
            )}
            {disabled && <Chip label="Coming soon" size="small" sx={{ height: 22 }} />}
          </Box>
        </Box>

        {disabled ? (
          <Typography variant="body2" color="text.secondary">
            An adapter for {provider.label} isn&apos;t implemented yet. The provider seam is in place —
            adding it later is a new adapter file, no rewrite.
          </Typography>
        ) : (
          <>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
              <TextField
                select
                size="small"
                label="Model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
              >
                {provider.models.map((m) => (
                  <MenuItem key={m} value={m}>
                    {m}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                size="small"
                type="password"
                label="API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={provider.hasKey ? "•••••••• (leave blank to keep current)" : "Not set"}
                helperText={
                  cryptoReady
                    ? "Encrypted before saving. Leave blank to keep the existing key."
                    : "Set AI_CONFIG_SECRET first to save keys."
                }
                disabled={!cryptoReady}
              />

              <TextField
                size="small"
                label="Base URL (optional)"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.anthropic.com (default)"
              />

              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Switch checked={enabled} onChange={(e) => setEnabled(e.target.checked)} size="small" />
                <Typography variant="body2">Enabled</Typography>
              </Box>
            </Box>

            {msg && (
              <Alert severity={msg.kind === "ok" ? "success" : "error"} sx={{ mt: 2 }}>
                {msg.text}
              </Alert>
            )}

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
              <Button
                variant="contained"
                size="small"
                onClick={() => save(false)}
                disabled={busy !== null || !cryptoReady}
                startIcon={busy === "save" ? <CircularProgress size={14} color="inherit" /> : undefined}
              >
                Save
              </Button>
              {!provider.isActive && (
                <Button
                  variant="outlined"
                  size="small"
                  color="success"
                  onClick={() => save(true)}
                  disabled={busy !== null || !cryptoReady}
                  startIcon={
                    busy === "active" ? (
                      <CircularProgress size={14} color="inherit" />
                    ) : (
                      <CheckCircle2 size={15} />
                    )
                  }
                >
                  Save &amp; set active
                </Button>
              )}
              <Button
                variant="text"
                size="small"
                onClick={test}
                disabled={busy !== null || !provider.hasKey}
                startIcon={busy === "test" ? <CircularProgress size={14} color="inherit" /> : undefined}
              >
                Test connection
              </Button>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
}
