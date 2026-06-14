import { db } from "@/lib/db";

export interface SiteSettingsInput {
  availableForWork: boolean;
  heroTagline?: string;
  heroBio?: string;
  metaDescription?: string;
  cvUrl?: string;
}

/** Upsert the portfolio SiteSettings singleton (id = "singleton"). */
export function upsertSiteSettings(input: SiteSettingsInput) {
  return db.siteSettings.upsert({
    where: { id: "singleton" },
    update: {
      availableForWork: input.availableForWork,
      heroTagline: input.heroTagline,
      heroBio: input.heroBio,
      metaDescription: input.metaDescription,
      cvUrl: input.cvUrl,
    },
    create: {
      id: "singleton",
      availableForWork: input.availableForWork,
      heroTagline: input.heroTagline ?? "Tech Lead & Full-Stack Engineer",
      heroBio: input.heroBio ?? "",
      metaDescription: input.metaDescription ?? "",
      metaKeywords: "",
      cvUrl: input.cvUrl ?? "",
    },
  });
}
