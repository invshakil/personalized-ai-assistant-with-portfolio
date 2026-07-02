import { Box, TextField } from "@mui/material";
import type { MoneyAccountRow } from "@/types";
import { dayBefore, fmt, type AddFutureForm, type TenantHistory, type UnitDetail } from "../types";
import AddFutureTenantAdvanceFields from "./AddFutureTenantAdvanceFields";

interface AddFutureTenantFieldsProps {
  form: AddFutureForm;
  onFormChange: (form: AddFutureForm) => void;
  unit: UnitDetail | null;
  currentTenant: TenantHistory | null;
  accounts: MoneyAccountRow[];
  advanceAccountId: string;
  onAdvanceAccountChange: (id: string) => void;
}

export default function AddFutureTenantFields({
  form,
  onFormChange,
  unit,
  currentTenant,
  accounts,
  advanceAccountId,
  onAdvanceAccountChange,
}: AddFutureTenantFieldsProps) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
      <TextField
        label="Full Name"
        value={form.name}
        size="small"
        fullWidth
        required
        onChange={(e) => onFormChange({ ...form, name: e.target.value })}
      />
      <TextField
        label="Phone"
        value={form.phone}
        size="small"
        fullWidth
        onChange={(e) => onFormChange({ ...form, phone: e.target.value })}
      />
      <TextField
        label="Move-in Date"
        type="date"
        value={form.moveInDate}
        size="small"
        fullWidth
        required
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
        slotProps={{ inputLabel: { shrink: true } }}
      />
      {currentTenant && (
        <TextField
          label={`${currentTenant.name}'s Move-out Date`}
          type="date"
          value={form.outgoingMoveOutDate}
          size="small"
          fullWidth
          required
          onChange={(e) => onFormChange({ ...form, outgoingMoveOutDate: e.target.value })}
          slotProps={{ inputLabel: { shrink: true } }}
          helperText={`Sets ${currentTenant.name}'s move-out and lease-end dates. Defaults to the day before the new tenant moves in.`}
        />
      )}
      <TextField
        label="Lease End Date"
        type="date"
        value={form.leaseEndDate}
        size="small"
        fullWidth
        onChange={(e) => onFormChange({ ...form, leaseEndDate: e.target.value })}
        slotProps={{ inputLabel: { shrink: true } }}
      />
      <TextField
        label={currentTenant ? "New Rent (৳)" : "Monthly Rent (৳)"}
        type="number"
        value={form.newRent}
        onChange={(e) => onFormChange({ ...form, newRent: e.target.value })}
        size="small"
        fullWidth
        placeholder={String(unit?.monthlyRent ?? "")}
        helperText={
          currentTenant
            ? form.newRent && Number(form.newRent) !== unit?.monthlyRent
              ? `Current rent is ${fmt(unit?.monthlyRent ?? 0)} — a rent change will be scheduled for their move-in date`
              : `Current rent is ${fmt(unit?.monthlyRent ?? 0)} — leave blank to keep the same`
            : "Leave blank to use current unit rent"
        }
      />

      <AddFutureTenantAdvanceFields
        form={form}
        onFormChange={onFormChange}
        accounts={accounts}
        advanceAccountId={advanceAccountId}
        onAdvanceAccountChange={onAdvanceAccountChange}
      />
    </Box>
  );
}
