"use client";

import PageHeader from "@/components/admin/PageHeader";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { Alert, Box, Card, Drawer } from "@mui/material";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ConversationList from "./ConversationList";
import { SLASH_TYPING_RE } from "./commands";
import AttachmentPreviewBar from "./components/AttachmentPreviewBar";
import ChatInputRow from "./components/ChatInputRow";
import ChatMessageList from "./components/ChatMessageList";
import DesktopBreadcrumb from "./components/DesktopBreadcrumb";
import InputStatusBar from "./components/InputStatusBar";
import LongThreadAlert from "./components/LongThreadAlert";
import MicPermissionDialog from "./components/MicPermissionDialog";
import MobileTopBar from "./components/MobileTopBar";
import SlashCommandMenu from "./components/SlashCommandMenu";
import { useAttachments } from "./hooks/useAttachments";
import { useChatSession } from "./hooks/useChatSession";
import { useChatStream } from "./hooks/useChatStream";
import { useInputAutoGrow } from "./hooks/useInputAutoGrow";
import { usePendingActions } from "./hooks/usePendingActions";
import { useSidebarResize } from "./hooks/useSidebarResize";
import { useSlashCommands } from "./hooks/useSlashCommands";

const LONG_THREAD_TOKENS = 60_000;

const SCOPE_RE = /^\/(property|finance|money|solar)\b\s*/i;
function parseScope(text: string): string {
  const m = text.match(SCOPE_RE);
  return m ? m[1].toLowerCase() : "all";
}

export default function AiAssistantPage() {
  const messages = useAppSelector((s) => s.aiChat.messages);
  const isStreaming = useAppSelector((s) => s.aiChat.isStreaming);

  const [input, setInput] = useState("");
  const [micHelpOpen, setMicHelpOpen] = useState(false);
  const [inputWrapEl, setInputWrapEl] = useState<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  // ── Hooks ───────────────────────────────────────────────────────────────────
  const { sidebarWidth, beginSidebarResize } = useSidebarResize();
  const attachments = useAttachments();
  const slashCommands = useSlashCommands(input, setInput, isStreaming, false);

  const session = useChatSession({
    onNewChat: () => setInput(""),
  });

  const { sendMessage, retryLastTurn, stopStreaming } = useChatStream({
    input,
    setInput,
    blocked: session.blocked,
    pendingAttachments: attachments.pendingAttachments,
    clearPendingAttachments: attachments.clearAttachments,
    clearUploadError: attachments.clearError,
    refreshSessions: session.refreshSessions,
    checkBudget: session.checkBudget,
  });

  const pendingActions = usePendingActions({ isStreaming, blocked: session.blocked });
  useInputAutoGrow(inputTextareaRef, input);

  const speech = useSpeechRecognition({
    onFinal: (text) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      setInput((prev) => (prev ? `${prev.replace(/\s+$/, "")} ${trimmed}` : trimmed));
    },
  });

  // ── Effects ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const { newChat } = session;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        newChat(); // internally guards against streaming + clears input via onNewChat
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [newChat]);

  // ── Derived state ────────────────────────────────────────────────────────────
  const activeScope = useMemo(() => parseScope(input), [input]);
  const threadInputTokens = useMemo(
    () => messages.reduce((sum, m) => sum + (m.usage?.inputTokens ?? 0), 0),
    [messages]
  );
  const currentSessionTitle = session.currentSessionId
    ? (session.sessions.find((s) => s.id === session.currentSessionId)?.title ?? "Conversation")
    : "New chat";
  const hasAttachmentBar =
    attachments.pendingAttachments.length > 0 || attachments.uploading || !!attachments.uploadError;

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const onMicClick = useCallback(() => {
    if (speech.listening) {
      speech.stop();
      return;
    }
    if (speech.permissionState === "denied") {
      setMicHelpOpen(true);
      return;
    }
    speech.start();
  }, [speech]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (slashCommands.open) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        slashCommands.setIndex((i) => (i + 1) % slashCommands.matches.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        slashCommands.setIndex(
          (i) => (i - 1 + slashCommands.matches.length) % slashCommands.matches.length
        );
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        slashCommands.apply(slashCommands.matches[slashCommands.index].cmd);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setInput("");
        return;
      }
    }
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: { xs: "calc(100vh - 64px - 32px)", md: "calc(100vh - 64px - 64px)" },
        minHeight: 400,
      }}
    >
      <PageHeader
        title="AI Assistant"
        subtitle="Ask about your finances, property, money manager, or anything else."
      />

      {session.blocked && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Monthly AI budget reached — the chat is paused. Raise or turn off the limit in{" "}
          <strong>Settings → AI</strong> to continue.
        </Alert>
      )}

      <Card sx={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
        <ConversationList
          sessions={session.sessions}
          currentId={session.currentSessionId}
          disabled={isStreaming}
          onNew={session.newChat}
          onSelect={session.loadSession}
          onDelete={session.deleteSession}
          onRename={session.renameSessionTitle}
          width={sidebarWidth}
          onResizeStart={beginSidebarResize}
        />

        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, minWidth: 0 }}>
          <MobileTopBar
            title={currentSessionTitle}
            isStreaming={isStreaming}
            onHistoryOpen={() => session.setHistoryOpen(true)}
            onNew={session.newChat}
          />
          <DesktopBreadcrumb title={currentSessionTitle} />
          <ChatMessageList
            messages={messages}
            isStreaming={isStreaming}
            messagesEndRef={messagesEndRef}
            onApproveAction={pendingActions.approveAction}
            onCancelAction={pendingActions.cancelAction}
            onApproveAll={pendingActions.approveAllActions}
            onRetry={retryLastTurn}
          />
          {threadInputTokens >= LONG_THREAD_TOKENS && !session.blocked && (
            <LongThreadAlert
              tokenCount={threadInputTokens}
              isStreaming={isStreaming}
              onNewChat={session.newChat}
            />
          )}
          <AttachmentPreviewBar
            attachments={attachments.pendingAttachments}
            uploading={attachments.uploading}
            error={attachments.uploadError}
            onRemove={attachments.removePendingAttachment}
          />
          <InputStatusBar
            scope={activeScope}
            provider={session.activeProvider}
            speechListening={speech.listening}
            speechError={speech.error}
            hasTopBorder={!hasAttachmentBar}
          />
          <ChatInputRow
            onWrapRef={setInputWrapEl}
            inputRef={inputTextareaRef}
            fileInputRef={attachments.fileInputRef}
            value={input}
            onChange={setInput}
            onKeyDown={handleKeyDown}
            onSend={sendMessage}
            onStop={stopStreaming}
            onAttach={() => attachments.fileInputRef.current?.click()}
            onMic={onMicClick}
            onFilesSelected={attachments.handleFiles}
            isStreaming={isStreaming}
            blocked={session.blocked}
            uploading={attachments.uploading}
            speechSupported={speech.supported}
            speechListening={speech.listening}
            hasContent={!!(input.trim() || attachments.pendingAttachments.length > 0)}
          />
          <SlashCommandMenu
            anchorEl={inputWrapEl}
            open={slashCommands.open}
            matches={slashCommands.matches}
            selectedIndex={slashCommands.index}
            onSelect={slashCommands.apply}
            onHover={slashCommands.setIndex}
            onClose={() => slashCommands.setIndex(0)}
          />
        </Box>
      </Card>

      <MicPermissionDialog
        open={micHelpOpen}
        onClose={() => setMicHelpOpen(false)}
        onRetry={async () => {
          await speech.refreshPermission();
          if (speech.permissionState !== "denied") {
            setMicHelpOpen(false);
            speech.start();
          }
        }}
      />

      <Drawer
        anchor="left"
        open={session.historyOpen}
        onClose={() => session.setHistoryOpen(false)}
        sx={{ display: { xs: "block", sm: "none" } }}
        slotProps={{ paper: { sx: { bgcolor: "background.paper" } } }}
      >
        <ConversationList
          inDrawer
          sessions={session.sessions}
          currentId={session.currentSessionId}
          disabled={isStreaming}
          onNew={session.newChat}
          onSelect={session.loadSession}
          onDelete={session.deleteSession}
          onRename={session.renameSessionTitle}
        />
      </Drawer>
    </Box>
  );
}
