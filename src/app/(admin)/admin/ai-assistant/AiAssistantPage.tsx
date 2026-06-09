"use client";

import { useRef, useState, useEffect } from "react";
import { Sparkles, Send } from "lucide-react";
import {
  Box, Card, Typography, TextField, Button, Avatar, IconButton,
} from "@mui/material";
import ChatMessage from "@/components/admin/ChatMessage";
import PageHeader from "@/components/admin/PageHeader";
import type { Message } from "./types";

export default function AiAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

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
        body: JSON.stringify({ messages: updatedMessages }),
      });

      if (!res.ok || !res.body) throw new Error("Failed to get response");

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
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
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
        height: "calc(100vh - 64px - 64px)",
        minHeight: 400,
      }}
    >
      <PageHeader title="AI Assistant" subtitle="Powered by Claude Sonnet 4" />

      <Card sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
        {/* Messages area */}
        <Box
          sx={{
            flex: 1,
            overflow: "auto",
            p: 2.5,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            "&::-webkit-scrollbar": { width: 4 },
            "&::-webkit-scrollbar-thumb": {
              bgcolor: "rgba(231,227,252,0.1)",
              borderRadius: 2,
            },
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
            maxRows={4}
            fullWidth
            size="small"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question…"
            disabled={isStreaming}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
              },
            }}
          />
          <Button
            variant="contained"
            onClick={sendMessage}
            disabled={!input.trim() || isStreaming}
            sx={{
              minWidth: 44,
              width: 44,
              height: 40,
              p: 0,
              borderRadius: 2,
              flexShrink: 0,
            }}
          >
            <Send size={18} />
          </Button>
        </Box>
      </Card>
    </Box>
  );
}
