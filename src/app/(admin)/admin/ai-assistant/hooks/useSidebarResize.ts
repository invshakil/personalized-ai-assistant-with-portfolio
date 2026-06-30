import { useCallback, useEffect, useState } from "react";

const SIDEBAR_WIDTH_KEY = "ai-chat:sidebar-width";
const SIDEBAR_MIN = 200;
const SIDEBAR_MAX = 480;
const SIDEBAR_DEFAULT = 240;

export function useSidebarResize() {
  const [sidebarWidth, setSidebarWidth] = useState<number>(SIDEBAR_DEFAULT);

  useEffect(() => {
    const saved = Number(localStorage.getItem(SIDEBAR_WIDTH_KEY));
    if (Number.isFinite(saved) && saved >= SIDEBAR_MIN && saved <= SIDEBAR_MAX) {
      setSidebarWidth(saved);
    }
  }, []);

  const beginSidebarResize = useCallback((startX: number, startW: number) => {
    const onMove = (e: MouseEvent) => {
      const next = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, startW + (e.clientX - startX)));
      setSidebarWidth(next);
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      setSidebarWidth((latest) => {
        try {
          localStorage.setItem(SIDEBAR_WIDTH_KEY, String(latest));
        } catch {
          /* storage quota / disabled — non-fatal */
        }
        return latest;
      });
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, []);

  return { sidebarWidth, beginSidebarResize };
}
