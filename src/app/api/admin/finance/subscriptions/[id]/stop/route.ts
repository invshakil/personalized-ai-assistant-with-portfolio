import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { stopSubscription, resumeSubscription } from "@/services/finance";

// POST { endDate?: string }      → stop the subscription (defaults to this month)
// POST { resume: true }          → resume a stopped subscription
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const data = body.resume ? await resumeSubscription(id) : await stopSubscription(id, body.endDate);
  return Response.json({ data });
}
