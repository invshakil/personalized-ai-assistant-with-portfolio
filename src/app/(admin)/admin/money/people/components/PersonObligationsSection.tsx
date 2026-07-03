import { Typography } from "@mui/material";
import type { ObligationDirection, ObligationRow, ObligationType } from "@/types";
import ObligationsList from "./ObligationsList";
import AddObligationForm from "./AddObligationForm";

type ObligationForm = {
  type: ObligationType;
  direction: ObligationDirection;
  amount: string;
  frequency: string;
  startDate: string;
  notes: string;
};

interface Props {
  obligations: ObligationRow[];
  obForm: ObligationForm;
  onObFormChange: (form: ObligationForm) => void;
  obSaving: boolean;
  onAddObligation: () => void;
  addDueId: string | null;
  addDueAmount: string;
  addDueSaving: boolean;
  onStartAddDue: (id: string) => void;
  onCancelAddDue: () => void;
  onAddDueAmountChange: (value: string) => void;
  onAddToDue: (o: ObligationRow) => void;
}

export default function PersonObligationsSection({
  obligations,
  obForm,
  onObFormChange,
  obSaving,
  onAddObligation,
  addDueId,
  addDueAmount,
  addDueSaving,
  onStartAddDue,
  onCancelAddDue,
  onAddDueAmountChange,
  onAddToDue,
}: Props) {
  return (
    <>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 3, mb: 1 }}>
        Obligations
      </Typography>
      <ObligationsList
        obligations={obligations}
        addDueId={addDueId}
        addDueAmount={addDueAmount}
        addDueSaving={addDueSaving}
        onStartAddDue={onStartAddDue}
        onCancelAddDue={onCancelAddDue}
        onAddDueAmountChange={onAddDueAmountChange}
        onAddToDue={onAddToDue}
      />
      <AddObligationForm
        form={obForm}
        onChange={onObFormChange}
        saving={obSaving}
        onSave={onAddObligation}
      />
    </>
  );
}
