import type { SkillGroup } from "@/types";

const SKILL_GROUPS: SkillGroup[] = [
  {
    name: "Frontend",
    tags: ["React", "Next.js", "TypeScript", "JavaScript", "Vue.js", "jQuery", "HTML / CSS", "Tailwind"],
  },
  {
    name: "Backend",
    tags: ["Node.js", "PHP", "Laravel", "REST APIs", "PostgreSQL", "MySQL"],
  },
  {
    name: "DevOps & Infra",
    tags: ["Docker", "Linux VPS", "CI/CD", "Nginx", "Amazon EC2", "Google App Engine", "Plesk", "Git / GitHub"],
  },
  {
    name: "Product & Leadership",
    tags: ["Figma", "Product Planning", "Team Leadership", "Code Review", "Jira", "Confluence", "Agile / Scrum"],
  },
  {
    name: "AI & Automation",
    tags: ["Claude API", "Claude Code", "LLM Tool Use", "AI-assisted Dev", "Prompt Engineering", "Cursor", "v0", "Google Apps Script"],
  },
];

export default function Skills() {
  return (
    <div className="sec" id="skills">
      <div className="skills-rule" />
      <div className="sec-in">
        <p className="lbl">Skills &amp; Stack</p>
        <div className="skills-grid">
          {SKILL_GROUPS.map((group) => (
            <div key={group.name}>
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
