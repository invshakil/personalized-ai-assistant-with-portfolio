import type { SkillGroup } from "@/types";

const SKILL_GROUPS: SkillGroup[] = [
  {
    name: "Frontend",
    tags: ["React", "Next.js", "TypeScript", "JavaScript", "Vue.js", "Tailwind"],
  },
  {
    name: "Backend",
    tags: ["Node.js", "NestJS", "PHP", "Laravel", "REST APIs", "WebSockets", "PostgreSQL", "MySQL"],
  },
  {
    name: "DevOps & Infra",
    tags: ["Docker", "Linux VPS", "CI/CD", "Nginx", "Amazon EC2"],
  },
  {
    name: "Leadership",
    tags: [
      "Team Leadership",
      "Hiring & Technical Interviewing",
      "Code Review",
      "Product Ownership",
      "Async Remote Delivery",
    ],
  },
  {
    name: "AI in Production",
    tags: [
      "Claude API",
      "OpenAI API",
      "Claude Code",
      "LLM Tool Use",
      "Output validation & evals",
      "AI-assisted Dev",
      "Prompt Engineering",
      "Cursor",
    ],
  },
];

export default function Skills() {
  return (
    <div className="sec" id="skills">
      <div className="skills-rule" />
      <div className="sec-in">
        <p className="lbl" data-animate="true">
          Skills &amp; Stack
        </p>
        <div className="skills-grid">
          {SKILL_GROUPS.map((group, i) => (
            <div key={group.name} data-animate="true" data-delay={String(i + 1)}>
              <p className="sg-name">{group.name}</p>
              <div className="sg-tags">
                {group.tags.map((tag) => (
                  <span key={tag} className="sg-tag">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
