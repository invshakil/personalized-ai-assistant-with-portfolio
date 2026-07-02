import type { RefObject } from "react";
import { Box, Button, Drawer, IconButton, TextField, Typography } from "@mui/material";
import { X } from "lucide-react";
import type { MoneyAccountRow, UnitWithTenant } from "@/types";
import type { AddTenantForm } from "../types";
import AddTenantUnitFields from "./AddTenantUnitFields";
import AddTenantDateFields from "./AddTenantDateFields";
import AddTenantAdvanceFields from "./AddTenantAdvanceFields";
import AddTenantDocumentsSection from "./AddTenantDocumentsSection";

interface AddTenantDrawerProps {
  open: boolean;
  onClose: () => void;
  isAddingExternal: boolean;
  form: AddTenantForm;
  onFormChange: (form: AddTenantForm) => void;
  unitsWithoutFuture: UnitWithTenant[];
  selectedUnit: UnitWithTenant | undefined;
  accounts: MoneyAccountRow[];
  advanceAccountId: string;
  onAdvanceAccountChange: (id: string) => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  pendingFiles: File[];
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  saving: boolean;
  onSave: () => void;
}

export default function AddTenantDrawer({
  open,
  onClose,
  isAddingExternal,
  form,
  onFormChange,
  unitsWithoutFuture,
  selectedUnit,
  accounts,
  advanceAccountId,
  onAdvanceAccountChange,
  fileInputRef,
  pendingFiles,
  onAddFiles,
  onRemoveFile,
  saving,
  onSave,
}: AddTenantDrawerProps) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: "100%", sm: 420 } } } }}
    >
      <Box sx={{ width: "100%", p: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {isAddingExternal ? "Add External Member" : "Add Tenant"}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <X size={18} />
          </IconButton>
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            label="Full Name"
            value={form.name}
            onChange={(e) => onFormChange({ ...form, name: e.target.value })}
            size="small"
            fullWidth
            required
          />
          <TextField
            label="Phone"
            value={form.phone}
            onChange={(e) => onFormChange({ ...form, phone: e.target.value })}
            size="small"
            fullWidth
          />

          {!isAddingExternal && (
            <AddTenantUnitFields
              form={form}
              onFormChange={onFormChange}
              unitsWithoutFuture={unitsWithoutFuture}
              selectedUnit={selectedUnit}
            />
          )}

          <AddTenantDateFields
            form={form}
            onFormChange={onFormChange}
            isAddingExternal={isAddingExternal}
            selectedUnit={selectedUnit}
          />

          <AddTenantAdvanceFields
            form={form}
            onFormChange={onFormChange}
            accounts={accounts}
            advanceAccountId={advanceAccountId}
            onAdvanceAccountChange={onAdvanceAccountChange}
          />

          <AddTenantDocumentsSection
            fileInputRef={fileInputRef}
            pendingFiles={pendingFiles}
            onAddFiles={onAddFiles}
            onRemoveFile={onRemoveFile}
          />

          <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
            <Button variant="outlined" size="small" fullWidth onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant="contained"
              size="small"
              fullWidth
              onClick={onSave}
              disabled={
                saving ||
                !form.name ||
                !form.moveInDate ||
                (!isAddingExternal && !form.unitId) ||
                (!isAddingExternal && !!selectedUnit?.isOccupied && !form.outgoingMoveOutDate)
              }
            >
              {saving ? "Saving…" : isAddingExternal ? "Add Member" : "Add Tenant"}
            </Button>
          </Box>
        </Box>
      </Box>
    </Drawer>
  );
}
