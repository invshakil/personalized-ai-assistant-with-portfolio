import { Card, CardContent } from "@mui/material";
import type { UnitDetail, UnitEditForm } from "../types";
import UnitInfoView from "./UnitInfoView";
import UnitInfoEditForm from "./UnitInfoEditForm";

interface UnitInfoCardProps {
  unit: UnitDetail;
  editMode: boolean;
  onEditModeChange: (v: boolean) => void;
  editForm: UnitEditForm;
  onEditFormChange: (form: UnitEditForm) => void;
  saving: boolean;
  onSave: () => void;
}

export default function UnitInfoCard({
  unit,
  editMode,
  onEditModeChange,
  editForm,
  onEditFormChange,
  saving,
  onSave,
}: UnitInfoCardProps) {
  return (
    <Card sx={{ bgcolor: "background.paper", mb: 3 }}>
      <CardContent>
        {editMode ? (
          <UnitInfoEditForm
            editForm={editForm}
            onEditFormChange={onEditFormChange}
            saving={saving}
            onCancel={() => onEditModeChange(false)}
            onSave={onSave}
          />
        ) : (
          <UnitInfoView unit={unit} onEdit={() => onEditModeChange(true)} />
        )}
      </CardContent>
    </Card>
  );
}
