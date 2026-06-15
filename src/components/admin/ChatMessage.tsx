import { Box, Typography, Avatar } from "@mui/material";
import { Sparkles } from "lucide-react";
import Markdown from "@/components/admin/Markdown";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

export default function ChatMessage({ role, content, isStreaming }: ChatMessageProps) {
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
          </Box>
        )}
      </Box>
    </Box>
  );
}
