// Typed client for the Solar API. Components call these instead of inlining
// fetch + URLs. Returns the unwrapped `data` payload; throws on error.
import { apiGet, apiPost, apiPut, apiDelete } from "./client";
import type { SolarOverview, SolarReport, SolarWeather } from "@/types";
// Settings + tariff shapes are inferred from the service layer (type-only
// imports, erased at build — no server code reaches the client bundle).
import type { SolarSettingsData, TariffRow, TariffInput } from "@/services/solar";
import type { SyncResult } from "@/services/solis";

export interface SolarSettingsPayload {
  systemSizeKwp?: number | null;
  batteryKwh?: number | null;
  installCost?: number;
  installDate?: string | null;
  currency?: string;
  co2FactorKgPerKwh?: number;
  latitude?: number | null;
  longitude?: number | null;
}

export const solarApi = {
  overview: () => apiGet<SolarOverview>("/solar/overview"),
  report: (params?: { from?: string; to?: string }) =>
    apiGet<SolarReport>("/solar/report", { params }),
  weather: () => apiGet<SolarWeather>("/solar/weather"),

  getSettings: () => apiGet<SolarSettingsData>("/solar/settings"),
  updateSettings: (body: SolarSettingsPayload) =>
    apiPut<SolarSettingsData>("/solar/settings", body),

  syncNow: (opts: { backfillDays?: number; from?: string } = {}) =>
    apiPost<SyncResult>("/solar/sync", opts),

  listTariffs: () => apiGet<TariffRow[]>("/solar/tariffs"),
  createTariff: (body: TariffInput) => apiPost<TariffRow>("/solar/tariffs", body),
  updateTariff: (id: string, body: TariffInput) => apiPut<TariffRow>(`/solar/tariffs/${id}`, body),
  deleteTariff: (id: string) => apiDelete(`/solar/tariffs/${id}`),
};
