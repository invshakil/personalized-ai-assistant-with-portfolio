-- User-controlled dropdown defaults.
--
-- Replaces the seven hardcoded `list[0]` fallbacks scattered across the drawer
-- hooks, which pre-selected whatever happened to sort first. Keyed by
-- (scope, field) so a new defaultable dropdown never needs a migration.

CREATE TABLE "FormDefault" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'fixed',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormDefault_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FormDefault_scope_field_key" ON "FormDefault"("scope", "field");
