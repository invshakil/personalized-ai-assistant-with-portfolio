import Image from "next/image";

import type { ExperienceEntry } from "@/types";

const CONTRACT_JOBS: ExperienceEntry[] = [
  {
    badge: "Nov 2020 – Jul 2026",
    isCurrent: false,
    role: "Lead Frontend Engineer",
    company: "Savannah Group",
    logo: "/savannah-logo.png",
    companyUrl: "https://www.linkedin.com/company/savannah-group/",
    summary:
      "Lead frontend engineer on a B2B SaaS platform for talent intelligence and organisational research. Engagement ended when the product was acquired; the acquirer did not retain contractors.",
    lead: "A hands-on product partner — not just an implementer. I planned and decided alongside the product owner, shaping requirements, scope, and how features behaved before any code was written.",
    bullets: [
      "Founding frontend engineer — owned architecture, state management, the API integration layer and weekly releases from first commit through to acquisition",
      "Longest tenure on the engineering team at six years; next-longest was 3.5",
      "Retained as the most senior engineer through a downsize from 16 engineers to 4",
      "Led a three-engineer frontend team and ran frontend hiring: 15 candidates interviewed, 6 hired and onboarded",
      "Diagnosed UI freezes under concurrent background jobs and fixed them by tiering event delivery — high-priority completions over Pusher, interval polling for the rest",
      "Led the frontend for AI-assisted candidate search: an LLM extracts filter criteria from a described profile, surfaced as an editable draft the user validates before running",
      "Built the data-dense search, filtering and analytics interfaces used concurrently by 30–40 researchers at global automotive and consumer brands",
    ],
  },
];

const FREELANCE_JOBS: ExperienceEntry[] = [
  {
    badge: "Mar 2025 – May 2026",
    isCurrent: false,
    role: "Tech Lead & Product Owner",
    company: "DevArena GmbH",
    logo: "/devarena-logo.png",
    companyUrl: "https://www.linkedin.com/company/devarena/",
    summary:
      "Platform where companies evaluate and grow developer talent through assessments and live competitive challenges. Delivered to MVP; paused while the founder raised funding.",
    lead: "I owned the product direction end-to-end — deciding which features shipped, how they worked, and the workflows behind them, then leading the team to deliver them.",
    bullets: [
      "Owned product scope and roadmap — feature decisions, behaviour, and workflows",
      "Led delivery across 5 engineers and 4 product stakeholders — planning, implementation oversight, and quality at every milestone",
      "Coordinated mobile app releases across iOS and Android with store compliance",
      "Shipped REST API features — invitations, assessments, PDF reports, and role-based access",
      "Powered real-time multiplayer coding battles via WebSockets and a matchmaking engine",
      "Built multi-language question generation on the Claude API with a human-in-the-loop review step — 100 validated questions in ~40 minutes at a 5% rejection rate",
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
              Contract (via German agency)
            </p>
            {CONTRACT_JOBS.map((entry, i) => (
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
