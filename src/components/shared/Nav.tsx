"use client";

import { useState } from "react";
import Link from "next/link";

const NAV_LINKS = [
  { href: "#skills", label: "Skills" },
  { href: "#experience", label: "Experience" },
  { href: "#projects", label: "Projects" },
  { href: "#education", label: "Education" },
  { href: "#contact", label: "Contact" },
] as const;

export default function Nav() {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  function closeNav(): void {
    setIsOpen(false);
  }

  return (
    <nav>
      <div className="nav-inner">
        <Link className="nav-logo" href="#hero">
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
