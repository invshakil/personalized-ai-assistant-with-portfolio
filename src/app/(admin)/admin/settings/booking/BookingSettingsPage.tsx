"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { Calendar, Check, Clock, Plus, Trash2, X } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import { bookingApi } from "@/lib/api/booking";
import type {
  BookingBlackout,
  BookingSettings,
  BookingSettingsState,
  BookingWorkingHour,
} from "@/types";

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

// A short curated list keeps the picker usable. Add more if needed.
const COMMON_TZ = [
  "Asia/Dhaka",
  "Asia/Karachi",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Dubai",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Los_Angeles",
  "UTC",
];

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { dateStyle: "medium" });

export default function BookingSettingsPage() {
  const [state, setState] = useState<BookingSettingsState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");

  // Local draft mirrors `state.settings`; "Save changes" pushes diffs.
  const [draft, setDraft] = useState<BookingSettings | null>(null);
  const [newDuration, setNewDuration] = useState("");
  const [newBlackoutDate, setNewBlackoutDate] = useState("");
  const [newBlackoutReason, setNewBlackoutReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = await bookingApi.getSettings();
      setState(s);
      setDraft(s.settings);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // One-time flash from OAuth callback (?google=connected|denied|error).
    const flag = new URLSearchParams(window.location.search).get("google");
    if (flag === "connected") setFlash("Google Calendar connected.");
    else if (flag === "denied") setError("Google Calendar connection was cancelled.");
    else if (flag === "error") setError("Google Calendar connection failed. Please try again.");
    if (flag) window.history.replaceState({}, "", window.location.pathname);
  }, [load]);

  if (loading || !state || !draft) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  const setField = <K extends keyof BookingSettings>(key: K, value: BookingSettings[K]) => {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  };

  const setHourField = (idx: number, field: "start" | "end", value: string) => {
    setDraft((d) => {
      if (!d) return d;
      const hours = d.workingHours.map((h, i) => (i === idx ? { ...h, [field]: value } : h));
      return { ...d, workingHours: hours };
    });
  };

  const toggleWeekday = (weekday: number) => {
    setDraft((d) => {
      if (!d) return d;
      const has = d.workingHours.some((h) => h.weekday === weekday);
      const hours: BookingWorkingHour[] = has
        ? d.workingHours.filter((h) => h.weekday !== weekday)
        : [...d.workingHours, { weekday, start: "09:00", end: "18:00" }].sort(
            (a, b) => a.weekday - b.weekday
          );
      return { ...d, workingHours: hours };
    });
  };

  const addDuration = () => {
    const n = Number(newDuration);
    if (!Number.isFinite(n) || n < 5 || n > 240) return;
    setDraft((d) => {
      if (!d) return d;
      if (d.durationsMinutes.includes(n)) return d;
      return { ...d, durationsMinutes: [...d.durationsMinutes, n].sort((a, b) => a - b) };
    });
    setNewDuration("");
  };

  const removeDuration = (n: number) => {
    setDraft((d) =>
      d ? { ...d, durationsMinutes: d.durationsMinutes.filter((x) => x !== n) } : d
    );
  };

  const save = async () => {
    if (!draft) return;
    setError("");
    setFlash("");
    setSaving(true);
    try {
      const next = await bookingApi.updateSettings(draft);
      setState({ ...state, settings: next });
      setDraft(next);
      setFlash("Saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const addBlackout = async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newBlackoutDate)) return;
    try {
      const row = await bookingApi.addBlackout(newBlackoutDate, newBlackoutReason || null);
      setState({ ...state, blackouts: dedupeBlackouts([...state.blackouts, row]) });
      setNewBlackoutDate("");
      setNewBlackoutReason("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Add failed");
    }
  };

  const removeBlackout = async (id: string) => {
    try {
      await bookingApi.deleteBlackout(id);
      setState({ ...state, blackouts: state.blackouts.filter((b) => b.id !== id) });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const disconnect = async () => {
    setSaving(true);
    try {
      await bookingApi.disconnectGoogle();
      await load();
    } finally {
      setSaving(false);
    }
  };

  const s = state.settings;
  const enabledByWeekday = (wd: number) => draft.workingHours.some((h) => h.weekday === wd);

  return (
    <Box sx={{ maxWidth: 880 }}>
      <PageHeader
        title="Booking"
        subtitle="Public consultation scheduler. Visitors pick a slot, you get a Google Meet invite."
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

      {/* Master switch */}
      <Card sx={{ mb: 2.5 }}>
        <CardContent sx={{ p: 3 }}>
          <FormControlLabel
            control={
              <Switch
                checked={draft.enabled}
                onChange={(_, v) => setField("enabled", v)}
                color="primary"
              />
            }
            label={
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Bookings enabled
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Public picker is shown on the home page when both this is on and Google is
                  connected.
                </Typography>
              </Box>
            }
          />
        </CardContent>
      </Card>

      {/* Google connection */}
      <Card sx={{ mb: 2.5 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
            <Calendar size={16} color={s.googleConnected ? "#28c76f" : undefined} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Google Calendar
            </Typography>
          </Box>
          {!state.googleConfigured ? (
            <Alert severity="info" sx={{ mt: 1 }}>
              Add <code>GOOGLE_OAUTH_CLIENT_ID</code> and <code>GOOGLE_OAUTH_CLIENT_SECRET</code> to
              the server env, then come back here to connect.
            </Alert>
          ) : s.googleConnected ? (
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Connected as <strong>{s.googleEmail || "your Google account"}</strong>. Events are
                created on calendar <code>{s.calendarId}</code> and the invite is sent to the
                visitor.
              </Typography>
              <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", flexWrap: "wrap" }}>
                <TextField
                  label="Calendar ID"
                  size="small"
                  value={draft.calendarId}
                  onChange={(e) => setField("calendarId", e.target.value)}
                  helperText="Usually 'primary'"
                  sx={{ width: 220 }}
                />
                <Button
                  variant="outlined"
                  color="inherit"
                  size="small"
                  onClick={disconnect}
                  disabled={saving}
                >
                  Disconnect
                </Button>
              </Box>
            </Box>
          ) : (
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Authorize the app to create events + read freeBusy. Same OAuth client as Drive
                backups.
              </Typography>
              <Button
                variant="contained"
                size="small"
                startIcon={<Calendar size={15} />}
                onClick={() => {
                  window.location.href = "/api/admin/booking/google/start";
                }}
              >
                Connect Google Calendar
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Slot rules */}
      <Card sx={{ mb: 2.5 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <Clock size={16} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Slot rules
            </Typography>
          </Box>

          {/* Durations */}
          <Typography variant="caption" color="text.secondary">
            Offered meeting durations (minutes)
          </Typography>
          <Box
            sx={{ mt: 1, mb: 2, display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center" }}
          >
            {draft.durationsMinutes.map((n) => (
              <Chip
                key={n}
                label={`${n} min`}
                onDelete={() => removeDuration(n)}
                deleteIcon={<X size={14} />}
              />
            ))}
            <TextField
              size="small"
              type="number"
              value={newDuration}
              onChange={(e) => setNewDuration(e.target.value)}
              placeholder="e.g. 30"
              sx={{ width: 110 }}
            />
            <Button size="small" startIcon={<Plus size={14} />} onClick={addDuration}>
              Add
            </Button>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Numbers row */}
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 2 }}>
            <TextField
              label="Slot increment (min)"
              size="small"
              type="number"
              value={draft.slotIncrementMinutes}
              onChange={(e) => setField("slotIncrementMinutes", Number(e.target.value) || 0)}
              sx={{ width: 170 }}
            />
            <TextField
              label="Buffer between (min)"
              size="small"
              type="number"
              value={draft.bufferMinutes}
              onChange={(e) => setField("bufferMinutes", Number(e.target.value) || 0)}
              sx={{ width: 170 }}
            />
            <TextField
              label="Min notice (hours)"
              size="small"
              type="number"
              value={draft.minNoticeHours}
              onChange={(e) => setField("minNoticeHours", Number(e.target.value) || 0)}
              sx={{ width: 170 }}
            />
            <TextField
              label="Max horizon (days)"
              size="small"
              type="number"
              value={draft.maxHorizonDays}
              onChange={(e) => setField("maxHorizonDays", Number(e.target.value) || 0)}
              sx={{ width: 170 }}
            />
            <TextField
              label="Timezone"
              select
              size="small"
              value={draft.timezone}
              onChange={(e) => setField("timezone", e.target.value)}
              sx={{ width: 220 }}
            >
              {COMMON_TZ.map((tz) => (
                <MenuItem key={tz} value={tz}>
                  {tz}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Working hours grid */}
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
            Working hours
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {WEEKDAY_NAMES.map((name, wd) => {
              const enabled = enabledByWeekday(wd);
              const idx = draft.workingHours.findIndex((h) => h.weekday === wd);
              const row = idx >= 0 ? draft.workingHours[idx] : null;
              return (
                <Box
                  key={wd}
                  sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}
                >
                  <FormControlLabel
                    control={
                      <Switch checked={enabled} onChange={() => toggleWeekday(wd)} size="small" />
                    }
                    label={<Typography sx={{ width: 90 }}>{name}</Typography>}
                  />
                  {row && (
                    <>
                      <TextField
                        type="time"
                        size="small"
                        value={row.start}
                        onChange={(e) => setHourField(idx, "start", e.target.value)}
                        sx={{ width: 130 }}
                      />
                      <Typography variant="body2" color="text.secondary">
                        to
                      </Typography>
                      <TextField
                        type="time"
                        size="small"
                        value={row.end}
                        onChange={(e) => setHourField(idx, "end", e.target.value)}
                        sx={{ width: 130 }}
                      />
                    </>
                  )}
                </Box>
              );
            })}
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <TextField
              label="Meeting title"
              size="small"
              value={draft.meetingTitleTemplate}
              onChange={(e) => setField("meetingTitleTemplate", e.target.value)}
              helperText="{name} expands to the visitor's name"
              sx={{ minWidth: 280 }}
            />
            <TextField
              label="Notification email (optional)"
              size="small"
              type="email"
              value={draft.notifyEmail ?? ""}
              onChange={(e) => setField("notifyEmail", e.target.value || null)}
              helperText="Added as a calendar attendee on every booking"
              sx={{ minWidth: 280 }}
            />
          </Box>
          <TextField
            label="Meeting description (optional)"
            multiline
            rows={2}
            value={draft.meetingDescription ?? ""}
            onChange={(e) => setField("meetingDescription", e.target.value || null)}
            sx={{ mt: 2, width: "100%" }}
          />
        </CardContent>
      </Card>

      {/* Blackouts */}
      <Card sx={{ mb: 2.5 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
            Blackout dates
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
            No slots are offered on these dates (holidays, vacation).
          </Typography>
          <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", flexWrap: "wrap", mb: 2 }}>
            <TextField
              type="date"
              size="small"
              label="Date"
              slotProps={{ inputLabel: { shrink: true } }}
              value={newBlackoutDate}
              onChange={(e) => setNewBlackoutDate(e.target.value)}
            />
            <TextField
              size="small"
              label="Reason (optional)"
              value={newBlackoutReason}
              onChange={(e) => setNewBlackoutReason(e.target.value)}
              sx={{ minWidth: 220 }}
            />
            <Button startIcon={<Plus size={14} />} variant="outlined" onClick={addBlackout}>
              Add
            </Button>
          </Box>
          {state.blackouts.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              None.
            </Typography>
          ) : (
            <Box>
              {state.blackouts.map((b, i) => (
                <Box
                  key={b.id}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    py: 0.75,
                    borderTop: i === 0 ? 0 : 1,
                    borderColor: "divider",
                  }}
                >
                  <Box>
                    <Typography variant="body2">{formatDate(b.date)}</Typography>
                    {b.reason && (
                      <Typography variant="caption" color="text.secondary">
                        {b.reason}
                      </Typography>
                    )}
                  </Box>
                  <Tooltip title="Delete">
                    <IconButton size="small" onClick={() => removeBlackout(b.id)}>
                      <Trash2 size={14} />
                    </IconButton>
                  </Tooltip>
                </Box>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* WhatsApp */}
      <Card sx={{ mb: 2.5 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
            WhatsApp quick-message button
          </Typography>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
            <FormControlLabel
              control={
                <Switch
                  checked={draft.whatsappEnabled}
                  onChange={(_, v) => setField("whatsappEnabled", v)}
                  color="primary"
                />
              }
              label="Show on home"
            />
            <TextField
              label="Number (international, digits only)"
              size="small"
              value={draft.whatsappNumber ?? ""}
              onChange={(e) => setField("whatsappNumber", e.target.value || null)}
              helperText="e.g. 8801675332265"
              sx={{ minWidth: 280 }}
            />
            <TextField
              label="Prefill message (optional)"
              size="small"
              value={draft.whatsappPrefill ?? ""}
              onChange={(e) => setField("whatsappPrefill", e.target.value || null)}
              sx={{ minWidth: 280 }}
            />
          </Box>
        </CardContent>
      </Card>

      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1.5 }}>
        <Button onClick={load} color="inherit" disabled={saving}>
          Reset
        </Button>
        <Button
          variant="contained"
          onClick={save}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : null}
        >
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </Box>
    </Box>
  );
}

function dedupeBlackouts(list: BookingBlackout[]): BookingBlackout[] {
  const map = new Map(list.map((b) => [b.date.slice(0, 10), b]));
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}
