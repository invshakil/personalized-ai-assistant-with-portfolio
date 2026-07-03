import { Typography } from "@mui/material";
import type { ObligationRow } from "@/types";
import ObligationCard from "./ObligationCard";

interface Props {
  obligations: ObligationRow[];
  addDueId: string | null;
  addDueAmount: string;
  addDueSaving: boolean;
  onStartAddDue: (id: string) => void;
  onCancelAddDue: () => void;
  onAddDueAmountChange: (value: string) => void;
  onAddToDue: (o: ObligationRow) => void;
}

export default function ObligationsList({
  obligations,
  addDueId,
  addDueAmount,
  addDueSaving,
  onStartAddDue,
  onCancelAddDue,
  onAddDueAmountChange,
  onAddToDue,
}: Props) {
  if (obligations.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        None yet.
      </Typography>
    );
  }

  return (
    <>
      {obligations.map((o) => (
        <ObligationCard
          key={o.id}
          obligation={o}
          isAddingDue={addDueId === o.id}
          addDueAmount={addDueAmount}
          addDueSaving={addDueSaving}
          onStartAddDue={onStartAddDue}
          onCancelAddDue={onCancelAddDue}
          onAddDueAmountChange={onAddDueAmountChange}
          onAddToDue={onAddToDue}
        />
      ))}
    </>
  );
}
