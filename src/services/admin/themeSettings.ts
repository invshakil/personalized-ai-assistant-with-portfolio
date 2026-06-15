import { db } from "@/lib/db";
import type { AdminThemeSettings } from "@/types";
// DEFAULT_THEME_SETTINGS lives in adminTheme.ts (client-safe — no Prisma import).
import { DEFAULT_THEME_SETTINGS } from "@/lib/adminTheme";

export { DEFAULT_THEME_SETTINGS };

/** Returns the admin theme settings, or defaults if unset. */
export async function getThemeSettings(): Promise<AdminThemeSettings> {
  const row = await db.adminThemeSettings.findUnique({ where: { id: "singleton" } });
  if (!row) return DEFAULT_THEME_SETTINGS;
  return {
    mode: row.mode as AdminThemeSettings["mode"],
    primaryColor: row.primaryColor,
    cardShadow: row.cardShadow as AdminThemeSettings["cardShadow"],
    cardBorder: row.cardBorder,
    borderRadius: row.borderRadius,
    density: row.density as AdminThemeSettings["density"],
    fontSize: row.fontSize,
  };
}

/** Upsert the admin theme settings singleton (id = "singleton"). */
export async function upsertThemeSettings(
  input: Partial<AdminThemeSettings>
): Promise<AdminThemeSettings> {
  const row = await db.adminThemeSettings.upsert({
    where: { id: "singleton" },
    update: {
      ...(input.mode !== undefined && { mode: input.mode }),
      ...(input.primaryColor !== undefined && { primaryColor: input.primaryColor }),
      ...(input.cardShadow !== undefined && { cardShadow: input.cardShadow }),
      ...(input.cardBorder !== undefined && { cardBorder: input.cardBorder }),
      ...(input.borderRadius !== undefined && { borderRadius: input.borderRadius }),
      ...(input.density !== undefined && { density: input.density }),
      ...(input.fontSize !== undefined && { fontSize: input.fontSize }),
    },
    create: {
      id: "singleton",
      mode: input.mode ?? DEFAULT_THEME_SETTINGS.mode,
      primaryColor: input.primaryColor ?? DEFAULT_THEME_SETTINGS.primaryColor,
      cardShadow: input.cardShadow ?? DEFAULT_THEME_SETTINGS.cardShadow,
      cardBorder: input.cardBorder ?? DEFAULT_THEME_SETTINGS.cardBorder,
      borderRadius: input.borderRadius ?? DEFAULT_THEME_SETTINGS.borderRadius,
      density: input.density ?? DEFAULT_THEME_SETTINGS.density,
      fontSize: input.fontSize ?? DEFAULT_THEME_SETTINGS.fontSize,
    },
  });
  return {
    mode: row.mode as AdminThemeSettings["mode"],
    primaryColor: row.primaryColor,
    cardShadow: row.cardShadow as AdminThemeSettings["cardShadow"],
    cardBorder: row.cardBorder,
    borderRadius: row.borderRadius,
    density: row.density as AdminThemeSettings["density"],
    fontSize: row.fontSize,
  };
}
