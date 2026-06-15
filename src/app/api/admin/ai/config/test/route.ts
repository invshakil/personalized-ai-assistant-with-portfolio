import { auth } from "@/lib/auth";
import { testProviderConnection } from "@/services/ai";
import type { AiProviderId } from "@/services/ai/types";

export async function POST(req: Request) {
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
    const data = await testProviderConnection(provider);
    return Response.json({ data });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Connection test failed." },
      { status: 400 }
    );
  }
}
