"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Grid,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Drawer,
  IconButton,
  Divider,
  CircularProgress,
  Tooltip,
  TextField,
  InputAdornment,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import {
  Building2,
  X,
  Phone,
  Calendar,
  DollarSign,
  UserCheck,
  UserX,
  UserPlus,
  ExternalLink,
  Plus,
  Pencil,
  TrendingUp,
  MapPin,
  Search,
} from "lucide-react";
import Link from "next/link";
import PageHeader from "@/components/admin/PageHeader";
import SearchableSelect, { type SelectOption } from "@/components/admin/SearchableSelect";
import MultiSearchableSelect from "@/components/admin/MultiSearchableSelect";
import TenantDocuments from "@/components/admin/TenantDocuments";
import { propertyApi } from "@/lib/api/property";
import { moneyApi } from "@/lib/api/money";
import { mobileCardTableSx } from "@/lib/mobileTableSx";
import type { UnitWithTenant, MoneyAccountRow } from "@/types";

// Sentinel for the optional "don't add advance to wallet" choice.
const NO_ACCOUNT = "";

function fmt(n: number) {
  return `৳${n.toLocaleString()}`;
}

// Given a YYYY-MM-DD string, return the calendar day before it (also YYYY-MM-DD).
// Parse and step in UTC so the result is timezone-independent (a local parse +
// toISOString() can shift the date by a day in non-UTC zones).
function dayBefore(iso: string): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function StatusChip({ isOccupied }: { isOccupied: boolean }) {
  return (
    <Chip
      label={isOccupied ? "Occupied" : "Vacant"}
      size="small"
      sx={{
        bgcolor: isOccupied ? "success.main" : "warning.main",
        color: "#fff",
        fontWeight: 600,
        fontSize: "0.6875rem",
        height: 20,
      }}
    />
  );
}

interface UnitForm {
  unitNumber: string;
  floor: string;
  monthlyRent: string;
  description: string;
  notes: string;
}
interface TenantForm {
  name: string;
  phone: string;
  moveInDate: string;
  leaseEndDate: string;
  advancePaid: boolean;
  advanceAmount: string;
}
interface RentChangeForm {
  effectiveDate: string;
  newRent: string;
  reason: string;
}
interface AddTenantForm {
  name: string;
  phone: string;
  unitId: string;
  customRent: string;
  moveInDate: string;
  leaseEndDate: string;
  advancePaid: boolean;
  advanceAmount: string;
  outgoingMoveOutDate: string;
}

// URL <-> tab-index mapping for the three top-level tabs.
const TAB_KEYS = ["units", "tenants", "external"] as const;
type TabKey = (typeof TAB_KEYS)[number];

export default function PropertyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // ── Tab + sub-view + tenant filters live in the URL (restored on reload) ──
  const tabKey = (searchParams.get("tab") as TabKey | null) ?? "units";
  const tab = Math.max(0, TAB_KEYS.indexOf(tabKey));
  const tenantView = searchParams.get("tstatus") === "past" ? "past" : "active";
  const extView = searchParams.get("tstatus") === "past" ? "past" : "active";
  // Tenants-tab filters
  const tenantUnitParam = searchParams.get("tunit") ?? "";
  const tenantUnitFilter = useMemo(
    () => tenantUnitParam.split(",").filter(Boolean),
    [tenantUnitParam]
  );
  const tenantStateFilter = searchParams.get("tstate") ?? "ALL"; // ALL | CURRENT | FUTURE
  const tenantQuery = searchParams.get("tq") ?? "";

  /** Merge a patch into the URL query (undefined/"" removes the key). */
  const setParams = useCallback(
    (patch: Record<string, string | undefined>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined || v === "") next.delete(k);
        else next.set(k, v);
      }
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [searchParams, pathname, router]
  );

  const setTab = (i: number) =>
    setParams({ tab: TAB_KEYS[i] === "units" ? undefined : TAB_KEYS[i] });
  const setTenantView = (v: "active" | "past") =>
    setParams({ tstatus: v === "active" ? undefined : "past" });
  const setExtView = setTenantView;

  const [units, setUnits] = useState<UnitWithTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inactiveRows, setInactiveRows] = useState<UnitWithTenant[]>([]);
  const [inactiveLoading, setInactiveLoading] = useState(false);
  const [unassignedRows, setUnassignedRows] = useState<UnitWithTenant[]>([]);

  // Debounced tenant search box: local input mirrors ?tq.
  const [tenantSearchInput, setTenantSearchInput] = useState(tenantQuery);
  useEffect(() => {
    setTenantSearchInput(tenantQuery);
  }, [tenantQuery]);
  useEffect(() => {
    const t = setTimeout(() => {
      if (tenantSearchInput !== tenantQuery) setParams({ tq: tenantSearchInput || undefined });
    }, 350);
    return () => clearTimeout(t);
  }, [tenantSearchInput, tenantQuery, setParams]);
  const [serviceCatalog, setServiceCatalog] = useState<{ id: string; name: string }[]>([]);
  const [addSvcId, setAddSvcId] = useState("");
  const [addSvcFee, setAddSvcFee] = useState("");
  const [addSvcDate, setAddSvcDate] = useState("");

  // Confirmation dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    confirmColor?: "error" | "warning" | "success" | "primary";
    onConfirm: () => Promise<void>;
  } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const openConfirm = (
    title: string,
    message: string,
    onConfirm: () => Promise<void>,
    opts?: { confirmLabel?: string; confirmColor?: "error" | "warning" | "success" | "primary" }
  ) => {
    setConfirmDialog({ title, message, onConfirm, ...opts });
  };

  const runConfirm = async () => {
    if (!confirmDialog) return;
    setConfirmLoading(true);
    try {
      await confirmDialog.onConfirm();
    } finally {
      setConfirmLoading(false);
      setConfirmDialog(null);
    }
  };

  // Unit drawer
  const [drawerUnit, setDrawerUnit] = useState<UnitWithTenant | null>(null);
  const [unitEditMode, setUnitEditMode] = useState(false);
  const [unitForm, setUnitForm] = useState<UnitForm>({
    unitNumber: "",
    floor: "",
    monthlyRent: "",
    description: "",
    notes: "",
  });

  // Tenant edit drawer
  const [editTenantRow, setEditTenantRow] = useState<UnitWithTenant | null>(null);
  const [tenantForm, setTenantForm] = useState<TenantForm>({
    name: "",
    phone: "",
    moveInDate: "",
    leaseEndDate: "",
    advancePaid: false,
    advanceAmount: "0",
  });
  const [showRcForm, setShowRcForm] = useState(false);
  const [rcForm, setRcForm] = useState<RentChangeForm>({
    effectiveDate: "",
    newRent: "",
    reason: "",
  });

  // Add tenant / external member drawer
  const [addOpen, setAddOpen] = useState(false);
  const [isAddingExternal, setIsAddingExternal] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const addFileInputRef = useRef<HTMLInputElement>(null);
  const [addForm, setAddForm] = useState<AddTenantForm>({
    name: "",
    phone: "",
    unitId: "",
    customRent: "",
    moveInDate: "",
    leaseEndDate: "",
    advancePaid: false,
    advanceAmount: "",
    outgoingMoveOutDate: "",
  });
  // Optional Money-Manager wallet to credit with the advance (add-tenant only).
  const [advanceAccountId, setAdvanceAccountId] = useState<string>(NO_ACCOUNT);
  const [accounts, setAccounts] = useState<MoneyAccountRow[]>([]);

  // Money accounts for the optional advance wallet link (loaded once).
  useEffect(() => {
    moneyApi.listAccounts().then((a) => setAccounts(a ?? []));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Auto-deactivate any tenants whose lease has expired (fire-and-forget; silent)
      propertyApi.autoDeactivateExpired().catch(() => {});

      const [unitData, activeTenants] = await Promise.all([
        propertyApi.listUnits(),
        propertyApi.listTenants("active"),
      ]);
      setUnits(unitData ?? []);

      // Active tenants with no unit (e.g. after re-activation before unit reassignment)
      // Include futureTenant IDs so scheduled tenants aren't also listed under "Unassigned"
      const unitTenantIds = new Set([
        ...(unitData ?? []).map((u) => u.tenant?.id).filter(Boolean),
        ...(unitData ?? []).map((u) => u.futureTenant?.id).filter(Boolean),
      ]);
      type ActiveTenant = {
        id: string;
        tenantCode: string | null;
        name: string;
        phone: string | null;
        isExternal: boolean;
        moveInDate: string;
        moveOutDate: string | null;
        leaseEndDate: string | null;
        advancePaid: boolean;
        advanceAmount: number;
        advanceSettled: boolean;
        services?: { id: string; serviceName: string; monthlyFee: number }[];
      };
      const unassigned: UnitWithTenant[] = ((activeTenants ?? []) as unknown as ActiveTenant[])
        .filter((t) => !unitTenantIds.has(t.id))
        .map((t) => ({
          id: `unassigned-${t.id}`,
          unitNumber: "Unassigned",
          floor: "—",
          monthlyRent: 0,
          description: null,
          isOccupied: false,
          notes: null,
          futureTenant: null,
          tenant: {
            id: t.id,
            tenantCode: t.tenantCode,
            name: t.name,
            phone: t.phone,
            isActive: true,
            isExternal: t.isExternal,
            tenantStatus: "CURRENT" as const,
            moveInDate: t.moveInDate,
            moveOutDate: t.moveOutDate ?? null,
            leaseEndDate: t.leaseEndDate,
            advancePaid: t.advancePaid,
            advanceAmount: t.advanceAmount,
            advanceSettled: t.advanceSettled,
            services: t.services ?? [],
          },
        }));
      setUnassignedRows(unassigned);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadInactive = useCallback(async () => {
    setInactiveLoading(true);
    try {
      // Past tenants have no unit/status; only the name/phone search applies.
      const inactiveTenants = await propertyApi.listTenants({
        filter: "inactive",
        ...(tenantQuery && { q: tenantQuery }),
      });
      type InactiveTenant = {
        id: string;
        tenantCode: string | null;
        name: string;
        phone: string | null;
        isExternal: boolean;
        moveInDate: string;
        moveOutDate: string | null;
        leaseEndDate: string | null;
        advancePaid: boolean;
        advanceAmount: number;
        advanceSettled: boolean;
        lastRent: number | null;
      };
      setInactiveRows(
        ((inactiveTenants ?? []) as unknown as InactiveTenant[]).map((t) => ({
          id: t.id,
          unitNumber: "—",
          floor: "—",
          monthlyRent: t.lastRent ?? 0,
          description: null,
          isOccupied: false,
          notes: null,
          futureTenant: null,
          tenant: {
            id: t.id,
            tenantCode: t.tenantCode,
            name: t.name,
            phone: t.phone,
            isActive: false,
            isExternal: t.isExternal,
            tenantStatus: "PAST" as const,
            moveInDate: t.moveInDate,
            moveOutDate: t.moveOutDate ?? null,
            leaseEndDate: t.leaseEndDate,
            advancePaid: t.advancePaid,
            advanceAmount: t.advanceAmount,
            advanceSettled: t.advanceSettled,
          },
        }))
      );
    } finally {
      setInactiveLoading(false);
    }
  }, [tenantQuery]);

  // Reload the Past list when its search query changes while it is visible.
  useEffect(() => {
    if (tenantView === "past" || extView === "past") loadInactive();
  }, [tenantView, extView, loadInactive]);

  useEffect(() => {
    load();
    propertyApi
      .listServices()
      .then((services) =>
        setServiceCatalog(
          ((services ?? []) as { id: string; name: string; isActive: boolean }[])
            .filter((s) => s.isActive)
            .map((s) => ({ id: s.id, name: s.name }))
        )
      );
  }, [load]);

  const saveUnit = async () => {
    if (!drawerUnit) return;
    setSaving(true);
    try {
      await propertyApi.updateUnit(drawerUnit.id, {
        unitNumber: unitForm.unitNumber,
        floor: unitForm.floor,
        monthlyRent: Number(unitForm.monthlyRent),
        description: unitForm.description || null,
        notes: unitForm.notes || null,
      });
      setUnitEditMode(false);
      setDrawerUnit(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const openTenantEdit = (row: UnitWithTenant) => {
    const t = row.tenant!;
    setAddSvcId("");
    setAddSvcFee("");
    setAddSvcDate(new Date().toISOString().split("T")[0]);
    setEditTenantRow(row);
    setTenantForm({
      name: t.name,
      phone: t.phone ?? "",
      moveInDate: t.moveInDate.split("T")[0],
      leaseEndDate: t.leaseEndDate ? t.leaseEndDate.split("T")[0] : "",
      advancePaid: t.advancePaid,
      advanceAmount: String(t.advanceAmount),
    });
    setShowRcForm(false);
    setRcForm({ effectiveDate: "", newRent: String(row.monthlyRent), reason: "" });
  };

  const saveTenant = async () => {
    if (!editTenantRow?.tenant) return;
    setSaving(true);
    try {
      await propertyApi.updateTenant(editTenantRow.tenant.id, {
        name: tenantForm.name,
        phone: tenantForm.phone || null,
        moveInDate: tenantForm.moveInDate,
        leaseEndDate: tenantForm.leaseEndDate || null,
        advancePaid: tenantForm.advancePaid,
        advanceAmount: Number(tenantForm.advanceAmount),
      });
      setEditTenantRow(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const saveRentChange = async () => {
    if (!editTenantRow?.tenant || !rcForm.effectiveDate || !rcForm.newRent) return;
    setSaving(true);
    try {
      await propertyApi.addRentChange(editTenantRow.tenant.id, {
        effectiveDate: rcForm.effectiveDate,
        newRent: Number(rcForm.newRent),
        reason: rcForm.reason || null,
      });
      setShowRcForm(false);
      setRcForm({ effectiveDate: "", newRent: String(editTenantRow.monthlyRent), reason: "" });
    } finally {
      setSaving(false);
    }
  };

  const refreshEditRow = async (tenantId: string) => {
    const fresh: UnitWithTenant[] = (await propertyApi.listUnits()) ?? [];
    setUnits(fresh);
    const freshRow = fresh.find((u) => u.tenant?.id === tenantId);
    if (freshRow) setEditTenantRow(freshRow);
  };

  const assignService = async () => {
    if (!editTenantRow?.tenant || !addSvcId || addSvcFee === "") return;
    setSaving(true);
    try {
      await propertyApi.assignService({
        tenantId: editTenantRow.tenant.id,
        serviceId: addSvcId,
        monthlyFee: parseFloat(addSvcFee),
        startDate: addSvcDate || new Date().toISOString().split("T")[0],
      });
      setAddSvcId("");
      setAddSvcFee("");
      setAddSvcDate(new Date().toISOString().split("T")[0]);
      await refreshEditRow(editTenantRow.tenant.id);
    } finally {
      setSaving(false);
    }
  };

  const removeService = (tenantServiceId: string, tenantId: string) => {
    openConfirm(
      "End Service",
      "End this service subscription for the tenant?",
      async () => {
        await propertyApi.removeAssignedService(tenantServiceId);
        await refreshEditRow(tenantId);
      },
      { confirmLabel: "End Subscription", confirmColor: "error" }
    );
  };

  const openAddTenant = (unitId = "") => {
    setIsAddingExternal(false);
    setPendingFiles([]);
    setAddForm({
      name: "",
      phone: "",
      unitId,
      customRent: "",
      moveInDate: "",
      leaseEndDate: "",
      advancePaid: false,
      advanceAmount: "",
      outgoingMoveOutDate: "",
    });
    // Default to the first CASH account; user can change or clear.
    setAdvanceAccountId(accounts.find((a) => a.type === "CASH")?.id ?? NO_ACCOUNT);
    setAddOpen(true);
  };

  const openAddExternal = () => {
    setIsAddingExternal(true);
    setPendingFiles([]);
    setAddForm({
      name: "",
      phone: "",
      unitId: "",
      customRent: "",
      moveInDate: "",
      leaseEndDate: "",
      advancePaid: false,
      advanceAmount: "",
      outgoingMoveOutDate: "",
    });
    setAdvanceAccountId(accounts.find((a) => a.type === "CASH")?.id ?? NO_ACCOUNT);
    setAddOpen(true);
  };

  const saveNewTenant = async () => {
    if (!addForm.name || !addForm.moveInDate) return;
    if (!isAddingExternal && !addForm.unitId) return;
    setSaving(true);
    try {
      const selectedUnitData = units.find((u) => u.id === addForm.unitId);
      // For vacant units with a custom rent, update the unit before creating the tenant
      if (
        !isAddingExternal &&
        addForm.customRent &&
        addForm.unitId &&
        selectedUnitData &&
        !selectedUnitData.isOccupied
      ) {
        if (Number(addForm.customRent) !== selectedUnitData.monthlyRent) {
          await propertyApi.updateUnit(addForm.unitId, {
            monthlyRent: Number(addForm.customRent),
          });
        }
      }
      const newTenant = (await propertyApi.createTenant({
        name: addForm.name,
        phone: addForm.phone || null,
        unitId: isAddingExternal ? null : addForm.unitId || null,
        moveInDate: addForm.moveInDate,
        leaseEndDate: addForm.leaseEndDate || null,
        advancePaid: addForm.advancePaid,
        advanceAmount: addForm.advancePaid ? Number(addForm.advanceAmount) : 0,
        // Opt-in: post the advance into the chosen wallet (only when paid + picked).
        ...(addForm.advancePaid && advanceAccountId ? { advanceAccountId } : {}),
        isExternal: isAddingExternal,
        // Occupied unit → the new tenant is queued; schedule the current tenant's move-out.
        outgoingMoveOutDate:
          !isAddingExternal && selectedUnitData?.isOccupied
            ? addForm.outgoingMoveOutDate || dayBefore(addForm.moveInDate) || null
            : null,
      })) as { id?: string; tenantStatus?: string } | null;
      // For occupied units: schedule a rent change for the future tenant's move-in date
      if (
        newTenant?.id &&
        newTenant.tenantStatus === "FUTURE" &&
        addForm.customRent &&
        selectedUnitData &&
        Number(addForm.customRent) !== selectedUnitData.monthlyRent
      ) {
        await propertyApi.addRentChange(newTenant.id, {
          effectiveDate: addForm.moveInDate,
          newRent: Number(addForm.customRent),
          reason: "Scheduled with future tenant",
        });
      }
      // Upload any pending documents to the newly created tenant
      if (newTenant?.id && pendingFiles.length > 0) {
        const fd = new FormData();
        pendingFiles.forEach((f) => fd.append("files", f));
        await propertyApi.uploadTenantDocuments(newTenant.id, fd);
      }
      setPendingFiles([]);
      setAddOpen(false);
      setDrawerUnit(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const deactivateTenant = (id: string, name: string) => {
    openConfirm(
      "Deactivate Tenant",
      `Are you sure you want to deactivate ${name}? They will be unassigned from their unit.`,
      async () => {
        await propertyApi.deactivateTenant(id);
        await load();
      },
      { confirmLabel: "Deactivate", confirmColor: "error" }
    );
  };

  const activateTenant = (id: string, name: string) => {
    openConfirm(
      "Re-activate Tenant",
      `Re-activate ${name}? Their record will be restored as active. You can then assign them to a unit.`,
      async () => {
        await propertyApi.activateTenant(id);
        await loadInactive();
        await load();
      },
      { confirmLabel: "Re-activate", confirmColor: "success" }
    );
  };

  // Assign Unit dialog (for unassigned tenants)
  const [assignUnitDialog, setAssignUnitDialog] = useState<{
    tenantId: string;
    tenantName: string;
    tenantMoveInDate: string;
  } | null>(null);
  const [assigningUnitId, setAssigningUnitId] = useState("");
  const [assignRent, setAssignRent] = useState("");
  const [assignOutgoingMoveOut, setAssignOutgoingMoveOut] = useState("");
  const [assignSaving, setAssignSaving] = useState(false);

  const doAssignUnit = async () => {
    if (!assignUnitDialog || !assigningUnitId) return;
    setAssignSaving(true);
    try {
      const targetUnit = units.find((u) => u.id === assigningUnitId);
      const newTenant = (await propertyApi.updateTenant(assignUnitDialog.tenantId, {
        unitId: assigningUnitId,
        // Occupied unit → schedule the current tenant's move-out.
        outgoingMoveOutDate: targetUnit?.isOccupied
          ? assignOutgoingMoveOut || dayBefore(assignUnitDialog.tenantMoveInDate) || null
          : null,
      })) as { id?: string; tenantStatus?: string; moveInDate?: string } | null;
      if (
        newTenant?.id &&
        assignRent &&
        targetUnit &&
        Number(assignRent) !== targetUnit.monthlyRent
      ) {
        if (newTenant.tenantStatus === "CURRENT") {
          // Vacant unit: update the unit's base rent immediately
          await propertyApi.updateUnit(assigningUnitId, { monthlyRent: Number(assignRent) });
        } else {
          // Occupied unit: schedule a rent change effective on move-in date
          await propertyApi.addRentChange(newTenant.id, {
            effectiveDate: newTenant.moveInDate,
            newRent: Number(assignRent),
            reason: "Set when assigning unit",
          });
        }
      }
      setAssignUnitDialog(null);
      setAssigningUnitId("");
      setAssignRent("");
      setAssignOutgoingMoveOut("");
      await load();
    } finally {
      setAssignSaving(false);
    }
  };

  const unitsWithoutFuture = units.filter((u) => !u.futureTenant);
  const selectedUnit = units.find((u) => u.id === addForm.unitId);
  const activeTenants = [
    ...units.filter((u) => u.tenant && !u.tenant.isExternal).map((u) => u.tenant!),
    ...unassignedRows.filter((r) => !r.tenant?.isExternal).map((r) => r.tenant!),
  ];
  const externalTenants = [
    ...units.filter((u) => u.tenant?.isExternal).map((u) => u.tenant!),
    ...unassignedRows.filter((r) => r.tenant?.isExternal).map((r) => r.tenant!),
  ];

  // ── Tenants-tab filter dropdown options + predicate ──
  // The active Tenants view is an in-memory join of units (current + future
  // tenants) and unassigned tenants, so the unit/status/search filters are
  // applied as a predicate over the assembled rows. The Past view fetches with
  // the same filters server-side (see loadInactive). The unit/status filters are
  // only meaningful for tenants; external members have no unit/status.
  const tenantUnitOptions: SelectOption[] = useMemo(
    () => [
      { value: "UNASSIGNED", label: "Unassigned" },
      ...units.map((u) => ({ value: u.id, label: u.unitNumber })),
    ],
    [units]
  );
  const tenantStateOptions: SelectOption[] = [
    { value: "ALL", label: "All statuses" },
    { value: "CURRENT", label: "Active" },
    { value: "FUTURE", label: "Scheduled" },
  ];

  // Map a tenant id → the unit id it is shown under (current or future), so the
  // unit filter can match assembled rows. Unassigned rows have no unit.
  const tenantUnitId = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of units) {
      if (u.tenant) map.set(u.tenant.id, u.id);
      if (u.futureTenant) map.set(u.futureTenant.id, u.id);
    }
    return map;
  }, [units]);

  const tenantMatches = useCallback(
    (row: UnitWithTenant) => {
      const t = row.tenant;
      if (!t) return false;
      if (tenantUnitFilter.length > 0) {
        const uid = tenantUnitId.get(t.id) ?? null;
        // Check if any of the selected values match: "UNASSIGNED" matches no-unit rows,
        // other values are unit ids.
        const hasUnassigned = tenantUnitFilter.includes("UNASSIGNED");
        const unitIds = tenantUnitFilter.filter((v) => v !== "UNASSIGNED");
        const matchesUnassigned = hasUnassigned && !uid;
        const matchesUnit = unitIds.length > 0 && uid !== null && unitIds.includes(uid);
        if (!matchesUnassigned && !matchesUnit) return false;
      }
      if (tenantStateFilter !== "ALL" && t.tenantStatus !== tenantStateFilter) return false;
      if (tenantQuery) {
        const q = tenantQuery.toLowerCase();
        const hit = t.name.toLowerCase().includes(q) || (t.phone ?? "").toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    },
    [tenantUnitFilter, tenantStateFilter, tenantQuery, tenantUnitId]
  );

  const hasTenantFilters =
    tenantUnitFilter.length > 0 || tenantStateFilter !== "ALL" || Boolean(tenantQuery);

  return (
    <Box>
      <PageHeader title="Property Management" subtitle="Manage units, tenants, and occupancy" />

      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        {[
          { label: "Total Units", value: units.length, color: "text.primary" },
          {
            label: "Occupied",
            value: units.filter((u) => u.isOccupied).length,
            color: "success.main",
          },
          {
            label: "Vacant",
            value: units.filter((u) => !u.isOccupied).length,
            color: "warning.main",
          },
          { label: "Active Tenants", value: activeTenants.length, color: "primary.main" },
        ].map((s) => (
          <Card
            key={s.label}
            sx={{ minWidth: 120, flex: "1 1 120px", bgcolor: "background.paper" }}
          >
            <CardContent sx={{ py: "12px !important", px: 2 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, color: s.color }}>
                {s.value}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {s.label}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ borderBottom: "1px solid", borderColor: "divider" }}
        >
          <Tab label={`Units (${units.length})`} />
          <Tab label={`Tenants (${activeTenants.length})`} />
          <Tab label={`External Members (${externalTenants.length})`} />
        </Tabs>
        <Box sx={{ display: "flex", gap: 1 }}>
          {tab === 2 ? (
            <Button
              variant="contained"
              size="small"
              startIcon={<Plus size={14} />}
              onClick={openAddExternal}
            >
              Add External Member
            </Button>
          ) : (
            <Button
              variant="contained"
              size="small"
              startIcon={<Plus size={14} />}
              onClick={() => openAddTenant()}
            >
              Add Tenant
            </Button>
          )}
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ mt: 3 }}>
          {tab === 0 && (
            <Grid container spacing={2}>
              {units.map((unit) => (
                <Grid key={unit.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                  <Card
                    sx={{
                      cursor: "pointer",
                      borderLeft: "4px solid",
                      borderColor: unit.isOccupied ? "success.main" : "warning.main",
                      bgcolor: "background.paper",
                      "&:hover": { bgcolor: "action.hover" },
                      transition: "background-color 0.15s",
                    }}
                    onClick={() => router.push(`/admin/property/units/${unit.id}`)}
                  >
                    <CardContent sx={{ p: "14px !important" }}>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          mb: 1,
                        }}
                      >
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          {unit.unitNumber}
                        </Typography>
                        <StatusChip isOccupied={unit.isOccupied} />
                      </Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontSize: "0.7rem" }}
                      >
                        {unit.floor}
                      </Typography>
                      <Box sx={{ mt: 1.5 }}>
                        {unit.tenant ? (
                          <>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {unit.tenant.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {unit.tenant.tenantCode} · {fmt(unit.monthlyRent)}/mo
                            </Typography>
                          </>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            {fmt(unit.monthlyRent)}/mo
                          </Typography>
                        )}
                        {unit.futureTenant && (
                          <Chip
                            label={`Future: ${unit.futureTenant.name}${unit.futureTenant.scheduledRent ? ` · ${fmt(unit.futureTenant.scheduledRent)}` : ""}`}
                            size="small"
                            sx={{
                              mt: 0.75,
                              fontSize: "0.6rem",
                              height: 18,
                              bgcolor: "warning.main",
                              color: "#fff",
                              maxWidth: "100%",
                            }}
                          />
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

          {tab === 1 && (
            <>
              <Box sx={{ display: "flex", gap: 1, mb: 2, mt: 1 }}>
                <Chip
                  label="Active"
                  clickable
                  color={tenantView === "active" ? "primary" : "default"}
                  onClick={() => setTenantView("active")}
                  sx={{ fontWeight: 600 }}
                />
                <Chip
                  label="Past Tenants"
                  clickable
                  color={tenantView === "past" ? "primary" : "default"}
                  onClick={() => {
                    setTenantView("past");
                    loadInactive();
                  }}
                  sx={{ fontWeight: 600 }}
                />
              </Box>

              {/* Filters (apply to the Active view; Past view honours search only) */}
              <Box sx={{ display: "flex", gap: 2, mb: 2, alignItems: "center", flexWrap: "wrap" }}>
                <MultiSearchableSelect
                  label="Unit"
                  value={tenantUnitFilter}
                  options={tenantUnitOptions}
                  disabled={tenantView === "past"}
                  onChange={(v) => setParams({ tunit: v.length ? v.join(",") : undefined })}
                  sx={{ minWidth: 150 }}
                />
                <SearchableSelect
                  label="Status"
                  value={tenantStateFilter}
                  options={tenantStateOptions}
                  disabled={tenantView === "past"}
                  onChange={(v) => setParams({ tstate: v === "ALL" ? undefined : v })}
                  sx={{ minWidth: 150 }}
                />
                <TextField
                  label="Search name / phone"
                  size="small"
                  value={tenantSearchInput}
                  onChange={(e) => setTenantSearchInput(e.target.value)}
                  sx={{ minWidth: 200 }}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search size={16} />
                        </InputAdornment>
                      ),
                      endAdornment: tenantSearchInput ? (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            onClick={() => setTenantSearchInput("")}
                            edge="end"
                          >
                            <X size={14} />
                          </IconButton>
                        </InputAdornment>
                      ) : null,
                    },
                  }}
                />
                {hasTenantFilters && (
                  <Button
                    size="small"
                    color="inherit"
                    onClick={() =>
                      setParams({ tunit: undefined, tstate: undefined, tq: undefined })
                    }
                  >
                    Clear
                  </Button>
                )}
              </Box>

              {tenantView === "active" ? (
                <TenantTable
                  tenants={[
                    ...units.filter((u) => u.tenant && !u.tenant.isExternal && u.tenant.isActive),
                    ...unassignedRows.filter((r) => !r.tenant?.isExternal),
                    // Future tenants — show as separate rows in the same unit column
                    ...units
                      .filter((u) => u.futureTenant && !u.futureTenant.isExternal)
                      .map((u) => ({ ...u, tenant: u.futureTenant! })),
                  ].filter(tenantMatches)}
                  showUnit
                  onEdit={openTenantEdit}
                  onDeactivate={deactivateTenant}
                  onActivate={activateTenant}
                  onAssignUnit={(id, name, moveInDate) => {
                    setAssignUnitDialog({
                      tenantId: id,
                      tenantName: name,
                      tenantMoveInDate: moveInDate?.split("T")[0] ?? "",
                    });
                    setAssigningUnitId("");
                    setAssignRent("");
                    setAssignOutgoingMoveOut("");
                  }}
                />
              ) : inactiveLoading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <TenantTable
                  tenants={inactiveRows.filter((r) => !r.tenant?.isExternal)}
                  showUnit
                  onEdit={openTenantEdit}
                  onDeactivate={deactivateTenant}
                  onActivate={activateTenant}
                />
              )}
            </>
          )}

          {tab === 2 && (
            <>
              <Box sx={{ display: "flex", gap: 1, mb: 2, mt: 1 }}>
                <Chip
                  label="Active"
                  clickable
                  color={extView === "active" ? "primary" : "default"}
                  onClick={() => setExtView("active")}
                  sx={{ fontWeight: 600 }}
                />
                <Chip
                  label="Past Members"
                  clickable
                  color={extView === "past" ? "primary" : "default"}
                  onClick={() => {
                    setExtView("past");
                    loadInactive();
                  }}
                  sx={{ fontWeight: 600 }}
                />
              </Box>
              {extView === "active" ? (
                <TenantTable
                  tenants={[
                    ...units.filter((u) => u.tenant?.isExternal && u.tenant.isActive),
                    ...unassignedRows.filter((r) => r.tenant?.isExternal),
                  ]}
                  showUnit={false}
                  onEdit={openTenantEdit}
                  onDeactivate={deactivateTenant}
                  onActivate={activateTenant}
                />
              ) : inactiveLoading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <TenantTable
                  tenants={inactiveRows.filter((r) => r.tenant?.isExternal)}
                  showUnit={false}
                  onEdit={openTenantEdit}
                  onDeactivate={deactivateTenant}
                  onActivate={activateTenant}
                />
              )}
            </>
          )}
        </Box>
      )}

      {/* ── Unit info / edit drawer ─────────────────────────────────── */}
      <Drawer
        anchor="right"
        open={!!drawerUnit}
        onClose={() => setDrawerUnit(null)}
        slotProps={{ paper: { sx: { width: { xs: "100%", sm: 400 } } } }}
      >
        {drawerUnit && (
          <Box sx={{ width: "100%", p: 3 }}>
            <Box
              sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}
            >
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {unitEditMode ? "Edit Unit" : drawerUnit.unitNumber}
              </Typography>
              <IconButton onClick={() => setDrawerUnit(null)} size="small">
                <X size={18} />
              </IconButton>
            </Box>

            {unitEditMode ? (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <TextField
                  label="Unit Number"
                  value={unitForm.unitNumber}
                  onChange={(e) => setUnitForm((p) => ({ ...p, unitNumber: e.target.value }))}
                  size="small"
                  fullWidth
                />
                <TextField
                  label="Floor"
                  value={unitForm.floor}
                  onChange={(e) => setUnitForm((p) => ({ ...p, floor: e.target.value }))}
                  size="small"
                  fullWidth
                />
                <TextField
                  label="Monthly Rent (৳)"
                  type="number"
                  value={unitForm.monthlyRent}
                  onChange={(e) => setUnitForm((p) => ({ ...p, monthlyRent: e.target.value }))}
                  size="small"
                  fullWidth
                />
                <TextField
                  label="Description"
                  value={unitForm.description}
                  onChange={(e) => setUnitForm((p) => ({ ...p, description: e.target.value }))}
                  size="small"
                  fullWidth
                  multiline
                  rows={2}
                />
                <TextField
                  label="Notes"
                  value={unitForm.notes}
                  onChange={(e) => setUnitForm((p) => ({ ...p, notes: e.target.value }))}
                  size="small"
                  fullWidth
                  multiline
                  rows={2}
                />
                <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    fullWidth
                    onClick={() => setUnitEditMode(false)}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    size="small"
                    fullWidth
                    onClick={saveUnit}
                    disabled={saving}
                  >
                    {saving ? "Saving…" : "Save"}
                  </Button>
                </Box>
              </Box>
            ) : (
              <>
                <Chip
                  label={drawerUnit.floor}
                  size="small"
                  variant="outlined"
                  sx={{ mb: 2, fontSize: "0.75rem" }}
                />
                <Divider sx={{ mb: 2 }} />
                {drawerUnit.tenant ? (
                  <Box>
                    <Typography
                      variant="overline"
                      color="text.secondary"
                      sx={{ fontSize: "0.6875rem" }}
                    >
                      Current Tenant
                    </Typography>
                    <Box sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 1.5 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <UserCheck size={16} color="var(--mui-palette-success-main)" />
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {drawerUnit.tenant.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {drawerUnit.tenant.tenantCode}
                          </Typography>
                        </Box>
                      </Box>
                      {drawerUnit.tenant.phone && (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Phone size={14} />
                          <Typography variant="body2">{drawerUnit.tenant.phone}</Typography>
                        </Box>
                      )}
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <DollarSign size={14} />
                        <Typography variant="body2">{fmt(drawerUnit.monthlyRent)}/month</Typography>
                      </Box>
                      {drawerUnit.tenant.moveInDate && (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Calendar size={14} />
                          <Typography variant="body2">
                            Move-in: {new Date(drawerUnit.tenant.moveInDate).toLocaleDateString()}
                          </Typography>
                        </Box>
                      )}
                      {drawerUnit.tenant.advancePaid && (
                        <Chip
                          label={`Advance: ${fmt(drawerUnit.tenant.advanceAmount)}`}
                          size="small"
                          sx={{ bgcolor: "primary.main", color: "#fff", alignSelf: "flex-start" }}
                        />
                      )}
                    </Box>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: 3 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        fullWidth
                        startIcon={<Pencil size={14} />}
                        onClick={() => setUnitEditMode(true)}
                      >
                        Edit Unit
                      </Button>
                      <Button
                        component={Link}
                        href={`/admin/property/tenants/${drawerUnit.tenant.id}`}
                        variant="contained"
                        size="small"
                        fullWidth
                        startIcon={<ExternalLink size={14} />}
                      >
                        View Profile
                      </Button>
                      <Button
                        component={Link}
                        href="/admin/property/payments"
                        variant="outlined"
                        size="small"
                        fullWidth
                      >
                        Record Payment
                      </Button>
                      <Divider sx={{ my: 0.5 }} />
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        fullWidth
                        startIcon={<UserX size={14} />}
                        onClick={() => {
                          if (!drawerUnit.tenant) return;
                          const hasFuture = !!drawerUnit.futureTenant;
                          const unitId = drawerUnit.id;
                          openConfirm(
                            "Move Out Tenant",
                            hasFuture
                              ? `Move out ${drawerUnit.tenant.name}? ${drawerUnit.futureTenant!.name} will automatically become the current tenant.`
                              : `Move out ${drawerUnit.tenant.name}? They will be unassigned from this unit.`,
                            async () => {
                              await propertyApi.deactivateTenant(drawerUnit.tenant!.id);
                              setDrawerUnit(null);
                              await load();
                              if (!hasFuture) openAddTenant(unitId);
                            },
                            { confirmLabel: "Move Out", confirmColor: "error" }
                          );
                        }}
                      >
                        Move Out
                        {drawerUnit.futureTenant
                          ? ` (${drawerUnit.futureTenant.name} takes over)`
                          : " & Add New Tenant"}
                      </Button>
                    </Box>

                    {/* Future tenant section */}
                    {drawerUnit.futureTenant && (
                      <Box sx={{ mt: 2 }}>
                        <Divider sx={{ mb: 1.5 }} />
                        <Typography
                          variant="overline"
                          color="warning.main"
                          sx={{ fontSize: "0.6875rem", fontWeight: 700 }}
                        >
                          Scheduled Future Tenant
                        </Typography>
                        <Box sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 1 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <UserPlus size={15} color="var(--mui-palette-warning-main)" />
                            <Box>
                              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                {drawerUnit.futureTenant.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {drawerUnit.futureTenant.tenantCode}
                              </Typography>
                            </Box>
                          </Box>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Calendar size={13} />
                            <Typography variant="caption">
                              Move-in:{" "}
                              {new Date(drawerUnit.futureTenant.moveInDate).toLocaleDateString()}
                            </Typography>
                          </Box>
                          <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
                            <Button
                              component={Link}
                              href={`/admin/property/tenants/${drawerUnit.futureTenant.id}`}
                              variant="outlined"
                              size="small"
                              fullWidth
                              startIcon={<ExternalLink size={13} />}
                            >
                              View Profile
                            </Button>
                            <Button
                              variant="outlined"
                              color="warning"
                              size="small"
                              fullWidth
                              startIcon={<UserCheck size={13} />}
                              onClick={() => {
                                const ft = drawerUnit.futureTenant!;
                                openConfirm(
                                  "Promote to Current Tenant",
                                  `Promote ${ft.name} to current tenant now? ${drawerUnit.tenant!.name} will be moved out.`,
                                  async () => {
                                    await propertyApi.deactivateTenant(drawerUnit.tenant!.id);
                                    setDrawerUnit(null);
                                    await load();
                                  },
                                  { confirmLabel: "Promote", confirmColor: "warning" }
                                );
                              }}
                            >
                              Promote Now
                            </Button>
                          </Box>
                        </Box>
                      </Box>
                    )}
                  </Box>
                ) : (
                  <Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                      <UserX size={16} color="var(--mui-palette-warning-main)" />
                      <Typography variant="body2" color="text.secondary">
                        This unit is currently vacant
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      Base rent: {fmt(drawerUnit.monthlyRent)}/month
                    </Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      fullWidth
                      startIcon={<Pencil size={14} />}
                      onClick={() => setUnitEditMode(true)}
                      sx={{ mb: 1 }}
                    >
                      Edit Unit
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      fullWidth
                      startIcon={<Plus size={14} />}
                      onClick={() => {
                        setDrawerUnit(null);
                        openAddTenant(drawerUnit.id);
                      }}
                    >
                      Add Tenant
                    </Button>
                  </Box>
                )}
              </>
            )}
          </Box>
        )}
      </Drawer>

      {/* ── Tenant edit drawer ──────────────────────────────────────── */}
      <Drawer
        anchor="right"
        open={!!editTenantRow}
        onClose={() => setEditTenantRow(null)}
        slotProps={{ paper: { sx: { width: { xs: "100%", sm: 420 } } } }}
      >
        {editTenantRow?.tenant && (
          <Box sx={{ width: "100%", p: 3 }}>
            <Box
              sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}
            >
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Edit Tenant
              </Typography>
              <IconButton onClick={() => setEditTenantRow(null)} size="small">
                <X size={18} />
              </IconButton>
            </Box>

            {!editTenantRow.tenant.isActive && (
              <Alert severity="warning" sx={{ mb: 2, fontSize: "0.8125rem" }}>
                Inactive — moved out. Changes save to their record only and won&apos;t affect any
                unit.
              </Alert>
            )}

            {!editTenantRow.tenant.isActive && editTenantRow.monthlyRent > 0 && (
              <Box sx={{ bgcolor: "action.selected", px: 2, py: 1.5, borderRadius: 1, mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Last Rent
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {fmt(editTenantRow.monthlyRent)}/month
                </Typography>
                {editTenantRow.tenant.moveOutDate && (
                  <>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", mt: 0.5 }}
                    >
                      Moved Out
                    </Typography>
                    <Typography variant="body2">
                      {new Date(editTenantRow.tenant.moveOutDate).toLocaleDateString()}
                    </Typography>
                  </>
                )}
              </Box>
            )}

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <TextField
                label="Full Name"
                value={tenantForm.name}
                onChange={(e) => setTenantForm((p) => ({ ...p, name: e.target.value }))}
                size="small"
                fullWidth
              />
              <TextField
                label="Phone"
                value={tenantForm.phone}
                onChange={(e) => setTenantForm((p) => ({ ...p, phone: e.target.value }))}
                size="small"
                fullWidth
              />
              <TextField
                label="Move-in Date"
                type="date"
                value={tenantForm.moveInDate}
                onChange={(e) => setTenantForm((p) => ({ ...p, moveInDate: e.target.value }))}
                size="small"
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="Lease End Date"
                type="date"
                value={tenantForm.leaseEndDate}
                onChange={(e) => setTenantForm((p) => ({ ...p, leaseEndDate: e.target.value }))}
                size="small"
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={tenantForm.advancePaid}
                    onChange={(e) =>
                      setTenantForm((p) => ({ ...p, advancePaid: e.target.checked }))
                    }
                  />
                }
                label="Advance Paid"
              />
              {tenantForm.advancePaid && (
                <TextField
                  label="Advance Amount (৳)"
                  type="number"
                  value={tenantForm.advanceAmount}
                  onChange={(e) => setTenantForm((p) => ({ ...p, advanceAmount: e.target.value }))}
                  size="small"
                  fullWidth
                />
              )}
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  fullWidth
                  onClick={() => setEditTenantRow(null)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  fullWidth
                  onClick={saveTenant}
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Save Changes"}
                </Button>
              </Box>
            </Box>

            {/* ── Add-On Services ─────────────────────────────────── */}
            <Divider sx={{ my: 2.5 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
              Add-On Services
            </Typography>

            {/* Current services */}
            {editTenantRow.tenant.services && editTenantRow.tenant.services.length > 0 ? (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, mb: 1.5 }}>
                {editTenantRow.tenant.services.map((sv) => (
                  <Box
                    key={sv.id}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      bgcolor: "action.selected",
                      px: 1.5,
                      py: 0.75,
                      borderRadius: 1,
                    }}
                  >
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {sv.serviceName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {sv.monthlyFee > 0 ? `${fmt(sv.monthlyFee)}/month` : "Free"}
                      </Typography>
                    </Box>
                    <Tooltip title="Remove service">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => removeService(sv.id, editTenantRow.tenant!.id)}
                      >
                        <X size={14} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mb: 1.5 }}
              >
                No services assigned.
              </Typography>
            )}

            {/* Assign new service */}
            {serviceCatalog.filter(
              (c) => !editTenantRow.tenant!.services?.some((sv) => sv.serviceName === c.name)
            ).length > 0 && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <FormControl size="small" sx={{ flex: 2 }}>
                    <InputLabel>Service</InputLabel>
                    <Select
                      label="Service"
                      value={addSvcId}
                      onChange={(e) => setAddSvcId(e.target.value as string)}
                    >
                      {serviceCatalog
                        .filter(
                          (c) =>
                            !editTenantRow.tenant!.services?.some((sv) => sv.serviceName === c.name)
                        )
                        .map((c) => (
                          <MenuItem key={c.id} value={c.id}>
                            {c.name}
                          </MenuItem>
                        ))}
                    </Select>
                  </FormControl>
                  <TextField
                    label="Fee (৳)"
                    type="number"
                    size="small"
                    sx={{ flex: 1 }}
                    value={addSvcFee}
                    onChange={(e) => setAddSvcFee(e.target.value)}
                    placeholder="0"
                  />
                </Box>
                <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                  <TextField
                    label="Start Date"
                    type="date"
                    size="small"
                    sx={{ flex: 1 }}
                    value={addSvcDate}
                    onChange={(e) => setAddSvcDate(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                  <Button
                    variant="contained"
                    size="small"
                    onClick={assignService}
                    disabled={saving || !addSvcId || addSvcFee === "" || !addSvcDate}
                  >
                    Assign
                  </Button>
                </Box>
              </Box>
            )}

            {/* Documents */}
            <Divider sx={{ my: 2.5 }} />
            <TenantDocuments tenantId={editTenantRow.tenant.id} compact />

            {editTenantRow.tenant.isActive && (
              <>
                <Divider sx={{ my: 2.5 }} />
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 1.5,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <TrendingUp size={15} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Scheduled Rent Changes
                    </Typography>
                  </Box>
                  {!showRcForm && (
                    <Button
                      size="small"
                      startIcon={<Plus size={13} />}
                      onClick={() => setShowRcForm(true)}
                    >
                      Add
                    </Button>
                  )}
                </Box>

                {showRcForm ? (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      Current rent: {fmt(editTenantRow.monthlyRent)}
                    </Typography>
                    <TextField
                      label="Effective Date"
                      type="date"
                      value={rcForm.effectiveDate}
                      onChange={(e) => setRcForm((p) => ({ ...p, effectiveDate: e.target.value }))}
                      size="small"
                      fullWidth
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                    <TextField
                      label="New Rent (৳)"
                      type="number"
                      value={rcForm.newRent}
                      onChange={(e) => setRcForm((p) => ({ ...p, newRent: e.target.value }))}
                      size="small"
                      fullWidth
                    />
                    <TextField
                      label="Reason (optional)"
                      value={rcForm.reason}
                      onChange={(e) => setRcForm((p) => ({ ...p, reason: e.target.value }))}
                      size="small"
                      fullWidth
                    />
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        fullWidth
                        onClick={() => setShowRcForm(false)}
                        disabled={saving}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="contained"
                        size="small"
                        fullWidth
                        onClick={saveRentChange}
                        disabled={saving || !rcForm.effectiveDate || !rcForm.newRent}
                      >
                        {saving ? "Saving…" : "Schedule"}
                      </Button>
                    </Box>
                  </Box>
                ) : (
                  <Typography variant="caption" color="text.secondary">
                    Changes are applied automatically when payments are generated for the effective
                    month.
                  </Typography>
                )}
              </>
            )}
          </Box>
        )}
      </Drawer>

      {/* ── Confirmation dialog ─────────────────────────────────────── */}
      <Dialog
        open={!!confirmDialog}
        onClose={() => !confirmLoading && setConfirmDialog(null)}
        slotProps={{
          paper: { sx: { bgcolor: "background.paper", borderRadius: 2, minWidth: 340 } },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor:
                  confirmDialog?.confirmColor === "error"
                    ? "error.main"
                    : confirmDialog?.confirmColor === "success"
                      ? "success.main"
                      : confirmDialog?.confirmColor === "warning"
                        ? "warning.main"
                        : "primary.main",
                flexShrink: 0,
              }}
            >
              {confirmDialog?.confirmColor === "error" ? (
                <UserX size={18} color="#fff" />
              ) : confirmDialog?.confirmColor === "success" ? (
                <UserPlus size={18} color="#fff" />
              ) : (
                <TrendingUp size={18} color="#fff" />
              )}
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "1rem" }}>
              {confirmDialog?.title}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 0.5 }}>
          <DialogContentText sx={{ color: "text.secondary", fontSize: "0.9rem" }}>
            {confirmDialog?.message}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => setConfirmDialog(null)}
            disabled={confirmLoading}
            sx={{ flex: 1 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            size="small"
            color={confirmDialog?.confirmColor ?? "primary"}
            onClick={runConfirm}
            disabled={confirmLoading}
            sx={{ flex: 1 }}
          >
            {confirmLoading ? "Please wait…" : (confirmDialog?.confirmLabel ?? "Confirm")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Assign Unit dialog ─────────────────────────────────────── */}
      <Dialog
        open={!!assignUnitDialog}
        onClose={() => !assignSaving && setAssignUnitDialog(null)}
        slotProps={{
          paper: { sx: { bgcolor: "background.paper", borderRadius: 2, minWidth: 360 } },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: "1rem" }}>
          Assign Unit — {assignUnitDialog?.tenantName}
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: "text.secondary", fontSize: "0.875rem", mb: 2 }}>
            Select a unit to assign. If the unit is already occupied, this tenant will be queued as
            a future tenant.
          </DialogContentText>
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Unit</InputLabel>
            <Select
              label="Unit"
              value={assigningUnitId}
              onChange={(e) => {
                const uid = e.target.value as string;
                setAssigningUnitId(uid);
                setAssignRent("");
                const u = units.find((x) => x.id === uid);
                setAssignOutgoingMoveOut(
                  u?.isOccupied ? dayBefore(assignUnitDialog?.tenantMoveInDate ?? "") : ""
                );
              }}
            >
              {units.map((u) => (
                <MenuItem key={u.id} value={u.id}>
                  {u.unitNumber} — {u.floor}
                  {u.isOccupied
                    ? ` (Occupied by ${u.tenant?.name ?? "?"} — will be Future)`
                    : ` (${fmt(u.monthlyRent)}/mo, Vacant)`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {assigningUnitId &&
            (() => {
              const u = units.find((x) => x.id === assigningUnitId);
              return (
                <TextField
                  label={u?.isOccupied ? "New Rent for Future Tenant (৳)" : "Monthly Rent (৳)"}
                  type="number"
                  value={assignRent}
                  onChange={(e) => setAssignRent(e.target.value)}
                  size="small"
                  fullWidth
                  placeholder={String(u?.monthlyRent ?? "")}
                  helperText={
                    u?.isOccupied
                      ? assignRent && Number(assignRent) !== u.monthlyRent
                        ? `Current rent is ${fmt(u.monthlyRent)} — a rent change will be scheduled for their move-in date`
                        : `Current rent is ${fmt(u?.monthlyRent ?? 0)} — leave blank to keep the same`
                      : assignRent && u && Number(assignRent) !== u.monthlyRent
                        ? `Default: ${fmt(u.monthlyRent)} — saving will update the unit's rent`
                        : "Leave blank to keep the unit's current rent"
                  }
                />
              );
            })()}
          {assigningUnitId &&
            units.find((x) => x.id === assigningUnitId)?.isOccupied &&
            (() => {
              const u = units.find((x) => x.id === assigningUnitId);
              const outName = u?.tenant?.name ?? "current tenant";
              return (
                <TextField
                  label={`${outName}'s Move-out Date`}
                  type="date"
                  value={assignOutgoingMoveOut}
                  onChange={(e) => setAssignOutgoingMoveOut(e.target.value)}
                  size="small"
                  fullWidth
                  required
                  sx={{ mt: 2 }}
                  slotProps={{ inputLabel: { shrink: true } }}
                  helperText={`Sets ${outName}'s move-out and lease-end dates. Defaults to the day before this tenant moves in.`}
                />
              );
            })()}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => setAssignUnitDialog(null)}
            disabled={assignSaving}
            sx={{ flex: 1 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<MapPin size={14} />}
            onClick={doAssignUnit}
            disabled={
              !assigningUnitId ||
              assignSaving ||
              (!!units.find((x) => x.id === assigningUnitId)?.isOccupied && !assignOutgoingMoveOut)
            }
            sx={{ flex: 1 }}
          >
            {assignSaving ? "Assigning…" : "Assign"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Add Tenant / External Member drawer ─────────────────────── */}
      <Drawer
        anchor="right"
        open={addOpen}
        onClose={() => setAddOpen(false)}
        slotProps={{ paper: { sx: { width: { xs: "100%", sm: 420 } } } }}
      >
        <Box sx={{ width: "100%", p: 3 }}>
          <Box
            sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {isAddingExternal ? "Add External Member" : "Add Tenant"}
            </Typography>
            <IconButton onClick={() => setAddOpen(false)} size="small">
              <X size={18} />
            </IconButton>
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label="Full Name"
              value={addForm.name}
              onChange={(e) => setAddForm((p) => ({ ...p, name: e.target.value }))}
              size="small"
              fullWidth
              required
            />
            <TextField
              label="Phone"
              value={addForm.phone}
              onChange={(e) => setAddForm((p) => ({ ...p, phone: e.target.value }))}
              size="small"
              fullWidth
            />

            {!isAddingExternal && (
              <>
                <FormControl size="small" fullWidth required>
                  <InputLabel>Unit</InputLabel>
                  <Select
                    label="Unit"
                    value={addForm.unitId}
                    onChange={(e) => {
                      const uid = e.target.value as string;
                      const u = units.find((x) => x.id === uid);
                      setAddForm((p) => ({
                        ...p,
                        unitId: uid,
                        customRent: u ? String(u.monthlyRent) : "",
                      }));
                    }}
                  >
                    {unitsWithoutFuture.length === 0 && (
                      <MenuItem disabled value="">
                        All units have a future tenant queued
                      </MenuItem>
                    )}
                    {unitsWithoutFuture.map((u) => (
                      <MenuItem key={u.id} value={u.id}>
                        {u.unitNumber} — {u.floor}
                        {u.isOccupied
                          ? ` (Occupied by ${u.tenant?.name ?? "?"} — will add as future)`
                          : ` (${fmt(u.monthlyRent)}/mo)`}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {selectedUnit?.isOccupied && (
                  <Alert severity="info" sx={{ fontSize: "0.8rem", py: 0.5 }}>
                    This unit is occupied. The new tenant will be scheduled as a{" "}
                    <strong>future tenant</strong>; the current tenant is moved out on the date
                    below and the new tenant becomes active from their move-in date.
                  </Alert>
                )}

                {addForm.unitId && (
                  <TextField
                    label={
                      selectedUnit?.isOccupied
                        ? "New Rent for Future Tenant (৳)"
                        : "Monthly Rent (৳)"
                    }
                    type="number"
                    value={addForm.customRent}
                    onChange={(e) => setAddForm((p) => ({ ...p, customRent: e.target.value }))}
                    size="small"
                    fullWidth
                    helperText={
                      selectedUnit?.isOccupied
                        ? addForm.customRent &&
                          Number(addForm.customRent) !== selectedUnit.monthlyRent
                          ? `Current unit rent is ${fmt(selectedUnit.monthlyRent)} — a rent change will be scheduled for their move-in date`
                          : `Current unit rent is ${fmt(selectedUnit?.monthlyRent ?? 0)} — enter a different amount if their rent will change`
                        : selectedUnit && Number(addForm.customRent) !== selectedUnit.monthlyRent
                          ? `Default: ${fmt(selectedUnit.monthlyRent)} — saving will update the unit's rent`
                          : "Leave as default or enter a custom rent for this tenant"
                    }
                  />
                )}
              </>
            )}

            <TextField
              label="Move-in Date"
              type="date"
              value={addForm.moveInDate}
              onChange={(e) =>
                setAddForm((p) => {
                  const moveInDate = e.target.value;
                  // Keep the outgoing move-out in lockstep with move-in unless edited.
                  const autoOut =
                    !p.outgoingMoveOutDate || p.outgoingMoveOutDate === dayBefore(p.moveInDate);
                  return {
                    ...p,
                    moveInDate,
                    outgoingMoveOutDate: autoOut ? dayBefore(moveInDate) : p.outgoingMoveOutDate,
                  };
                })
              }
              size="small"
              fullWidth
              required
              slotProps={{ inputLabel: { shrink: true } }}
            />
            {!isAddingExternal && selectedUnit?.isOccupied && (
              <TextField
                label={`${selectedUnit.tenant?.name ?? "Current tenant"}'s Move-out Date`}
                type="date"
                value={addForm.outgoingMoveOutDate}
                onChange={(e) => setAddForm((p) => ({ ...p, outgoingMoveOutDate: e.target.value }))}
                size="small"
                fullWidth
                required
                slotProps={{ inputLabel: { shrink: true } }}
                helperText={`Sets ${
                  selectedUnit.tenant?.name ?? "the current tenant"
                }'s move-out and lease-end dates. Defaults to the day before the new tenant moves in.`}
              />
            )}
            <TextField
              label="Lease End Date"
              type="date"
              value={addForm.leaseEndDate}
              onChange={(e) => setAddForm((p) => ({ ...p, leaseEndDate: e.target.value }))}
              size="small"
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={addForm.advancePaid}
                  onChange={(e) => setAddForm((p) => ({ ...p, advancePaid: e.target.checked }))}
                />
              }
              label="Advance Paid"
            />
            {addForm.advancePaid && (
              <TextField
                label="Advance Amount (৳)"
                type="number"
                value={addForm.advanceAmount}
                onChange={(e) => setAddForm((p) => ({ ...p, advanceAmount: e.target.value }))}
                size="small"
                fullWidth
              />
            )}
            {addForm.advancePaid && accounts.length > 0 && (
              <SearchableSelect
                label="Add advance to wallet/account (optional)"
                value={advanceAccountId}
                options={[
                  { value: NO_ACCOUNT, label: "— none / don't add to wallet —" },
                  ...accounts.map((a) => ({ value: a.id, label: a.name })),
                ]}
                onChange={setAdvanceAccountId}
              />
            )}

            {/* Document upload (queued until tenant is saved) */}
            <Box>
              <Divider sx={{ mb: 1.5 }} />
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                Documents (optional — uploaded after tenant is saved)
              </Typography>
              <input
                ref={addFileInputRef}
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                style={{ display: "none" }}
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  setPendingFiles((prev) => [...prev, ...files]);
                  if (addFileInputRef.current) addFileInputRef.current.value = "";
                }}
              />
              <Button
                variant="outlined"
                size="small"
                onClick={() => addFileInputRef.current?.click()}
                sx={{ fontSize: "0.75rem", mb: pendingFiles.length > 0 ? 1 : 0 }}
              >
                Select Files
              </Button>
              {pendingFiles.length > 0 && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                  {pendingFiles.map((f, i) => (
                    <Box
                      key={i}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        bgcolor: "action.hover",
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          flex: 1,
                        }}
                      >
                        {f.name}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() =>
                          setPendingFiles((prev) => prev.filter((_, idx) => idx !== i))
                        }
                      >
                        <X size={12} />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>

            <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
              <Button
                variant="outlined"
                size="small"
                fullWidth
                onClick={() => setAddOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                size="small"
                fullWidth
                onClick={saveNewTenant}
                disabled={
                  saving ||
                  !addForm.name ||
                  !addForm.moveInDate ||
                  (!isAddingExternal && !addForm.unitId) ||
                  (!isAddingExternal && !!selectedUnit?.isOccupied && !addForm.outgoingMoveOutDate)
                }
              >
                {saving ? "Saving…" : isAddingExternal ? "Add Member" : "Add Tenant"}
              </Button>
            </Box>
          </Box>
        </Box>
      </Drawer>
    </Box>
  );
}

function TenantTable({
  tenants,
  showUnit,
  onEdit,
  onDeactivate,
  onActivate,
  onAssignUnit,
}: {
  tenants: UnitWithTenant[];
  showUnit: boolean;
  onEdit: (row: UnitWithTenant) => void;
  onDeactivate: (id: string, name: string) => void;
  onActivate: (id: string, name: string) => void;
  onAssignUnit?: (tenantId: string, tenantName: string, moveInDate: string) => void;
}) {
  if (tenants.length === 0) {
    return (
      <Box sx={{ textAlign: "center", py: 8 }}>
        <Building2 size={40} style={{ opacity: 0.3 }} />
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          No records found
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Card} sx={{ bgcolor: "background.paper" }}>
      <Table size="small" sx={mobileCardTableSx}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700 }}>Code</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
            {showUnit && <TableCell sx={{ fontWeight: 700 }}>Unit</TableCell>}
            <TableCell sx={{ fontWeight: 700 }}>Rent</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Services</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Move-in</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Advance Held</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Lease End</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {tenants.map((row) => {
            const t = row.tenant!;
            return (
              <TableRow key={t.id} hover>
                <TableCell data-label="Code">
                  <Chip label={t.tenantCode ?? "—"} size="small" variant="outlined" />
                </TableCell>
                <TableCell data-label="Name">
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {t.name}
                  </Typography>
                  {t.phone && (
                    <Typography variant="caption" color="text.secondary">
                      {t.phone}
                    </Typography>
                  )}
                </TableCell>
                {showUnit && (
                  <TableCell data-label="Unit">
                    <Typography variant="body2">{row.unitNumber}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {row.floor}
                    </Typography>
                  </TableCell>
                )}
                <TableCell data-label="Rent">
                  <Typography variant="body2">{fmt(row.monthlyRent)}</Typography>
                </TableCell>
                <TableCell data-label="Services">
                  {t.services && t.services.length > 0 ? (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {t.services.map((sv) => (
                        <Chip
                          key={sv.serviceName}
                          label={
                            sv.monthlyFee > 0
                              ? `${sv.serviceName} ${fmt(sv.monthlyFee)}`
                              : sv.serviceName
                          }
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: "0.65rem", height: 18 }}
                        />
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      —
                    </Typography>
                  )}
                </TableCell>
                <TableCell data-label="Move-in">
                  <Typography variant="body2">
                    {new Date(t.moveInDate).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </Typography>
                </TableCell>
                <TableCell data-label="Advance Held">
                  {t.advancePaid ? (
                    <Typography variant="body2" color="primary.main" sx={{ fontWeight: 600 }}>
                      {fmt(t.advanceAmount)}
                    </Typography>
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      None
                    </Typography>
                  )}
                </TableCell>
                <TableCell data-label="Lease End">
                  {t.leaseEndDate ? (
                    <Typography variant="body2">
                      {new Date(t.leaseEndDate).toLocaleDateString()}
                    </Typography>
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      —
                    </Typography>
                  )}
                </TableCell>
                <TableCell data-label="Status">
                  {t.tenantStatus === "FUTURE" ? (
                    <Chip
                      label="Scheduled"
                      size="small"
                      sx={{
                        bgcolor: "warning.main",
                        color: "#fff",
                        fontWeight: 600,
                        fontSize: "0.6875rem",
                      }}
                    />
                  ) : t.isActive ? (
                    <Chip
                      label="Active"
                      size="small"
                      sx={{
                        bgcolor: "success.main",
                        color: "#fff",
                        fontWeight: 600,
                        fontSize: "0.6875rem",
                      }}
                    />
                  ) : (
                    <Box>
                      <Chip
                        label="Inactive"
                        size="small"
                        sx={{
                          bgcolor: "action.selected",
                          color: "text.secondary",
                          fontWeight: 600,
                          fontSize: "0.6875rem",
                        }}
                      />
                      {t.moveOutDate && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: "block", mt: 0.25 }}
                        >
                          Out: {new Date(t.moveOutDate).toLocaleDateString()}
                        </Typography>
                      )}
                    </Box>
                  )}
                </TableCell>
                <TableCell data-label="Actions">
                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={() => onEdit(row)}>
                      <Pencil size={15} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="View profile">
                    <IconButton
                      component={Link}
                      href={`/admin/property/tenants/${t.id}`}
                      size="small"
                    >
                      <ExternalLink size={15} />
                    </IconButton>
                  </Tooltip>
                  {onAssignUnit && row.id.startsWith("unassigned-") && (
                    <Tooltip title="Assign to unit">
                      <IconButton
                        size="small"
                        color="warning"
                        onClick={() => onAssignUnit(t.id, t.name, t.moveInDate)}
                      >
                        <MapPin size={15} />
                      </IconButton>
                    </Tooltip>
                  )}
                  {t.isActive ? (
                    <Tooltip title="Deactivate">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => onDeactivate(t.id, t.name)}
                      >
                        <UserX size={15} />
                      </IconButton>
                    </Tooltip>
                  ) : (
                    <Tooltip title="Re-activate">
                      <IconButton
                        size="small"
                        color="success"
                        onClick={() => onActivate(t.id, t.name)}
                      >
                        <UserPlus size={15} />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
