import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type {
  Message,
  MessageUsage,
  PendingActionState,
} from "@/app/(admin)/admin/ai-assistant/types";

/**
 * In-memory state for the AI Assistant chat. Lives in the store (not the page
 * component) so the active thread — messages plus the tool badges, token usage,
 * and approval cards rendered against them — survives navigation between admin
 * pages. Nothing here is persisted to the database; sessions are reloaded from
 * the server when one is explicitly opened.
 */
interface AiChatState {
  messages: Message[];
  currentSessionId: string | null;
  isStreaming: boolean;
}

const initialState: AiChatState = {
  messages: [],
  currentSessionId: null,
  isStreaming: false,
};

/** Returns the last message, or undefined when the thread is empty. */
function lastMessage(state: AiChatState): Message | undefined {
  return state.messages[state.messages.length - 1];
}

const aiChatSlice = createSlice({
  name: "aiChat",
  initialState,
  reducers: {
    /** Start a fresh thread (clears messages and detaches from any session). */
    newChat(state) {
      state.messages = [];
      state.currentSessionId = null;
      state.isStreaming = false;
    },
    setCurrentSessionId(state, action: PayloadAction<string | null>) {
      state.currentSessionId = action.payload;
    },
    /** Replace the whole thread with a session loaded from the server. */
    loadSession(state, action: PayloadAction<{ id: string; messages: Message[] }>) {
      state.currentSessionId = action.payload.id;
      state.messages = action.payload.messages;
    },
    setStreaming(state, action: PayloadAction<boolean>) {
      state.isStreaming = action.payload;
    },
    addMessage(state, action: PayloadAction<Message>) {
      state.messages.push(action.payload);
    },
    /** Append streamed text (or an inline error) to the last message. */
    appendToLastContent(state, action: PayloadAction<string>) {
      const last = lastMessage(state);
      if (last) last.content += action.payload;
    },
    /** Record a tool the assistant called, shown as a badge on the message. */
    addToolToLast(state, action: PayloadAction<string>) {
      const last = lastMessage(state);
      if (last) last.tools = [...(last.tools ?? []), action.payload];
    },
    /** Attach a proposed write awaiting approval to the last message. */
    addPendingActionToLast(state, action: PayloadAction<PendingActionState>) {
      const last = lastMessage(state);
      if (last) last.pendingActions = [...(last.pendingActions ?? []), action.payload];
    },
    setUsageOnLast(state, action: PayloadAction<MessageUsage>) {
      const last = lastMessage(state);
      if (last) last.usage = action.payload;
    },
    /** Replace the last message wholesale (used on a failed turn). */
    replaceLastMessage(state, action: PayloadAction<Message>) {
      if (state.messages.length > 0) state.messages[state.messages.length - 1] = action.payload;
    },
    /** Drop the last message — used to pop a failed assistant turn before a retry. */
    popLastMessage(state) {
      state.messages.pop();
    },
    /** Mark the last assistant message as stopped — keeps its partial content. */
    markLastStopped(state) {
      const last = lastMessage(state);
      if (last) last.stopped = true;
    },
    /** Patch a single pending action's approval lifecycle by message + action id. */
    patchAction(
      state,
      action: PayloadAction<{
        msgIndex: number;
        actionId: string;
        patch: Partial<PendingActionState>;
      }>
    ) {
      const { msgIndex, actionId, patch } = action.payload;
      const msg = state.messages[msgIndex];
      const target = msg?.pendingActions?.find((a) => a.id === actionId);
      if (target) Object.assign(target, patch);
    },
  },
});

export const {
  newChat,
  setCurrentSessionId,
  loadSession,
  setStreaming,
  addMessage,
  appendToLastContent,
  addToolToLast,
  addPendingActionToLast,
  setUsageOnLast,
  replaceLastMessage,
  popLastMessage,
  markLastStopped,
  patchAction,
} = aiChatSlice.actions;

export const aiChatReducer = aiChatSlice.reducer;
