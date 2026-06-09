import { db } from "@/lib/db";
import SettingsPage from "./SettingsPage";
import type { SettingsFormData } from "./types";

export const metadata = { title: "Settings" };

const defaults: SettingsFormData = {
  availableForWork: true,
  heroTagline: "Tech Lead & Full-Stack Engineer",
  heroBio: "",
  metaDescription: "",
  cvUrl: "https://drive.google.com/file/d/15jSzTm3iaj_ghVqgC_t1Wk9bKnsIfGIA/view?usp=sharing",
};

export default async function Page() {
  const row = await db.siteSettings.findUnique({ where: { id: "singleton" } });

  const initialData: SettingsFormData = row
    ? {
        availableForWork: row.availableForWork,
        heroTagline: row.heroTagline,
        heroBio: row.heroBio,
        metaDescription: row.metaDescription,
        cvUrl: row.cvUrl,
      }
    : defaults;

  return <SettingsPage initialData={initialData} />;
}
