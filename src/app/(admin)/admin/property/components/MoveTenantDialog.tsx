import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import { ArrowLeftRight } from "lucide-react";
import type { UnitWithTenant } from "@/types";
import MoveTenantFields from "./MoveTenantFields";

type TenantServices = NonNullable<UnitWithTenant["tenant"]>["services"];

interface MoveTenantDialogState {
  tenantId: string;
  tenantName: string;
  currentUnitId: string;
  services: TenantServices;
}

interface MoveTenantDialogProps {
  dialog: MoveTenantDialogState | null;
  onClose: () => void;
  units: UnitWithTenant[];
  serviceCatalog: { id: string; name: string }[];
  targetUnitId: string;
  onSelectUnit: (uid: string) => void;
  rent: string;
  onRentChange: (v: string) => void;
  moveDate: string;
  onMoveDateChange: (v: string) => void;
  endServiceIds: string[];
  onToggleEndService: (tenantServiceId: string) => void;
  addSvcId: string;
  onAddSvcIdChange: (id: string) => void;
  addSvcFee: string;
  onAddSvcFeeChange: (fee: string) => void;
  saving: boolean;
  onMove: () => void;
}

export default function MoveTenantDialog({
  dialog,
  onClose,
  units,
  serviceCatalog,
  targetUnitId,
  onSelectUnit,
  rent,
  onRentChange,
  moveDate,
  onMoveDateChange,
  endServiceIds,
  onToggleEndService,
  addSvcId,
  onAddSvcIdChange,
  addSvcFee,
  onAddSvcFeeChange,
  saving,
  onMove,
}: MoveTenantDialogProps) {
  return (
    <Dialog
      open={!!dialog}
      onClose={() => !saving && onClose()}
      slotProps={{ paper: { sx: { bgcolor: "background.paper", borderRadius: 2, minWidth: 400 } } }}
    >
      <DialogTitle sx={{ fontWeight: 700, fontSize: "1rem" }}>
        Move Tenant — {dialog?.tenantName}
      </DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ color: "text.secondary", fontSize: "0.875rem", mb: 2 }}>
          Select a vacant unit to move this tenant into. You can adjust their rent and service
          subscriptions as part of the move.
        </DialogContentText>
        {dialog && (
          <MoveTenantFields
            units={units}
            currentUnitId={dialog.currentUnitId}
            targetUnitId={targetUnitId}
            onSelectUnit={onSelectUnit}
            rent={rent}
            onRentChange={onRentChange}
            moveDate={moveDate}
            onMoveDateChange={onMoveDateChange}
            services={dialog.services}
            endServiceIds={endServiceIds}
            onToggleEndService={onToggleEndService}
            serviceCatalog={serviceCatalog}
            addSvcId={addSvcId}
            onAddSvcIdChange={onAddSvcIdChange}
            addSvcFee={addSvcFee}
            onAddSvcFeeChange={onAddSvcFeeChange}
          />
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button
          variant="outlined"
          size="small"
          onClick={onClose}
          disabled={saving}
          sx={{ flex: 1 }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          size="small"
          startIcon={<ArrowLeftRight size={14} />}
          onClick={onMove}
          disabled={!targetUnitId || saving}
          sx={{ flex: 1 }}
        >
          {saving ? "Moving…" : "Move"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
