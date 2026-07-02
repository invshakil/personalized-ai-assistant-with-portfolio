import { useCallback, useEffect, useState } from "react";
import { financeApi } from "@/lib/api/finance";
import type { BusinessProfile } from "../../types";

const BLANK_BUSINESS: BusinessProfile = {
  name: "",
  tagline: "",
  address: "",
  phone: "",
  email: "",
};

export function useBusinessProfile(onError: (message: string) => void) {
  const [business, setBusiness] = useState<BusinessProfile>(BLANK_BUSINESS);
  const [loading, setLoading] = useState(true);
  const [bizSaving, setBizSaving] = useState(false);
  const [bizSaved, setBizSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const b = await financeApi.getBusinessProfile();
      if (b) setBusiness(b);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveBusiness() {
    setBizSaving(true);
    setBizSaved(false);
    try {
      const saved = await financeApi.updateBusinessProfile(business);
      setBusiness(saved);
      setBizSaved(true);
      setTimeout(() => setBizSaved(false), 3000);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Failed to save business profile");
    } finally {
      setBizSaving(false);
    }
  }

  return { business, setBusiness, loading, bizSaving, bizSaved, saveBusiness };
}
