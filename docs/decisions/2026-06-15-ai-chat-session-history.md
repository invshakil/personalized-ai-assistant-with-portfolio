# AI chat session history

**Assistant conversations are saved in two tables, `ChatSession` and `ChatMessage`** (Shakil, 15 Jun 2026).

- New `ChatSession` and `ChatMessage` models, the `ChatRole` enum, and a migration.
- `services/ai/sessions.ts`: list, get, create, rename, delete, and `appendTurn` with an automatic title from the first message.
- Routes: `/api/admin/ai/sessions` (GET, POST) and `/sessions/[id]` (GET, PATCH, DELETE).
- `lib/api/ai.ts` was extended, and `apiPatch` was added to the client.
- The chat route saves the user and assistant text turn after a clean answer, using the `sessionId` in the request body. Only text turns are stored; tool round-trips are not.
- The AI Assistant page was reworked: a `ConversationList` panel (new, select, delete), sessions created on the first message, and the list refreshed after each turn.

Verified: `tsc`, eslint and build clean. Session create, read, rename and delete were checked over HTTP, and `appendTurn` (auto-title, ordering, cascade delete) at the service level.
