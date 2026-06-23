-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');

-- CreateTable
CREATE TABLE "BookingSettings" (
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
);

-- CreateTable
CREATE TABLE "BookingBlackout" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingBlackout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
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
);

-- CreateIndex
CREATE UNIQUE INDEX "BookingBlackout_date_key" ON "BookingBlackout"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_cancelToken_key" ON "Booking"("cancelToken");

-- CreateIndex
CREATE INDEX "Booking_startsAt_idx" ON "Booking"("startsAt");

-- CreateIndex
CREATE INDEX "Booking_status_startsAt_idx" ON "Booking"("status", "startsAt");

-- CreateIndex
CREATE INDEX "Booking_ip_createdAt_idx" ON "Booking"("ip", "createdAt");
