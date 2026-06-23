"use client";

import { useMemo, useState } from "react";
import {
  Box,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  IconButton,
  Typography,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
} from "@mui/material";
import { Plus, Trash2, MessageSquare, Search, MoreVertical, Pencil, X } from "lucide-react";
import type { ChatSessionSummary } from "@/services/ai/types";

interface ConversationListProps {
  sessions: ChatSessionSummary[];
  currentId: string | null;
  disabled: boolean;
  onNew: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => Promise<void> | void;
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
  onRename,
  inDrawer = false,
}: ConversationListProps) {
  const [query, setQuery] = useState("");
  const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement; id: string } | null>(null);
  // The row currently being renamed inline. Editing UI replaces the row's label
  // until the user commits (Enter) or cancels (Esc / blur with empty value).
  const [renaming, setRenaming] = useState<{ id: string; draft: string } | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((s) => s.title.toLowerCase().includes(q));
  }, [sessions, query]);

  const startRename = (s: ChatSessionSummary) => {
    setMenuAnchor(null);
    setRenaming({ id: s.id, draft: s.title });
  };

  const commitRename = async () => {
    if (!renaming) return;
    const next = renaming.draft.trim();
    const original = sessions.find((s) => s.id === renaming.id)?.title ?? "";
    setRenaming(null);
    if (!next || next === original) return;
    await onRename(renaming.id, next);
  };

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
      <Box sx={{ p: 1.5, display: "flex", flexDirection: "column", gap: 1 }}>
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
        <TextField
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search conversations…"
          size="small"
          fullWidth
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={14} />
                </InputAdornment>
              ),
              endAdornment: query ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setQuery("")}>
                    <X size={12} />
                  </IconButton>
                </InputAdornment>
              ) : undefined,
            },
          }}
          sx={{
            "& .MuiInputBase-root": { fontSize: "0.8125rem" },
            "& .MuiOutlinedInput-input": { py: 0.75 },
          }}
        />
      </Box>

      <Box sx={{ flex: 1, overflow: "auto", px: 1, pb: 1 }}>
        {filtered.length === 0 ? (
          <Typography variant="caption" color="text.disabled" sx={{ px: 1.5 }}>
            {sessions.length === 0 ? "No conversations yet." : `No matches for “${query.trim()}”.`}
          </Typography>
        ) : (
          <List dense disablePadding>
            {filtered.map((s) => {
              const isRenaming = renaming?.id === s.id;
              return (
                <ListItem
                  key={s.id}
                  disablePadding
                  sx={{ mb: 0.25, "&:hover .row-actions": { opacity: 1 } }}
                  secondaryAction={
                    !isRenaming && (
                      <IconButton
                        className="row-actions"
                        edge="end"
                        size="small"
                        aria-label="More"
                        onClick={(e) => setMenuAnchor({ el: e.currentTarget, id: s.id })}
                        sx={{ opacity: 0, transition: "opacity 0.15s", color: "text.secondary" }}
                      >
                        <MoreVertical size={14} />
                      </IconButton>
                    )
                  }
                >
                  {isRenaming ? (
                    <Box sx={{ px: 1, py: 0.5, width: "100%" }}>
                      <TextField
                        autoFocus
                        fullWidth
                        size="small"
                        value={renaming.draft}
                        onChange={(e) =>
                          setRenaming((r) => (r ? { ...r, draft: e.target.value } : r))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            commitRename();
                          } else if (e.key === "Escape") {
                            e.preventDefault();
                            setRenaming(null);
                          }
                        }}
                        onBlur={commitRename}
                        sx={{
                          "& .MuiInputBase-root": { fontSize: "0.8125rem" },
                          "& .MuiOutlinedInput-input": { py: 0.5 },
                        }}
                      />
                    </Box>
                  ) : (
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
                  )}
                </ListItem>
              );
            })}
          </List>
        )}
      </Box>

      <Menu
        open={!!menuAnchor}
        anchorEl={menuAnchor?.el ?? null}
        onClose={() => setMenuAnchor(null)}
        slotProps={{ list: { dense: true } }}
      >
        <MenuItem
          onClick={() => {
            const s = sessions.find((x) => x.id === menuAnchor?.id);
            if (s) startRename(s);
          }}
        >
          <Pencil size={13} style={{ marginRight: 8 }} />
          Rename
        </MenuItem>
        <MenuItem
          onClick={() => {
            const id = menuAnchor?.id;
            setMenuAnchor(null);
            if (id) onDelete(id);
          }}
          sx={{ color: "error.main" }}
        >
          <Trash2 size={13} style={{ marginRight: 8 }} />
          Delete
        </MenuItem>
      </Menu>
    </Box>
  );
}
