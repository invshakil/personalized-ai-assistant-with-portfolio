import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { getSolarSettings, updateSolarSettings } from "@/services/solar";
import { withApiError } from "@/lib/apiRoute";

export async function GET() {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const data = await getSolarSettings();
  return Response.json({ data });
}

export const PUT = withApiError(async (req: NextRequest) => {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const num = (v: unknown) => (v === null || v === "" || v === undefined ? null : Number(v));

  const data = await updateSolarSettings({
    ...(body.systemSizeKwp !== undefined && { systemSizeKwp: num(body.systemSizeKwp) }),
    ...(body.batteryKwh !== undefined && { batteryKwh: num(body.batteryKwh) }),
    ...(body.installCost !== undefined && { installCost: Number(body.installCost) || 0 }),
    ...(body.installDate !== undefined && { installDate: body.installDate || null }),
    ...(body.currency !== undefined && { currency: String(body.currency) }),
    ...(body.co2FactorKgPerKwh !== undefined && {
      co2FactorKgPerKwh: Number(body.co2FactorKgPerKwh) || 0,
    }),
    ...(body.latitude !== undefined && { latitude: num(body.latitude) }),
    ...(body.longitude !== undefined && { longitude: num(body.longitude) }),
  });
  return Response.json({ data });
});
