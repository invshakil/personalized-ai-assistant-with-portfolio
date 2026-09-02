import { auth } from "@/lib/auth";
import { withApiError } from "@/lib/apiRoute";
import { clearFormDefault, getFormDefaults, setFormDefault } from "@/services/admin/formDefaults";
import type { DefaultMode } from "@/lib/formDefaults/registry";

export const GET = withApiError(async () => {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json({ data: await getFormDefaults() });
});

export const PUT = withApiError(async (req: Request) => {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    scope?: unknown;
    field?: unknown;
    value?: unknown;
    mode?: unknown;
  };
  const scope = typeof body.scope === "string" ? body.scope : "";
  const field = typeof body.field === "string" ? body.field : "";
  if (!scope || !field) {
    return Response.json({ error: "scope and field are required" }, { status: 400 });
  }
  const mode: DefaultMode | undefined =
    body.mode === "fixed" || body.mode === "lastUsed" ? body.mode : undefined;

  const data = await setFormDefault({
    scope,
    field,
    value: typeof body.value === "string" ? body.value : "",
    mode,
  });
  return Response.json({ data });
});

export const DELETE = withApiError(async (req: Request) => {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") ?? "";
  const field = url.searchParams.get("field") ?? "";
  if (!scope || !field) {
    return Response.json({ error: "scope and field are required" }, { status: 400 });
  }
  await clearFormDefault(scope, field);
  return Response.json({ data: { cleared: true } });
});
