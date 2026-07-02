import type { Dispatch, SetStateAction } from "react";
import { Box, Button, TextField } from "@mui/material";
import type { RcForm } from "../types";

interface RateChangeAddFormProps {
  rcForm: RcForm;
  onRcFormChange: Dispatch<SetStateAction<RcForm>>;
  busy: boolean;
  onAddRateChange: () => void;
}

export default function RateChangeAddForm({
  rcForm,
  onRcFormChange,
  busy,
  onAddRateChange,
}: RateChangeAddFormProps) {
  return (
    <Box
      sx={{
        mt: 1.5,
        p: 1.5,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
      }}
    >
      <TextField
        label="Effective from"
        type="month"
        size="small"
        value={rcForm.effectiveMonth}
        onChange={(e) => onRcFormChange((f) => ({ ...f, effectiveMonth: e.target.value }))}
      />
      <TextField
        label="New monthly amount (৳)"
        type="number"
        size="small"
        value={rcForm.monthlyAmount}
        onChange={(e) => onRcFormChange((f) => ({ ...f, monthlyAmount: e.target.value }))}
      />
      <TextField
        label="Note (optional)"
        size="small"
        placeholder="e.g. annual price increase"
        value={rcForm.note}
        onChange={(e) => onRcFormChange((f) => ({ ...f, note: e.target.value }))}
      />
      <Button
        variant="contained"
        size="small"
        onClick={onAddRateChange}
        disabled={busy || !rcForm.monthlyAmount}
      >
        Apply price change
      </Button>
    </Box>
  );
}
