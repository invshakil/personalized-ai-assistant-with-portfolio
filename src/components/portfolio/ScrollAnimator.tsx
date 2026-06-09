"use client";

import { useEffect } from "react";

export default function ScrollAnimator() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-animate]"));

    function reveal() {
      const vh = window.innerHeight;
      els.forEach((el) => {
        if (el.classList.contains("in-view")) return;
        const { top, bottom } = el.getBoundingClientRect();
        if (top < vh * 0.93 && bottom > 0) {
          el.classList.add("in-view");
        }
      });
    }

    reveal();
    window.addEventListener("scroll", reveal, { passive: true });
    window.addEventListener("resize", reveal, { passive: true });
    return () => {
      window.removeEventListener("scroll", reveal);
      window.removeEventListener("resize", reveal);
    };
  }, []);

  return null;
}
