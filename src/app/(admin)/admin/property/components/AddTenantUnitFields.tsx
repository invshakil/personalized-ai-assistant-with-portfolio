import { Alert, FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import type { UnitWithTenant } from "@/types";
import { fmt, type AddTenantForm } from "../types";
import NumberField from "@/components/admin/NumberField";

interface AddTenantUnitFieldsProps {
  form: AddTenantForm;
  onFormChange: (form: AddTenantForm) => void;
  unitsWithoutFuture: UnitWithTenant[];
  selectedUnit: UnitWithTenant | undefined;
}

export default function AddTenantUnitFields({
  form,
  onFormChange,
  unitsWithoutFuture,
  selectedUnit,
}: AddTenantUnitFieldsProps) {
  return (
    <>
      <FormControl size="small" fullWidth required>
        <InputLabel>Unit</InputLabel>
        <Select
          label="Unit"
          value={form.unitId}
          onChange={(e) => {
            const uid = e.target.value as string;
            const u = unitsWithoutFuture.find((x) => x.id === uid);
            onFormChange({ ...form, unitId: uid, customRent: u ? String(u.monthlyRent) : "" });
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
          <strong>future tenant</strong>; the current tenant is moved out on the date below and the
          new tenant becomes active from their move-in date.
        </Alert>
      )}

      {form.unitId && (
        <NumberField
          label={selectedUnit?.isOccupied ? "New Rent for Future Tenant (৳)" : "Monthly Rent (৳)"}
          value={form.customRent}
          onChange={(v) => onFormChange({ ...form, customRent: v })}
          size="small"
          fullWidth
          helperText={
            selectedUnit?.isOccupied
              ? form.customRent && Number(form.customRent) !== selectedUnit.monthlyRent
                ? `Current unit rent is ${fmt(selectedUnit.monthlyRent)} — a rent change will be scheduled for their move-in date`
                : `Current unit rent is ${fmt(selectedUnit?.monthlyRent ?? 0)} — enter a different amount if their rent will change`
              : selectedUnit && Number(form.customRent) !== selectedUnit.monthlyRent
                ? `Default: ${fmt(selectedUnit.monthlyRent)} — saving will update the unit's rent`
                : "Leave as default or enter a custom rent for this tenant"
          }
        />
      )}
    </>
  );
}
