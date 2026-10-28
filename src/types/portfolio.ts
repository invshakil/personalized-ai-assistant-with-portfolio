// Portfolio surface — shared component types. Re-exported through the @/types
// barrel.

export interface SkillGroup {
  name: string;
  tags: string[];
}

/** One role held at a company; a company can list several (LinkedIn style). */
export interface ExperienceRole {
  /** Date range shown on the role, e.g. "Apr 2022 – Jul 2026". */
  badge: string;
  isCurrent: boolean;
  role: string;
  summary?: string;
  /** Emphasised lead line framing the product-ownership involvement. */
  lead?: string;
  bullets: string[];
}

/** A company with its roles, newest role first. */
export interface ExperienceCompany {
  company: string;
  /** Public-folder path to the company logo; without one a monogram is shown. */
  logo?: string;
  /** LinkedIn company page — the company name links here for verification. */
  companyUrl?: string;
  /** Employment type and location, e.g. "Contract · Remote (United States)". */
  meta: string;
  /** Total time at the company, shown when it lists more than one role. */
  span?: string;
  roles: ExperienceRole[];
}

export interface Project {
  num: string;
  title: string;
  description: string;
  tech: string[];
  footer: {
    label: string;
    icon: "lock" | "heart";
    link?: string;
  };
}

export interface EducationItem {
  years: string;
  degree: string;
  institution: string;
}

export interface Testimonial {
  rating: number;
  date: string;
  quote: string;
  tags: string[];
  project: string;
  source: string;
}

export type ContactIconType = "email" | "linkedin" | "github" | "whatsapp" | "cv";

export interface ContactLink {
  label: string;
  value: string;
  href: string;
  icon: ContactIconType;
}
