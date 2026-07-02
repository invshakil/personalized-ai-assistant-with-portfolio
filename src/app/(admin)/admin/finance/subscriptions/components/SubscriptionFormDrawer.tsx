import type { Dispatch, SetStateAction } from "react";
import { Alert, Box, Button, Drawer, Typography } from "@mui/material";
import type { CategoryRow } from "../../types";
import type { SubForm } from "../types";
import SubscriptionFormFields from "./SubscriptionFormFields";

interface SubscriptionFormDrawerProps {
  open: boolean;
  editing: string | null;
  form: SubForm;
  onFormChange: Dispatch<SetStateAction<SubForm>>;
  categories: CategoryRow[];
  saving: boolean;
  error: string | null;
  onSave: () => void;
  onClose: () => void;
}

export default function SubscriptionFormDrawer({
  open,
  editing,
  form,
  onFormChange,
  categories,
  saving,
  error,
  onSave,
  onClose,
}: SubscriptionFormDrawerProps) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: "100%", sm: 420 } } } }}
    >
      <Box sx={{ width: "100%", p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          {editing ? "Edit Subscription" : "Add Subscription"}
        </Typography>

        <SubscriptionFormFields
          editing={editing}
          form={form}
          onFormChange={onFormChange}
          categories={categories}
        />

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Button
          variant="contained"
          fullWidth
          onClick={onSave}
          disabled={saving || !form.name || !form.categoryId || !form.monthlyAmount}
        >
          {saving ? "Saving…" : editing ? "Save Changes" : "Add Subscription"}
        </Button>
        {editing && (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
            This is the starting rate. For a price hike from a later month, use “Manage pricing &
            history” → Add price change.
          </Typography>
        )}
      </Box>
    </Drawer>
  );
}
