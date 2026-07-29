# AI Engineering — Learning Progress

> **Purpose:** a personal source-of-truth tracking what I've learned about building AI features
> (tool use, agents, cost) against my own `sshakil.com` admin app, the mental models I've settled on,
> where each concept lives in the codebase, and what comes next. Updated as I go.
>
> **Owner:** Syful Islam Shakil · **Started:** 2026-06-18 · **Stack:** Next.js 16 + Anthropic SDK,
> vendor-neutral AI seam in `src/services/ai/`.

---

## Where I am right now (snapshot)

- **Built:** a read-only AI assistant → then **write tools** (create/update) with an **enforced
  approval gate** → then **prompt caching** → then **module-scoped tool selection** (`/property`,
  `/finance`).
- **Tier of tool selection:** **Tier 2 — manual scope** (see §5). Largest scope today = 40 tools (`/property`); 98 total.
- **Model:** moved from Haiku 4.5 → **Sonnet 4.6** for analytical accuracy.
- **Comfortable with:** the tool-use loop, propose→approve→commit, prompt-cache economics, why tool
  count matters, and the feed-all vs selector trade-off.
- **Next frontier:** tool retrieval (Tier 3) when a single module outgrows ~80 tools; conversation
  caching; trimming fat read payloads.

---

## 1. The tool-use loop (how an LLM "does things")

**What it is:** a turn isn't one request. The model can ask to call tools, get results, and decide
again — a loop of API rounds until it stops asking.

Key things I learned:

- The request carries a `tools` array (schemas) + the conversation. The model replies with either a
  final answer (`stop_reason: "end_turn"`) or tool calls (`stop_reason: "tool_use"`).
- On `tool_use`, **my backend** runs the tool(s), appends the results as a `tool_result` message, and
  calls the model again. Repeat until `end_turn`.
- The loop must be **capped** (`MAX_ITERATIONS = 6`) so a confused model can't loop forever.
- **`convo.push(assistant)` happens before the stop check** — the assistant's turn (including its
  tool-call request) must be recorded in history before I decide what to do next, or the next round's
  context is broken.
- Tool calls in one round run **concurrently** (`Promise.all`); results are matched back by
  **`tool_use_id`**, not array order — so finish order doesn't matter.
- A failing tool becomes an `is_error` tool_result, so one bad tool doesn't kill the turn.

**The big realisation:** the model only ever knows about tools I put in the request. It has no ambient
access to my system. Everything it "can do" is what I hand it.

**In my code:** `src/services/ai/adapters/anthropic.ts` (the loop), `src/services/ai/tools.ts`
(catalog + `runAiTool`), `src/app/api/admin/ai/route.ts` (streams the turn).

---

## 2. Tool design & model choice

- **Tool descriptions matter more than names** — the model picks tools from the description. Be
  explicit about _when_ to use each and what every param means.
- For "no direct tool" questions, the model reasons: it picks the closest broad read tool, pulls data,
  and composes an answer — or says "no data" rather than inventing.
- **Model capability is real:** Haiku 4.5 mis-summed rent payments and **over-called** the same tool 6×
  trying to verify itself. Sonnet 4.6 did it in 1–2 rounds. Cheaper-per-token ≠ cheaper-per-answer —
  repeated wrong answers + retries made Haiku _more_ expensive for analytical work.

**Lesson:** match the model to the task. Use a capable model for anything requiring arithmetic /
multi-step reasoning over tool data.

---

## 3. Writing data through chat — propose → approve → commit

**Question I started with:** can the assistant create/update/delete data, not just read?
**Answer:** yes — and the safe pattern is a three-phase gate where the **model never commits**.

```
Model calls a write tool  →  preview() validates + resolves ids to labels, NO mutation
                          →  a pending_action card streams to the UI (Approve / Cancel)
                          →  model is told "awaiting approval — don't claim it's done"
User clicks Approve       →  POST /ai/actions/execute  →  commit() runs the real service  →  saved
                          →  card flips to ✅ + a "✓" line appears in chat
```

Key things I learned:

- **Two-phase, one parser:** `preview` (in-stream, never writes) and `commit` (after approval) share
  one `parse()`, so the untrusted model input is validated **identically twice** — and the service
  layer is still the real guard.
- **The commit is a plain HTTP call, not a model turn** → approving a write costs **0 tokens**. The
  other approaches (model re-confirms in chat) cost a _full extra round-trip_ because the whole
  conversation is re-sent. This is why the UI-approve design is the cheapest.
- Writes aren't always one tool: "William Jones paid June rent" = `list_rent_payments` (find the row) →
  `record_rent_payment`. The model resolves ids via read tools first.
- I deliberately exposed **create + update only** — no deletes/deactivations through the AI (those stay
  in the dashboard UI).

**In my code:** `src/services/ai/writeTools/` (registry: schema + preview + commit per tool, one file per domain),
`src/app/api/admin/ai/actions/execute/route.ts` (commit endpoint), `PendingActionCard.tsx` (the card).

---

## 4. Prompt caching — the cost model

**The cost shock:** one "log a ৳500 expense" turn cost ~$0.12 — and **96% was input tokens**, almost
none of it my actual request.

What I learned about _why_:

- **Input is the cost driver, not output.** Every round re-sends system + **all tool schemas** + the
  growing history. A 3-round turn re-sent the ~9k-token tool catalog 3× ≈ 70% of the bill.
- **Prompt caching** caches a stable **prefix** so it's billed cheaply on reuse. I put one
  `cache_control` breakpoint on the **last tool** → the whole tool catalog is cached as one unit, and
  any tool I add later extends the same prefix (auto-cached on first use).

The three prices that matter (Sonnet, per 1M input tokens):

| State           | Multiplier               | $/M         | When                                    |
| --------------- | ------------------------ | ----------- | --------------------------------------- |
| Cache **write** | 1.25× (5m) / **2× (1h)** | 3.75 / 6.00 | first call, and after the cache expires |
| Cache **read**  | **0.1×**                 | 0.30        | every reuse within the TTL window       |
| Base / uncached | 1×                       | 3.00        | if I didn't cache at all                |

Mental models I corrected along the way:

- **TTL is a _sliding_ window** — refreshed on every hit. Keep chatting → stays warm forever. It only
  expires after full idle (5 min, or **1 hour** with `ttl: "1h"` — which I chose).
- **Cache is keyed by content, not by chat.** A brand-new chat reuses the same cached catalog.
- **After expiry I'm NOT back to base** — I pay a cache _write_ (a bit more than base), then reads
  again. A cold start is still cheaper than no caching.
- **Only tool _definitions_ are cached, not tool _outputs_.** Request order is `tools → system →
messages`; my breakpoint is on tools, so outputs (which live in `messages`, after it, and are
  dynamic anyway) are re-billed each round. That leftover ~$0.035/turn is mostly the `list_units`
  output echoed across rounds.

**In my code:** `cache_control: { type: "ephemeral", ttl: "1h" }` on the last tool in
`adapters/anthropic.ts`; cached-token display in `ChatMessage.tsx`; pricing in `services/ai/pricing.ts`.

---

## 5. Tool selection at scale — feed-all vs selector

**The insight that reframed everything:** it's not about my 98 tools today — at **thousands** of tools,
three things break: **cost** (linear), **context window** (schemas eat the budget / don't fit), and —
biggest — **accuracy** (models mis-pick as the menu grows). Caching makes tokens _cheaper_ but not
_fewer_, so it doesn't fix context or accuracy.

**Feed-all vs a tool selector — the honest trade-off (two failure modes):**

- Feed-all: model **picks the wrong tool** among many (worsens with size). No false negatives — it can
  always see everything.
- Selector: the right tool **never gets surfaced** → silent capability loss. _Worse_ than a wrong pick,
  unless the selector has high recall + a fallback.

**How a tool selector actually works (the thing that clicked):** the model never searches my system. **My
backend builds the `tools` list per query.** Four ways to build it:

1. **Manual scope** — filter by a tag from a `/property` command. Deterministic, zero risk. ← _I'm here._
2. **Semantic retrieval** — embed the query, vector-search tool descriptions, send top-K.
3. **Meta-tool** — give the model one `search_tools` tool; it asks, my handler looks up, returns matches.
4. **Auto-route** — a cheap classifier picks the module first.

**The three tiers (and when to switch):**

| Tier               | Largest single scope | Strategy                              | Me      |
| ------------------ | -------------------- | ------------------------------------- | ------- |
| 1 Feed-all         | ≤ ~50 tools          | send everything (cached)              | past    |
| 2 **Manual scope** | ~50–120              | `/property` `/finance` + shared tools | **now** |
| 3 Retrieval        | hundreds–thousands   | `search_tools` injects top-K          | future  |

**In my code:** `domain` tag on `AiToolDef`; `getToolsForScope()` in `tools.ts`;
`TOOL_SCOPE_LIMITS {warn:80, migrate:120}` with a `console.warn` at build/start when the largest scope
outgrows manual scoping; `/property|/finance|/money` parsing in `AiAssistantPage.tsx`. Full write-up in
`AI_TOOLS_REFERENCE.md` §8.

**Why manual scope now (when caching already cut cost):** scoping is **both-and** — ~43% less tool cost
_and_ better accuracy/clarity — and, crucially, it's the **architectural seam** for retrieval later.
Tier 3 only swaps the _selector_; `runAiTool`, the approval flow, and caching stay identical.

---

## Concept checklist

- [x] Tool-use loop: rounds, `stop_reason`, `tool_use_id`, concurrent calls, iteration cap
- [x] Async generators / streaming events (`text`, `tool`, `usage`, `pending_action`, `error`)
- [x] Service layer as the single source of truth shared by API routes + AI tools
- [x] Write tools: propose → approve → commit; untrusted input validated twice
- [x] Token economics: input vs output; why multi-round turns get expensive
- [x] Prompt caching: prefix caching, write/read/base rates, sliding TTL, content-keyed, defs-not-outputs
- [x] Tool selection: feed-all vs selector failure modes; backend builds the list; 4 mechanisms
- [x] Scaling tiers + objective thresholds for switching strategy
- [ ] Tier 3 retrieval (semantic / meta-tool) — _next_
- [ ] Conversation/history caching (a 2nd breakpoint on the last message) — _next_
- [ ] Trimming fat read payloads (e.g. `list_units` nested tenants) — _next_
- [ ] Persisting pending-action cards + outcomes across session reloads — _known gap_
- [ ] Evals / measuring tool-selection accuracy as the catalog grows — _not started_

---

## What's next (roadmap)

1. **Watch the alert.** As I add write tools, the build log warns when a scope passes 80 → that's my
   cue to start Tier 3.
2. **Trim read payloads** — `list_units` returns nested tenant data the model doesn't need for id
   resolution; smaller results = less re-billed history.
3. **Conversation caching** — a second cache breakpoint on the last message to make round-to-round
   re-sends within a turn cheaper (attacks the ~$0.035 non-tool floor).
4. **Tier 3 retrieval** — add a `search_tools` index (keyword first, embeddings later) + a small
   always-loaded core + a "load more" fallback so a missed selection is recoverable.
5. **Persist pending actions** — store proposed/committed actions on the turn so reloading a session
   shows the cards and their outcomes.
6. **Evals** — a small harness to measure whether the model picks the right tools as the catalog grows;
   this is what turns "feels better" into a number.

---

## Reference map (where things live)

| Concept                                                   | File                                                                                                   |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Tool-use loop, prompt caching                             | `src/services/ai/adapters/anthropic.ts`                                                                |
| Read catalog, scope filter, thresholds                    | `src/services/ai/tools.ts`                                                                             |
| Write tools (preview/commit)                              | `src/services/ai/writeTools/` (one file per domain)                                                    |
| Shared types (`AiToolDef`, `StreamEvent`, `ToolScope`, …) | `src/services/ai/types.ts`                                                                             |
| Chat route (stream, scope, budget)                        | `src/app/api/admin/ai/route.ts`                                                                        |
| Commit endpoint                                           | `src/app/api/admin/ai/actions/execute/route.ts`                                                        |
| Cost / pricing                                            | `src/services/ai/pricing.ts`, `usage.ts`                                                               |
| Chat UI, approval cards, scope commands                   | `src/app/(admin)/admin/ai-assistant/`, `src/components/admin/PendingActionCard.tsx`, `ChatMessage.tsx` |
| Deep-dive tool reference                                  | `AI_TOOLS_REFERENCE.md`                                                                                |
