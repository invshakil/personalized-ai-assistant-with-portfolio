/** Company name; links to its LinkedIn page when one is known. */
export default function CompanyName({
  company,
  companyUrl,
  className,
}: {
  company: string;
  companyUrl?: string;
  className: string;
}) {
  if (!companyUrl) {
    return <span className={className}>{company}</span>;
  }

  return (
    <a
      href={companyUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`${className} exp-company-link`}
      aria-label={`${company} on LinkedIn (opens in a new tab)`}
    >
      {company}
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
  );
}
