import { aiApi } from "@/lib/api/ai";
import { useRef, useState } from "react";
import type { MessageAttachment } from "../types";

export function useAttachments() {
  const [pendingAttachments, setPendingAttachments] = useState<MessageAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadError(null);
    const uploaded: MessageAttachment[] = [];
    try {
      for (const file of Array.from(files)) {
        const res = await aiApi.uploadAttachment(file);
        uploaded.push({ url: res.url, mimeType: res.mimeType });
      }
      setPendingAttachments((prev) => [...prev, ...uploaded]);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removePendingAttachment = (url: string) =>
    setPendingAttachments((prev) => prev.filter((a) => a.url !== url));

  const clearAttachments = () => setPendingAttachments([]);
  const clearError = () => setUploadError(null);

  return {
    pendingAttachments,
    uploading,
    uploadError,
    fileInputRef,
    handleFiles,
    removePendingAttachment,
    clearAttachments,
    clearError,
  };
}
