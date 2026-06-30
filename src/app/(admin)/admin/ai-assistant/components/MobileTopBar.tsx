import { Box, Button, IconButton, Typography } from "@mui/material";
import { History } from "lucide-react";

interface MobileTopBarProps {
  title: string;
  isStreaming: boolean;
  onHistoryOpen: () => void;
  onNew: () => void;
}

export default function MobileTopBar({
  title,
  isStreaming,
  onHistoryOpen,
  onNew,
}: MobileTopBarProps) {
  return (
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
        onClick={onHistoryOpen}
        sx={{ color: "text.secondary" }}
      >
        <History size={18} />
      </IconButton>
      <Typography variant="caption" color="text.secondary" noWrap sx={{ flex: 1 }}>
        {title}
      </Typography>
      <Button size="small" onClick={onNew} disabled={isStreaming} sx={{ minWidth: 0 }}>
        New
      </Button>
    </Box>
  );
}
