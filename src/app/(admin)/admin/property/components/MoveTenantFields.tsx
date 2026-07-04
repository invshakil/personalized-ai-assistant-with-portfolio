import {
  Box,
  Checkbox,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import type { UnitWithTenant } from "@/types";
import { fmt } from "../types";

type TenantServices = NonNullable<UnitWithTenant["tenant"]>["services"];

interface MoveTenantFieldsProps {
  units: UnitWithTenant[];
  currentUnitId: string;
  targetUnitId: string;
  onSelectUnit: (uid: string) => void;
  rent: string;
  onRentChange: (v: string) => void;
  moveDate: string;
  onMoveDateChange: (v: string) => void;
  services: TenantServices;
  endServiceIds: string[];
  onToggleEndService: (tenantServiceId: string) => void;
  serviceCatalog: { id: string; name: string }[];
  addSvcId: string;
  onAddSvcIdChange: (id: string) => void;
  addSvcFee: string;
  onAddSvcFeeChange: (fee: string) => void;
}

export default function MoveTenantFields({
  units,
  currentUnitId,
  targetUnitId,
  onSelectUnit,
  rent,
  onRentChange,
  moveDate,
  onMoveDateChange,
  services,
  endServiceIds,
  onToggleEndService,
  serviceCatalog,
  addSvcId,
  onAddSvcIdChange,
  addSvcFee,
  onAddSvcFeeChange,
}: MoveTenantFieldsProps) {
  const destinationUnits = units.filter((u) => !u.isOccupied && u.id !== currentUnitId);
  const targetUnit = units.find((u) => u.id === targetUnitId);

  return (
    <>
      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
        <InputLabel>Destination Unit</InputLabel>
        <Select
          label="Destination Unit"
          value={targetUnitId}
          onChange={(e) => onSelectUnit(e.target.value as string)}
        >
          {destinationUnits.length === 0 ? (
            <MenuItem value="" disabled>
              No vacant units available
            </MenuItem>
          ) : (
            destinationUnits.map((unit) => (
              <MenuItem key={unit.id} value={unit.id}>
                {unit.unitNumber} — {unit.floor} ({fmt(unit.monthlyRent)}/mo, Vacant)
              </MenuItem>
            ))
          )}
        </Select>
      </FormControl>

      {targetUnitId && (
        <>
          <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
            <TextField
              label="Rent for New Unit (৳)"
              type="number"
              value={rent}
              onChange={(e) => onRentChange(e.target.value)}
              size="small"
              fullWidth
              helperText={
                targetUnit && rent && Number(rent) !== targetUnit.monthlyRent
                  ? `Current rent is ${fmt(targetUnit.monthlyRent)} — will be updated`
                  : "Defaults to the unit's current rent"
              }
            />
            <TextField
              label="Move Date"
              type="date"
              value={moveDate}
              onChange={(e) => onMoveDateChange(e.target.value)}
              size="small"
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
            Active services — uncheck to end on the move date
          </Typography>
          {!services || services.length === 0 ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
              No services assigned.
            </Typography>
          ) : (
            <Box sx={{ mb: 2 }}>
              {services.map((sv) => (
                <FormControlLabel
                  key={sv.id}
                  sx={{ display: "block" }}
                  control={
                    <Checkbox
                      size="small"
                      checked={!endServiceIds.includes(sv.id)}
                      onChange={() => onToggleEndService(sv.id)}
                    />
                  }
                  label={
                    <Typography variant="body2">
                      {sv.serviceName}
                      {sv.monthlyFee > 0 ? ` — ${fmt(sv.monthlyFee)}/mo` : ""}
                    </Typography>
                  }
                />
              ))}
            </Box>
          )}

          {serviceCatalog.length > 0 && (
            <>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mb: 0.5 }}
              >
                Add a service for the new unit (optional)
              </Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                <FormControl size="small" sx={{ flex: 2 }}>
                  <InputLabel>Service</InputLabel>
                  <Select
                    label="Service"
                    value={addSvcId}
                    onChange={(e) => onAddSvcIdChange(e.target.value as string)}
                  >
                    <MenuItem value="">None</MenuItem>
                    {serviceCatalog.map((c) => (
                      <MenuItem key={c.id} value={c.id}>
                        {c.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  label="Fee (৳)"
                  type="number"
                  size="small"
                  sx={{ flex: 1 }}
                  value={addSvcFee}
                  onChange={(e) => onAddSvcFeeChange(e.target.value)}
                  placeholder="0"
                  disabled={!addSvcId}
                />
              </Box>
            </>
          )}
        </>
      )}
    </>
  );
}
