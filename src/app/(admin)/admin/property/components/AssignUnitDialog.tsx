import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import { MapPin } from "lucide-react";
import type { UnitWithTenant } from "@/types";
import AssignUnitFields from "./AssignUnitFields";

interface AssignUnitDialogState {
  tenantId: string;
  tenantName: string;
  tenantMoveInDate: string;
}

interface AssignUnitDialogProps {
  dialog: AssignUnitDialogState | null;
  onClose: () => void;
  units: UnitWithTenant[];
  assigningUnitId: string;
  onSelectUnit: (uid: string) => void;
  assignRent: string;
  onAssignRentChange: (v: string) => void;
  assignOutgoingMoveOut: string;
  onAssignOutgoingMoveOutChange: (v: string) => void;
  saving: boolean;
  onAssign: () => void;
}

export default function AssignUnitDialog({
  dialog,
  onClose,
  units,
  assigningUnitId,
  onSelectUnit,
  assignRent,
  onAssignRentChange,
  assignOutgoingMoveOut,
  onAssignOutgoingMoveOutChange,
  saving,
  onAssign,
}: AssignUnitDialogProps) {
  const targetUnit = units.find((x) => x.id === assigningUnitId);

  return (
    <Dialog
      open={!!dialog}
      onClose={() => !saving && onClose()}
      slotProps={{ paper: { sx: { bgcolor: "background.paper", borderRadius: 2, minWidth: 360 } } }}
    >
      <DialogTitle sx={{ fontWeight: 700, fontSize: "1rem" }}>
        Assign Unit — {dialog?.tenantName}
      </DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ color: "text.secondary", fontSize: "0.875rem", mb: 2 }}>
          Select a unit to assign. If the unit is already occupied, this tenant will be queued as a
          future tenant.
        </DialogContentText>
        <AssignUnitFields
          units={units}
          assigningUnitId={assigningUnitId}
          onSelectUnit={onSelectUnit}
          assignRent={assignRent}
          onAssignRentChange={onAssignRentChange}
          assignOutgoingMoveOut={assignOutgoingMoveOut}
          onAssignOutgoingMoveOutChange={onAssignOutgoingMoveOutChange}
        />
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
          startIcon={<MapPin size={14} />}
          onClick={onAssign}
          disabled={
            !assigningUnitId || saving || (!!targetUnit?.isOccupied && !assignOutgoingMoveOut)
          }
          sx={{ flex: 1 }}
        >
          {saving ? "Assigning…" : "Assign"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
