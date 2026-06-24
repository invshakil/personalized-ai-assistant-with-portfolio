"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Typography,
  Button,
  IconButton,
  Tooltip,
  Chip,
  CircularProgress,
  LinearProgress,
  Alert,
} from "@mui/material";
import { FileUp, FileDown, Trash2, File, FileImage, FileText, Eye } from "lucide-react";
import { propertyApi } from "@/lib/api/property";

type Doc = {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  label: string | null;
  uploadedAt: string;
};

function fileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return <FileImage size={15} />;
  if (mimeType === "application/pdf") return <FileText size={15} />;
  return <File size={15} />;
}

// Types the browser can render natively in a new tab.
function canPreview(mimeType: string) {
  return mimeType.startsWith("image/") || mimeType === "application/pdf";
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  tenantId: string;
  /** When true, shows a compact layout suited for drawers */
  compact?: boolean;
}

export default function TenantDocuments({ tenantId, compact = false }: Props) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    try {
      setDocs(((await propertyApi.listTenantDocuments(tenantId)) as Doc[]) ?? []);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      Array.from(files).forEach((f) => formData.append("files", f));
      await propertyApi.uploadTenantDocuments(tenantId, formData);
      await fetchDocs();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDelete = async (docId: string) => {
    setDeletingId(docId);
    try {
      await propertyApi.deleteTenantDocument(tenantId, docId);
      setDocs((prev) => prev.filter((d) => d.id !== docId));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Box>
      {!compact && (
        <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600, mb: 1.5 }}>
          Documents
        </Typography>
      )}

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 1.5, fontSize: "0.8rem" }}>
          {error}
        </Alert>
      )}

      {uploading && <LinearProgress sx={{ mb: 1.5, borderRadius: 1 }} />}

      {/* Upload button */}
      <Box sx={{ mb: 1.5 }}>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
          style={{ display: "none" }}
          onChange={(e) => handleFiles(e.target.files)}
        />
        <Button
          variant="outlined"
          size="small"
          startIcon={<FileUp size={14} />}
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          sx={{ fontSize: "0.8rem" }}
        >
          {uploading ? "Uploading…" : "Upload Files"}
        </Button>
        <Typography variant="caption" color="text.secondary" sx={{ ml: 1.5 }}>
          PDF, images, Word · max 10 MB each
        </Typography>
      </Box>

      {/* Document list */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
          <CircularProgress size={20} />
        </Box>
      ) : docs.length === 0 ? (
        <Typography variant="caption" color="text.secondary">
          No documents uploaded yet
        </Typography>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
          {docs.map((doc) => (
            <Box
              key={doc.id}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                p: 1,
                borderRadius: 1,
                bgcolor: "action.hover",
                "&:hover": { bgcolor: "action.selected" },
              }}
            >
              <Box sx={{ color: "text.secondary", flexShrink: 0 }}>{fileIcon(doc.mimeType)}</Box>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 600,
                    display: "block",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {doc.fileName}
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.75,
                    mt: 0.25,
                    flexWrap: "wrap",
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    {fmtSize(doc.size)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    ·
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(doc.uploadedAt).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </Typography>
                  {doc.label && (
                    <Chip
                      label={doc.label}
                      size="small"
                      variant="outlined"
                      sx={{ height: 16, fontSize: "0.6rem" }}
                    />
                  )}
                </Box>
              </Box>

              <Box sx={{ display: "flex", gap: 0.25, flexShrink: 0 }}>
                {canPreview(doc.mimeType) && (
                  <Tooltip title="Preview">
                    <IconButton
                      size="small"
                      color="primary"
                      component="a"
                      href={`/api/admin/property/tenants/${tenantId}/documents/${doc.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Eye size={14} />
                    </IconButton>
                  </Tooltip>
                )}
                <Tooltip title="Download">
                  <IconButton
                    size="small"
                    color="primary"
                    component="a"
                    href={`/api/admin/property/tenants/${tenantId}/documents/${doc.id}?download=1`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <FileDown size={14} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete">
                  <IconButton
                    size="small"
                    color="error"
                    disabled={deletingId === doc.id}
                    onClick={() => handleDelete(doc.id)}
                  >
                    {deletingId === doc.id ? <CircularProgress size={12} /> : <Trash2 size={14} />}
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
