import ChatMessage from "@/components/admin/ChatMessage";
import { Box } from "@mui/material";
import type { RefObject } from "react";
import type { Message } from "../types";
import ChatEmptyState from "./ChatEmptyState";
import SystemNotice from "./SystemNotice";

interface ChatMessageListProps {
  messages: Message[];
  isStreaming: boolean;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  onApproveAction: (msgIndex: number, actionId: string) => void;
  onCancelAction: (msgIndex: number, actionId: string) => void;
  onApproveAll: (msgIndex: number) => void;
  onRetry?: () => void;
}

export default function ChatMessageList({
  messages,
  isStreaming,
  messagesEndRef,
  onApproveAction,
  onCancelAction,
  onApproveAll,
  onRetry,
}: ChatMessageListProps) {
  return (
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
      {messages.length === 0 && <ChatEmptyState />}

      {messages.map((msg, i) =>
        msg.role === "system" ? (
          <SystemNotice key={i} content={msg.content} />
        ) : (
          <ChatMessage
            key={i}
            role={msg.role}
            content={msg.content}
            usage={msg.usage}
            tools={msg.tools}
            pendingActions={msg.pendingActions}
            actionsDisabled={isStreaming}
            onApproveAction={(id) => onApproveAction(i, id)}
            onCancelAction={(id) => onCancelAction(i, id)}
            onApproveAll={() => onApproveAll(i)}
            isStreaming={isStreaming && i === messages.length - 1 && msg.role === "assistant"}
            error={msg.error}
            stopped={msg.stopped}
            onRetry={
              msg.error && i === messages.length - 1 && msg.role === "assistant"
                ? onRetry
                : undefined
            }
            attachments={msg.attachments}
          />
        )
      )}
      <div ref={messagesEndRef} />
    </Box>
  );
}
