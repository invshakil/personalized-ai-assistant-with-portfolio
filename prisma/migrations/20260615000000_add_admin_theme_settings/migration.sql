-- Admin dashboard appearance preferences singleton.
CREATE TABLE "AdminThemeSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "mode" TEXT NOT NULL DEFAULT 'dark',
    "primaryColor" TEXT NOT NULL DEFAULT '#7367f0',
    "cardShadow" TEXT NOT NULL DEFAULT 'soft',
    "cardBorder" BOOLEAN NOT NULL DEFAULT true,
    "borderRadius" INTEGER NOT NULL DEFAULT 8,
    "density" TEXT NOT NULL DEFAULT 'comfortable',
    "fontSize" INTEGER NOT NULL DEFAULT 14,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AdminThemeSettings_pkey" PRIMARY KEY ("id")
);
