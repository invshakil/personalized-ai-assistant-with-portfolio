-- Business identity singleton for Financial Tracker PDFs.
CREATE TABLE "BusinessProfile" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "name" TEXT NOT NULL DEFAULT 'Syful Islam Shakil',
    "tagline" TEXT NOT NULL DEFAULT 'Software Engineering & Consulting',
    "address" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BusinessProfile_pkey" PRIMARY KEY ("id")
);
