"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Drawer,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import { Plus, Pencil, PowerOff, ChevronDown } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";

function fmt(n: number) { return `৳${n.toLocaleString()}`; }

type ServiceEntry = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  assignedCount: number;
  tenants: {
    id: string;
    tenantId: string;
    tenantCode: string | null;
    tenantName: string;
    monthlyFee: number;
    startDate: string;
    endDate: string | null;
  }[];
};

type TenantOption = { id: string; tenantCode: string | null; name: string };

export default function ServicesPage() {
  const [services, setServices] = useState<ServiceEntry[]>([]);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [serviceDrawer, setServiceDrawer] = useState(false);
  const [assignDrawer, setAssignDrawer] = useState(false);
  const [editingService, setEditingService] = useState<ServiceEntry | null>(null);
  const [serviceName, setServiceName] = useState("");
  const [serviceDesc, setServiceDesc] = useState("");
  const [assignTenant, setAssignTenant] = useState("");
  const [assignService, setAssignService] = useState("");
  const [assignFee, setAssignFee] = useState("");
  const [assignDate, setAssignDate] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, tRes] = await Promise.all([
        fetch("/api/admin/property/services"),
        fetch("/api/admin/property/tenants?filter=all"),
      ]);
      const [sJson, tJson] = await Promise.all([sRes.json(), tRes.json()]);
      setServices(sJson.data ?? []);
      setTenants(tJson.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAddService = () => {
    setEditingService(null);
    setServiceName("");
    setServiceDesc("");
    setError(null);
    setServiceDrawer(true);
  };

  const openEditService = (s: ServiceEntry) => {
    setEditingService(s);
    setServiceName(s.name);
    setServiceDesc(s.description ?? "");
    setError(null);
    setServiceDrawer(true);
  };

  const saveService = async () => {
    setSaving(true);
    setError(null);
    try {
      const url = editingService ? `/api/admin/property/services/${editingService.id}` : "/api/admin/property/services";
      const res = await fetch(url, {
        method: editingService ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: serviceName, description: serviceDesc || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setServiceDrawer(false);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (id: string) => {
    if (!confirm("Deactivate this service?")) return;
    await fetch(`/api/admin/property/services/${id}`, { method: "DELETE" });
    load();
  };

  const endAssignment = async (tsId: string) => {
    if (!confirm("End this service subscription?")) return;
    await fetch(`/api/admin/property/services/assign/${tsId}`, { method: "DELETE" });
    load();
  };

  const saveAssignment = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/property/services/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: assignTenant,
          serviceId: assignService,
          monthlyFee: parseFloat(assignFee),
          startDate: assignDate,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setAssignDrawer(false);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <PageHeader title="Add-On Services" subtitle="Manage service catalog and tenant subscriptions" />

      <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
        <Button variant="contained" startIcon={<Plus size={16} />} onClick={openAddService}>
          Add Service
        </Button>
        <Button
          variant="outlined"
          startIcon={<Plus size={16} />}
          onClick={() => {
            setAssignTenant("");
            setAssignService("");
            setAssignFee("");
            setAssignDate(new Date().toISOString().split("T")[0]);
            setError(null);
            setAssignDrawer(true);
          }}
        >
          Assign to Tenant
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {services.map((s) => (
            <Accordion key={s.id} sx={{ bgcolor: "background.paper" }}>
              <AccordionSummary expandIcon={<ChevronDown size={16} />}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2, width: "100%" }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{s.name}</Typography>
                  {s.description && (
                    <Typography variant="caption" color="text.secondary">{s.description}</Typography>
                  )}
                  <Box sx={{ ml: "auto", display: "flex", gap: 1, alignItems: "center" }}>
                    <Chip
                      label={`${s.assignedCount} tenant${s.assignedCount !== 1 ? "s" : ""}`}
                      size="small"
                      sx={{ bgcolor: "primary.main", color: "#fff", fontSize: "0.6875rem" }}
                    />
                    <Chip
                      label={s.isActive ? "Active" : "Inactive"}
                      size="small"
                      sx={{ bgcolor: s.isActive ? "success.main" : "error.main", color: "#fff", fontSize: "0.6875rem" }}
                    />
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); openEditService(s); }}>
                        <Pencil size={14} />
                      </IconButton>
                    </Tooltip>
                    {s.isActive && (
                      <Tooltip title="Deactivate">
                        <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); deactivate(s.id); }}>
                          <PowerOff size={14} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                {s.tenants.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No tenants currently subscribed.
                  </Typography>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>Tenant</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Monthly Fee</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Start Date</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {s.tenants.map((t) => (
                          <TableRow key={t.id}>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>{t.tenantName}</Typography>
                              <Typography variant="caption" color="text.secondary">{t.tenantCode}</Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: "primary.main" }}>
                                {fmt(t.monthlyFee)}/mo
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {new Date(t.startDate).toLocaleDateString()}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Tooltip title="End subscription">
                                <IconButton size="small" color="error" onClick={() => endAssignment(t.id)}>
                                  <PowerOff size={14} />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </AccordionDetails>
            </Accordion>
          ))}
          {services.length === 0 && (
            <Card sx={{ bgcolor: "background.paper" }}>
              <CardContent sx={{ textAlign: "center", py: 6 }}>
                <Typography color="text.secondary">No services defined yet. Add your first service.</Typography>
              </CardContent>
            </Card>
          )}
        </Box>
      )}

      {/* Add/Edit Service Drawer */}
      <Drawer anchor="right" open={serviceDrawer} onClose={() => setServiceDrawer(false)}>
        <Box sx={{ width: 340, p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            {editingService ? "Edit Service" : "Add Service"}
          </Typography>
          <TextField
            label="Service Name" size="small" fullWidth
            value={serviceName}
            onChange={(e) => setServiceName(e.target.value)}
            sx={{ mb: 2 }}
            placeholder="e.g. WiFi, Parking, Generator"
          />
          <TextField
            label="Description (optional)" size="small" fullWidth
            value={serviceDesc}
            onChange={(e) => setServiceDesc(e.target.value)}
            sx={{ mb: 2 }}
          />
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Button variant="contained" fullWidth onClick={saveService} disabled={saving || !serviceName}>
            {saving ? "Saving…" : editingService ? "Save Changes" : "Add Service"}
          </Button>
        </Box>
      </Drawer>

      {/* Assign Service Drawer */}
      <Drawer anchor="right" open={assignDrawer} onClose={() => setAssignDrawer(false)}>
        <Box sx={{ width: 360, p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Assign Service to Tenant</Typography>
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Tenant</InputLabel>
            <Select label="Tenant" value={assignTenant} onChange={(e) => setAssignTenant(e.target.value)}>
              {tenants.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.tenantCode ? `${t.tenantCode} · ` : ""}{t.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Service</InputLabel>
            <Select label="Service" value={assignService} onChange={(e) => setAssignService(e.target.value)}>
              {services.filter((s) => s.isActive).map((s) => (
                <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Monthly Fee (৳)" type="number" size="small" fullWidth
            value={assignFee}
            onChange={(e) => setAssignFee(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Start Date" type="date" size="small" fullWidth
            value={assignDate}
            onChange={(e) => setAssignDate(e.target.value)}
            sx={{ mb: 2 }}
          />
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Button
            variant="contained" fullWidth onClick={saveAssignment}
            disabled={saving || !assignTenant || !assignService || !assignFee}
          >
            {saving ? "Saving…" : "Assign Service"}
          </Button>
        </Box>
      </Drawer>
    </Box>
  );
}
