"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  Divider,
  Chip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { Check, RefreshCw, Plus, Pencil, Trash2, X, History } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { solarApi } from "@/lib/api/solar";
import type { SolarSettingsData, TariffRow, TariffSlabInput } from "@/services/solar";

interface TariffForm {
  id: string | null;
  name: string;
  distributor: string;
  effectiveFrom: string; // YYYY-MM
  demandCharge: string;
  vatPercent: string;
  note: string;
  slabs: { fromUnit: string; toUnit: string; rate: string }[];
}

const emptyTariffForm = (): TariffForm => ({
  id: null,
  name: "",
  distributor: "BPDB",
  effectiveFrom: "",
  demandCharge: "0",
  vatPercent: "5",
  note: "",
  slabs: [{ fromUnit: "0", toUnit: "50", rate: "" }],
});

export default function SolarSettingsPage() {
  const [settings, setSettings] = useState<SolarSettingsData | null>(null);
  const [tariffs, setTariffs] = useState<TariffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");

  // System-info form fields (strings for controlled inputs).
  const [form, setForm] = useState({
    systemSizeKwp: "",
    batteryKwh: "",
    installCost: "",
    installDate: "",
    latitude: "",
    longitude: "",
    co2FactorKgPerKwh: "",
    currency: "BDT",
  });

  const [tariffDialog, setTariffDialog] = useState<TariffForm | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const hydrate = useCallback((s: SolarSettingsData) => {
    setSettings(s);
    setForm({
      systemSizeKwp: s.systemSizeKwp?.toString() ?? "",
      batteryKwh: s.batteryKwh?.toString() ?? "",
      installCost: s.installCost?.toString() ?? "",
      installDate: s.installDate ? s.installDate.slice(0, 10) : "",
      latitude: s.latitude?.toString() ?? "",
      longitude: s.longitude?.toString() ?? "",
      co2FactorKgPerKwh: s.co2FactorKgPerKwh?.toString() ?? "",
      currency: s.currency ?? "BDT",
    });
  }, []);

  const load = useCallback(async () => {
    try {
      const [s, t] = await Promise.all([solarApi.getSettings(), solarApi.listTariffs()]);
      hydrate(s);
      setTariffs(t ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load solar settings");
    } finally {
      setLoading(false);
    }
  }, [hydrate]);

  useEffect(() => {
    load();
  }, [load]);

  const set = (key: keyof typeof form, value: string) => {
    setSaved(false);
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const numOrNull = (v: string) => (v.trim() === "" ? null : Number(v));

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const s = await solarApi.updateSettings({
        systemSizeKwp: numOrNull(form.systemSizeKwp),
        batteryKwh: numOrNull(form.batteryKwh),
        installCost: Number(form.installCost) || 0,
        installDate: form.installDate || null,
        latitude: numOrNull(form.latitude),
        longitude: numOrNull(form.longitude),
        co2FactorKgPerKwh: Number(form.co2FactorKgPerKwh) || 0,
        currency: form.currency || "BDT",
      });
      hydrate(s);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    }
    setSaving(false);
  };

  const handleSync = async () => {
    setSyncing(true);
    setError("");
    setFlash("");
    try {
      const r = await solarApi.syncNow();
      setFlash(`Synced ${r.daysWritten} reading(s) across ${r.inverters} inverter(s).`);
      const s = await solarApi.getSettings();
      hydrate(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed");
    }
    setSyncing(false);
  };

  // Backfill every missing day from the install date. The server returns at most
  // a chunk per call, so we loop until nothing remains (bounded request time).
  const handleBackfill = async () => {
    const from = form.installDate || settings?.installDate?.slice(0, 10);
    if (!from) {
      setError("Set the install date first — that's where history starts.");
      return;
    }
    setBackfilling(true);
    setError("");
    setFlash("");
    try {
      let total = 0;
      // Safety cap on iterations (≈ BACKFILL_CHUNK × 40 days).
      for (let i = 0; i < 40; i++) {
        const r = await solarApi.syncNow({ from });
        total += r.daysWritten;
        setFlash(
          r.remaining > 0
            ? `Backfilling… ${total} day(s) so far, ${r.remaining} remaining.`
            : `Backfill complete — ${total} day(s) synced.`
        );
        if (r.remaining <= 0) break;
      }
      hydrate(await solarApi.getSettings());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Backfill failed");
    }
    setBackfilling(false);
  };

  // ── Tariff editor ──
  const openNewTariff = () => setTariffDialog(emptyTariffForm());
  const openEditTariff = (t: TariffRow) =>
    setTariffDialog({
      id: t.id,
      name: t.name,
      distributor: t.distributor,
      effectiveFrom: t.effectiveFrom ? t.effectiveFrom.slice(0, 7) : "",
      demandCharge: t.demandCharge.toString(),
      vatPercent: t.vatPercent.toString(),
      note: t.note ?? "",
      slabs: t.slabs.map((s) => ({
        fromUnit: String(s.fromUnit),
        toUnit: s.toUnit == null ? "" : String(s.toUnit),
        rate: String(s.rate),
      })),
    });

  const saveTariff = async () => {
    if (!tariffDialog) return;
    setError("");
    const slabs: TariffSlabInput[] = tariffDialog.slabs.map((s) => ({
      fromUnit: Number(s.fromUnit) || 0,
      toUnit: s.toUnit.trim() === "" ? null : Number(s.toUnit),
      rate: Number(s.rate) || 0,
    }));
    const payload = {
      name: tariffDialog.name,
      distributor: tariffDialog.distributor,
      effectiveFrom: tariffDialog.effectiveFrom,
      demandCharge: Number(tariffDialog.demandCharge) || 0,
      vatPercent: Number(tariffDialog.vatPercent) || 0,
      note: tariffDialog.note || null,
      slabs,
    };
    try {
      if (tariffDialog.id) await solarApi.updateTariff(tariffDialog.id, payload);
      else await solarApi.createTariff(payload);
      setTariffDialog(null);
      setTariffs((await solarApi.listTariffs()) ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save tariff");
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await solarApi.deleteTariff(deleteId);
      setTariffs((await solarApi.listTariffs()) ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete tariff");
    }
    setDeleteId(null);
  };

  const updateSlab = (i: number, key: "fromUnit" | "toUnit" | "rate", value: string) =>
    setTariffDialog((prev) =>
      prev
        ? { ...prev, slabs: prev.slabs.map((s, idx) => (idx === i ? { ...s, [key]: value } : s)) }
        : prev
    );
  const addSlab = () =>
    setTariffDialog((prev) =>
      prev ? { ...prev, slabs: [...prev.slabs, { fromUnit: "", toUnit: "", rate: "" }] } : prev
    );
  const removeSlab = (i: number) =>
    setTariffDialog((prev) =>
      prev ? { ...prev, slabs: prev.slabs.filter((_, idx) => idx !== i) } : prev
    );

  const header = (
    <PageHeader
      title="Solar"
      subtitle="SolisCloud system configuration, sync, and electricity tariffs."
    />
  );

  if (loading) {
    return (
      <Box>
        {header}
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 860 }}>
      {header}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      {flash && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setFlash("")}>
          {flash}
        </Alert>
      )}

      {/* Connection + sync */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3, "&:last-child": { pb: 3 } }}>
          <Box
            sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}
          >
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                SolisCloud connection
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                {settings?.configured ? (
                  <Chip size="small" color="success" label="Credentials configured" />
                ) : (
                  <Chip size="small" color="warning" label="Not configured" />
                )}
                {settings?.lastSyncAt && (
                  <Typography variant="caption" color="text.secondary">
                    Last sync {new Date(settings.lastSyncAt).toLocaleString()} ·{" "}
                    {settings.lastSyncStatus ?? "—"}
                  </Typography>
                )}
              </Box>
              {!settings?.configured && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mt: 1 }}
                >
                  Set SOLIS_KEY_ID, SOLIS_KEY_SECRET and SOLIS_API_URL in .env.local, then restart.
                </Typography>
              )}
              {settings?.lastSyncStatus === "error" && settings.lastSyncError && (
                <Typography variant="caption" color="error.main" sx={{ display: "block", mt: 1 }}>
                  {settings.lastSyncError}
                </Typography>
              )}
            </Box>
            <Box sx={{ display: "flex", gap: 1, flexShrink: 0 }}>
              <Button
                variant="outlined"
                onClick={handleBackfill}
                disabled={syncing || backfilling || !settings?.configured}
                startIcon={
                  backfilling ? (
                    <CircularProgress size={14} color="inherit" />
                  ) : (
                    <History size={16} />
                  )
                }
              >
                {backfilling ? "Backfilling…" : "Backfill history"}
              </Button>
              <Button
                variant="contained"
                onClick={handleSync}
                disabled={syncing || backfilling || !settings?.configured}
                startIcon={
                  syncing ? <CircularProgress size={14} color="inherit" /> : <RefreshCw size={16} />
                }
              >
                {syncing ? "Syncing…" : "Sync now"}
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* System info */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3, "&:last-child": { pb: 3 } }}>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
            System
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
            Used by the reports — install cost drives the payback tracker; location drives the
            weather forecast. Capacity/location auto-fill from SolisCloud if left blank.
          </Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
            <TextField
              label="System size (kWp)"
              size="small"
              type="number"
              value={form.systemSizeKwp}
              onChange={(e) => set("systemSizeKwp", e.target.value)}
            />
            <TextField
              label="Battery capacity (kWh)"
              size="small"
              type="number"
              value={form.batteryKwh}
              onChange={(e) => set("batteryKwh", e.target.value)}
            />
            <TextField
              label={`Install cost (${form.currency})`}
              size="small"
              type="number"
              value={form.installCost}
              onChange={(e) => set("installCost", e.target.value)}
            />
            <TextField
              label="Install date"
              size="small"
              type="date"
              slotProps={{ inputLabel: { shrink: true } }}
              value={form.installDate}
              onChange={(e) => set("installDate", e.target.value)}
            />
            <TextField
              label="Latitude"
              size="small"
              type="number"
              value={form.latitude}
              onChange={(e) => set("latitude", e.target.value)}
            />
            <TextField
              label="Longitude"
              size="small"
              type="number"
              value={form.longitude}
              onChange={(e) => set("longitude", e.target.value)}
            />
            <TextField
              label="CO₂ factor (kg/kWh)"
              size="small"
              type="number"
              value={form.co2FactorKgPerKwh}
              onChange={(e) => set("co2FactorKgPerKwh", e.target.value)}
            />
            <TextField
              label="Currency"
              size="small"
              value={form.currency}
              onChange={(e) => set("currency", e.target.value)}
            />
          </Box>
          <Divider sx={{ my: 2.5 }} />
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

      {/* Tariffs */}
      <Card>
        <CardContent sx={{ p: 3, "&:last-child": { pb: 3 } }}>
          <Box
            sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Electricity tariffs (BPDB)
            </Typography>
            <Button size="small" startIcon={<Plus size={15} />} onClick={openNewTariff}>
              Add tariff
            </Button>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
            Effective-dated slab rates. The tariff in force each month is the latest one starting on
            or before it. Verify the seeded rates against your bill.
          </Typography>

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Effective from</TableCell>
                <TableCell align="right">Slabs</TableCell>
                <TableCell align="right">VAT %</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {tariffs.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{t.name}</TableCell>
                  <TableCell>{t.effectiveFrom ? t.effectiveFrom.slice(0, 7) : "—"}</TableCell>
                  <TableCell align="right">{t.slabs.length}</TableCell>
                  <TableCell align="right">{t.vatPercent}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => openEditTariff(t)}>
                        <Pencil size={15} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" onClick={() => setDeleteId(t.id)}>
                        <Trash2 size={15} />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {tariffs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Typography variant="caption" color="text.secondary">
                      No tariffs yet.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Tariff editor dialog */}
      <Dialog open={!!tariffDialog} onClose={() => setTariffDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{tariffDialog?.id ? "Edit tariff" : "Add tariff"}</DialogTitle>
        <DialogContent>
          {tariffDialog && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
              <TextField
                label="Name"
                size="small"
                value={tariffDialog.name}
                onChange={(e) => setTariffDialog({ ...tariffDialog, name: e.target.value })}
              />
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                <TextField
                  label="Distributor"
                  size="small"
                  value={tariffDialog.distributor}
                  onChange={(e) =>
                    setTariffDialog({ ...tariffDialog, distributor: e.target.value })
                  }
                />
                <TextField
                  label="Effective from (YYYY-MM)"
                  size="small"
                  type="month"
                  slotProps={{ inputLabel: { shrink: true } }}
                  value={tariffDialog.effectiveFrom}
                  onChange={(e) =>
                    setTariffDialog({ ...tariffDialog, effectiveFrom: e.target.value })
                  }
                />
                <TextField
                  label="Demand charge (BDT/mo)"
                  size="small"
                  type="number"
                  value={tariffDialog.demandCharge}
                  onChange={(e) =>
                    setTariffDialog({ ...tariffDialog, demandCharge: e.target.value })
                  }
                />
                <TextField
                  label="VAT %"
                  size="small"
                  type="number"
                  value={tariffDialog.vatPercent}
                  onChange={(e) => setTariffDialog({ ...tariffDialog, vatPercent: e.target.value })}
                />
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Typography variant="caption" color="text.secondary">
                  Slabs (leave the last “to” blank for the unbounded top band)
                </Typography>
                <Button size="small" startIcon={<Plus size={14} />} onClick={addSlab}>
                  Slab
                </Button>
              </Box>
              {tariffDialog.slabs.map((s, i) => (
                <Box key={i} sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                  <TextField
                    label="From"
                    size="small"
                    type="number"
                    value={s.fromUnit}
                    onChange={(e) => updateSlab(i, "fromUnit", e.target.value)}
                  />
                  <TextField
                    label="To"
                    size="small"
                    type="number"
                    value={s.toUnit}
                    onChange={(e) => updateSlab(i, "toUnit", e.target.value)}
                  />
                  <TextField
                    label="৳/kWh"
                    size="small"
                    type="number"
                    value={s.rate}
                    onChange={(e) => updateSlab(i, "rate", e.target.value)}
                  />
                  <IconButton
                    size="small"
                    onClick={() => removeSlab(i)}
                    disabled={tariffDialog.slabs.length === 1}
                  >
                    <X size={15} />
                  </IconButton>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTariffDialog(null)}>Cancel</Button>
          <Button variant="contained" onClick={saveTariff}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete tariff?"
        message="This removes the tariff version and its slabs. Reports will fall back to the previous tariff for affected months."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onClose={() => setDeleteId(null)}
      />
    </Box>
  );
}
