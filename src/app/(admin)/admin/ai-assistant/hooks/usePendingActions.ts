import { aiApi } from "@/lib/api/ai";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { addMessage, patchAction as patchActionRedux } from "@/store/slices/aiChatSlice";
import type { PendingActionState } from "../types";

interface UsePendingActionsParams {
  isStreaming: boolean;
  blocked: boolean;
}

export function usePendingActions({ isStreaming, blocked }: UsePendingActionsParams) {
  const dispatch = useAppDispatch();
  const messages = useAppSelector((s) => s.aiChat.messages);

  const patchAction = (msgIndex: number, actionId: string, patch: Partial<PendingActionState>) =>
    dispatch(patchActionRedux({ msgIndex, actionId, patch }));

  const approveAction = async (msgIndex: number, actionId: string) => {
    const action = messages[msgIndex]?.pendingActions?.find((a) => a.id === actionId);
    if (!action || action.status === "committing" || action.status === "done") return;
    patchAction(msgIndex, actionId, { status: "committing", error: undefined });
    try {
      const res = await aiApi.executeAction(action.tool, action.input, action.id);
      patchAction(msgIndex, actionId, { status: "done", resultSummary: res.summary });
      dispatch(addMessage({ role: "system", content: res.summary }));
    } catch (e) {
      patchAction(msgIndex, actionId, {
        status: "error",
        error: e instanceof Error ? e.message : "Failed to perform the action.",
      });
    }
  };

  const cancelAction = (msgIndex: number, actionId: string) => {
    patchAction(msgIndex, actionId, { status: "cancelled" });
    // Fire-and-forget: the card is already cancelled in the UI, and a failed
    // audit write must not resurrect it.
    void aiApi.cancelAction(actionId).catch(() => {});
  };

  const approveAllActions = async (msgIndex: number) => {
    if (isStreaming || blocked) return;
    const pending = messages[msgIndex]?.pendingActions?.filter(
      (a) => a.status === "pending" || a.status === "error"
    );
    if (!pending?.length) return;
    await Promise.all(pending.map((a) => approveAction(msgIndex, a.id)));
  };

  return { approveAction, cancelAction, approveAllActions };
}
