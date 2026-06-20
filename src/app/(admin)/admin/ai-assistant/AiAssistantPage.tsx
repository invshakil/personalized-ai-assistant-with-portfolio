"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { Sparkles, Send, History } from "lucide-react";
import {
  Box,
  Card,
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
import type { ChatSessionSummary } from "@/services/ai/types";
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
  patchAction as patchActionAction,
} from "@/store/slices/aiChatSlice";

// Warn once the running input-token total for a thread crosses this. Message
// history is re-sent uncached every turn, so cost grows with thread length —
// starting a new chat resets it to zero.
const LONG_THREAD_TOKENS = 60_000;

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
  const [blocked, setBlocked] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [slashIndex, setSlashIndex] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
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
  }, [refreshSessions, checkBudget]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isStreaming || blocked) return;

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

    const userMsg: Message = { role: "user", content: text };
    const updatedMessages = [...messages, userMsg];
    dispatch(addMessage(userMsg));
    setInput("");
    dispatch(setStreaming(true));
    dispatch(addMessage({ role: "assistant", content: "" }));

    try {
      const res = await fetch("/api/admin/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // System lines are client-only approval receipts — never sent to the model.
        // Scope is taken from the latest user message; the `/property|/finance`
        // command is stripped from every user turn so the model only sees intent.
        body: JSON.stringify({
          sessionId: sid,
          scope: parseScope(text),
          messages: updatedMessages
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
      const message =
        e instanceof Error ? e.message : "Sorry, something went wrong. Please try again.";
      dispatch(replaceLastMessage({ role: "assistant", content: message }));
    } finally {
      dispatch(setStreaming(false));
      refreshSessions();
      checkBudget();
    }
  };

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
                  Shift+Enter for new line · Enter to send
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

          {/* Input row */}
          <Box
            ref={setInputWrapEl}
            sx={{
              p: 2,
              borderTop: "1px solid",
              borderColor: "divider",
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
            <Button
              variant="contained"
              onClick={sendMessage}
              disabled={!input.trim() || isStreaming || blocked}
              sx={{ minWidth: 44, width: 44, height: 40, p: 0, borderRadius: 2, flexShrink: 0 }}
            >
              <Send size={18} />
            </Button>
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
        />
      </Drawer>
    </Box>
  );
}
