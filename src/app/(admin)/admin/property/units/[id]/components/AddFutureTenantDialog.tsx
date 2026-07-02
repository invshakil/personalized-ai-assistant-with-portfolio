import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import type { MoneyAccountRow } from "@/types";
import type { AddFutureForm, TenantHistory, UnitDetail } from "../types";
import AddFutureTenantFields from "./AddFutureTenantFields";

interface AddFutureTenantDialogProps {
  open: boolean;
  onClose: () => void;
  unit: UnitDetail | null;
  currentTenant: TenantHistory | null;
  form: AddFutureForm;
  onFormChange: (form: AddFutureForm) => void;
  accounts: MoneyAccountRow[];
  advanceAccountId: string;
  onAdvanceAccountChange: (id: string) => void;
  saving: boolean;
  onSave: () => void;
}

export default function AddFutureTenantDialog({
  open,
  onClose,
  unit,
  currentTenant,
  form,
  onFormChange,
  accounts,
  advanceAccountId,
  onAdvanceAccountChange,
  saving,
  onSave,
}: AddFutureTenantDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { bgcolor: "background.paper", borderRadius: 2, minWidth: 360 } } }}
    >
      <DialogTitle sx={{ fontWeight: 700 }}>
        {currentTenant ? "Schedule Future Tenant" : "Add Tenant"}
      </DialogTitle>
      <DialogContent>
        {currentTenant && (
          <Alert severity="info" sx={{ mb: 2, fontSize: "0.8rem" }}>
            This unit is occupied by <strong>{currentTenant.name}</strong>. They will be moved out
            on the date below, and the new tenant becomes active from their move-in date.
          </Alert>
        )}
        <AddFutureTenantFields
          form={form}
          onFormChange={onFormChange}
          unit={unit}
          currentTenant={currentTenant}
          accounts={accounts}
          advanceAccountId={advanceAccountId}
          onAdvanceAccountChange={onAdvanceAccountChange}
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
          onClick={onSave}
          disabled={
            saving ||
            !form.name ||
            !form.moveInDate ||
            (!!currentTenant && !form.outgoingMoveOutDate)
          }
          sx={{ flex: 1 }}
        >
          {saving ? "Adding…" : currentTenant ? "Schedule" : "Add Tenant"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
