// Client API for the dynamic currency list. Components call the shared
// <CurrencySelect /> (which uses this) instead of hardcoding a currency list.
import { apiGet } from "./client";
import type { CurrencyOption } from "@/types";

export const currenciesApi = {
  list: () => apiGet<CurrencyOption[]>("/currencies"),
};
