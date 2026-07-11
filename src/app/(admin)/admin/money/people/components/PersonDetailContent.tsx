import { Divider, Typography } from "@mui/material";
import { fmt } from "../../format";
import type {
  BeneficiaryDetail,
  MoneyAccountRow,
  ObligationDirection,
  ObligationRow,
  ObligationType,
} from "@/types";
import PersonObligationsSection from "./PersonObligationsSection";
import PersonPaymentSection from "./PersonPaymentSection";

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
  detail: BeneficiaryDetail;
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
  editObId: string | null;
  editAmount: string;
  editSaving: boolean;
  onStartEdit: (o: ObligationRow) => void;
  onCancelEdit: () => void;
  onEditAmountChange: (value: string) => void;
  onSaveObligation: (o: ObligationRow) => void;
  onDeleteObligation: (o: ObligationRow) => void;
  detailError: string | null;
  onClose: () => void;
}

export default function PersonDetailContent({ detail, accounts, onClose, ...rest }: Props) {
  const obligationSectionProps = {
    obligations: detail.obligations,
    obForm: rest.obForm,
    onObFormChange: rest.onObFormChange,
    obSaving: rest.obSaving,
    onAddObligation: rest.onAddObligation,
    addDueId: rest.addDueId,
    addDueAmount: rest.addDueAmount,
    addDueSaving: rest.addDueSaving,
    onStartAddDue: rest.onStartAddDue,
    onCancelAddDue: rest.onCancelAddDue,
    onAddDueAmountChange: rest.onAddDueAmountChange,
    onAddToDue: rest.onAddToDue,
    editObId: rest.editObId,
    editAmount: rest.editAmount,
    editSaving: rest.editSaving,
    onStartEdit: rest.onStartEdit,
    onCancelEdit: rest.onCancelEdit,
    onEditAmountChange: rest.onEditAmountChange,
    onSaveObligation: rest.onSaveObligation,
    onDeleteObligation: rest.onDeleteObligation,
  };
  const paymentSectionProps = {
    accounts,
    obligations: detail.obligations,
    payForm: rest.payForm,
    onPayFormChange: rest.onPayFormChange,
    paySaving: rest.paySaving,
    onRecordPayment: rest.onRecordPayment,
    detailError: rest.detailError,
    payments: detail.payments,
    onClose,
  };

  return (
    <>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>
        {detail.name}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {detail.relationship ?? "—"} · paid {fmt(detail.totalPaid)} lifetime
      </Typography>

      <PersonObligationsSection {...obligationSectionProps} />
      <Divider sx={{ my: 2 }} />
      <PersonPaymentSection {...paymentSectionProps} />
    </>
  );
}
