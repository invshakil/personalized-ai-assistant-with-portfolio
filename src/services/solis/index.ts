// SolisCloud integration — READ ONLY. Barrel for the signed client, field
// mapping, sync, and scheduler. No inverter-control/write endpoints exist here.
export * from "./types";
export {
  getSolisConfig,
  isSolisConfigured,
  userStationList,
  stationDetail,
  inverterList,
  inverterDetail,
  inverterDay,
  stationDay,
} from "./client";
export {
  mapStations,
  mapInverters,
  dailyFromInverterDetail,
  enrichFromDaySeries,
} from "./fieldMap";
export { runSolisSync, runScheduledSyncIfDue, isSyncDue, type SyncResult } from "./sync";
export { startSolisScheduler } from "./scheduler";
