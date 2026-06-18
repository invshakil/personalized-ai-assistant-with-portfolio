// Anthropic adapter — maps the vendor-neutral request onto the Anthropic SDK,
// runs the streaming tool-use loop, and yields normalized StreamEvents. This is
// the only place Anthropic-specific shapes (input_schema, tool_result blocks,
// content-block deltas) appear. Adding OpenAI/Gemini = a sibling file here.
import { randomUUID } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import type { AiProvider, StreamChatOptions, StreamEvent, UsageTotals } from "../types";

const MAX_ITERATIONS = 6; // cap the tool loop
const MAX_TOKENS = 2048;

export function createAnthropicProvider(opts: { apiKey: string; baseURL?: string }): AiProvider {
  const client = new Anthropic({ apiKey: opts.apiKey, baseURL: opts.baseURL });

  return {
    id: "anthropic",
    async *streamChat({
      model,
      system,
      messages,
      tools,
      runTool,
    }: StreamChatOptions): AsyncIterable<StreamEvent> {
      const anthropicTools: Anthropic.Tool[] = tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters as Anthropic.Tool["input_schema"],
      }));

      // Prompt-cache the whole tool catalog. The catalog is identical on every
      // round of the loop AND every turn, but it's the largest part of the
      // request (~9k tokens). Marking the LAST tool as a cache breakpoint caches
      // the entire tools prefix up to it — so cache reads cost ~10% of the input
      // rate instead of re-billing the full catalog each round. Adding a new tool
      // later just extends this prefix: it's cached automatically on first use,
      // cheap on every call after. The breakpoint sits on tools (not system), so
      // the daily date in the system prompt never invalidates it.
      //
      // 1-hour TTL (vs the 5-minute default): the write costs 2× the input rate
      // instead of 1.25×, but the cache survives ~1h of idle and the timer
      // refreshes on every hit — so bursty admin use stays warm all session and
      // rarely pays a cold write. Reads cost the same regardless of TTL.
      const lastTool = anthropicTools.at(-1);
      if (lastTool) lastTool.cache_control = { type: "ephemeral", ttl: "1h" };

      // Write tools are previewed in-stream, never executed — they surface to the
      // UI as pending actions the user approves separately.
      const writeNames = new Set(tools.filter((t) => t.kind === "write").map((t) => t.name));

      const convo: Anthropic.MessageParam[] = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Accumulate token usage across every API call this turn makes.
      const usage: UsageTotals = {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheCreateTokens: 0,
      };

      for (let i = 0; i < MAX_ITERATIONS; i++) {
        const stream = client.messages.stream({
          model,
          max_tokens: MAX_TOKENS,
          system,
          tools: anthropicTools.length ? anthropicTools : undefined,
          messages: convo,
        });

        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            yield { type: "text", text: event.delta.text };
          }
        }

        const final = await stream.finalMessage();
        usage.inputTokens += final.usage.input_tokens ?? 0;
        usage.outputTokens += final.usage.output_tokens ?? 0;
        usage.cacheReadTokens += final.usage.cache_read_input_tokens ?? 0;
        usage.cacheCreateTokens += final.usage.cache_creation_input_tokens ?? 0;
        convo.push({ role: "assistant", content: final.content });

        if (final.stop_reason !== "tool_use") {
          yield { type: "usage", usage };
          return;
        }

        const toolUses = final.content.filter(
          (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
        );
        for (const block of toolUses) {
          yield { type: "tool", name: block.name };
        }

        // Run all tool calls in this round concurrently — if Claude asks for
        // get_finance_summary AND get_property_dashboard, both DB queries run at
        // once. Each call is isolated: a failure becomes an is_error result so
        // one bad tool can't break the round, and Claude can answer around it.
        // For write tools `runTool` only validates + builds a preview; it does
        // not mutate. Promise.all preserves array order regardless of finish time.
        const settled = await Promise.all(
          toolUses.map(async (block) => {
            try {
              return {
                block,
                data: await runTool(block.name, block.input),
                error: null as string | null,
              };
            } catch (e) {
              return {
                block,
                data: null as unknown,
                error: e instanceof Error ? e.message : "Tool execution failed.",
              };
            }
          })
        );

        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        for (const { block, data, error } of settled) {
          if (error) {
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: error,
              is_error: true,
            });
          } else if (writeNames.has(block.name)) {
            // A proposed write: surface it for approval and tell the model it is
            // pending — never committed here — so it doesn't claim success.
            const { summary } = data as { summary: string };
            yield {
              type: "pending_action",
              action: {
                id: randomUUID(),
                tool: block.name,
                input: (block.input ?? {}) as Record<string, unknown>,
                summary,
              },
            };
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: JSON.stringify({
                status: "awaiting_user_approval",
                summary,
                note:
                  "This action has NOT been performed. It is shown to the user as an approval card. " +
                  "Do not say it is done — briefly tell the user to review and approve it.",
              }),
            });
          } else {
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: JSON.stringify(data),
            });
          }
        }
        convo.push({ role: "user", content: toolResults });
      }

      yield { type: "usage", usage };
      yield { type: "error", message: "Reached the maximum number of tool steps for this turn." };
    },
  };
}
