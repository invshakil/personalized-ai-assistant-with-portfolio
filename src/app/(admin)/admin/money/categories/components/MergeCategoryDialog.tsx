import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
} from "@mui/material";
import SearchableSelect from "@/components/admin/SearchableSelect";
import type { SelectOption } from "@/components/admin/SearchableSelect";
import type { MoneyCategoryRow } from "@/types";

interface Props {
  open: boolean;
  source: MoneyCategoryRow | null;
  targetId: string;
  targetOptions: SelectOption[];
  deleteSource: boolean;
  merging: boolean;
  error: string | null;
  onTargetChange: (value: string) => void;
  onDeleteSourceChange: (value: boolean) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export default function MergeCategoryDialog({
  open,
  source,
  targetId,
  targetOptions,
  deleteSource,
  merging,
  error,
  onTargetChange,
  onDeleteSourceChange,
  onClose,
  onConfirm,
}: Props) {
  // `open` is only ever true after a source has been set, and the source is
  // deliberately retained while the dialog fades out — so bailing here can
  // never blank a visible dialog, and every field below is non-optional.
  if (!source) return null;

  const kindLabel = source.kind === "INCOME" ? "income" : "expense";
  const count = source.entryCount;
  const noTargets = targetOptions.length === 0;

  return (
    <Dialog open={open} onClose={merging ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Merge category</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ color: "text.secondary", mb: 2 }}>
          {`Move all ${count} entr${count === 1 ? "y" : "ies"} from "${source.name}" into another ` +
            `category. Only ${kindLabel} categories can receive them.`}
        </DialogContentText>
        <SearchableSelect
          label="Merge into"
          value={targetId}
          options={targetOptions}
          onChange={onTargetChange}
          disabled={merging || noTargets}
          sx={{ mb: 1 }}
        />
        {noTargets && (
          <Alert severity="info" sx={{ mt: 1 }}>
            {`There is no other ${kindLabel} category to merge into yet.`}
          </Alert>
        )}
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={deleteSource}
              disabled={merging || noTargets}
              onChange={(e) => onDeleteSourceChange(e.target.checked)}
            />
          }
          label={`Delete "${source.name}" afterwards`}
        />
        {error && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={merging} color="inherit">
          Cancel
        </Button>
        <Button onClick={onConfirm} disabled={merging || !targetId} variant="contained">
          {merging ? "Merging…" : "Merge"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
