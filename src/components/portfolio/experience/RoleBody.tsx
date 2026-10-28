import type { ExperienceRole } from "@/types";

/** Date badge, summary, lead line and bullets for one role. */
export default function RoleBody({ role }: { role: ExperienceRole }) {
  return (
    <>
      <span className={`exp-badge${role.isCurrent ? " current" : ""}`}>{role.badge}</span>
      <div className="exp-desc">
        {role.summary ? <p>{role.summary}</p> : null}
        {role.lead ? <p className="exp-lead">{role.lead}</p> : null}
        <ul>
          {role.bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      </div>
    </>
  );
}
