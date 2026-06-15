import { auth } from "@/lib/auth";
import { getActiveProvider } from "@/services/ai/registry";
import { AI_TOOLS, runAiTool } from "@/services/ai/tools";
import type { ChatMessage } from "@/services/ai/types";

const SYSTEM_PROMPT =
  "You are a personal assistant for Syful Islam Shakil — a Tech Lead and Full-Stack Engineer based in Comilla, Bangladesh. " +
  "You have access to his admin dashboard through tools covering two domains: the Financial Tracker (business income, " +
  "employee salaries, expenses, subscriptions) and Property Management (rental units, tenants, rent payments, expenses). " +
  "Use the tools to answer questions with real data rather than guessing. Money is in BDT (৳); the business fiscal year " +
  'runs July→June, written like "2025-2026". Be concise, helpful, and professional. When a tool returns no data or the ' +
  "information isn't available, say so clearly instead of making something up.";

export async function POST(req: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { messages } = (await req.json()) as { messages: ChatMessage[] };
  if (!messages || !Array.isArray(messages)) {
    return Response.json({ error: "messages array is required" }, { status: 400 });
  }

  let active;
  try {
    active = await getActiveProvider();
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "AI provider not configured" },
      { status: 400 }
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const ev of active.provider.streamChat({
          model: active.model,
          system: SYSTEM_PROMPT,
          messages,
          tools: AI_TOOLS,
          runTool: runAiTool,
        })) {
          if (ev.type === "text") {
            controller.enqueue(encoder.encode(ev.text));
          } else if (ev.type === "error") {
            controller.enqueue(encoder.encode(`\n\n⚠️ ${ev.message}`));
          }
          // "tool" events are not surfaced on the plain-text stream.
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Something went wrong.";
        controller.enqueue(encoder.encode(`\n\n⚠️ ${msg}`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
