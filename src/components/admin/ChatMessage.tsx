import { useState } from "react";
import { Box, Typography, Avatar, IconButton, Tooltip, Button } from "@mui/material";
import { Sparkles, Copy, Check, RefreshCw, AlertTriangle } from "lucide-react";
import Markdown from "@/components/admin/Markdown";
import PendingActionCard from "@/components/admin/PendingActionCard";
import type { PendingActionState, MessageAttachment } from "@/app/(admin)/admin/ai-assistant/types";

interface MessageUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreateTokens: number;
  cost: number;
}

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  usage?: MessageUsage;
  tools?: string[];
  pendingActions?: PendingActionState[];
  actionsDisabled?: boolean;
  onApproveAction?: (id: string) => void;
  onCancelAction?: (id: string) => void;
  /** Failed turn — when set, shows the error and a Retry button. */
  error?: string;
  /** Stream was stopped by the user — partial content stays, but no error. */
  stopped?: boolean;
  onRetry?: () => void;
  attachments?: MessageAttachment[];
}

export default function ChatMessage({
  role,
  content,
  isStreaming,
  usage,
  tools,
  pendingActions,
  actionsDisabled,
  onApproveAction,
  onCancelAction,
  error,
  stopped,
  onRetry,
  attachments,
}: ChatMessageProps) {
  const isUser = role === "user";
  const [copied, setCopied] = useState(false);
  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — ignore */
    }
  };
  const showAssistantToolbar = !isUser && !isStreaming && content.length > 0;

  return (
    <Box
      sx={{
        display: "flex",
        gap: 1.5,
        flexDirection: isUser ? "row-reverse" : "row",
        alignItems: "flex-start",
        "&:hover .msg-actions": { opacity: 1 },
      }}
    >
      <Avatar
        sx={{
          width: 30,
          height: 30,
          flexShrink: 0,
          mt: 0.25,
          fontSize: "0.75rem",
          fontWeight: 700,
          bgcolor: isUser ? "primary.main" : "rgba(115,103,240,0.12)",
          color: isUser ? "#fff" : "primary.main",
          border: isUser ? "none" : "1px solid rgba(115,103,240,0.3)",
        }}
      >
        {isUser ? "S" : <Sparkles size={14} />}
      </Avatar>

      <Box
        sx={{
          maxWidth: "75%",
          px: 2,
          py: 1.5,
          borderRadius: isUser ? "12px 2px 12px 12px" : "2px 12px 12px 12px",
          bgcolor: isUser ? "rgba(115,103,240,0.15)" : "rgba(255,255,255,0.04)",
          border: "1px solid",
          borderColor: isUser ? "rgba(115,103,240,0.25)" : "rgba(231,227,252,0.08)",
        }}
      >
        {isUser ? (
          <Box>
            {attachments && attachments.length > 0 && (
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 0.75,
                  mb: content ? 1 : 0,
                }}
              >
                {attachments.map((att) => (
                  <a
                    key={att.url}
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: "block", lineHeight: 0 }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={att.url}
                      alt="attachment"
                      style={{
                        maxWidth: 240,
                        maxHeight: 240,
                        borderRadius: 8,
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    />
                  </a>
                ))}
              </Box>
            )}
            {content && (
              <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.65 }}>
                {content}
              </Typography>
            )}
          </Box>
        ) : (
          <Box>
            {tools && tools.length > 0 && (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 1.25 }}>
                {tools.map((name, i) => (
                  <Box
                    key={`${name}-${i}`}
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 0.5,
                      px: 0.75,
                      py: 0.25,
                      borderRadius: "4px",
                      bgcolor: "rgba(115,103,240,0.08)",
                      border: "1px solid rgba(115,103,240,0.2)",
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        color: "primary.main",
                        fontFamily: "monospace",
                        fontSize: "0.68rem",
                        opacity: 0.85,
                      }}
                    >
                      ƒ {name}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
            {content.length > 0 && <Markdown content={content} />}
            {error && (
              <Box
                sx={{
                  mt: content ? 1.25 : 0,
                  px: 1.25,
                  py: 1,
                  borderRadius: 1.5,
                  bgcolor: "rgba(234,84,85,0.08)",
                  border: "1px solid rgba(234,84,85,0.3)",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 1,
                }}
              >
                <AlertTriangle size={14} color="#ea5455" style={{ marginTop: 2, flexShrink: 0 }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant="caption"
                    sx={{ color: "error.main", display: "block", lineHeight: 1.5 }}
                  >
                    {error}
                  </Typography>
                </Box>
                {onRetry && (
                  <Button
                    size="small"
                    startIcon={<RefreshCw size={12} />}
                    onClick={onRetry}
                    sx={{ minHeight: 24, fontSize: "0.72rem", flexShrink: 0 }}
                  >
                    Retry
                  </Button>
                )}
              </Box>
            )}
            {stopped && !error && (
              <Typography
                variant="caption"
                color="text.disabled"
                sx={{ display: "block", mt: 0.75, fontStyle: "italic" }}
              >
                Stopped
              </Typography>
            )}
            {isStreaming && (
              <Box
                component="span"
                sx={{
                  display: "inline-block",
                  width: 4,
                  height: 16,
                  ml: 0.5,
                  bgcolor: "primary.main",
                  verticalAlign: "text-bottom",
                  borderRadius: "1px",
                  animation: "pulse 1s ease-in-out infinite",
                  "@keyframes pulse": {
                    "0%, 100%": { opacity: 1 },
                    "50%": { opacity: 0.3 },
                  },
                }}
              />
            )}
            {pendingActions?.map((action) => (
              <PendingActionCard
                key={action.id}
                action={action}
                disabled={actionsDisabled}
                onApprove={(id) => onApproveAction?.(id)}
                onCancel={(id) => onCancelAction?.(id)}
              />
            ))}
            {showAssistantToolbar && (
              <Box
                className="msg-actions"
                sx={{
                  mt: 1,
                  display: "flex",
                  gap: 0.25,
                  opacity: 0,
                  transition: "opacity 0.15s",
                }}
              >
                <Tooltip title={copied ? "Copied" : "Copy"} placement="top">
                  <IconButton
                    size="small"
                    onClick={copyText}
                    sx={{ width: 24, height: 24, color: "text.secondary" }}
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                  </IconButton>
                </Tooltip>
              </Box>
            )}
            {!isStreaming && usage && (
              <Box
                sx={{
                  mt: 1.5,
                  pt: 1,
                  borderTop: "1px solid",
                  borderColor: "rgba(231,227,252,0.08)",
                }}
              >
                <Typography
                  variant="caption"
                  component="p"
                  sx={{
                    color: "text.disabled",
                    fontStyle: "italic",
                    lineHeight: 1.6,
                    letterSpacing: "0.015em",
                  }}
                >
                  in {usage.inputTokens.toLocaleString()} ·{" "}
                  {usage.cacheReadTokens + usage.cacheCreateTokens > 0 && (
                    <>
                      cached {(usage.cacheReadTokens + usage.cacheCreateTokens).toLocaleString()}{" "}
                      ·{" "}
                    </>
                  )}
                  out {usage.outputTokens.toLocaleString()} · Σ{" "}
                  {(
                    usage.inputTokens +
                    usage.cacheReadTokens +
                    usage.cacheCreateTokens +
                    usage.outputTokens
                  ).toLocaleString()}{" "}
                  tokens · ≈ $
                  {usage.cost < 0.0001
                    ? usage.cost.toFixed(6)
                    : usage.cost < 0.001
                      ? usage.cost.toFixed(5)
                      : usage.cost.toFixed(4)}
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}
