import { Box, CircularProgress } from "@mui/material";
import type { UnitWithTenant } from "@/types";
import TenantViewToggle from "./TenantViewToggle";
import TenantTable from "./TenantTable";

interface ExternalTabContentProps {
  view: "active" | "past";
  onViewChange: (v: "active" | "past") => void;
  activeRows: UnitWithTenant[];
  inactiveRows: UnitWithTenant[];
  inactiveLoading: boolean;
  onEdit: (row: UnitWithTenant) => void;
  onDeactivate: (id: string, name: string) => void;
  onActivate: (id: string, name: string) => void;
}

export default function ExternalTabContent({
  view,
  onViewChange,
  activeRows,
  inactiveRows,
  inactiveLoading,
  onEdit,
  onDeactivate,
  onActivate,
}: ExternalTabContentProps) {
  return (
    <>
      <TenantViewToggle view={view} onChange={onViewChange} pastLabel="Past Members" />

      {view === "active" ? (
        <TenantTable
          tenants={activeRows}
          showUnit={false}
          onEdit={onEdit}
          onDeactivate={onDeactivate}
          onActivate={onActivate}
        />
      ) : inactiveLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TenantTable
          tenants={inactiveRows}
          showUnit={false}
          onEdit={onEdit}
          onDeactivate={onDeactivate}
          onActivate={onActivate}
        />
      )}
    </>
  );
}
