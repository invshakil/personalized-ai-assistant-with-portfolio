// Anthropic adapter — maps the vendor-neutral request onto the Anthropic SDK,
// runs the streaming tool-use loop, and yields normalized StreamEvents. This is
// the only place Anthropic-specific shapes (input_schema, tool_result blocks,
// content-block deltas) appear. Adding OpenAI/Gemini = a sibling file here.
import Anthropic from "@anthropic-ai/sdk";
import type { AiProvider, StreamChatOptions, StreamEvent } from "../types";

const MAX_ITERATIONS = 6; // cap the tool loop
const MAX_TOKENS = 2048;

export function createAnthropicProvider(opts: { apiKey: string; baseURL?: string }): AiProvider {
  const client = new Anthropic({ apiKey: opts.apiKey, baseURL: opts.baseURL });

  return {
    id: "anthropic",
    async *streamChat({ model, system, messages, tools, runTool }: StreamChatOptions): AsyncIterable<StreamEvent> {
      const anthropicTools: Anthropic.Tool[] = tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters as Anthropic.Tool["input_schema"],
      }));

      const convo: Anthropic.MessageParam[] = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

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
        convo.push({ role: "assistant", content: final.content });

        if (final.stop_reason !== "tool_use") return;

        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        for (const block of final.content) {
          if (block.type !== "tool_use") continue;
          yield { type: "tool", name: block.name };
          try {
            const data = await runTool(block.name, block.input);
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: JSON.stringify(data),
            });
          } catch (e) {
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: e instanceof Error ? e.message : "Tool execution failed.",
              is_error: true,
            });
          }
        }
        convo.push({ role: "user", content: toolResults });
      }

      yield { type: "error", message: "Reached the maximum number of tool steps for this turn." };
    },
  };
}
