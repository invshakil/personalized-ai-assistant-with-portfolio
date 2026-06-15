"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Sparkles, Send } from "lucide-react";
import { Box, Card, Typography, TextField, Button, Avatar, Alert } from "@mui/material";
import ChatMessage from "@/components/admin/ChatMessage";
import PageHeader from "@/components/admin/PageHeader";
import { aiApi } from "@/lib/api/ai";
import type { ChatSessionSummary } from "@/services/ai/types";
import type { Message } from "./types";
import ConversationList from "./ConversationList";

export default function AiAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  const newChat = () => {
    if (isStreaming) return;
    setCurrentSessionId(null);
    setMessages([]);
    setInput("");
  };

  const loadSession = async (id: string) => {
    if (isStreaming || id === currentSessionId) return;
    try {
      const detail = await aiApi.getSession(id);
      setCurrentSessionId(detail.id);
      setMessages(detail.messages);
    } catch {
      /* ignore — likely deleted elsewhere */
    }
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
        setCurrentSessionId(sid);
      } catch {
        sid = null; // persistence unavailable — chat still works in-memory
      }
    }

    const userMsg: Message = { role: "user", content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setIsStreaming(true);
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/admin/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sid, messages: updatedMessages }),
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

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: updated[updated.length - 1].content + chunk,
          };
          return updated;
        });
      }
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Sorry, something went wrong. Please try again.";
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: message };
        return updated;
      });
    } finally {
      setIsStreaming(false);
      refreshSessions();
      checkBudget();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
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
                <Typography variant="caption" color="text.disabled">
                  Shift+Enter for new line · Enter to send
                </Typography>
              </Box>
            )}

            {messages.map((msg, i) => (
              <ChatMessage
                key={i}
                role={msg.role}
                content={msg.content}
                isStreaming={isStreaming && i === messages.length - 1 && msg.role === "assistant"}
              />
            ))}
            <div ref={messagesEndRef} />
          </Box>

          {/* Input row */}
          <Box
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
              placeholder={blocked ? "AI budget reached — chat paused" : "Ask a question…"}
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
        </Box>
      </Card>
    </Box>
  );
}
