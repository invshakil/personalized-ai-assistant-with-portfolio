import Image from "next/image";

/** Company logo, or a two-letter monogram when no logo file exists. */
export default function CompanyLogo({ company, logo }: { company: string; logo?: string }) {
  if (logo) {
    return <Image src={logo} alt={`${company} logo`} width={44} height={44} className="exp-logo" />;
  }

  const initials = company
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <span className="exp-logo exp-monogram" aria-hidden="true">
      {initials}
    </span>
  );
}
