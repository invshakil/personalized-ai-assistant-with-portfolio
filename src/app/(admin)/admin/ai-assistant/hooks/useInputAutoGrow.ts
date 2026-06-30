import type { RefObject } from "react";
import { useLayoutEffect } from "react";

export function useInputAutoGrow(ref: RefObject<HTMLTextAreaElement | null>, value: string) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    const lineH = parseFloat(getComputedStyle(el).lineHeight) || 24;
    const maxH = lineH * 12;
    el.style.height = `${Math.min(el.scrollHeight, maxH)}px`;
    el.style.overflow = el.scrollHeight > maxH ? "auto" : "hidden";
  }, [ref, value]);
}
