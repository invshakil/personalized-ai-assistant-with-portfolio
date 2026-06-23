import { auth } from "@/lib/auth";
import { readChatAttachment } from "@/services/ai/uploads";

/** Serve a chat attachment to the authenticated admin. Files live outside
 *  /public so they can't be accessed without a session. */
export async function GET(_req: Request, ctx: { params: Promise<{ file: string[] }> }) {
  const session = await auth();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { file } = await ctx.params;
  const url = `/api/admin/ai/uploads/${file.join("/")}`;
  const got = await readChatAttachment(url);
  if (!got) return new Response("Not found", { status: 404 });

  // Cast to BodyInit — Node's Buffer is a Uint8Array under the hood and works.
  return new Response(new Uint8Array(got.buffer), {
    headers: {
      "Content-Type": got.mimeType,
      "Cache-Control": "private, max-age=86400",
    },
  });
}
