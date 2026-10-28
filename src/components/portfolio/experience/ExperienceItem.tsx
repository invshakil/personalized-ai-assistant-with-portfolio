import type { ExperienceCompany } from "@/types";

import CompanyLogo from "./CompanyLogo";
import CompanyName from "./CompanyName";
import RoleBody from "./RoleBody";

/**
 * One company in the LinkedIn-style list. A single role leads with the role title;
 * several roles lead with the company and list the roles on a timeline beneath it.
 */
export default function ExperienceItem({
  item,
  delay,
}: {
  item: ExperienceCompany;
  delay: number;
}) {
  const [onlyRole] = item.roles;
  const single = item.roles.length === 1;

  return (
    <article className="exp-item" data-animate="true" data-delay={String(delay)}>
      <CompanyLogo company={item.company} logo={item.logo} />
      <div className="exp-main">
        {single && onlyRole ? (
          <>
            <h3 className="exp-role">{onlyRole.role}</h3>
            <p className="exp-meta">
              <CompanyName
                company={item.company}
                companyUrl={item.companyUrl}
                className="exp-company"
              />
              <span> &middot; {item.meta}</span>
            </p>
            <RoleBody role={onlyRole} />
          </>
        ) : (
          <>
            <h3 className="exp-role">
              <CompanyName
                company={item.company}
                companyUrl={item.companyUrl}
                className="exp-company-title"
              />
            </h3>
            <p className="exp-meta">
              {item.meta}
              {item.span ? <span> &middot; {item.span}</span> : null}
            </p>
            <ol className="exp-roles">
              {item.roles.map((role) => (
                <li key={`${role.role}-${role.badge}`} className="exp-step">
                  <h4 className="exp-step-role">{role.role}</h4>
                  <RoleBody role={role} />
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
    </article>
  );
}
