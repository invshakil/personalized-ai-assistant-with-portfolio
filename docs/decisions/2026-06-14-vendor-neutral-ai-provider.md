# A vendor-neutral AI provider seam

**AI calls go through a vendor-neutral `AiProvider` interface, with a Claude adapter as the only one implemented** (Shakil, 14 Jun 2026).

- **Why:** the provider, model and key are chosen in Settings → AI, so swapping providers is a settings change, not a code change. Adding OpenAI or Gemini later is a new adapter file, not a rewrite.
- **Instead of:** calling one vendor's SDK directly from the chat route.

The key is stored encrypted in the database. The work that built the seam is in [AI provider seam and tool use](2026-06-14-ai-provider-seam-and-tool-use.md).
