// Solar domain service — settings, effective-dated tariff math, report
// aggregation, and weather forecast. Used by API routes and AI tools. All data
// derives from locally-synced SolisDailyReading rows (read-only telemetry).
export {
  getSolarSettings,
  updateSolarSettings,
  type SolarSettingsData,
  type UpdateSolarSettingsInput,
} from "./settings";
export {
  listTariffs,
  getEffectiveTariff,
  computeBill,
  createTariff,
  updateTariff,
  deleteTariff,
  seedDefaultTariffsIfEmpty,
  monthStartFromInput,
  type TariffRow,
  type TariffSlabRow,
  type TariffSlabInput,
  type TariffInput,
  type BillBreakdown,
} from "./tariff";
export { getSolarReport, getSolarOverview, type SolarReportRange } from "./reports";
export { getSolarWeather } from "./weather";
