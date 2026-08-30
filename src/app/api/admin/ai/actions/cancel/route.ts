import { auth } from "@/lib/auth";
import { withApiError } from "@/lib/apiRoute";
import { resolveProposedAction } from "@/services/ai/proposedActions";

// Records that the user declined a proposed write. Nothing is mutated — this
// only closes out the audit row so a declined action stops showing as pending.
export const POST = withApiError(async (req: Request) => {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { actionId?: unknown };
  const actionId = typeof body.actionId === "string" ? body.actionId : "";
  if (!actionId) return Response.json({ error: "actionId is required" }, { status: 400 });

  await resolveProposedAction(actionId, "CANCELLED");
  return Response.json({ data: { ok: true } });
});
