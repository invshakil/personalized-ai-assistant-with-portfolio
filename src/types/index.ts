// Extend next-auth session types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string;
    };
  }
}

// Property management
export type PaymentStatus = "PENDING" | "PAID" | "PARTIAL" | "OVERDUE";
export type IncomeCategory = "SALARY" | "FREELANCE" | "RENTAL" | "OTHER";
export type ExpenseCategory =
  | "MAINTENANCE"
  | "UTILITY"
  | "SALARY"
  | "SUBSCRIPTION"
  | "CONSTRUCTION"
  | "OTHER";
export type RenovationStatus = "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export interface DashboardStats {
  totalUnits: number;
  occupiedUnits: number;
  monthlyRentCollected: number;
  monthlyRentExpected: number;
  overdueCount: number;
}

// ── Admin chat types ──

export interface Message {
  role: "user" | "assistant";
  content: string;
}

// ── Portfolio component types ──

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
