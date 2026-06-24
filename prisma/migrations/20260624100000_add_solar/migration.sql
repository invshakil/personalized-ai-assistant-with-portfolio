-- Solar monitoring (SolisCloud) — read-only telemetry + BPDB slab tariffs.

-- System configuration singleton (non-secret; credentials live in env).
CREATE TABLE "SolarSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "systemSizeKwp" DECIMAL(8,2),
    "batteryKwh" DECIMAL(8,2),
    "installCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "installDate" TIMESTAMP(3),
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "co2FactorKgPerKwh" DECIMAL(8,4) NOT NULL DEFAULT 0.6495,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "stationId" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncStatus" TEXT,
    "lastSyncError" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SolarSettings_pkey" PRIMARY KEY ("id")
);

-- Effective-dated tariff version.
CREATE TABLE "ElectricityTariff" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "distributor" TEXT NOT NULL DEFAULT 'BPDB',
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "demandChargePerKw" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "vatPercent" DECIMAL(5,2) NOT NULL DEFAULT 5,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ElectricityTariff_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ElectricityTariff_effectiveFrom_idx" ON "ElectricityTariff"("effectiveFrom");

-- One consumption band of a tariff.
CREATE TABLE "TariffSlab" (
    "id" TEXT NOT NULL,
    "tariffId" TEXT NOT NULL,
    "fromUnit" INTEGER NOT NULL,
    "toUnit" INTEGER,
    "rate" DECIMAL(10,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TariffSlab_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TariffSlab_tariffId_idx" ON "TariffSlab"("tariffId");

ALTER TABLE "TariffSlab" ADD CONSTRAINT "TariffSlab_tariffId_fkey"
    FOREIGN KEY ("tariffId") REFERENCES "ElectricityTariff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- One row per day per inverter — local snapshot of daily energy flows.
CREATE TABLE "SolisDailyReading" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "inverterSn" TEXT NOT NULL,
    "generationKwh" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "gridImportKwh" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "gridExportKwh" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "batteryChargeKwh" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "batteryDischargeKwh" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "consumptionKwh" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "peakPowerKw" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "batterySocMin" DECIMAL(5,2),
    "batterySocMax" DECIMAL(5,2),
    "inverterTempC" DECIMAL(6,2),
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SolisDailyReading_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SolisDailyReading_inverterSn_date_key" ON "SolisDailyReading"("inverterSn", "date");
CREATE INDEX "SolisDailyReading_date_idx" ON "SolisDailyReading"("date");
