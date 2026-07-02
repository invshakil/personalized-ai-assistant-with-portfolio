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

  function openConfirm(
    title: string,
    message: string,
    onConfirm: () => Promise<void>,
    opts?: { confirmLabel?: string; confirmColor?: ConfirmColor }
  ) {
    setDialog({ title, message, onConfirm, ...opts });
  }

  async function runConfirm() {
    if (!dialog) return;
    setLoading(true);
    try {
      await dialog.onConfirm();
    } finally {
      setLoading(false);
      setDialog(null);
    }
  }

  return { dialog, loading, openConfirm, runConfirm, closeConfirm: () => setDialog(null) };
}
