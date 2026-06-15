import AppearanceSettingsPage from "./AppearanceSettingsPage";

export const metadata = { title: "Appearance" };

// Settings are read from AdminThemeProvider context (hydrated in the admin
// layout), so this route is a thin client-component wrapper — no DB fetch here.
export default function Page() {
  return <AppearanceSettingsPage />;
}
