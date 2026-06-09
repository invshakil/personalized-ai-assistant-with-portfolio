import type { Project } from "@/types";

const LockIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const HeartIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const GitHubIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

const PROJECTS: Project[] = [
  {
    num: "01",
    title: "MapX — Talent Intelligence Platform",
    description:
      "B2B SaaS platform for talent intelligence and organisational research, including executive talent mapping. Built data-rich interfaces for executive search, filtering, and analytics — owning the full frontend architecture, state management, API integration, and automated deployment pipelines across dev, staging, and production.",
    tech: ["React", "TypeScript", "Node.js", "CI/CD"],
    footer: { label: "Private · Savannah Group", icon: "lock" },
  },
  {
    num: "02",
    title: "DevArena — Developer Evaluation Platform",
    description:
      "Platform for companies to evaluate and grow developer talent through assessments and live competitive challenges. Led the team end-to-end — shipping REST APIs, real-time multiplayer coding battles via WebSockets, a matchmaking engine, iOS & Android releases, and AI-powered multi-language question generation at scale.",
    tech: ["Node.js", "WebSockets", "REST API", "AI Integration"],
    footer: { label: "Private · DevArena", icon: "lock" },
  },
  {
    num: "03",
    title: "AI Property Management Dashboard",
    description:
      "A personalized AI assistant with a public portfolio layer and a private dashboard — built with Next.js, PostgreSQL, and Claude API. Features natural-language querying, property management, and AI-augmented workflows. Actively in development.",
    tech: ["Next.js", "PostgreSQL", "Claude API", "Node.js"],
    footer: {
      label: "Personal · Public",
      icon: "heart",
      link: "https://github.com/invshakil/personalized-ai-assistant-with-portfolio",
    },
  },
  {
    num: "04",
    title: "Home Network & Solar Setup",
    description:
      "Hobby project — designed and deployed a multi-floor home network (Starlink → Mikrotik → mesh Wi-Fi) with tenant subnet isolation and bandwidth controls. Paired with a 6kW hybrid solar system and 16kWh battery bank, monitored for energy self-sufficiency and load management.",
    tech: ["Mikrotik", "Networking", "Solar / IoT", "Linux"],
    footer: { label: "Hobby & personal", icon: "heart" },
  },
];

export default function Projects() {
  return (
    <div className="sec" id="projects">
      <div className="proj-rule" />
      <div className="sec-in">
        <p className="lbl" data-animate="true">Selected Projects</p>
        <div className="proj-grid">
          {PROJECTS.map((project, i) => (
            <div key={project.num} className="proj-card" data-animate="true" data-delay={String(i + 1)}>
              <p className="proj-num">{project.num}</p>
              <h3 className="proj-title">{project.title}</h3>
              <p className="proj-desc">{project.description}</p>
              <div className="proj-tech">
                {project.tech.map((t) => (
                  <span key={t} className="tech-pill">
                    {t}
                  </span>
                ))}
              </div>
              <div
                className="proj-footer"
                style={project.footer.link ? { justifyContent: "space-between" } : undefined}
              >
                <span className="proj-private">
                  {project.footer.icon === "lock" ? <LockIcon /> : <HeartIcon />}
                  {project.footer.label}
                </span>
                {project.footer.link && (
                  <a
                    href={project.footer.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="proj-link-btn"
                  >
                    <GitHubIcon />
                    View on GitHub
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
