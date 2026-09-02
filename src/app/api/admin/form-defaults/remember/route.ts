import { auth } from "@/lib/auth";
import { withApiError } from "@/lib/apiRoute";
import { rememberFormValues } from "@/services/admin/formDefaults";

// Records what a form just saved, for fields in "lastUsed" mode. Fields pinned
// to "fixed" are ignored by the service, so this cannot overwrite a deliberate
// choice even if the client sends one.
export const POST = withApiError(async (req: Request) => {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { scope?: unknown; values?: unknown };
  const scope = typeof body.scope === "string" ? body.scope : "";
  if (!scope) return Response.json({ error: "scope is required" }, { status: 400 });

  const raw = body.values;
  const values: Record<string, string> = {};
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof v === "string") values[k] = v;
    }
  }

  await rememberFormValues(scope, values);
  return Response.json({ data: { ok: true } });
});
