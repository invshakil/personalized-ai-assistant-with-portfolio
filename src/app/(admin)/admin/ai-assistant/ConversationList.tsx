"use client";

import {
  Box,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  IconButton,
  Typography,
} from "@mui/material";
import { Plus, Trash2, MessageSquare } from "lucide-react";
import type { ChatSessionSummary } from "@/services/ai/types";

interface ConversationListProps {
  sessions: ChatSessionSummary[];
  currentId: string | null;
  disabled: boolean;
  onNew: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  /** When true, fills its parent (for the mobile Drawer) instead of the
   *  fixed-width desktop sidebar that hides itself on small screens. */
  inDrawer?: boolean;
}

export default function ConversationList({
  sessions,
  currentId,
  disabled,
  onNew,
  onSelect,
  onDelete,
  inDrawer = false,
}: ConversationListProps) {
  return (
    <Box
      sx={{
        width: inDrawer ? 260 : 240,
        flexShrink: 0,
        display: inDrawer ? "flex" : { xs: "none", sm: "flex" },
        flexDirection: "column",
        borderRight: inDrawer ? "none" : "1px solid",
        borderColor: "divider",
        minHeight: 0,
        height: inDrawer ? "100%" : undefined,
      }}
    >
      <Box sx={{ p: 1.5 }}>
        <Button
          fullWidth
          variant="outlined"
          size="small"
          startIcon={<Plus size={15} />}
          onClick={onNew}
          disabled={disabled}
          sx={{ justifyContent: "flex-start", fontWeight: 600 }}
        >
          New chat
        </Button>
      </Box>

      <Box sx={{ flex: 1, overflow: "auto", px: 1, pb: 1 }}>
        {sessions.length === 0 ? (
          <Typography variant="caption" color="text.disabled" sx={{ px: 1.5 }}>
            No conversations yet.
          </Typography>
        ) : (
          <List dense disablePadding>
            {sessions.map((s) => (
              <ListItem
                key={s.id}
                disablePadding
                sx={{ mb: 0.25, "&:hover .del-btn": { opacity: 1 } }}
                secondaryAction={
                  <IconButton
                    className="del-btn"
                    edge="end"
                    size="small"
                    aria-label="Delete conversation"
                    onClick={() => onDelete(s.id)}
                    sx={{ opacity: 0, transition: "opacity 0.15s", color: "text.secondary" }}
                  >
                    <Trash2 size={14} />
                  </IconButton>
                }
              >
                <ListItemButton
                  selected={s.id === currentId}
                  onClick={() => onSelect(s.id)}
                  sx={{ borderRadius: 1, py: 0.625, pr: 4 }}
                >
                  <MessageSquare
                    size={14}
                    style={{ marginRight: 8, flexShrink: 0, opacity: 0.7 }}
                  />
                  <ListItemText
                    primary={s.title}
                    slotProps={{
                      primary: {
                        noWrap: true,
                        style: { fontSize: "0.8125rem" },
                      },
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </Box>
    </Box>
  );
}
