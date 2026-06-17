import { Box, Typography, Avatar } from "@mui/material";
import { Sparkles } from "lucide-react";
import Markdown from "@/components/admin/Markdown";

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
}

export default function ChatMessage({
  role,
  content,
  isStreaming,
  usage,
  tools,
}: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <Box
      sx={{
        display: "flex",
        gap: 1.5,
        flexDirection: isUser ? "row-reverse" : "row",
        alignItems: "flex-start",
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
          <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.65 }}>
            {content}
          </Typography>
        ) : (
          <Box>
            {tools && tools.length > 0 && (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 1.25 }}>
                {tools.map((name) => (
                  <Box
                    key={name}
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
            <Markdown content={content} />
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
                  in {usage.inputTokens.toLocaleString()} · out{" "}
                  {usage.outputTokens.toLocaleString()} · Σ{" "}
                  {(usage.inputTokens + usage.outputTokens).toLocaleString()} tokens · ≈ $
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
