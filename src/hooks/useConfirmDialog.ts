import { useState } from "react";

type ConfirmColor = "error" | "primary" | "warning" | "success";

interface ConfirmDialogState {
  title: string;
  message: string;
  confirmLabel?: string;
  confirmColor?: ConfirmColor;
  onConfirm: () => Promise<void>;
}

/** Pairs with components/admin/ConfirmDialog — owns the open/loading state and the pending action. */
export function useConfirmDialog() {
  const [dialog, setDialog] = useState<ConfirmDialogState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openConfirm(
    title: string,
    message: string,
    onConfirm: () => Promise<void>,
    opts?: { confirmLabel?: string; confirmColor?: ConfirmColor }
  ) {
    setError(null);
    setDialog({ title, message, onConfirm, ...opts });
  }

  async function runConfirm() {
    if (!dialog) return;
    setLoading(true);
    setError(null);
    try {
      await dialog.onConfirm();
      setDialog(null);
    } catch (e) {
      // Most confirmed actions are deletes, and the common failure is a real
      // server message worth reading ("Cannot delete — it is still in use").
      // Keep the dialog open and show it: closing regardless used to look
      // exactly like success while the row was still there.
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return {
    dialog,
    loading,
    error,
    openConfirm,
    runConfirm,
    closeConfirm: () => {
      setError(null);
      setDialog(null);
    },
  };
}
