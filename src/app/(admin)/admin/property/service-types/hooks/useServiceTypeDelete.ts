import { useState } from "react";
import { propertyApi } from "@/lib/api/property";
import type { PropertyServiceType } from "@/types";

export function useServiceTypeDelete(onDeleted: () => Promise<void>) {
  const [pendingDelete, setPendingDelete] = useState<PropertyServiceType | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function requestDelete(t: PropertyServiceType) {
    setDeleteError(null);
    setPendingDelete(t);
  }

  function cancelDelete() {
    setPendingDelete(null);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await propertyApi.deleteServiceType(pendingDelete.id);
      setPendingDelete(null);
      await onDeleted();
    } catch (e) {
      // Surface the guard message (e.g. "Cannot delete: N expenses still use…").
      setDeleteError(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  }

  return {
    pendingDelete,
    deleting,
    deleteError,
    clearDeleteError: () => setDeleteError(null),
    requestDelete,
    cancelDelete,
    confirmDelete,
  };
}
