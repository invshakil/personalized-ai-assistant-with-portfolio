import { auth } from "@/lib/auth";
import { listProviderConfigs, upsertProviderConfig } from "@/services/ai";
import type { AiProviderId } from "@/services/ai/types";

export async function GET() {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const data = await listProviderConfigs();
  return Response.json({ data });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const provider = body?.provider as AiProviderId;
  if (!provider) {
    return Response.json({ error: "provider is required" }, { status: 400 });
  }

  try {
    const data = await upsertProviderConfig({
      provider,
      defaultModel: typeof body.defaultModel === "string" ? body.defaultModel : undefined,
      apiKey: body.apiKey === undefined ? undefined : body.apiKey,
      baseUrl: body.baseUrl === undefined ? undefined : body.baseUrl,
      enabled: typeof body.enabled === "boolean" ? body.enabled : undefined,
      setActive: body.setActive === true,
    });
    return Response.json({ data });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Failed to save provider settings." },
      { status: 400 }
    );
  }
}
