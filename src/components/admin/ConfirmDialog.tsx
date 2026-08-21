"use client";

import type { ReactNode } from "react";
import {
  Alert,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material";

type ConfirmColor = "error" | "primary" | "warning" | "success";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: ConfirmColor;
  loading?: boolean;
  /** Failure from the last confirm attempt; shown inline, dialog stays open. */
  error?: string | null;
  /** Optional icon shown in a colored circular avatar beside the title. */
  icon?: ReactNode;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Themed confirmation dialog used across the admin surface in place of the
 * native window.confirm(). Controlled via `open`; the parent owns the action.
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmColor = "error",
  loading = false,
  error = null,
  icon,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, ...(icon && { pb: 1 }) }}>
        {icon ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: `${confirmColor}.main`,
                flexShrink: 0,
              }}
            >
              {icon}
            </Box>
            <Box component="span" sx={{ fontSize: "1rem" }}>
              {title}
            </Box>
          </Box>
        ) : (
          title
        )}
      </DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ color: "text.secondary" }}>{message}</DialogContentText>
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading} color="inherit">
          {cancelLabel}
        </Button>
        <Button onClick={onConfirm} disabled={loading} variant="contained" color={confirmColor}>
          {loading ? "Working…" : error ? "Retry" : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
