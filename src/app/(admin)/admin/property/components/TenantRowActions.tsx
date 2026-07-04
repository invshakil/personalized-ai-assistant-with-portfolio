import { IconButton, Tooltip } from "@mui/material";
import { ArrowLeftRight, ExternalLink, MapPin, Pencil, UserPlus, UserX } from "lucide-react";
import Link from "next/link";
import type { UnitWithTenant } from "@/types";

type TenantServices = NonNullable<UnitWithTenant["tenant"]>["services"];

interface TenantRowActionsProps {
  row: UnitWithTenant;
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

export default function TenantRowActions({
  row,
  onEdit,
  onDeactivate,
  onActivate,
  onAssignUnit,
  onMoveTenant,
}: TenantRowActionsProps) {
  const t = row.tenant!;
  const isAssignedCurrentTenant = !row.id.startsWith("unassigned-") && t.tenantStatus === "CURRENT";

  return (
    <>
      <Tooltip title="Edit">
        <IconButton size="small" onClick={() => onEdit(row)}>
          <Pencil size={15} />
        </IconButton>
      </Tooltip>
      <Tooltip title="View profile">
        <IconButton component={Link} href={`/admin/property/tenants/${t.id}`} size="small">
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
      {onMoveTenant && t.isActive && isAssignedCurrentTenant && (
        <Tooltip title="Move to another unit">
          <IconButton
            size="small"
            color="info"
            onClick={() => onMoveTenant(t.id, t.name, row.id, t.services)}
          >
            <ArrowLeftRight size={15} />
          </IconButton>
        </Tooltip>
      )}
      {t.isActive ? (
        <Tooltip title="Deactivate">
          <IconButton size="small" color="error" onClick={() => onDeactivate(t.id, t.name)}>
            <UserX size={15} />
          </IconButton>
        </Tooltip>
      ) : (
        <Tooltip title="Re-activate">
          <IconButton size="small" color="success" onClick={() => onActivate(t.id, t.name)}>
            <UserPlus size={15} />
          </IconButton>
        </Tooltip>
      )}
    </>
  );
}
