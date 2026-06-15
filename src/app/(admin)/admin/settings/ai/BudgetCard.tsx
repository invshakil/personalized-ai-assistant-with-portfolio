"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Switch,
  Button,
  Alert,
  Chip,
  LinearProgress,
  CircularProgress,
  InputAdornment,
} from "@mui/material";
import { Wallet } from "lucide-react";
import { aiApi } from "@/lib/api/ai";
import type { UsageSummary } from "@/services/ai/types";

const usd = (n: number) => `$${n.toFixed(n > 0 && n < 1 ? 4 : 2)}`;

export default function BudgetCard() {
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [limit, setLimit] = useState("");
  const [enforce, setEnforce] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const load = async () => {
    const u = await aiApi.getUsage();
    setUsage(u);
    setLimit(u.monthlyLimitUsd === null ? "" : String(u.monthlyLimitUsd));
    setEnforce(u.enforce);
  };

  useEffect(() => {
    load().catch(() => setMsg({ kind: "err", text: "Failed to load usage." }));
  }, []);

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      await aiApi.saveBudget({
        monthlyLimitUsd: limit.trim() === "" ? null : Number(limit),
        enforce,
      });
      await load();
      setMsg({ kind: "ok", text: "Budget saved." });
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Failed to save." });
    }
    setSaving(false);
  };

  const pct = usage?.pctUsed ?? null;
  const barColor =
    pct === null ? "primary" : pct >= 100 ? "error" : pct >= 80 ? "warning" : "success";

  return (
    <Card>
      <CardContent sx={{ p: 3, "&:last-child": { pb: 3 } }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
          <Wallet size={17} />
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Monthly AI budget
          </Typography>
          {usage?.overBudget && (
            <Chip label="Exceeded" size="small" color="error" sx={{ height: 22 }} />
          )}
        </Box>
        <Typography variant="caption" color="text.secondary">
          Token costs are billed in USD. When enforcement is on and this month&apos;s spend reaches
          the limit, the AI chat is blocked until next month or until you raise the limit.
        </Typography>

        {usage && (
          <Box sx={{ mt: 2, mb: 2 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                Spent this month: <strong>{usd(usage.monthToDate)}</strong>
                {usage.monthlyLimitUsd !== null && ` of ${usd(usage.monthlyLimitUsd)}`}
              </Typography>
              {usage.remaining !== null && (
                <Typography variant="caption" color="text.secondary">
                  {usd(usage.remaining)} left
                </Typography>
              )}
            </Box>
            <LinearProgress
              variant="determinate"
              value={Math.min(100, pct ?? 0)}
              color={barColor}
              sx={{ height: 6, borderRadius: 3 }}
            />
          </Box>
        )}

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
          <TextField
            size="small"
            label="Monthly limit"
            type="number"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            placeholder="No limit"
            helperText="Leave blank for no limit."
            slotProps={{
              input: { startAdornment: <InputAdornment position="start">$</InputAdornment> },
            }}
            sx={{ maxWidth: 240 }}
          />
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Switch checked={enforce} onChange={(e) => setEnforce(e.target.checked)} size="small" />
            <Typography variant="body2">Block the chat when the limit is reached</Typography>
          </Box>
        </Box>

        {msg && (
          <Alert severity={msg.kind === "ok" ? "success" : "error"} sx={{ mt: 2 }}>
            {msg.text}
          </Alert>
        )}

        <Button
          variant="contained"
          size="small"
          onClick={save}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}
          sx={{ mt: 2.5 }}
        >
          Save budget
        </Button>
      </CardContent>
    </Card>
  );
}
