import { auth } from "@/lib/auth";
import { isWriteTool, commitWrite } from "@/services/ai/writeTools";
import { resolveProposedAction } from "@/services/ai/proposedActions";

// Commits a write the AI proposed and the user approved in the chat UI. The
// model is NOT in the loop here — this is a plain authenticated mutation that
// re-validates the (untrusted) tool input through the service layer.
export async function POST(req: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { tool?: unknown; input?: unknown; actionId?: unknown };
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

  // Present for proposals raised after they became persistent; absent for cards
  // still in flight from an older client. The commit does not depend on it —
  // it only records the outcome.
  const actionId = typeof body.actionId === "string" ? body.actionId : null;

  try {
    const result = await commitWrite(tool, body.input);
    if (actionId) await resolveProposedAction(actionId, "APPROVED", result.summary);
    return Response.json({ data: result });
  } catch (e) {
    // Service-layer validation errors are user-safe.
    const message = e instanceof Error ? e.message : "Failed to perform the action.";
    if (actionId) await resolveProposedAction(actionId, "ERROR", message);
    return Response.json({ error: message }, { status: 400 });
  }
}
