// Solar system settings (singleton). Non-secret config — capacity, battery size,
// install cost (payback), location (weather), CO2 factor — plus the last-sync
// status. API credentials live in env, surfaced here only as a `configured` flag.
import { db } from "@/lib/db";
import { isSolisConfigured } from "@/services/solis";
import { toIso, toNum, toNumOrNull } from "./_serializers";
import { seedDefaultTariffsIfEmpty } from "./tariff";

export interface SolarSettingsData {
  systemSizeKwp: number | null;
  batteryKwh: number | null;
  installCost: number;
  installDate: string | null;
  currency: string;
  co2FactorKgPerKwh: number;
  latitude: number | null;
  longitude: number | null;
  stationId: string | null;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  lastSyncError: string | null;
  /** True when SOLIS_KEY_ID/SECRET are set in env. */
  configured: boolean;
}

export interface UpdateSolarSettingsInput {
  systemSizeKwp?: number | null;
  batteryKwh?: number | null;
  installCost?: number;
  installDate?: string | null;
  currency?: string;
  co2FactorKgPerKwh?: number;
  latitude?: number | null;
  longitude?: number | null;
}

function serialize(row: {
  systemSizeKwp: { toNumber(): number } | null;
  batteryKwh: { toNumber(): number } | null;
  installCost: { toNumber(): number };
  installDate: Date | null;
  currency: string;
  co2FactorKgPerKwh: { toNumber(): number };
  latitude: number | null;
  longitude: number | null;
  stationId: string | null;
  lastSyncAt: Date | null;
  lastSyncStatus: string | null;
  lastSyncError: string | null;
}): SolarSettingsData {
  return {
    systemSizeKwp: toNumOrNull(row.systemSizeKwp),
    batteryKwh: toNumOrNull(row.batteryKwh),
    installCost: toNum(row.installCost),
    installDate: toIso(row.installDate),
    currency: row.currency,
    co2FactorKgPerKwh: toNum(row.co2FactorKgPerKwh),
    latitude: row.latitude,
    longitude: row.longitude,
    stationId: row.stationId,
    lastSyncAt: toIso(row.lastSyncAt),
    lastSyncStatus: row.lastSyncStatus,
    lastSyncError: row.lastSyncError,
    configured: isSolisConfigured(),
  };
}

export async function getSolarSettings(): Promise<SolarSettingsData> {
  const row = await db.solarSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton" },
    update: {},
  });
  await seedDefaultTariffsIfEmpty();
  return serialize(row);
}

export async function updateSolarSettings(
  input: UpdateSolarSettingsInput
): Promise<SolarSettingsData> {
  const row = await db.solarSettings.update({
    where: { id: "singleton" },
    data: {
      ...(input.systemSizeKwp !== undefined && { systemSizeKwp: input.systemSizeKwp }),
      ...(input.batteryKwh !== undefined && { batteryKwh: input.batteryKwh }),
      ...(input.installCost !== undefined && { installCost: input.installCost }),
      ...(input.installDate !== undefined && {
        installDate: input.installDate ? new Date(input.installDate) : null,
      }),
      ...(input.currency !== undefined && { currency: input.currency }),
      ...(input.co2FactorKgPerKwh !== undefined && {
        co2FactorKgPerKwh: input.co2FactorKgPerKwh,
      }),
      ...(input.latitude !== undefined && { latitude: input.latitude }),
      ...(input.longitude !== undefined && { longitude: input.longitude }),
    },
  });
  return serialize(row);
}
