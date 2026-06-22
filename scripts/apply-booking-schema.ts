// One-shot SQL apply for the Booking* schema additions. Local DB has no
// migration baseline (P3005), so we apply DDL directly.
//   npx tsx scripts/apply-booking-schema.ts
import { existsSync, readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

function loadEnv(file: string) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    process.env[m[1]] = v;
  }
}
loadEnv(".env.local");
loadEnv(".env");

const db = new PrismaClient();

const STATEMENTS = [
  `DO $$ BEGIN
     CREATE TYPE "BookingStatus" AS ENUM ('PENDING','CONFIRMED','CANCELLED');
   EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,

  `CREATE TABLE IF NOT EXISTS "BookingSettings" (
     "id" TEXT NOT NULL DEFAULT 'singleton',
     "enabled" BOOLEAN NOT NULL DEFAULT false,
     "calendarId" TEXT NOT NULL DEFAULT 'primary',
     "meetingTitleTemplate" TEXT NOT NULL DEFAULT 'Consultation — {name}',
     "meetingDescription" TEXT,
     "durationsMinutes" INTEGER[] NOT NULL DEFAULT ARRAY[30]::INTEGER[],
     "slotIncrementMinutes" INTEGER NOT NULL DEFAULT 15,
     "bufferMinutes" INTEGER NOT NULL DEFAULT 15,
     "minNoticeHours" INTEGER NOT NULL DEFAULT 24,
     "maxHorizonDays" INTEGER NOT NULL DEFAULT 14,
     "timezone" TEXT NOT NULL DEFAULT 'Asia/Dhaka',
     "workingHours" JSONB NOT NULL,
     "notifyEmail" TEXT,
     "whatsappNumber" TEXT,
     "whatsappPrefill" TEXT,
     "whatsappEnabled" BOOLEAN NOT NULL DEFAULT true,
     "googleConnected" BOOLEAN NOT NULL DEFAULT false,
     "googleEmail" TEXT,
     "googleTokenEnc" TEXT,
     "googleTokenIv" TEXT,
     "googleTokenTag" TEXT,
     "updatedAt" TIMESTAMP(3) NOT NULL,
     CONSTRAINT "BookingSettings_pkey" PRIMARY KEY ("id")
   );`,

  `CREATE TABLE IF NOT EXISTS "BookingBlackout" (
     "id" TEXT NOT NULL,
     "date" TIMESTAMP(3) NOT NULL,
     "reason" TEXT,
     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
     CONSTRAINT "BookingBlackout_pkey" PRIMARY KEY ("id")
   );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "BookingBlackout_date_key" ON "BookingBlackout"("date");`,

  `CREATE TABLE IF NOT EXISTS "Booking" (
     "id" TEXT NOT NULL,
     "name" TEXT NOT NULL,
     "email" TEXT NOT NULL,
     "topic" TEXT NOT NULL,
     "message" TEXT,
     "startsAt" TIMESTAMP(3) NOT NULL,
     "endsAt" TIMESTAMP(3) NOT NULL,
     "durationMin" INTEGER NOT NULL,
     "status" "BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
     "googleEventId" TEXT,
     "meetUrl" TEXT,
     "cancelToken" TEXT NOT NULL,
     "ip" TEXT,
     "cancelledAt" TIMESTAMP(3),
     "cancelReason" TEXT,
     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
     CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
   );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Booking_cancelToken_key" ON "Booking"("cancelToken");`,
  `CREATE INDEX IF NOT EXISTS "Booking_startsAt_idx" ON "Booking"("startsAt");`,
  `CREATE INDEX IF NOT EXISTS "Booking_status_startsAt_idx" ON "Booking"("status","startsAt");`,
  `CREATE INDEX IF NOT EXISTS "Booking_ip_createdAt_idx" ON "Booking"("ip","createdAt");`,
];

async function main() {
  for (const stmt of STATEMENTS) {
    await db.$executeRawUnsafe(stmt);
  }
  console.log(`✓ Booking schema applied (${STATEMENTS.length} statements).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
