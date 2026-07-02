import { useState, useEffect, useCallback } from "react";
import { propertyApi } from "@/lib/api/property";
import type { PaymentWithTenant } from "@/types";

interface Filters {
  month: number | "all";
  year: number;
  isAllMonths: boolean;
  buildFilters: () => {
    month?: number;
    year?: number;
    unitIds?: string[];
    tenantIds?: string[];
    period?: string;
  };
}

export function usePaymentData({ month, year, isAllMonths, buildFilters }: Filters) {
  const [payments, setPayments] = useState<PaymentWithTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genMsg, setGenMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPayments((await propertyApi.listPayments(buildFilters())) ?? []);
    } finally {
      setLoading(false);
    }
  }, [buildFilters]);

  // Auto-generate on load if no payments exist for a specific month. Skipped
  // when viewing "All months" (a cross-month read, nothing to generate for).
  const autoGenerate = useCallback(async () => {
    if (isAllMonths) {
      await load();
      return;
    }
    const data = (await propertyApi.listPayments(buildFilters())) ?? [];
    if (data.length === 0) {
      setGenerating(true);
      const gen = (await propertyApi.generatePayments({ month: month as number, year })) as {
        created?: number;
        message?: string;
      } | null;
      if (gen?.created && gen.created > 0) {
        setGenMsg(gen.message ?? null);
      }
      setGenerating(false);
      await load();
    } else {
      setPayments(data);
      setLoading(false);
    }
  }, [isAllMonths, buildFilters, month, year, load]);

  useEffect(() => {
    setLoading(true);
    autoGenerate();
  }, [autoGenerate]);

  async function regenerateMonth() {
    setGenerating(true);
    const gen = (await propertyApi.generatePayments({ month: month as number, year })) as {
      message?: string;
    } | null;
    setGenMsg(gen?.message ?? null);
    setGenerating(false);
    await load();
  }

  return { payments, loading, generating, genMsg, setGenMsg, reload: load, regenerateMonth };
}
