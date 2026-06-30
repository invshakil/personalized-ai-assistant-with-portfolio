import { Box, IconButton, Typography } from "@mui/material";
import { X } from "lucide-react";
import type { MessageAttachment } from "../types";

interface AttachmentPreviewBarProps {
  attachments: MessageAttachment[];
  uploading: boolean;
  error: string | null;
  onRemove: (url: string) => void;
}

export default function AttachmentPreviewBar({
  attachments,
  uploading,
  error,
  onRemove,
}: AttachmentPreviewBarProps) {
  if (attachments.length === 0 && !uploading && !error) return null;

  return (
    <Box
      sx={{
        px: 2,
        pt: 1.25,
        borderTop: "1px solid",
        borderColor: "divider",
        display: "flex",
        alignItems: "center",
        gap: 1,
        flexWrap: "wrap",
      }}
    >
      {attachments.map((att) => (
        <Box
          key={att.url}
          sx={{
            position: "relative",
            width: 56,
            height: 56,
            borderRadius: 1,
            overflow: "hidden",
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "background.default",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={att.url}
            alt="attachment preview"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
          <IconButton
            size="small"
            aria-label="Remove attachment"
            onClick={() => onRemove(att.url)}
            sx={{
              position: "absolute",
              top: 2,
              right: 2,
              width: 18,
              height: 18,
              bgcolor: "rgba(0,0,0,0.6)",
              color: "#fff",
              "&:hover": { bgcolor: "rgba(0,0,0,0.8)" },
            }}
          >
            <X size={10} />
          </IconButton>
        </Box>
      ))}
      {uploading && (
        <Typography variant="caption" color="text.secondary">
          Uploading…
        </Typography>
      )}
      {error && (
        <Typography variant="caption" color="error.main">
          {error}
        </Typography>
      )}
    </Box>
  );
}
