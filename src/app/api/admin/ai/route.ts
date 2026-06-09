import { auth } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { messages } = (await req.json()) as { messages: MessageParam[] };

  if (!messages || !Array.isArray(messages)) {
    return Response.json({ error: "messages array is required" }, { status: 400 });
  }

  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system:
      "You are a personal assistant for Syful Islam Shakil — a Tech Lead and Full-Stack Engineer based in Comilla, Bangladesh. " +
      "You have access to his admin dashboard. Be concise, helpful, and professional. " +
      "When you don't have real data, say so clearly rather than making up information.",
    messages,
  });

  return new Response(stream.toReadableStream());
}
