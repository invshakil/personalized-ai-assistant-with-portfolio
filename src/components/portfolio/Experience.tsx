import type { ExperienceEntry } from "@/types";

const FULLTIME_JOBS: ExperienceEntry[] = [
  {
    badge: "Current · 2020 – Present",
    isCurrent: true,
    role: "Lead Frontend Engineer",
    company: "Savannah Group",
    summary:
      "Lead frontend engineer on a B2B SaaS platform for talent intelligence and organisational research.",
    bullets: [
      "Delivering end-to-end product features — from requirements to deployment",
      "Building responsive, data-rich interfaces for search, filtering, and analytics",
      "Owning the full frontend architecture, state management, and API integration",
      "Maintaining automated deployment pipelines across dev, staging, and production",
      "Leveraging AI-assisted workflows (Claude Code, Antigravity) to accelerate delivery",
      "Collaborating with backend engineers, product, and stakeholders to ship well-tested software",
    ],
  },
];

const FREELANCE_JOBS: ExperienceEntry[] = [
  {
    badge: "2025 – 2026",
    isCurrent: true,
    role: "Tech Lead & Backend Engineer",
    company: "DevArena",
    summary:
      "Platform where companies evaluate and grow developer talent through assessments and live competitive challenges.",
    bullets: [
      "Leading the team end-to-end — product planning, implementation oversight, and quality at every milestone",
      "Coordinating mobile app releases across iOS and Android with store compliance",
      "Shipping REST API features — invitations, assessments, PDF reports, and role-based access",
      "Powering real-time multiplayer coding battles via WebSockets and a matchmaking engine",
      "Integrating AI for multi-language question generation with bulk Excel/CSV import pipelines",
    ],
  },
];

function ExperienceCard({ entry, delay }: { entry: ExperienceEntry; delay?: number }) {
  return (
    <div className="exp-entry" data-animate="true" data-delay={delay !== undefined ? String(delay) : undefined}>
      <span className={`exp-badge${entry.isCurrent ? " current" : ""}`}>{entry.badge}</span>
      <p className="exp-role">{entry.role}</p>
      <p className="exp-company">{entry.company}</p>
      <div className="exp-desc">
        <p>{entry.summary}</p>
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
        <p className="lbl" data-animate="true">Work Experience</p>
        <div className="exp-cols">
          <div>
            <p className="exp-col-label" data-animate="true" data-delay="1">Full-time</p>
            {FULLTIME_JOBS.map((entry, i) => (
              <ExperienceCard key={entry.company} entry={entry} delay={i + 2} />
            ))}
          </div>
          <div>
            <p className="exp-col-label freelance" data-animate="true" data-delay="1">Freelance</p>
            {FREELANCE_JOBS.map((entry, i) => (
              <ExperienceCard key={entry.company} entry={entry} delay={i + 2} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
