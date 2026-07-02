import type { Dispatch, SetStateAction } from "react";
import { Box, Divider, Drawer } from "@mui/material";
import type { SubscriptionDetail } from "../../types";
import type { AdjustingState, RcForm } from "../types";
import ManageDrawerHeader from "./ManageDrawerHeader";
import RateChangeSection from "./RateChangeSection";
import ChargeHistoryTable from "./ChargeHistoryTable";

interface ManageDrawerProps {
  detail: SubscriptionDetail | null;
  onClose: () => void;
  manageError: string | null;
  onDismissError: () => void;
  rcForm: RcForm;
  onRcFormChange: Dispatch<SetStateAction<RcForm>>;
  showRcForm: boolean;
  onToggleRcForm: () => void;
  busy: boolean;
  onAddRateChange: () => void;
  onDeleteRateChange: (rcId: string) => void;
  adjusting: AdjustingState | null;
  onAdjustingChange: Dispatch<SetStateAction<AdjustingState | null>>;
  onStartAdjust: (chargeId: string, amount: number, note: string | null) => void;
  onSaveOverride: () => void;
  onClearOverride: (month: string | null) => void;
  onCancelAdjust: () => void;
}

export default function ManageDrawer({
  detail,
  onClose,
  manageError,
  onDismissError,
  rcForm,
  onRcFormChange,
  showRcForm,
  onToggleRcForm,
  busy,
  onAddRateChange,
  onDeleteRateChange,
  adjusting,
  onAdjustingChange,
  onStartAdjust,
  onSaveOverride,
  onClearOverride,
  onCancelAdjust,
}: ManageDrawerProps) {
  return (
    <Drawer
      anchor="right"
      open={!!detail}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: "100%", sm: 480 } } } }}
    >
      {detail && (
        <Box sx={{ width: "100%", p: 3 }}>
          <ManageDrawerHeader
            detail={detail}
            manageError={manageError}
            onDismissError={onDismissError}
          />

          <RateChangeSection
            detail={detail}
            rcForm={rcForm}
            onRcFormChange={onRcFormChange}
            showRcForm={showRcForm}
            onToggleRcForm={onToggleRcForm}
            busy={busy}
            onAddRateChange={onAddRateChange}
            onDeleteRateChange={onDeleteRateChange}
          />

          <Divider sx={{ my: 2 }} />

          <ChargeHistoryTable
            detail={detail}
            adjusting={adjusting}
            onAdjustingChange={onAdjustingChange}
            onStartAdjust={onStartAdjust}
            busy={busy}
            onSave={onSaveOverride}
            onClear={onClearOverride}
            onCancel={onCancelAdjust}
          />
        </Box>
      )}
    </Drawer>
  );
}
