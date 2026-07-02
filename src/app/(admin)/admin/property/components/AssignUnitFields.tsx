import { FormControl, InputLabel, MenuItem, Select, TextField } from "@mui/material";
import type { UnitWithTenant } from "@/types";
import { fmt } from "../types";

interface AssignUnitFieldsProps {
  units: UnitWithTenant[];
  assigningUnitId: string;
  onSelectUnit: (uid: string) => void;
  assignRent: string;
  onAssignRentChange: (v: string) => void;
  assignOutgoingMoveOut: string;
  onAssignOutgoingMoveOutChange: (v: string) => void;
}

export default function AssignUnitFields({
  units,
  assigningUnitId,
  onSelectUnit,
  assignRent,
  onAssignRentChange,
  assignOutgoingMoveOut,
  onAssignOutgoingMoveOutChange,
}: AssignUnitFieldsProps) {
  const u = units.find((x) => x.id === assigningUnitId);

  return (
    <>
      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
        <InputLabel>Unit</InputLabel>
        <Select
          label="Unit"
          value={assigningUnitId}
          onChange={(e) => onSelectUnit(e.target.value as string)}
        >
          {units.map((unit) => (
            <MenuItem key={unit.id} value={unit.id}>
              {unit.unitNumber} — {unit.floor}
              {unit.isOccupied
                ? ` (Occupied by ${unit.tenant?.name ?? "?"} — will be Future)`
                : ` (${fmt(unit.monthlyRent)}/mo, Vacant)`}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {assigningUnitId && (
        <TextField
          label={u?.isOccupied ? "New Rent for Future Tenant (৳)" : "Monthly Rent (৳)"}
          type="number"
          value={assignRent}
          onChange={(e) => onAssignRentChange(e.target.value)}
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
      )}

      {assigningUnitId && u?.isOccupied && (
        <TextField
          label={`${u?.tenant?.name ?? "current tenant"}'s Move-out Date`}
          type="date"
          value={assignOutgoingMoveOut}
          onChange={(e) => onAssignOutgoingMoveOutChange(e.target.value)}
          size="small"
          fullWidth
          required
          sx={{ mt: 2 }}
          slotProps={{ inputLabel: { shrink: true } }}
          helperText={`Sets ${u?.tenant?.name ?? "current tenant"}'s move-out and lease-end dates. Defaults to the day before this tenant moves in.`}
        />
      )}
    </>
  );
}
