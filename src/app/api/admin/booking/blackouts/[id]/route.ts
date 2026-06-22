import { auth } from "@/lib/auth";
import { deleteBlackout } from "@/services/booking";

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  await deleteBlackout(id);
  return Response.json({ data: { ok: true } });
}
