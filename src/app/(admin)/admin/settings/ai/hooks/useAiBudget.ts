import { useCallback, useEffect, useState } from "react";
import { aiApi } from "@/lib/api/ai";
import type { UsageSummary } from "@/services/ai/types";

export interface BudgetFormState {
  limit: string;
  enforce: boolean;
  creditBalance: string;
  creditAsOf: string;
  creditExpiresAt: string;
}

/** Usage summary + the editable budget/credit fields on Settings → AI. */
export function useAiBudget() {
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [form, setForm] = useState<BudgetFormState>({
    limit: "",
    enforce: false,
    creditBalance: "",
    creditAsOf: "",
    creditExpiresAt: "",
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    const [u, b] = await Promise.all([aiApi.getUsage(), aiApi.getBudget()]);
    setUsage(u);
    setForm({
      limit: b.monthlyLimitUsd === null ? "" : String(b.monthlyLimitUsd),
      enforce: b.enforce,
      creditBalance: b.creditBalanceUsd === null ? "" : String(b.creditBalanceUsd),
      creditAsOf: b.creditAsOf ?? "",
      creditExpiresAt: b.creditExpiresAt ?? "",
    });
  }, []);

  useEffect(() => {
    load().catch(() => setMsg({ kind: "err", text: "Failed to load usage." }));
  }, [load]);

  const patch = (p: Partial<BudgetFormState>) => setForm((f) => ({ ...f, ...p }));

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      await aiApi.saveBudget({
        monthlyLimitUsd: form.limit.trim() === "" ? null : Number(form.limit),
        enforce: form.enforce,
        creditBalanceUsd: form.creditBalance.trim() === "" ? null : Number(form.creditBalance),
        creditAsOf: form.creditAsOf || null,
        creditExpiresAt: form.creditExpiresAt || null,
      });
      await load();
      setMsg({ kind: "ok", text: "Saved." });
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Failed to save." });
    }
    setSaving(false);
  };

  return { usage, form, patch, saving, msg, save };
}
