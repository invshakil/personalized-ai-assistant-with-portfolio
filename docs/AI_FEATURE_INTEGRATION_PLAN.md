# AI_FEATURE_INTEGRATION_PLAN.md — sshakil.com

**Written:** 2026-08-30 · **Owner:** Syful Islam Shakil
**Status:** Phase 0 ✅ shipped · Phase 1 ✅ shipped (2026-08-30) · Phases 2–5 open
**Premise:** the AI layer is well-built and has exactly one consumer. This plan moves AI from
_a place you go_ to _a thing the features do_.

> Read `AI_TOOLS_REFERENCE.md` for the tool catalog and `AI_ENGINEERING_LEARNING_PROGRESS.md` for
> the concepts already internalised. This file is about **where AI plugs into features**, not how
> tool use works.

---

## 1. Diagnosis

**What exists (genuinely good):**

- A vendor-neutral provider seam (`AiProvider`), DB-resolved at runtime via `getActiveProvider()`
- **101 tools** — 50 read (`tools.ts`) + 51 write (`writeTools/`), each calling the same service
  function the HTTP API uses
- A propose → approve → commit gate where the model _never_ commits (the best idea in the codebase)
- Prompt caching on the tool prefix (1h TTL), per-turn usage metering, an enforced monthly USD budget
- Module scoping (`/property`, `/finance`, `/money`, `/solar`) with threshold alerts

**The gap, stated precisely:**

```
$ grep -rn "getActiveProvider\|streamChat" src/ | grep -v "services/ai/"
src/app/api/admin/ai/route.ts:80   active = await getActiveProvider();
src/app/api/admin/ai/route.ts:100  for await (const ev of active.provider.streamChat({
```

Two hits, one file. **Every AI capability in this application is reachable only by a human typing
prose into `/admin/ai-assistant`.** The tool catalog is a complete, machine-readable map of what the
app can do — and only a chat box can read it.

The cost of that shape: using AI requires the user to (a) know a capability exists, (b) navigate away
from the page they are working on, and (c) describe in sentences what is already on screen in front
of them.

**Chat is the right shape for open-ended analysis. It is the wrong shape for four things this app
does constantly:**

| Shape                      | Example here              | Why chat is wrong for it                        |
| -------------------------- | ------------------------- | ----------------------------------------------- |
| Classification at volume   | 200 CSV rows → categories | Nobody dictates 200 rows into a chat box        |
| Extraction from a document | receipt / lease → fields  | The answer belongs in the form, not in prose    |
| Ranking known signals      | "what needs my attention" | The user must already suspect something to ask  |
| Intent → UI state          | "unpaid rent in Block B"  | The answer is a filtered table, not a paragraph |

Those four cover most of what is missing.

---

## 2. Foundation gaps (Phase 0 — nothing user-visible, unblocks everything)

### 2.1 No one-shot task primitive

`AiProvider` has exactly one method: `streamChat`. Every model call must therefore be a streaming
conversation with a tool loop. Embedded AI needs the opposite: one call, structured JSON out, no
loop, no stream.

```ts
// src/services/ai/types.ts — add to AiProvider
complete<T>(opts: {
  model: string;
  system: string;
  input: string | ChatMessage[];
  schema: Record<string, unknown>;  // JSON Schema for the result
  maxTokens?: number;
}): Promise<{ result: T; usage: UsageTotals }>;
```

Implement on the Anthropic adapter as a single forced tool call (the tool _is_ the output schema) —
which maps cleanly onto OpenAI/Gemini structured output when those adapters land. Add
`src/services/ai/task.ts` as the vendor-neutral entry point that resolves the provider, calls
`complete`, records usage, and returns typed data.

### 2.2 No server-initiated path

`instrumentation.ts` already boots two schedulers (backup, Solis sync). Nothing AI. **Every token
this app has ever spent required a human in a browser.** Proactive AI — nightly insights, attention
triage, anomaly detection — needs a third scheduler and a small job table for results.

### 2.3 `PendingAction` is chat-shaped

`PendingActionState` lives in the AI assistant page's local `types.ts`, is held in the `aiChat` Redux
slice, renders inside the message list, and is lost on reload (a known gap). Promote it:

```prisma
model AiProposedAction {
  id        String   @id @default(cuid())
  source    String   // "chat" | "import" | "receipt" | "insight" | "job"
  sessionId String?  // set only for chat-originated proposals
  tool      String
  input     Json
  summary   String
  status    String   @default("PENDING") // PENDING|APPROVED|CANCELLED|ERROR
  result    Json?
  createdAt DateTime @default(now())
  resolvedAt DateTime?
}
```

`PendingActionCard.tsx` then works on any surface, and reloading a chat session restores its cards
and their outcomes — closing the existing debt while unblocking every embedded surface.

### 2.4 Usage isn't attributable, and the budget is a single global gate

`AiUsage` records provider + model, no feature. `isOverBudget()` is one boolean checked by the chat
route. Add background jobs today and a chat-heavy month silently kills the nightly insights — or a
runaway job locks the user out of chat, with no way to tell which.

- Add `feature String` to `AiUsage` (`"chat" | "import" | "receipt" | "insight" | "filter" | ...`)
- Per-feature soft caps; the global cap stays as the hard backstop
- Surface a per-feature breakdown on the existing spend panel, so it's visible which embedded
  feature is worth its cost

### 2.5 One model for all work

`getActiveProvider()` returns a single model. Classification and extraction want the cheap fast
model; analysis and narrative want the strong one. Add a purpose → model resolution
(`getProviderFor("classify" | "extract" | "analyze" | "chat")`) with per-purpose defaults, still
DB-configurable in Settings → AI.

Also: `PROVIDER_CATALOG` in `config.ts` lists `claude-opus-4-8` / `claude-sonnet-4-6` /
`claude-haiku-4-5`. The Claude 5 family (`claude-opus-5`, `claude-sonnet-5`, `claude-fable-5`) is
current — refresh the catalog, and treat this as evidence that a hardcoded model list wants to be
config.

### 2.6 No evals

The learning doc's checklist has this unstarted. That was fine when a human read every answer. It
stops being fine the moment a model silently categorises 200 CSV rows. A fixture-based harness
(`npm run eval:ai`) with golden cases for tool selection and extraction accuracy is the gate that
lets everything below ship safely.

---

## 3. Where AI plugs into features

Ranked by value ÷ effort. Every one of these reuses the services that already exist.

### 3.1 CSV import auto-categorisation — **highest ROI**

**Today** (`src/services/money/import.ts:174`): a row's category comes from a mapped column, or a
single `defaultCategory` applied to the whole file. Real bank exports have a description column and
no category — so every import is either uncategorised or hand-sorted afterwards.

**Change:** collect the distinct descriptions, send one `complete<T>()` call with the user's existing
category list plus the last ~50 `(description → category)` pairs from `MoneyEntry` as few-shot
examples, get back `{ description, categoryName, confidence }`. Pre-fill the existing preview table,
show confidence as a chip, leave every cell editable.

Why this one first: no new UI paradigm (the preview table already exists), the output is reviewed
before it commits by construction, it exercises every Phase-0 piece, and it learns from the user's
own history with no ML infrastructure. Cost is roughly one cheap call per import.

**Extension:** transfer detection — a DEBIT on account A and a CREDIT on account B, same day, same
amount, is one TRANSFER, not two entries. The importer already has duplicate detection to hang this
off.

### 3.2 Receipt and document extraction at the point of entry

**Today:** vision works, but only by going to the chat page, attaching an image, and having it
propose `create_money_entry`. That is the long way round for a photo of a receipt.

**Change:** a "Scan receipt" control on the drawers where the expense is actually entered — Money Add
Entry, Property Expense, Business Expense. Same vision call; the extraction pre-fills _the form the
user is already in_, which they then correct and save normally. No approval card needed, because the
user is looking at the form.

**Extension:** `TenantDocument` and `PayeeDocument` already exist as models with uploads, and are
currently dumb file attachments. Extract lease start/end, rent amount, and contract expiry from an
uploaded lease and offer to pre-fill the tenant record — that data is currently keyed in by hand from
the same document that was just uploaded. Note `saveChatAttachment` is images-only; PDFs need the
document content block.

### 3.3 Attention feed on the Overview page

**Today:** the signals already exist and are computed by services nobody calls unprompted —
`getArrearsReport`, `getLeaseExpiryReport`, `getScheduledRentChanges`, `getPendingForeignIncome`,
`getSubscriptionSpendReport`, `getBeneficiaryBalances`, solar payback. Every one is a question the
user must think to ask.

**Change:** a nightly job runs the deterministic reports, and the model _only_ ranks, groups, and
phrases the candidates into "what needs you this week", each item carrying a deep link and — where
the action is unambiguous — a pre-built `AiProposedAction` the user can approve inline.

**The rule that keeps this safe:** rules generate the candidates, the model never decides _whether_
rent is overdue. That is a query, and queries don't hallucinate.

### 3.4 Cached report narratives

Every report page computes rich aggregates and renders them as tables and charts. Add a short "what
changed and why" block — but compute it in the nightly job and cache it keyed by a hash of the
underlying figures, so it regenerates only when the numbers actually move. Pageviews stay free and
instant; no report ever blocks on a model call.

### 3.5 Natural-language filters on list pages

The List Page Filter Standard already gives every list page URL-state params _and_ a matching AI tool
whose JSON schema documents those exact params. Reuse that schema as the output schema: "unpaid rent
in Block B since March" → params → `router.replace`. The user gets the normal filtered table with
normal filter chips they can adjust or clear.

This is the right shape for list pages specifically: **the answer is the UI, not prose.** Cheap
model, sub-second, fully reversible, and it degrades to "nothing happened" rather than to a wrong
answer.

### 3.6 Booking — intake and follow-up

The only module with zero AI, and the only one with untrusted public input. Classify the visitor's
note (topic, likely scope, urgency), draft a prep brief before the call, draft the follow-up
afterwards. Untrusted text → proposals only, never a commit, never in the system prompt.

### 3.7 Solar outlook and anomalies

`getSolarWeather` already returns a 7-day forecast with predicted generation, and the tariff engine
knows the BPDB slab boundaries. Add: a plain-language weekly outlook, a slab-crossing warning ("about
30 kWh from the next slab this month"), and underperformance detection against comparable-weather
days. Stays strictly read-only — no inverter control, per the existing rule.

### 3.8 Trip settle-up drafts

Who-owes-whom is already computed by `report.ts`. The model drafts the per-person message to send.
Separately: a photo of a shared bill → expense + split suggestion.

### 3.9 Renovation Tracker — build it AI-first

The one unbuilt module. Rather than porting the spreadsheet by hand: material invoice photo → line
items, and budget-vs-actual narrative against the ৳12,500,000 plan. It is the only module with no
legacy UI to retrofit, so it can be designed around extraction from the start.

---

## 4. Making the assistant itself better

**Deprioritise tier-3 tool retrieval.** The learning doc calls it the next frontier, but the health
check in `tools.ts` disagrees: the largest scope is 40 tools against a warn threshold of 80. There is
real headroom. Spend the effort below instead.

- **Render tool results as components, not prose.** The model already receives structured JSON from
  `get_rent_roll`; having it re-type those numbers into markdown costs output tokens and adds
  transcription risk. Emit a `tool_result` stream event carrying the payload and render the actual
  table or chart. Cheaper _and_ more accurate.
- **Evals** (§2.6) — the prerequisite for trusting anything embedded.
- **Persist pending actions** — solved by §2.3.
- **Conversation caching** — a second cache breakpoint on the last message, already on the roadmap.
- **Trim fat read payloads** — matters much more once background jobs run these tools on a schedule.
- **Refresh the model catalog** (§2.5).

---

## 5. Public surface (portfolio) — viable, but guarded

The portfolio has no AI at all. A curated "ask about my experience" assistant is reasonable, on
strict terms:

- A **fixed, curated corpus** (CV, projects, skills) — **no DB tools, ever**
- A separate, tool-free provider call. **The scope filter is a UX device, not a security boundary** —
  a public path must never resolve the admin catalog
- Turnstile + per-IP rate limit + honeypot (Booking's anti-abuse harness already exists and works)
- A master enable toggle in settings, mirroring `BookingSettings`, and a hard token cap per request

---

## 6. Cross-cutting rules

1. **The model classifies, phrases, and ranks. Services compute.** Never let the model do arithmetic
   a query can do. This is already the read-tool pattern — keep it everywhere.
2. **Keep the approval gate and extend it.** Do not bypass propose → approve → commit for
   convenience on an embedded surface. It is the reason writes are safe.
3. **Untrusted text produces proposals only.** Once AI reads bank CSV descriptions, visitor notes, or
   uploaded documents, its input is attacker-influenced. Never in the system prompt; never straight
   to commit.
4. **Validate on the server at every hop the value crosses.** A guard applied when a suggestion is
   _produced_ does not protect the path where it is _applied_ — if the client round-trips the result,
   re-check it against live data on the way back in. Anything less makes the guarantee depend on the
   browser behaving.
5. **Latency budget.** Inline AI is sub-second, optimistic/background, or precomputed. Never block a
   page render on a model call.
6. **Attribute every token.** Without per-feature usage you cannot tell which embedded feature earns
   its cost.

---

## 7. Sequencing

Revised 2026-09-02 after a module-by-module analysis (see the companion artifact "AI Where You
Work"). Phases 2–7 replace the original 2–5: the command bar was promoted out of "ambient" because
it is structural rather than a feature, reports gained a phase of their own, and voice moved to the
front of Capture because the hook is already written.

| Phase                 | Scope                                                                                                                                   | Why here                                                                                 |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **0 — Foundation** ✅ | `complete<T>()`; `AiUsage.feature`; purpose → model map; persist `AiProposedAction`; eval harness                                       | Nothing user-visible; unblocks every phase below                                         |
| **1 — Prove it** ✅   | CSV auto-categorisation end-to-end, with evals                                                                                          | Smallest surface, clearest win, exercises all of Phase 0                                 |
| **0b — Finish**       | Wire `listSessionProposedActions` into `getChatSession` so cards restore on reload; add the `byFeature` breakdown to the AI spend panel | Both are written-but-unwired; small, and closes a claim I made                           |
| **2 — Capture**       | Voice entry in the Money drawer; receipt scan on the three expense drawers; then lease/invoice documents                                | Voice first: `useSpeechRecognition` (223 lines) already exists and has one consumer      |
| **3 — Command bar**   | ⌘K over any admin route, inheriting scope + filters + selected row; results render in place                                             | Structural. Answers the page-switching problem and gives every later idea an entry point |
| **4 — Proactive**     | AI job runner in `instrumentation.ts` → attention feed on Overview + cached report narratives + solar daily anomaly detection           | One nightly job powers three surfaces; first server-initiated AI                         |
| **5 — Reports**       | Comparative framing on every figure (**no AI** — do this first), then the natural-language report builder                               | Framing makes the numbers legible; the builder turns 25 fixed reports into an open set   |
| **6 — Recall**        | Semantic search across the 36 models carrying `notes` / `description` / `reason`                                                        | Years of writing that nothing can search; value compounds with age                       |
| **7 — Public**        | Portfolio assistant, corpus-only and guarded                                                                                            | Highest risk, lowest coupling — last on purpose                                          |
| **Ongoing**           | Tool-result rendering as components, conversation caching, payload trimming                                                             | Assistant quality, independent of the above                                              |

### What each phase actually turns on

- **2 (Capture)** needs nothing new — `complete<T>()` already takes image input, and the speech hook
  already returns text. This is assembly.
- **3 (Command bar)** needs page context passed to the chat route (route, filters, selected row) and
  a renderer that applies the outcome to the page instead of printing prose. Tool scoping and the
  approval gate are unchanged.
- **4 (Proactive)** needs the job runner that Phase 0 deliberately deferred — a scheduler alongside
  the backup and Solis ones in `instrumentation.ts`, plus a table to hold generated output so a page
  view never waits on a model call.
- **5 (Reports)** starts with work that has no AI in it at all: nothing in the current reports is
  compared against a prior period, the same period last year, or a trailing median. Add that framing
  and the narratives in Phase 4 have something to say.
- **6 (Recall)** is keyword-first over existing columns; embeddings only if that proves too blunt.

**The single sentence version:** the seam, the tools, the approval gate, and the metering are all
built and all correct — they are just wired to one text box. Phase 0 added a second way in; every
phase after it is a new caller on infrastructure that already exists.
