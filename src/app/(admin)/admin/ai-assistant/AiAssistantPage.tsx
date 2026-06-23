"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { Sparkles, Send, History, Square, Cpu } from "lucide-react";
import {
  Box,
  Card,
  Chip,
  Typography,
  TextField,
  Button,
  Avatar,
  Alert,
  Drawer,
  IconButton,
  Popper,
  Paper,
  MenuList,
  MenuItem,
  ListItemText,
  ClickAwayListener,
} from "@mui/material";
import ChatMessage from "@/components/admin/ChatMessage";
import PageHeader from "@/components/admin/PageHeader";
import { aiApi } from "@/lib/api/ai";
import type { ChatSessionSummary, ProviderConfigView } from "@/services/ai/types";
import type { Message, PendingActionState } from "./types";
import ConversationList from "./ConversationList";
import { SLASH_COMMANDS, SLASH_TYPING_RE } from "./commands";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  newChat as newChatAction,
  setCurrentSessionId,
  loadSession as loadSessionAction,
  setStreaming,
  addMessage,
  appendToLastContent,
  addToolToLast,
  addPendingActionToLast,
  setUsageOnLast,
  replaceLastMessage,
  popLastMessage,
  markLastStopped,
  patchAction as patchActionAction,
} from "@/store/slices/aiChatSlice";

// Warn once the running input-token total for a thread crosses this. Message
// history is re-sent uncached every turn, so cost grows with thread length —
// starting a new chat resets it to zero.
const LONG_THREAD_TOKENS = 60_000;

// The Redux store is in-memory, so a full page refresh clears the active thread.
// We persist only the current session id here and reopen that session (messages
// come from the DB) on reload, so a refresh restores the conversation.
const LAST_SESSION_KEY = "ai-chat:last-session";

// A leading `/property` or `/finance` scopes the assistant to that module's
// tools for the turn. We parse it client-side, send the scope to the backend,
// and strip the command so the model never sees it.
const SCOPE_RE = /^\/(property|finance|money)\b\s*/i;

function parseScope(text: string): "property" | "finance" | "money" | "all" {
  const m = text.match(SCOPE_RE);
  return m ? (m[1].toLowerCase() as "property" | "finance" | "money") : "all";
}

export default function AiAssistantPage() {
  // The chat thread lives in the Redux store so it survives navigation between
  // admin pages (the (admin) layout doesn't remount). Transient UI state below
  // stays local — it's either re-derived or re-fetched on mount.
  const dispatch = useAppDispatch();
  const messages = useAppSelector((s) => s.aiChat.messages);
  const currentSessionId = useAppSelector((s) => s.aiChat.currentSessionId);
  const isStreaming = useAppSelector((s) => s.aiChat.isStreaming);
  const [input, setInput] = useState("");
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const [activeProvider, setActiveProvider] = useState<ProviderConfigView | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [slashIndex, setSlashIndex] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // AbortController for the in-flight stream. Cleared after each turn so a new
  // Stop click always aborts the *current* request, not a stale one.
  const abortRef = useRef<AbortController | null>(null);
  // State (not a ref) so the slash-menu Popper can anchor to it and read its
  // width during render without tripping the refs-in-render rule.
  const [inputWrapEl, setInputWrapEl] = useState<HTMLDivElement | null>(null);

  // Commands matching what's currently typed (the menu shows while the first
  // token is a bare "/word" with no space yet).
  const slashMatches = useMemo(() => {
    const m = input.match(SLASH_TYPING_RE);
    if (!m) return [];
    const partial = `/${m[1].toLowerCase()}`;
    return SLASH_COMMANDS.filter((c) => c.cmd.startsWith(partial));
  }, [input]);
  const slashOpen = slashMatches.length > 0 && !isStreaming && !blocked;

  // Running input-token total across the thread (excludes cached reads, which
  // are cheap). Used only to nudge toward a fresh chat on long threads.
  const threadInputTokens = useMemo(
    () => messages.reduce((sum, m) => sum + (m.usage?.inputTokens ?? 0), 0),
    [messages]
  );
  const threadIsLong = threadInputTokens >= LONG_THREAD_TOKENS;

  const refreshSessions = useCallback(async () => {
    try {
      setSessions(await aiApi.listSessions());
    } catch {
      /* non-fatal — the chat still works without the history list */
    } finally {
      setSessionsLoaded(true);
    }
  }, []);

  const checkBudget = useCallback(async () => {
    try {
      setBlocked((await aiApi.getUsage()).overBudget);
    } catch {
      /* non-fatal */
    }
  }, []);

  useEffect(() => {
    refreshSessions();
    checkBudget();
    aiApi
      .listProviders()
      .then((list) => setActiveProvider(list.find((p) => p.isActive && p.supported) ?? null))
      .catch(() => {
        /* non-fatal */
      });
  }, [refreshSessions, checkBudget]);

  // Show the parsed scope (from the leading slash, if any) as a hint chip.
  const activeScope = useMemo(() => parseScope(input), [input]);

  // Pick a session to open on first mount. Runs once after the sessions list
  // has loaded; skipped when an in-memory thread is already present (in-app
  // navigation). Preference order:
  //   1. The id saved in localStorage from the last visit (resume on refresh)
  //   2. The most recent session in the list (auto-open latest on fresh visit)
  //   3. Nothing — empty state when the user has no sessions yet
  const rehydratedRef = useRef(false);
  useEffect(() => {
    if (rehydratedRef.current || !sessionsLoaded) return;
    rehydratedRef.current = true;
    if (currentSessionId || messages.length > 0) return;

    const saved = localStorage.getItem(LAST_SESSION_KEY);
    const savedIsValid = saved !== null && sessions.some((s) => s.id === saved);
    const targetId = savedIsValid ? saved : (sessions[0]?.id ?? null);
    if (!targetId) {
      if (saved) localStorage.removeItem(LAST_SESSION_KEY);
      return;
    }
    aiApi
      .getSession(targetId)
      .then((detail) => dispatch(loadSessionAction({ id: detail.id, messages: detail.messages })))
      .catch(() => {
        if (saved) localStorage.removeItem(LAST_SESSION_KEY);
      });
  }, [sessionsLoaded, sessions, currentSessionId, messages.length, dispatch]);

  // Mirror the active session id to localStorage so the effect above can reopen
  // it after a refresh. Cleared on New Chat (currentSessionId → null). The first
  // run is skipped so a fresh mount (currentSessionId still null) doesn't wipe
  // the saved id out from under the rehydrate effect.
  const persistMountedRef = useRef(false);
  useEffect(() => {
    if (!persistMountedRef.current) {
      persistMountedRef.current = true;
      return;
    }
    if (currentSessionId) localStorage.setItem(LAST_SESSION_KEY, currentSessionId);
    else localStorage.removeItem(LAST_SESSION_KEY);
  }, [currentSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Cmd/Ctrl+K → new chat (skipped while streaming to avoid mid-turn loss).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        if (isStreaming) return;
        e.preventDefault();
        dispatch(newChatAction());
        setInput("");
        setHistoryOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isStreaming, dispatch]);

  // Keep the highlighted command in range as the filtered list narrows.
  useEffect(() => {
    setSlashIndex((i) => (i >= slashMatches.length ? 0 : i));
  }, [slashMatches.length]);

  const newChat = () => {
    if (isStreaming) return;
    dispatch(newChatAction());
    setInput("");
    setHistoryOpen(false);
  };

  const loadSession = async (id: string) => {
    setHistoryOpen(false);
    if (isStreaming || id === currentSessionId) return;
    try {
      const detail = await aiApi.getSession(id);
      dispatch(loadSessionAction({ id: detail.id, messages: detail.messages }));
    } catch {
      /* ignore — likely deleted elsewhere */
    }
  };

  // Insert a chosen slash command into the input (with a trailing space so the
  // user types their question right after it) and dismiss the menu.
  const applySlashCommand = (cmd: string) => {
    setInput(input.replace(SLASH_TYPING_RE, `${cmd} `));
    setSlashIndex(0);
  };

  const deleteSession = async (id: string) => {
    try {
      await aiApi.deleteSession(id);
      if (id === currentSessionId) newChat();
      await refreshSessions();
    } catch {
      /* ignore */
    }
  };

  const renameSessionTitle = async (id: string, title: string) => {
    try {
      await aiApi.renameSession(id, title);
      await refreshSessions();
    } catch {
      /* ignore — UI will revert on the next refresh */
    }
  };

  // Core send: appends the user turn (unless re-sending after a failure), opens
  // the SSE stream, dispatches into the store. Returns when the stream finishes
  // OR the user aborts via Stop. `priorMessages` lets Retry rebuild the request
  // body from the thread minus the popped failed assistant turn.
  const runTurn = async (text: string, priorMessages: Message[]) => {
    // Lazily create a session on the first message (best-effort).
    let sid = currentSessionId;
    if (!sid) {
      try {
        const created = await aiApi.createSession();
        sid = created.id;
        dispatch(setCurrentSessionId(sid));
      } catch {
        sid = null; // persistence unavailable — chat still works in-memory
      }
    }

    dispatch(setStreaming(true));
    dispatch(addMessage({ role: "assistant", content: "" }));
    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/admin/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortRef.current.signal,
        // System lines are client-only approval receipts — never sent to the model.
        // Scope is taken from the latest user message; the `/property|/finance`
        // command is stripped from every user turn so the model only sees intent.
        body: JSON.stringify({
          sessionId: sid,
          scope: parseScope(text),
          messages: priorMessages
            .filter((m) => m.role !== "system")
            .map(({ role, content }) => ({
              role,
              content: role === "user" ? content.replace(SCOPE_RE, "") : content,
            })),
        }),
      });

      if (!res.ok || !res.body) {
        let message = "Failed to get response";
        try {
          const j = await res.json();
          if (j?.error) message = j.error;
        } catch {
          /* body wasn't JSON */
        }
        throw new Error(message);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const ev = JSON.parse(line) as {
              type: string;
              text?: string;
              name?: string;
              message?: string;
              action?: {
                id: string;
                tool: string;
                input: Record<string, unknown>;
                summary: string;
              };
              inputTokens?: number;
              outputTokens?: number;
              cacheReadTokens?: number;
              cacheCreateTokens?: number;
              cost?: number;
            };
            if (ev.type === "text" && ev.text) {
              dispatch(appendToLastContent(ev.text));
            } else if (ev.type === "tool" && ev.name) {
              dispatch(addToolToLast(ev.name));
            } else if (ev.type === "pending_action" && ev.action) {
              const action: PendingActionState = { ...ev.action, status: "pending" };
              dispatch(addPendingActionToLast(action));
            } else if (ev.type === "error" && ev.message) {
              dispatch(appendToLastContent(`\n\n⚠️ ${ev.message}`));
            } else if (ev.type === "usage") {
              dispatch(
                setUsageOnLast({
                  inputTokens: ev.inputTokens ?? 0,
                  outputTokens: ev.outputTokens ?? 0,
                  cacheReadTokens: ev.cacheReadTokens ?? 0,
                  cacheCreateTokens: ev.cacheCreateTokens ?? 0,
                  cost: ev.cost ?? 0,
                })
              );
            }
          } catch {
            /* malformed line — skip */
          }
        }
      }
    } catch (e) {
      // User-initiated Stop — keep partial content, mark as stopped (no error).
      if (e instanceof DOMException && e.name === "AbortError") {
        dispatch(markLastStopped());
      } else {
        const message =
          e instanceof Error ? e.message : "Sorry, something went wrong. Please try again.";
        dispatch(replaceLastMessage({ role: "assistant", content: "", error: message }));
      }
    } finally {
      abortRef.current = null;
      dispatch(setStreaming(false));
      refreshSessions();
      checkBudget();
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isStreaming || blocked) return;
    const userMsg: Message = { role: "user", content: text };
    dispatch(addMessage(userMsg));
    setInput("");
    await runTurn(text, [...messages, userMsg]);
  };

  /** Drop the failed assistant turn, then re-send the last user message. */
  const retryLastTurn = async () => {
    if (isStreaming || blocked) return;
    // Walk back: pop the failed assistant bubble, find the last user message,
    // and re-run with the thread up to and including it.
    const lastUserIndex = (() => {
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === "user") return i;
      }
      return -1;
    })();
    if (lastUserIndex < 0) return;
    dispatch(popLastMessage());
    const prior = messages.slice(0, lastUserIndex + 1);
    await runTurn(messages[lastUserIndex].content, prior);
  };

  const stopStreaming = () => abortRef.current?.abort();

  const patchAction = (msgIndex: number, actionId: string, patch: Partial<PendingActionState>) =>
    dispatch(patchActionAction({ msgIndex, actionId, patch }));

  const approveAction = async (msgIndex: number, actionId: string) => {
    const action = messages[msgIndex]?.pendingActions?.find((a) => a.id === actionId);
    if (!action || action.status === "committing" || action.status === "done") return;

    patchAction(msgIndex, actionId, { status: "committing", error: undefined });
    try {
      const res = await aiApi.executeAction(action.tool, action.input);
      patchAction(msgIndex, actionId, { status: "done", resultSummary: res.summary });
      dispatch(addMessage({ role: "system", content: res.summary }));
    } catch (e) {
      patchAction(msgIndex, actionId, {
        status: "error",
        error: e instanceof Error ? e.message : "Failed to perform the action.",
      });
    }
  };

  const cancelAction = (msgIndex: number, actionId: string) =>
    patchAction(msgIndex, actionId, { status: "cancelled" });

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // While the slash menu is open, arrows/Enter/Tab drive the menu, not send.
    if (slashOpen) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSlashIndex((i) => (i + 1) % slashMatches.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSlashIndex((i) => (i - 1 + slashMatches.length) % slashMatches.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        applySlashCommand(slashMatches[slashIndex].cmd);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setInput("");
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: { xs: "calc(100vh - 64px - 32px)", md: "calc(100vh - 64px - 64px)" },
        minHeight: 400,
      }}
    >
      <PageHeader
        title="AI Assistant"
        subtitle="Ask about your finances, property, or anything else."
      />

      {blocked && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Monthly AI budget reached — the chat is paused. Raise or turn off the limit in{" "}
          <strong>Settings → AI</strong> to continue.
        </Alert>
      )}

      <Card sx={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
        <ConversationList
          sessions={sessions}
          currentId={currentSessionId}
          disabled={isStreaming}
          onNew={newChat}
          onSelect={loadSession}
          onDelete={deleteSession}
          onRename={renameSessionTitle}
        />

        {/* Chat column */}
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, minWidth: 0 }}>
          {/* Mobile-only bar: the desktop sidebar (history + New chat) is hidden
              on xs, so surface it through a drawer trigger here. */}
          <Box
            sx={{
              display: { xs: "flex", sm: "none" },
              alignItems: "center",
              gap: 1,
              px: 1.5,
              py: 1,
              borderBottom: "1px solid",
              borderColor: "divider",
            }}
          >
            <IconButton
              size="small"
              aria-label="Conversation history"
              onClick={() => setHistoryOpen(true)}
              sx={{ color: "text.secondary" }}
            >
              <History size={18} />
            </IconButton>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ flex: 1 }}>
              {currentSessionId
                ? (sessions.find((s) => s.id === currentSessionId)?.title ?? "Conversation")
                : "New chat"}
            </Typography>
            <Button size="small" onClick={newChat} disabled={isStreaming} sx={{ minWidth: 0 }}>
              New
            </Button>
          </Box>

          <Box
            sx={{
              flex: 1,
              overflow: "auto",
              p: 2.5,
              display: "flex",
              flexDirection: "column",
              gap: 2,
              "&::-webkit-scrollbar": { width: 4 },
              "&::-webkit-scrollbar-thumb": { bgcolor: "rgba(231,227,252,0.1)", borderRadius: 2 },
            }}
          >
            {messages.length === 0 && (
              <Box
                sx={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  py: 8,
                  textAlign: "center",
                }}
              >
                <Avatar
                  sx={{
                    width: 48,
                    height: 48,
                    mb: 2,
                    bgcolor: "rgba(115,103,240,0.12)",
                    border: "1px solid rgba(115,103,240,0.25)",
                    borderRadius: "12px",
                  }}
                >
                  <Sparkles size={22} color="#7367f0" />
                </Avatar>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75 }}>
                  Ask me anything — about your properties, finances, or anything else.
                </Typography>
                <Typography variant="caption" color="text.disabled" sx={{ mb: 0.25 }}>
                  Start with <strong>/property</strong> or <strong>/finance</strong> to focus the
                  assistant on one module.
                </Typography>
                <Typography variant="caption" color="text.disabled">
                  Shift+Enter for new line · Enter to send · ⌘K for new chat
                </Typography>
              </Box>
            )}

            {messages.map((msg, i) =>
              msg.role === "system" ? (
                <Box key={i} sx={{ display: "flex", justifyContent: "center", my: 0.5 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "success.main",
                      bgcolor: "rgba(40,199,111,0.08)",
                      border: "1px solid rgba(40,199,111,0.25)",
                      px: 1.5,
                      py: 0.5,
                      borderRadius: "999px",
                    }}
                  >
                    ✓ {msg.content}
                  </Typography>
                </Box>
              ) : (
                <ChatMessage
                  key={i}
                  role={msg.role}
                  content={msg.content}
                  usage={msg.usage}
                  tools={msg.tools}
                  pendingActions={msg.pendingActions}
                  actionsDisabled={isStreaming}
                  onApproveAction={(id) => approveAction(i, id)}
                  onCancelAction={(id) => cancelAction(i, id)}
                  isStreaming={isStreaming && i === messages.length - 1 && msg.role === "assistant"}
                  error={msg.error}
                  stopped={msg.stopped}
                  onRetry={
                    msg.error && i === messages.length - 1 && msg.role === "assistant"
                      ? retryLastTurn
                      : undefined
                  }
                />
              )
            )}
            <div ref={messagesEndRef} />
          </Box>

          {/* Long-thread nudge: history is re-sent uncached each turn, so a
              fresh chat is the cheapest way to cut per-turn cost. */}
          {threadIsLong && !blocked && (
            <Box sx={{ px: 2, pt: 1 }}>
              <Alert
                severity="info"
                variant="outlined"
                sx={{ py: 0, "& .MuiAlert-message": { py: 0.75 } }}
                action={
                  <Button color="inherit" size="small" onClick={newChat} disabled={isStreaming}>
                    New chat
                  </Button>
                }
              >
                This chat is getting long (~{Math.round(threadInputTokens / 1000)}k tokens re-sent
                each turn). Start a new chat to lower cost.
              </Alert>
            </Box>
          )}

          {/* Active scope + model hint */}
          <Box
            sx={{
              px: 2,
              pt: 1.25,
              borderTop: "1px solid",
              borderColor: "divider",
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              flexWrap: "wrap",
            }}
          >
            {activeScope !== "all" && (
              <Chip
                label={`Scope: /${activeScope}`}
                size="small"
                color="primary"
                variant="outlined"
                sx={{ height: 22, fontSize: "0.68rem" }}
              />
            )}
            {activeProvider && (
              <Chip
                icon={<Cpu size={12} />}
                label={`${activeProvider.label} · ${activeProvider.defaultModel}`}
                size="small"
                variant="outlined"
                sx={{
                  height: 22,
                  fontSize: "0.68rem",
                  color: "text.secondary",
                  borderColor: "divider",
                }}
              />
            )}
          </Box>

          {/* Input row */}
          <Box
            ref={setInputWrapEl}
            sx={{
              p: 2,
              pt: 1.25,
              display: "flex",
              alignItems: "flex-end",
              gap: 1.5,
            }}
          >
            <TextField
              multiline
              minRows={1}
              maxRows={12}
              fullWidth
              size="small"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                blocked ? "AI budget reached — chat paused" : "Ask a question…  (/ for commands)"
              }
              disabled={isStreaming || blocked}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
            />
            {isStreaming ? (
              <Button
                variant="contained"
                color="error"
                onClick={stopStreaming}
                aria-label="Stop generating"
                sx={{ minWidth: 44, width: 44, height: 40, p: 0, borderRadius: 2, flexShrink: 0 }}
              >
                <Square size={16} fill="#fff" />
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={sendMessage}
                disabled={!input.trim() || blocked}
                aria-label="Send message"
                sx={{ minWidth: 44, width: 44, height: 40, p: 0, borderRadius: 2, flexShrink: 0 }}
              >
                <Send size={18} />
              </Button>
            )}
          </Box>

          {/* Slash-command autocomplete, anchored above the input row. */}
          <Popper
            open={slashOpen}
            anchorEl={inputWrapEl}
            placement="top-start"
            style={{ zIndex: 1300, width: inputWrapEl?.clientWidth }}
          >
            <ClickAwayListener onClickAway={() => setSlashIndex(0)}>
              <Paper
                elevation={6}
                sx={{
                  mx: 2,
                  mb: 0.5,
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Box sx={{ px: 1.5, py: 0.75 }}>
                  <Typography variant="caption" color="text.secondary">
                    Commands — focus the assistant on one module
                  </Typography>
                </Box>
                <MenuList dense disablePadding sx={{ pb: 0.5 }}>
                  {slashMatches.map((c, i) => (
                    <MenuItem
                      key={c.cmd}
                      selected={i === slashIndex}
                      onMouseEnter={() => setSlashIndex(i)}
                      onClick={() => applySlashCommand(c.cmd)}
                      sx={{ borderRadius: 1, mx: 0.5 }}
                    >
                      <ListItemText
                        primary={c.cmd}
                        secondary={c.desc}
                        slotProps={{
                          primary: { style: { fontWeight: 600, fontSize: "0.8125rem" } },
                          secondary: { style: { fontSize: "0.75rem" } },
                        }}
                      />
                    </MenuItem>
                  ))}
                </MenuList>
              </Paper>
            </ClickAwayListener>
          </Popper>
        </Box>
      </Card>

      {/* Mobile conversation history drawer */}
      <Drawer
        anchor="left"
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        sx={{ display: { xs: "block", sm: "none" } }}
        slotProps={{ paper: { sx: { bgcolor: "background.paper" } } }}
      >
        <ConversationList
          inDrawer
          sessions={sessions}
          currentId={currentSessionId}
          disabled={isStreaming}
          onNew={newChat}
          onSelect={loadSession}
          onDelete={deleteSession}
          onRename={renameSessionTitle}
        />
      </Drawer>
    </Box>
  );
}
