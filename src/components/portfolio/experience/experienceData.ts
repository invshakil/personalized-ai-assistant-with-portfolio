import type { ExperienceCompany } from "@/types";

/** Work history, newest first. Companies with several roles list them newest first. */
export const EXPERIENCE: ExperienceCompany[] = [
  {
    company: "Capital Typing",
    meta: "Contract · Remote (United States)",
    roles: [
      {
        badge: "Oct 2026 – Present",
        isCurrent: true,
        role: "Senior Software Engineer & Tech Lead",
        summary:
          "Leading development across Capital Typing's software products on a long-term contract.",
        lead: "A returning client: I first built the company's admin system in 2018–2020. It still runs the business today, and the new platform follows the same business logic.",
        bullets: [
          "Point-of-sale system for retail stores: rebuilt the frontend foundation (Next.js, TypeScript), secure sessions and staff permissions, and the shipping, ordering and payment flows, delivered in fixed-scope milestones with test steps and automated end-to-end tests",
          "Cloud service for counter hardware (NestJS, WebSocket, MongoDB, Redis, Docker): connects each counter PC's label printer, receipt printer and scale to the POS, with live device status and secure PC linking. Deployed and run on GCP",
          "Rework of the company's operations platform: code audit, a shared foundation for list and detail screens, and a plan to switch the team over from the previous system",
          "Technical leadership: turning the owner's requirements into specs and milestone plans, coordinating frontend, backend and desktop developers, and code review and security audits on every change",
        ],
      },
    ],
  },
  {
    company: "Savannah Group",
    logo: "/savannah-logo.png",
    companyUrl: "https://www.linkedin.com/company/savannah-group/",
    meta: "Contract via a German agency · Remote (United Kingdom)",
    span: "Nov 2020 – Jul 2026 · 5 yrs 9 mos",
    roles: [
      {
        badge: "Apr 2022 – Jul 2026",
        isCurrent: false,
        role: "Lead Frontend Engineer",
        summary:
          "Lead frontend engineer on a B2B SaaS platform for talent intelligence and organisational research. Engagement ended when the product was acquired; the acquirer did not retain contractors.",
        lead: "A hands-on product partner — not just an implementer. I planned and decided alongside the product owner, shaping requirements, scope, and how features behaved before any code was written.",
        bullets: [
          "Promoted to lead after 18 months and owned the frontend through to acquisition — architecture, state management, API integration layer, and weekly releases across dev, staging and production.",
          "Longest tenure on the engineering team at six years; next-longest was 3.5",
          "Retained as the most senior engineer through a downsize from 16 engineers to 4",
          "Led a three-engineer frontend team and ran frontend hiring: 15 candidates interviewed, 6 hired and onboarded",
          "Diagnosed UI freezes under concurrent background jobs and fixed them by tiering event delivery — high-priority completions over Pusher, interval polling for the rest",
          "Led the frontend for AI-assisted candidate search: an LLM extracts filter criteria from a described profile, surfaced as an editable draft the user validates before running",
          "Built the data-dense search, filtering and analytics interfaces used concurrently by 30–40 researchers at global automotive and consumer brands",
        ],
      },
      {
        badge: "Nov 2020 – Apr 2022",
        isCurrent: false,
        role: "Frontend Engineer",
        summary:
          "Frontend engineer on MapX, the B2B SaaS platform for talent intelligence and organisational research.",
        bullets: [
          "Founding frontend engineer on MapX: built the frontend from first commit — application architecture, state management and the API integration layer — and set the release process the team used from then on.",
        ],
      },
    ],
  },
  {
    company: "DevArena GmbH",
    logo: "/devarena-logo.png",
    companyUrl: "https://www.linkedin.com/company/devarena/",
    meta: "Freelance · Remote (Germany)",
    roles: [
      {
        badge: "Mar 2025 – May 2026",
        isCurrent: false,
        role: "Tech Lead",
        summary:
          "Platform where companies evaluate and grow developer talent through assessments and live competitive challenges. Delivered to MVP; paused while the founder raises funding.",
        lead: "I owned the product direction end-to-end — deciding which features shipped, how they worked, and the workflows behind them, then leading the team to deliver them.",
        bullets: [
          "Owned product scope and roadmap — feature decisions, behaviour, and workflows",
          "Led delivery across 5 engineers and 4 product stakeholders — planning, implementation oversight, and quality at every milestone",
          "Coordinated mobile app releases across iOS and Android with store compliance",
          "Shipped REST API features — invitations, assessments, PDF reports, and role-based access",
          "Powered real-time multiplayer coding battles via WebSockets and a matchmaking engine",
          "Built multi-language question generation on the Claude API with a human-in-the-loop review step — 100 validated questions in ~40 minutes at a 5% rejection rate",
        ],
      },
    ],
  },
];
