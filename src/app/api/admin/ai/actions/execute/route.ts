import { auth } from "@/lib/auth";
import { isWriteTool, commitWrite } from "@/services/ai/writeTools";

// Commits a write the AI proposed and the user approved in the chat UI. The
// model is NOT in the loop here — this is a plain authenticated mutation that
// re-validates the (untrusted) tool input through the service layer.
export async function POST(req: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { tool?: unknown; input?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const tool = typeof body.tool === "string" ? body.tool : "";
  if (!tool || !isWriteTool(tool)) {
    return Response.json(
      { error: `Unknown or non-writable action: ${tool || "(missing)"}` },
      { status: 400 }
    );
  }

  try {
    const result = await commitWrite(tool, body.input);
    return Response.json({ data: result });
  } catch (e) {
    // Service-layer validation errors are user-safe.
    return Response.json(
      { error: e instanceof Error ? e.message : "Failed to perform the action." },
      { status: 400 }
    );
  }
}
