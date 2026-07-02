import { useState } from "react";
import { financeApi } from "@/lib/api/finance";
import type { SubscriptionDetail } from "../../types";

export function useSubscriptionManage(onMutate: () => Promise<void>) {
  const [detail, setDetail] = useState<SubscriptionDetail | null>(null);
  const [manageError, setManageError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const openManage = async (id: string) => {
    setManageError(null);
    try {
      setDetail(await financeApi.getSubscription(id));
    } catch {
      // ignore — drawer simply won't open
    }
  };

  const refreshManage = async (id: string) => {
    const [d] = await Promise.all([financeApi.getSubscription(id), onMutate()]);
    setDetail(d);
  };

  return {
    detail,
    manageError,
    setManageError,
    busy,
    setBusy,
    openManage,
    refreshManage,
    closeManage: () => setDetail(null),
  };
}
