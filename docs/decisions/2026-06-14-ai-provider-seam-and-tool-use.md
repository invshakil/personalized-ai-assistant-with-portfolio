# AI provider seam and tool use

**The AI assistant was rebuilt on a vendor-neutral provider seam with read-only tool use** (Shakil, 14 Jun 2026).

- **Why:** see [A vendor-neutral AI provider seam](2026-06-14-vendor-neutral-ai-provider.md).

The new `src/services/ai/` domain:

- A vendor-neutral `AiProvider` interface.
- `adapters/anthropic.ts`: a streaming tool-use loop, capped at 6 steps.
- `registry.ts`: resolves the active provider.
- `config.ts`: the provider catalog, and masked list, upsert, activate and test.
- `crypto.ts`: AES-256-GCM encryption of API keys.
- `tools.ts`: 12 read-only finance and property tools, which call the same service functions the HTTP API uses.

Also:

- A new `AiProviderConfig` model and migration.
- `api/admin/ai/route.ts` was rewritten to stream through the active provider as plain-text deltas.
- `api/admin/ai/config` (GET, PUT) and `config/test` (POST), with the client layer `lib/api/ai.ts`.
- The `/admin/settings/ai` page: one card per provider, a write-only key field, and Test connection.
- Only the Claude adapter is implemented. OpenAI and Gemini are seeded inactive (`supported: false`).
- The deprecated model `claude-sonnet-4-20250514` was dropped for `claude-sonnet-4-6`.
- A new environment variable, `AI_CONFIG_SECRET`. On first run the Claude key is bootstrapped from `ANTHROPIC_API_KEY`, so existing installs keep working.

Write tools were deliberately not exposed at this point. They came later, behind an approval gate.

Verified: `tsc`, eslint and build clean. An authenticated runtime smoke test checked config create, read and update, key bootstrap and encryption with no leak, and the full decrypt, stream and tool-loop path.
