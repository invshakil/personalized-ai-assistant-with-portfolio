import { Box, CircularProgress, Drawer } from "@mui/material";
import type {
  BeneficiaryDetail,
  MoneyAccountRow,
  ObligationDirection,
  ObligationRow,
  ObligationType,
} from "@/types";
import PersonDetailContent from "./PersonDetailContent";

type ObligationForm = {
  type: ObligationType;
  direction: ObligationDirection;
  amount: string;
  frequency: string;
  startDate: string;
  notes: string;
};

type PaymentForm = {
  amount: string;
  date: string;
  accountId: string;
  obligationId: string;
  direction: "DEBIT" | "CREDIT";
};

interface Props {
  open: boolean;
  loading: boolean;
  detail: BeneficiaryDetail | null;
  accounts: MoneyAccountRow[];
  obForm: ObligationForm;
  onObFormChange: (form: ObligationForm) => void;
  obSaving: boolean;
  onAddObligation: () => void;
  payForm: PaymentForm;
  onPayFormChange: (form: PaymentForm) => void;
  paySaving: boolean;
  onRecordPayment: () => void;
  addDueId: string | null;
  addDueAmount: string;
  addDueSaving: boolean;
  onStartAddDue: (id: string) => void;
  onCancelAddDue: () => void;
  onAddDueAmountChange: (value: string) => void;
  onAddToDue: (o: ObligationRow) => void;
  detailError: string | null;
  onClose: () => void;
}

export default function PersonDetailDrawer({
  open,
  loading,
  detail,
  onClose,
  ...contentProps
}: Props) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: "100%", sm: 520 } } } }}
    >
      <Box sx={{ width: "100%", p: 3 }}>
        {loading || !detail ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <PersonDetailContent detail={detail} onClose={onClose} {...contentProps} />
        )}
      </Box>
    </Drawer>
  );
}
