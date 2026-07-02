import { TextField } from "@mui/material";
import type { UnitWithTenant } from "@/types";
import { dayBefore, type AddTenantForm } from "../types";

interface AddTenantDateFieldsProps {
  form: AddTenantForm;
  onFormChange: (form: AddTenantForm) => void;
  isAddingExternal: boolean;
  selectedUnit: UnitWithTenant | undefined;
}

export default function AddTenantDateFields({
  form,
  onFormChange,
  isAddingExternal,
  selectedUnit,
}: AddTenantDateFieldsProps) {
  return (
    <>
      <TextField
        label="Move-in Date"
        type="date"
        value={form.moveInDate}
        onChange={(e) => {
          const moveInDate = e.target.value;
          // Keep the outgoing move-out in lockstep with move-in unless edited.
          const autoOut =
            !form.outgoingMoveOutDate || form.outgoingMoveOutDate === dayBefore(form.moveInDate);
          onFormChange({
            ...form,
            moveInDate,
            outgoingMoveOutDate: autoOut ? dayBefore(moveInDate) : form.outgoingMoveOutDate,
          });
        }}
        size="small"
        fullWidth
        required
        slotProps={{ inputLabel: { shrink: true } }}
      />
      {!isAddingExternal && selectedUnit?.isOccupied && (
        <TextField
          label={`${selectedUnit.tenant?.name ?? "Current tenant"}'s Move-out Date`}
          type="date"
          value={form.outgoingMoveOutDate}
          onChange={(e) => onFormChange({ ...form, outgoingMoveOutDate: e.target.value })}
          size="small"
          fullWidth
          required
          slotProps={{ inputLabel: { shrink: true } }}
          helperText={`Sets ${selectedUnit.tenant?.name ?? "the current tenant"}'s move-out and lease-end dates. Defaults to the day before the new tenant moves in.`}
        />
      )}
      <TextField
        label="Lease End Date"
        type="date"
        value={form.leaseEndDate}
        onChange={(e) => onFormChange({ ...form, leaseEndDate: e.target.value })}
        size="small"
        fullWidth
        slotProps={{ inputLabel: { shrink: true } }}
      />
    </>
  );
}
