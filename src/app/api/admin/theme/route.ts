import { auth } from "@/lib/auth";
import { upsertThemeSettings } from "@/services/admin";
import type { AdminThemeSettings } from "@/types";
import { withApiError } from "@/lib/apiRoute";

const MODES = ["light", "dark", "system"];
const SHADOWS = ["none", "soft", "elevated"];
const DENSITIES = ["compact", "comfortable"];
const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export const PUT = withApiError(async (req: Request) => {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { mode, primaryColor, cardShadow, cardBorder, borderRadius, density, fontSize } = body;

  if (!MODES.includes(mode)) {
    return Response.json({ error: "Invalid mode" }, { status: 400 });
  }
  if (typeof primaryColor !== "string" || !HEX.test(primaryColor)) {
    return Response.json({ error: "primaryColor must be a hex colour" }, { status: 400 });
  }
  if (!SHADOWS.includes(cardShadow)) {
    return Response.json({ error: "Invalid cardShadow" }, { status: 400 });
  }
  if (typeof cardBorder !== "boolean") {
    return Response.json({ error: "cardBorder must be a boolean" }, { status: 400 });
  }
  if (typeof borderRadius !== "number" || borderRadius < 0 || borderRadius > 24) {
    return Response.json({ error: "borderRadius must be 0–24" }, { status: 400 });
  }
  if (!DENSITIES.includes(density)) {
    return Response.json({ error: "Invalid density" }, { status: 400 });
  }
  if (typeof fontSize !== "number" || fontSize < 12 || fontSize > 18) {
    return Response.json({ error: "fontSize must be 12–18" }, { status: 400 });
  }

  const settings = await upsertThemeSettings({
    mode,
    primaryColor,
    cardShadow,
    cardBorder,
    borderRadius,
    density,
    fontSize,
  } satisfies AdminThemeSettings);

  return Response.json({ data: settings });
});
