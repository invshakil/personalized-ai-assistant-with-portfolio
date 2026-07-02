import { TrendingUp, UserPlus, UserX } from "lucide-react";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

interface ConfirmDialogState {
  title: string;
  message: string;
  confirmLabel?: string;
  confirmColor?: "error" | "warning" | "success" | "primary";
}

interface PropertyConfirmDialogProps {
  dialog: ConfirmDialogState | null;
  loading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function PropertyConfirmDialog({
  dialog,
  loading,
  onConfirm,
  onClose,
}: PropertyConfirmDialogProps) {
  const icon =
    dialog?.confirmColor === "error" ? (
      <UserX size={18} color="#fff" />
    ) : dialog?.confirmColor === "success" ? (
      <UserPlus size={18} color="#fff" />
    ) : (
      <TrendingUp size={18} color="#fff" />
    );

  return (
    <ConfirmDialog
      open={!!dialog}
      title={dialog?.title ?? ""}
      message={dialog?.message ?? ""}
      confirmLabel={dialog?.confirmLabel}
      confirmColor={dialog?.confirmColor}
      icon={icon}
      loading={loading}
      onConfirm={onConfirm}
      onClose={onClose}
    />
  );
}
