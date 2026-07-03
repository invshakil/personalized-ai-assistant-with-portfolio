import { Alert, Button, Typography } from "@mui/material";
import type { MoneyAccountRow, MoneyEntryRow, ObligationRow } from "@/types";
import RecordPaymentForm from "./RecordPaymentForm";
import PaymentHistoryTable from "./PaymentHistoryTable";

type PaymentForm = {
  amount: string;
  date: string;
  accountId: string;
  obligationId: string;
  direction: "DEBIT" | "CREDIT";
};

interface Props {
  accounts: MoneyAccountRow[];
  obligations: ObligationRow[];
  payForm: PaymentForm;
  onPayFormChange: (form: PaymentForm) => void;
  paySaving: boolean;
  onRecordPayment: () => void;
  detailError: string | null;
  payments: MoneyEntryRow[];
  onClose: () => void;
}

export default function PersonPaymentSection({
  accounts,
  obligations,
  payForm,
  onPayFormChange,
  paySaving,
  onRecordPayment,
  detailError,
  payments,
  onClose,
}: Props) {
  return (
    <>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
        Record a payment
      </Typography>
      <RecordPaymentForm
        form={payForm}
        onChange={onPayFormChange}
        accounts={accounts}
        obligations={obligations}
        saving={paySaving}
        onSave={onRecordPayment}
      />

      {detailError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {detailError}
        </Alert>
      )}

      <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 3, mb: 1 }}>
        Payment history
      </Typography>
      <PaymentHistoryTable payments={payments} />

      <Button sx={{ mt: 3 }} fullWidth onClick={onClose}>
        Close
      </Button>
    </>
  );
}
