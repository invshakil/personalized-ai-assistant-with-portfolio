import { Box, CircularProgress } from "@mui/material";
import type { SelectOption } from "@/components/admin/SearchableSelect";
import type { UnitWithTenant } from "@/types";
import TenantViewToggle from "./TenantViewToggle";
import TenantFilters from "./TenantFilters";
import TenantTable from "./TenantTable";

type TenantServices = NonNullable<UnitWithTenant["tenant"]>["services"];

interface TenantsTabContentProps {
  view: "active" | "past";
  onViewChange: (v: "active" | "past") => void;
  activeRows: UnitWithTenant[];
  inactiveRows: UnitWithTenant[];
  inactiveLoading: boolean;
  unitFilter: string[];
  unitOptions: SelectOption[];
  stateFilter: string;
  stateOptions: SelectOption[];
  searchInput: string;
  onSearchChange: (v: string) => void;
  hasActiveFilters: boolean;
  setParams: (patch: Record<string, string | undefined>) => void;
  onEdit: (row: UnitWithTenant) => void;
  onDeactivate: (id: string, name: string) => void;
  onActivate: (id: string, name: string) => void;
  onAssignUnit?: (tenantId: string, tenantName: string, moveInDate: string) => void;
  onMoveTenant?: (
    tenantId: string,
    tenantName: string,
    currentUnitId: string,
    services: TenantServices
  ) => void;
}

export default function TenantsTabContent({
  view,
  onViewChange,
  activeRows,
  inactiveRows,
  inactiveLoading,
  unitFilter,
  unitOptions,
  stateFilter,
  stateOptions,
  searchInput,
  onSearchChange,
  hasActiveFilters,
  setParams,
  onEdit,
  onDeactivate,
  onActivate,
  onAssignUnit,
  onMoveTenant,
}: TenantsTabContentProps) {
  return (
    <>
      <TenantViewToggle view={view} onChange={onViewChange} pastLabel="Past Tenants" />

      {/* Filters (apply to the Active view; Past view honours search only) */}
      <TenantFilters
        unitFilter={unitFilter}
        unitOptions={unitOptions}
        stateFilter={stateFilter}
        stateOptions={stateOptions}
        disabled={view === "past"}
        searchInput={searchInput}
        onSearchChange={onSearchChange}
        hasActiveFilters={hasActiveFilters}
        setParams={setParams}
      />

      {view === "active" ? (
        <TenantTable
          tenants={activeRows}
          showUnit
          onEdit={onEdit}
          onDeactivate={onDeactivate}
          onActivate={onActivate}
          onAssignUnit={onAssignUnit}
          onMoveTenant={onMoveTenant}
        />
      ) : inactiveLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TenantTable
          tenants={inactiveRows}
          showUnit
          onEdit={onEdit}
          onDeactivate={onDeactivate}
          onActivate={onActivate}
        />
      )}
    </>
  );
}
