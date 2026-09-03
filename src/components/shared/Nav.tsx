"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import Link from "next/link";

const DELAYS = [0, 0.08, 0.18, 0.28, 0.38, 0.48];

// Root-relative so the nav also works from routes that aren't the home page
// (e.g. the public trip guide at /trips/<slug>), where bare hashes point at
// sections that don't exist. On "/" the browser still scrolls in place.
const NAV_LINKS = [
  { href: "/#skills", label: "Skills" },
  { href: "/#experience", label: "Experience" },
  { href: "/#projects", label: "Projects" },
  { href: "/#contact", label: "Contact" },
] as const;

export default function Nav() {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  // Hide elements before first paint, then reveal on scroll
  useLayoutEffect(() => {
    document.querySelectorAll<HTMLElement>("[data-animate]").forEach((el) => {
      const d = Number(el.dataset.delay ?? 0);
      delete el.dataset.revealed;
      el.style.opacity = "0";
      el.style.transform = "translateY(24px)";
      el.style.transition = `opacity 0.55s ease ${DELAYS[d] ?? 0}s, transform 0.55s ease ${DELAYS[d] ?? 0}s`;
    });
  }, []);

  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-animate]"));

    function reveal() {
      const vh = window.innerHeight;
      els.forEach((el) => {
        if (el.dataset.revealed) return;
        const { top, bottom } = el.getBoundingClientRect();
        if (top < vh * 0.93 && bottom > 0) {
          el.dataset.revealed = "true";
          el.style.opacity = "1";
          el.style.transform = "translateY(0)";
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

  function closeNav(): void {
    setIsOpen(false);
  }

  return (
    <nav>
      <div className="nav-inner">
        <Link className="nav-logo" href="/#hero">
          Shakil
        </Link>

        <ul className="nav-links">
          {NAV_LINKS.map(({ href, label }) => (
            <li key={href}>
              <a href={href}>{label}</a>
            </li>
          ))}
        </ul>

        <button
          className={`nav-toggle${isOpen ? " open" : ""}`}
          aria-label="Toggle menu"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((prev) => !prev)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      <div className={`nav-mobile${isOpen ? " open" : ""}`}>
        {NAV_LINKS.map(({ href, label }) => (
          <a key={href} href={href} onClick={closeNav}>
            {label}
          </a>
        ))}
      </div>
    </nav>
  );
}
