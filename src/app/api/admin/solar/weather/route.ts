import { auth } from "@/lib/auth";
import { getSolarWeather } from "@/services/solar";

export async function GET() {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const data = await getSolarWeather();
    return Response.json({ data });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Failed to load weather" },
      { status: 502 }
    );
  }
}
