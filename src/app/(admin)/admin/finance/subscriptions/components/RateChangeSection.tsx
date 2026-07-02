import type { Dispatch, SetStateAction } from "react";
import { Box, Button, Typography } from "@mui/material";
import { Plus, TrendingUp } from "lucide-react";
import type { SubscriptionDetail } from "../../types";
import { fmt, fmtMonth } from "../../format";
import type { RcForm } from "../types";
import RateChangeAddForm from "./RateChangeAddForm";
import RateChangeList from "./RateChangeList";

interface RateChangeSectionProps {
  detail: SubscriptionDetail;
  rcForm: RcForm;
  onRcFormChange: Dispatch<SetStateAction<RcForm>>;
  showRcForm: boolean;
  onToggleRcForm: () => void;
  busy: boolean;
  onAddRateChange: () => void;
  onDeleteRateChange: (rcId: string) => void;
}

export default function RateChangeSection({
  detail,
  rcForm,
  onRcFormChange,
  showRcForm,
  onToggleRcForm,
  busy,
  onAddRateChange,
  onDeleteRateChange,
}: RateChangeSectionProps) {
  return (
    <>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, display: "flex", gap: 0.75 }}>
          <TrendingUp size={16} /> Price changes
        </Typography>
        <Button size="small" startIcon={<Plus size={14} />} onClick={onToggleRcForm}>
          Add
        </Button>
      </Box>
      <Typography variant="caption" color="text.secondary">
        Base rate {fmt(detail.monthlyAmount)} from {fmtMonth(detail.startDate)}.
      </Typography>

      {showRcForm && (
        <RateChangeAddForm
          rcForm={rcForm}
          onRcFormChange={onRcFormChange}
          busy={busy}
          onAddRateChange={onAddRateChange}
        />
      )}

      <RateChangeList
        rateChanges={detail.rateChanges}
        busy={busy}
        onDeleteRateChange={onDeleteRateChange}
      />
    </>
  );
}
