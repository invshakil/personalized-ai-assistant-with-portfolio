"use client";

import { useEffect, useState } from "react";

// Floating "Book a chat" CTA that lives on the portfolio surface. Visible as
// long as booking is enabled AND the visitor hasn't scrolled into #booking yet.
// Posts a smooth scroll to the booking section on click.
export default function FloatingBookButton() {
  const [enabled, setEnabled] = useState(false);
  const [hidden, setHidden] = useState(false);

  // Probe the booking config — same endpoint the picker uses. We only render
  // when bookings are actually live (master switch + Google connected).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/booking/config", { cache: "no-store" });
        if (!res.ok) return;
        const j = (await res.json()) as { data?: { enabled?: boolean } };
        if (!cancelled) setEnabled(!!j.data?.enabled);
      } catch {
        // silent — button stays hidden if config unreachable
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Hide while the booking section is on-screen so it doesn't sit on top of
  // the form the visitor just opened.
  useEffect(() => {
    if (!enabled) return;
    const target = document.getElementById("booking");
    if (!target) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) setHidden(e.isIntersecting);
      },
      { rootMargin: "-20% 0px -20% 0px" }
    );
    io.observe(target);
    return () => io.disconnect();
  }, [enabled]);

  if (!enabled) return null;

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const target = document.getElementById("booking");
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <a
      href="#booking"
      onClick={onClick}
      className={`fb-cta${hidden ? " fb-cta--hidden" : ""}`}
      aria-label="Book a consultation"
    >
      <span className="fb-cta-dot" aria-hidden="true" />
      <span className="fb-cta-text">Book a quick call</span>
      <svg
        className="fb-cta-arrow"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </svg>
    </a>
  );
}
