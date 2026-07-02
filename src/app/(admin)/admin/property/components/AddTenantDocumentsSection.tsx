import type { RefObject } from "react";
import { Box, Button, Divider, IconButton, Typography } from "@mui/material";
import { X } from "lucide-react";

interface AddTenantDocumentsSectionProps {
  fileInputRef: RefObject<HTMLInputElement | null>;
  pendingFiles: File[];
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
}

export default function AddTenantDocumentsSection({
  fileInputRef,
  pendingFiles,
  onAddFiles,
  onRemoveFile,
}: AddTenantDocumentsSectionProps) {
  return (
    <Box>
      <Divider sx={{ mb: 1.5 }} />
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
        Documents (optional — uploaded after tenant is saved)
      </Typography>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
        style={{ display: "none" }}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          onAddFiles(files);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }}
      />
      <Button
        variant="outlined"
        size="small"
        onClick={() => fileInputRef.current?.click()}
        sx={{ fontSize: "0.75rem", mb: pendingFiles.length > 0 ? 1 : 0 }}
      >
        Select Files
      </Button>
      {pendingFiles.length > 0 && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          {pendingFiles.map((f, i) => (
            <Box
              key={i}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                bgcolor: "action.hover",
                px: 1,
                py: 0.5,
                borderRadius: 1,
              }}
            >
              <Typography
                variant="caption"
                sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}
              >
                {f.name}
              </Typography>
              <IconButton size="small" onClick={() => onRemoveFile(i)}>
                <X size={12} />
              </IconButton>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
