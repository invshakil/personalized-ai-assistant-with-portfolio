import { Box, Button, FormControl, InputLabel, MenuItem, Select, TextField } from "@mui/material";

interface ServiceOption {
  id: string;
  name: string;
}

interface AssignServiceFormProps {
  availableServices: ServiceOption[];
  addSvcId: string;
  onSvcIdChange: (id: string) => void;
  addSvcFee: string;
  onSvcFeeChange: (fee: string) => void;
  addSvcDate: string;
  onSvcDateChange: (date: string) => void;
  saving: boolean;
  onAssign: () => void;
}

export default function AssignServiceForm({
  availableServices,
  addSvcId,
  onSvcIdChange,
  addSvcFee,
  onSvcFeeChange,
  addSvcDate,
  onSvcDateChange,
  saving,
  onAssign,
}: AssignServiceFormProps) {
  if (availableServices.length === 0) return null;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <Box sx={{ display: "flex", gap: 1 }}>
        <FormControl size="small" sx={{ flex: 2 }}>
          <InputLabel>Service</InputLabel>
          <Select
            label="Service"
            value={addSvcId}
            onChange={(e) => onSvcIdChange(e.target.value as string)}
          >
            {availableServices.map((c) => (
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
          onChange={(e) => onSvcFeeChange(e.target.value)}
          placeholder="0"
        />
      </Box>
      <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
        <TextField
          label="Start Date"
          type="date"
          size="small"
          sx={{ flex: 1 }}
          value={addSvcDate}
          onChange={(e) => onSvcDateChange(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <Button
          variant="contained"
          size="small"
          onClick={onAssign}
          disabled={saving || !addSvcId || addSvcFee === "" || !addSvcDate}
        >
          Assign
        </Button>
      </Box>
    </Box>
  );
}
