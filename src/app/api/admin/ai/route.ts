import { auth } from "@/lib/auth";
import { getActiveProvider } from "@/services/ai/registry";
import { getToolsForScope, runAiTool } from "@/services/ai/tools";
import { appendTurn } from "@/services/ai/sessions";
import { isOverBudget, recordUsage } from "@/services/ai/usage";
import type { AiProviderId, ChatMessage, ToolScope, UsageTotals } from "@/services/ai/types";

// Published Anthropic rates per 1M tokens (USD). Defaults to Sonnet for unknown models.
function estimateCost(model: string, u: UsageTotals): number {
  const isOpus = model.includes("opus");
  const isHaiku = model.includes("haiku");
  const inp = isOpus ? 15 : isHaiku ? 0.8 : 3;
  const out = isOpus ? 75 : isHaiku ? 4 : 15;
  const cr = isOpus ? 1.5 : isHaiku ? 0.08 : 0.3;
  const cw = isOpus ? 18.75 : isHaiku ? 1 : 3.75;
  return (
    (u.inputTokens / 1_000_000) * inp +
    (u.outputTokens / 1_000_000) * out +
    (u.cacheReadTokens / 1_000_000) * cr +
    (u.cacheCreateTokens / 1_000_000) * cw
  );
}

const SYSTEM_PROMPT =
  "You are a personal assistant for Syful Islam Shakil — a Tech Lead and Full-Stack Engineer based in Comilla, Bangladesh. " +
  "You have access to his admin dashboard through tools covering two domains: the Financial Tracker (business income, " +
  "employee salaries, expenses, subscriptions) and Property Management (rental units, tenants, rent payments, expenses). " +
  "Use the tools to answer questions with real data rather than guessing. Money is in BDT (৳); the business fiscal year " +
  'runs July→June, written like "2025-2026". Be concise, helpful, and professional. When a tool returns no data or the ' +
  "information isn't available, say so clearly instead of making something up. " +
  "Some tools create or update data (their names start with create_/update_/record_/assign_/generate_/add_/set_). " +
  "These do NOT take effect when you call them — they only PROPOSE an action that the user must approve via a card in " +
  "the UI. Before calling a write tool, resolve any referenced records (tenant, unit, client, employee, payment, " +
  "category) to their real id using the matching list/get tool — never invent ids. After proposing, do not claim the " +
  "change was saved; tell the user to review and approve the card. Deletes and deactivations are NOT available through " +
  "you — if asked to delete or remove something, explain it must be done from the dashboard UI. " +
  "When the user attaches a receipt image, read the amount, date, and vendor/category from the image, " +
  "then propose a create_money_entry write tool (DEBIT for spends, CREDIT for income/refunds) with a " +
  "sensible categoryName (free-text — will be created if it doesn't exist). If the user already has " +
  "the right category, use that exact name. Suggest accountName only if the receipt makes it obvious.";

export async function POST(req: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { messages, sessionId, scope } = (await req.json()) as {
    messages: ChatMessage[];
    sessionId?: string;
    scope?: ToolScope;
  };
  if (!messages || !Array.isArray(messages)) {
    return Response.json({ error: "messages array is required" }, { status: 400 });
  }

  // Hand the model only the requested module's tools (plus shared). Unknown
  // values fall back to the full catalog so a bad scope never loses capability.
  const toolScope: ToolScope =
    scope === "property" || scope === "finance" || scope === "money" ? scope : "all";

  // Block new turns once this month's spend has hit the budget.
  if (await isOverBudget()) {
    return Response.json(
      {
        error:
          "Monthly AI budget reached. Increase or turn off the limit in Settings → AI to keep chatting.",
      },
      { status: 402 }
    );
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

  // Tell the model today's date so it can pick the right relative period token
  // (the report tools resolve periods server-side, but this helps tool choice).
  const system = `${SYSTEM_PROMPT} Today's date is ${new Date().toISOString().slice(0, 10)}.`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (ev: object) => controller.enqueue(encoder.encode(JSON.stringify(ev) + "\n"));

      let assistantText = "";
      let usage: UsageTotals | null = null;
      try {
        for await (const ev of active.provider.streamChat({
          model: active.model,
          system,
          messages,
          tools: getToolsForScope(toolScope),
          runTool: runAiTool,
        })) {
          if (ev.type === "text") {
            assistantText += ev.text;
            send({ type: "text", text: ev.text });
          } else if (ev.type === "usage") {
            usage = ev.usage;
            send({
              type: "usage",
              inputTokens: ev.usage.inputTokens,
              outputTokens: ev.usage.outputTokens,
              cacheReadTokens: ev.usage.cacheReadTokens,
              cacheCreateTokens: ev.usage.cacheCreateTokens,
              cost: estimateCost(active.model, ev.usage),
            });
          } else if (ev.type === "tool") {
            send({ type: "tool", name: ev.name });
          } else if (ev.type === "pending_action") {
            send({ type: "pending_action", action: ev.action });
          } else if (ev.type === "error") {
            send({ type: "error", message: ev.message });
          }
        }

        // Record token spend whenever tokens were billed (independent of save).
        if (usage) {
          await recordUsage({
            provider: active.provider.id as AiProviderId,
            model: active.model,
            usage,
          });
        }

        // Persist the completed turn (only on a clean answer).
        if (sessionId && assistantText.trim()) {
          const lastUser = [...messages].reverse().find((m) => m.role === "user");
          if (lastUser) {
            await appendTurn(sessionId, lastUser.content, assistantText, lastUser.attachments);
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Something went wrong.";
        send({ type: "error", message: msg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
  });
}
