import { Box, Card, CardContent, Typography } from "@mui/material";
import { TrendingUp } from "lucide-react";
import type { TenantWithUnit } from "@/types";
import PendingRentChangeItem from "./PendingRentChangeItem";

type RentChange = TenantWithUnit["rentChanges"][number];

interface PendingRentChangesSectionProps {
  changes: RentChange[];
  editRcId: string | null;
  editRcDate: string;
  onEditRcDateChange: (v: string) => void;
  editRcRent: string;
  onEditRcRentChange: (v: string) => void;
  editRcReason: string;
  onEditRcReasonChange: (v: string) => void;
  rcSaving: boolean;
  onOpenEdit: (rc: RentChange) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDelete: (rcId: string) => void;
}

export default function PendingRentChangesSection({
  changes,
  editRcId,
  editRcDate,
  onEditRcDateChange,
  editRcRent,
  onEditRcRentChange,
  editRcReason,
  onEditRcReasonChange,
  rcSaving,
  onOpenEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
}: PendingRentChangesSectionProps) {
  if (changes.length === 0) return null;

  return (
    <Card
      sx={{ bgcolor: "background.paper", mb: 3, border: "1px solid", borderColor: "warning.main" }}
    >
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <TrendingUp size={16} color="var(--mui-palette-warning-main)" />
          <Typography variant="subtitle2" color="warning.main" sx={{ fontWeight: 600 }}>
            Pending Rent Changes
          </Typography>
        </Box>
        {changes.map((rc) => (
          <PendingRentChangeItem
            key={rc.id}
            rc={rc}
            editing={editRcId === rc.id}
            editDate={editRcDate}
            onEditDateChange={onEditRcDateChange}
            editRent={editRcRent}
            onEditRentChange={onEditRcRentChange}
            editReason={editRcReason}
            onEditReasonChange={onEditRcReasonChange}
            saving={rcSaving}
            onOpenEdit={() => onOpenEdit(rc)}
            onCancelEdit={onCancelEdit}
            onSaveEdit={onSaveEdit}
            onDelete={() => onDelete(rc.id)}
          />
        ))}
      </CardContent>
    </Card>
  );
}
