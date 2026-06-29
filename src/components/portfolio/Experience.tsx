import Image from "next/image";

import type { ExperienceEntry } from "@/types";

const FULLTIME_JOBS: ExperienceEntry[] = [
  {
    badge: "Current · 2020 – Present",
    isCurrent: true,
    role: "Lead Frontend Engineer",
    company: "Savannah Group",
    logo: "/savannah-logo.png",
    companyUrl: "https://www.linkedin.com/company/savannah-group/",
    summary:
      "Lead frontend engineer on a B2B SaaS platform for talent intelligence and organisational research.",
    lead: "A hands-on product partner — not just an implementer. I plan and decide alongside the product owner, shaping requirements, scope, and how features behave before any code is written.",
    bullets: [
      "Defining requirements and feature decisions together with the product owner",
      "Delivering end-to-end product features — from requirements to deployment",
      "Building responsive, data-rich interfaces for search, filtering, and analytics",
      "Owning the full frontend architecture, state management, and API integration",
      "Maintaining automated deployment pipelines across dev, staging, and production",
      "Leveraging AI-assisted workflows (Claude Code, Antigravity) to accelerate delivery",
    ],
  },
];

const FREELANCE_JOBS: ExperienceEntry[] = [
  {
    badge: "2025 – 2026",
    isCurrent: true,
    role: "Tech Lead & Product Owner",
    company: "DevArena GmbH",
    logo: "/devarena-logo.png",
    companyUrl: "https://www.linkedin.com/company/devarena/",
    summary:
      "Platform where companies evaluate and grow developer talent through assessments and live competitive challenges.",
    lead: "I own the product direction end-to-end — deciding which features ship, how they work, and the workflows behind them, then leading the team to deliver them.",
    bullets: [
      "Owning product scope and roadmap — feature decisions, behaviour, and workflows",
      "Leading the team end-to-end — planning, implementation oversight, and quality at every milestone",
      "Coordinating mobile app releases across iOS and Android with store compliance",
      "Shipping REST API features — invitations, assessments, PDF reports, and role-based access",
      "Powering real-time multiplayer coding battles via WebSockets and a matchmaking engine",
      "Integrating AI for multi-language question generation with bulk Excel/CSV import pipelines",
    ],
  },
];

function ExperienceCard({ entry, delay }: { entry: ExperienceEntry; delay?: number }) {
  return (
    <div
      className="exp-entry"
      data-animate="true"
      data-delay={delay !== undefined ? String(delay) : undefined}
    >
      <span className={`exp-badge${entry.isCurrent ? " current" : ""}`}>{entry.badge}</span>
      <p className="exp-role">{entry.role}</p>
      <div className="exp-company-row">
        <Image
          src={entry.logo}
          alt={`${entry.company} logo`}
          width={28}
          height={28}
          className="exp-logo"
        />
        <a
          href={entry.companyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="exp-company-link"
          aria-label={`${entry.company} on LinkedIn (opens in a new tab)`}
        >
          {entry.company}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="exp-company-ext"
          >
            <path d="M7 17 17 7M9 7h8v8" />
          </svg>
        </a>
      </div>
      <div className="exp-desc">
        <p>{entry.summary}</p>
        {entry.lead ? <p className="exp-lead">{entry.lead}</p> : null}
        <ul>
          {entry.bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function Experience() {
  return (
    <div className="sec" id="experience">
      <div className="exp-rule" />
      <div className="sec-in">
        <p className="lbl" data-animate="true">
          Work Experience
        </p>
        <div className="exp-cols">
          <div>
            <p className="exp-col-label" data-animate="true" data-delay="1">
              Full-time
            </p>
            {FULLTIME_JOBS.map((entry, i) => (
              <ExperienceCard key={entry.company} entry={entry} delay={i + 2} />
            ))}
          </div>
          <div>
            <p className="exp-col-label freelance" data-animate="true" data-delay="1">
              Freelance
            </p>
            {FREELANCE_JOBS.map((entry, i) => (
              <ExperienceCard key={entry.company} entry={entry} delay={i + 2} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
