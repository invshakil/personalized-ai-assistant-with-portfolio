"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  TextField,
  Alert,
  Divider,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  CircularProgress,
  IconButton,
  Tooltip,
} from "@mui/material";
import { Database, Download, Trash2, Play, Cloud, CloudOff, Check } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { adminApi } from "@/lib/api/admin";
import { mobileCardTableSx } from "@/lib/mobileTableSx";
import type { AdminBackupState, BackupFrequency } from "@/types";

function formatBytes(n: number): string {
  if (n <= 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
const formatDateTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—";

export default function BackupSettingsPage() {
  const [state, setState] = useState<AdminBackupState | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState<string>("");
  const [retention, setRetention] = useState("7");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const s = await adminApi.getBackupState();
      setState(s);
      setRetention(String(s.settings.retentionCount));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load backup settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // One-time flash from the Google OAuth redirect (?drive=connected|error|denied).
    const drive = new URLSearchParams(window.location.search).get("drive");
    if (drive === "connected") setFlash("Google Drive connected.");
    else if (drive === "denied") setError("Google Drive connection was cancelled.");
    else if (drive === "error") setError("Google Drive connection failed. Please try again.");
    if (drive) window.history.replaceState({}, "", window.location.pathname);
  }, [load]);

  const setFrequency = async (frequency: BackupFrequency) => {
    setError("");
    try {
      await adminApi.updateBackupSettings({ frequency });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    }
  };

  const saveRetention = async () => {
    const n = parseInt(retention, 10);
    if (!Number.isFinite(n) || n < 1) return;
    try {
      await adminApi.updateBackupSettings({ retentionCount: n });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    }
  };

  const backupNow = async () => {
    setRunning(true);
    setError("");
    setFlash("");
    try {
      await adminApi.runBackupNow();
      setFlash("Backup created.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Backup failed");
    } finally {
      setRunning(false);
    }
  };

  const disconnectDrive = async () => {
    setBusy(true);
    try {
      await adminApi.disconnectDrive();
      await load();
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setBusy(true);
    try {
      await adminApi.deleteBackup(pendingDelete);
      setPendingDelete(null);
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  const s = state?.settings;

  return (
    <Box sx={{ maxWidth: 820 }}>
      <PageHeader
        title="Backups"
        subtitle="Schedule database backups and keep a copy in your Google Drive."
      />

      {flash && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          icon={<Check size={18} />}
          onClose={() => setFlash("")}
        >
          {flash}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {/* Schedule */}
      <Card sx={{ mb: 2.5 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
            <Box component="span" sx={{ color: "primary.main", display: "inline-flex" }}>
              <Database size={16} />
            </Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Schedule
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
            Automatic backups run while the app is online.
          </Typography>

          <ToggleButtonGroup
            exclusive
            size="small"
            value={s?.frequency ?? "off"}
            onChange={(_, v) => v && setFrequency(v)}
            sx={{ mb: 2.5 }}
          >
            <ToggleButton value="off" sx={{ px: 2 }}>
              Off
            </ToggleButton>
            <ToggleButton value="daily" sx={{ px: 2 }}>
              Daily
            </ToggleButton>
            <ToggleButton value="weekly" sx={{ px: 2 }}>
              Weekly
            </ToggleButton>
          </ToggleButtonGroup>

          <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
            <TextField
              label="Keep last"
              type="number"
              size="small"
              value={retention}
              onChange={(e) => setRetention(e.target.value)}
              onBlur={saveRetention}
              helperText="Older backups are pruned (local + Drive)"
              sx={{ width: 160 }}
            />
            <Button
              variant="contained"
              startIcon={
                running ? <CircularProgress size={14} color="inherit" /> : <Play size={15} />
              }
              onClick={backupNow}
              disabled={running}
              sx={{ fontWeight: 600 }}
            >
              {running ? "Backing up…" : "Backup now"}
            </Button>
          </Box>

          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Last run: {formatDateTime(s?.lastRunAt ?? null)}
            </Typography>
            {s?.lastStatus === "ok" && (
              <Chip
                label="OK"
                size="small"
                color="success"
                variant="outlined"
                sx={{ height: 20 }}
              />
            )}
            {s?.lastStatus === "error" && (
              <Tooltip title={s?.lastError ?? ""}>
                <Chip
                  label="Error"
                  size="small"
                  color="error"
                  variant="outlined"
                  sx={{ height: 20 }}
                />
              </Tooltip>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Google Drive */}
      <Card sx={{ mb: 2.5 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
            {s?.driveConnected ? (
              <Cloud size={16} style={{ color: "#28c76f" }} />
            ) : (
              <Box component="span" sx={{ color: "text.secondary", display: "inline-flex" }}>
                <CloudOff size={16} />
              </Box>
            )}
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Google Drive (offsite copy)
            </Typography>
          </Box>

          {!state?.driveConfigured ? (
            <Alert severity="info" sx={{ mt: 1 }}>
              Google OAuth isn’t configured on the server yet. Add{" "}
              <code>GOOGLE_OAUTH_CLIENT_ID</code> and <code>GOOGLE_OAUTH_CLIENT_SECRET</code> to
              enable uploading backups to your Drive. Local backups + download work without it.
            </Alert>
          ) : s?.driveConnected ? (
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Connected as <strong>{s.driveEmail || "your Google account"}</strong>. New backups
                are uploaded to a “sshakil DB backups” folder in your Drive.
              </Typography>
              <Button
                variant="outlined"
                color="inherit"
                size="small"
                onClick={disconnectDrive}
                disabled={busy}
              >
                Disconnect
              </Button>
            </Box>
          ) : (
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Connect your Google account to keep an offsite copy of every backup.
              </Typography>
              <Button
                variant="contained"
                size="small"
                startIcon={<Cloud size={15} />}
                onClick={() => {
                  window.location.href = "/api/admin/backup/google/start";
                }}
              >
                Connect Google Drive
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Backups list */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, p: 2.5, pb: 1.5 }}>
            Backups
          </Typography>
          <TableContainer>
            <Table size="small" sx={mobileCardTableSx}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Created</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Size</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Where</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(state?.records.length ?? 0) === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} sx={{ textAlign: "center", py: 4 }}>
                      <Typography color="text.secondary">No backups yet</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  state!.records.map((r) => (
                    <TableRow key={r.id} hover>
                      <TableCell data-label="Created">
                        {formatDateTime(r.createdAt)}
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: "block" }}
                        >
                          {r.trigger}
                        </Typography>
                      </TableCell>
                      <TableCell data-label="Size">{formatBytes(r.sizeBytes)}</TableCell>
                      <TableCell data-label="Where">
                        <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                          {r.location.includes("local") && (
                            <Chip
                              label="Local"
                              size="small"
                              variant="outlined"
                              sx={{ height: 20 }}
                            />
                          )}
                          {r.location.includes("drive") && (
                            <Chip
                              label="Drive"
                              size="small"
                              color="info"
                              variant="outlined"
                              sx={{ height: 20 }}
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell data-label="Status">
                        {r.status === "ok" ? (
                          <Chip
                            label="OK"
                            size="small"
                            color="success"
                            variant="outlined"
                            sx={{ height: 20 }}
                          />
                        ) : (
                          <Tooltip title={r.error ?? ""}>
                            <Chip
                              label="Error"
                              size="small"
                              color="error"
                              variant="outlined"
                              sx={{ height: 20 }}
                            />
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell align="right" data-label="Actions">
                        {r.status === "ok" && (
                          <Tooltip title="Download">
                            <IconButton
                              size="small"
                              onClick={() => window.open(`/api/admin/backup/${r.id}`, "_blank")}
                            >
                              <Download size={14} />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setPendingDelete(r.id)}
                          >
                            <Trash2 size={14} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>
        Backups use <code>pg_dump</code> (custom format). Restore with{" "}
        <code>pg_restore -d &lt;database&gt; &lt;file&gt;.dump</code>.
      </Typography>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete backup"
        message="This permanently deletes the backup file (local and Drive copies). This cannot be undone."
        confirmLabel="Delete"
        loading={busy}
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </Box>
  );
}
