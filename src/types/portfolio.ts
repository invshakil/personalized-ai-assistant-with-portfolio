// Portfolio surface — shared component types. Re-exported through the @/types
// barrel.

export interface SkillGroup {
  name: string;
  tags: string[];
}

export interface ExperienceEntry {
  badge: string;
  isCurrent: boolean;
  role: string;
  company: string;
  summary: string;
  bullets: string[];
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
