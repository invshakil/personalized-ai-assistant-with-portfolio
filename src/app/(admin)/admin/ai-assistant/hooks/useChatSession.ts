import { aiApi } from "@/lib/api/ai";
import type { ChatSessionSummary, ProviderConfigView } from "@/services/ai/types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  loadSession as loadSessionAction,
  newChat as newChatAction,
} from "@/store/slices/aiChatSlice";
import { useCallback, useEffect, useRef, useState } from "react";

const LAST_SESSION_KEY = "ai-chat:last-session";

interface UseChatSessionOptions {
  /** Called whenever newChat() fires — use to clear local input state. */
  onNewChat?: () => void;
}

export function useChatSession({ onNewChat }: UseChatSessionOptions = {}) {
  const dispatch = useAppDispatch();
  const messages = useAppSelector((s) => s.aiChat.messages);
  const currentSessionId = useAppSelector((s) => s.aiChat.currentSessionId);
  const isStreaming = useAppSelector((s) => s.aiChat.isStreaming);

  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const [activeProvider, setActiveProvider] = useState<ProviderConfigView | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const refreshSessions = useCallback(async () => {
    try {
      setSessions(await aiApi.listSessions());
    } catch {
      /* non-fatal — chat still works without the history list */
    } finally {
      setSessionsLoaded(true);
    }
  }, []);

  const checkBudget = useCallback(async () => {
    try {
      setBlocked((await aiApi.getUsage()).overBudget);
    } catch {
      /* non-fatal */
    }
  }, []);

  useEffect(() => {
    refreshSessions();
    checkBudget();
    aiApi
      .listProviders()
      .then((list) => setActiveProvider(list.find((p) => p.isActive && p.supported) ?? null))
      .catch(() => {});
  }, [refreshSessions, checkBudget]);

  // Reopen the last session on first mount (localStorage id → most recent → nothing).
  const rehydratedRef = useRef(false);
  useEffect(() => {
    if (rehydratedRef.current || !sessionsLoaded) return;
    rehydratedRef.current = true;
    if (currentSessionId || messages.length > 0) return;
    const saved = localStorage.getItem(LAST_SESSION_KEY);
    const savedIsValid = saved !== null && sessions.some((s) => s.id === saved);
    const targetId = savedIsValid ? saved : (sessions[0]?.id ?? null);
    if (!targetId) {
      if (saved) localStorage.removeItem(LAST_SESSION_KEY);
      return;
    }
    aiApi
      .getSession(targetId)
      .then((detail) => dispatch(loadSessionAction({ id: detail.id, messages: detail.messages })))
      .catch(() => {
        if (saved) localStorage.removeItem(LAST_SESSION_KEY);
      });
  }, [sessionsLoaded, sessions, currentSessionId, messages.length, dispatch]);

  // Mirror active session id to localStorage so the rehydration effect above
  // can restore it after a full page refresh.
  const persistMountedRef = useRef(false);
  useEffect(() => {
    if (!persistMountedRef.current) {
      persistMountedRef.current = true;
      return;
    }
    if (currentSessionId) localStorage.setItem(LAST_SESSION_KEY, currentSessionId);
    else localStorage.removeItem(LAST_SESSION_KEY);
  }, [currentSessionId]);

  const newChat = useCallback(() => {
    if (isStreaming) return;
    dispatch(newChatAction());
    setHistoryOpen(false);
    onNewChat?.();
  }, [isStreaming, dispatch, onNewChat]);

  const loadSession = useCallback(
    async (id: string) => {
      setHistoryOpen(false);
      if (isStreaming || id === currentSessionId) return;
      try {
        const detail = await aiApi.getSession(id);
        dispatch(loadSessionAction({ id: detail.id, messages: detail.messages }));
      } catch {
        /* ignore — likely deleted elsewhere */
      }
    },
    [isStreaming, currentSessionId, dispatch]
  );

  const deleteSession = useCallback(
    async (id: string) => {
      try {
        await aiApi.deleteSession(id);
        if (id === currentSessionId) newChat();
        await refreshSessions();
      } catch {
        /* ignore */
      }
    },
    [currentSessionId, newChat, refreshSessions]
  );

  const renameSessionTitle = useCallback(
    async (id: string, title: string) => {
      try {
        await aiApi.renameSession(id, title);
        await refreshSessions();
      } catch {
        /* ignore — UI will revert on the next refresh */
      }
    },
    [refreshSessions]
  );

  return {
    sessions,
    currentSessionId,
    activeProvider,
    blocked,
    historyOpen,
    setHistoryOpen,
    newChat,
    loadSession,
    deleteSession,
    renameSessionTitle,
    refreshSessions,
    checkBudget,
  };
}
