import { Avatar, Box, Typography } from "@mui/material";
import { Sparkles } from "lucide-react";

export default function ChatEmptyState() {
  return (
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
        Start with <strong>/property</strong>, <strong>/finance</strong>, <strong>/money</strong>,
        or <strong>/solar</strong> to focus the assistant on one module.
      </Typography>
      <Typography variant="caption" color="text.disabled">
        Enter for new line · Ctrl+Enter to send · ⌘K for new chat
      </Typography>
    </Box>
  );
}
