import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";

interface MicPermissionDialogProps {
  open: boolean;
  onClose: () => void;
  onRetry: () => void;
}

export default function MicPermissionDialog({ open, onClose, onRetry }: MicPermissionDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} slotProps={{ paper: { sx: { maxWidth: 480 } } }}>
      <DialogTitle>Microphone is blocked</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          The browser remembers a previous denial and won&apos;t prompt again. To re-enable
          dictation:
        </Typography>
        <Box component="ol" sx={{ pl: 2.5, my: 0, "& li": { mb: 1.25 } }}>
          <li>
            <Typography variant="body2">
              Click the <strong>lock / tune icon</strong> on the left of the address bar.
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              Find <strong>Microphone</strong> and switch it from <em>Block</em> to <em>Allow</em>{" "}
              (or click <em>Reset permission</em>).
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              On macOS, also check{" "}
              <strong>System Settings → Privacy &amp; Security → Microphone</strong> and make sure
              your browser is toggled on.
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              Return here and click <strong>Try again</strong>.
            </Typography>
          </li>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained" onClick={onRetry}>
          Try again
        </Button>
      </DialogActions>
    </Dialog>
  );
}
