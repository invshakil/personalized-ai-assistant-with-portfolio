import { redirect } from "next/navigation";

// The Property dashboard now lives under Reports.
export default function Page() {
  redirect("/admin/reports/property");
}
