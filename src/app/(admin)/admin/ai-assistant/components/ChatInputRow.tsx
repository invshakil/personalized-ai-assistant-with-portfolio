import { Box, Button, IconButton, TextField } from "@mui/material";
import { Mic, MicOff, Paperclip, Send, Square } from "lucide-react";
import type { RefObject } from "react";

interface ChatInputRowProps {
  onWrapRef: (el: HTMLDivElement | null) => void;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  fileInputRef: RefObject<HTMLInputElement | null>;
  value: string;
  onChange: (v: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  onSend: () => void;
  onStop: () => void;
  onAttach: () => void;
  onMic: () => void;
  onFilesSelected: (files: FileList | null) => void;
  isStreaming: boolean;
  blocked: boolean;
  uploading: boolean;
  speechSupported: boolean;
  speechListening: boolean;
  hasContent: boolean;
}

export default function ChatInputRow({
  onWrapRef,
  inputRef,
  fileInputRef,
  value,
  onChange,
  onKeyDown,
  onSend,
  onStop,
  onAttach,
  onMic,
  onFilesSelected,
  isStreaming,
  blocked,
  uploading,
  speechSupported,
  speechListening,
  hasContent,
}: ChatInputRowProps) {
  return (
    <Box ref={onWrapRef} sx={{ p: 2, pt: 1.25, display: "flex", alignItems: "flex-end", gap: 1.5 }}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        multiple
        hidden
        onChange={(e) => onFilesSelected(e.target.files)}
      />
      <IconButton
        aria-label="Attach image"
        onClick={onAttach}
        disabled={isStreaming || blocked || uploading}
        sx={{ width: 40, height: 40, borderRadius: 2, color: "text.secondary", flexShrink: 0 }}
      >
        <Paperclip size={18} />
      </IconButton>
      {speechSupported && (
        <IconButton
          aria-label={speechListening ? "Stop dictation" : "Dictate"}
          onClick={onMic}
          disabled={isStreaming || blocked}
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            color: speechListening ? "error.main" : "text.secondary",
            bgcolor: speechListening ? "rgba(234,84,85,0.12)" : "transparent",
            flexShrink: 0,
            ...(speechListening && {
              animation: "micPulse 1.4s ease-in-out infinite",
              "@keyframes micPulse": {
                "0%, 100%": { boxShadow: "0 0 0 0 rgba(234,84,85,0.5)" },
                "50%": { boxShadow: "0 0 0 6px rgba(234,84,85,0)" },
              },
            }),
          }}
        >
          {speechListening ? <MicOff size={18} /> : <Mic size={18} />}
        </IconButton>
      )}
      <TextField
        multiline
        minRows={1}
        maxRows={12}
        fullWidth
        size="small"
        inputRef={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={
          blocked ? "AI budget reached — chat paused" : "Ask a question…  (/ for commands)"
        }
        disabled={isStreaming || blocked}
        sx={{
          "& .MuiOutlinedInput-root": { borderRadius: 2 },
          "& textarea": { overflow: "hidden" },
        }}
      />
      {isStreaming ? (
        <Button
          variant="contained"
          color="error"
          onClick={onStop}
          aria-label="Stop generating"
          sx={{ minWidth: 44, width: 44, height: 40, p: 0, borderRadius: 2, flexShrink: 0 }}
        >
          <Square size={16} fill="#fff" />
        </Button>
      ) : (
        <Button
          variant="contained"
          onClick={onSend}
          disabled={!hasContent || blocked}
          aria-label="Send message"
          sx={{ minWidth: 44, width: 44, height: 40, p: 0, borderRadius: 2, flexShrink: 0 }}
        >
          <Send size={18} />
        </Button>
      )}
    </Box>
  );
}
