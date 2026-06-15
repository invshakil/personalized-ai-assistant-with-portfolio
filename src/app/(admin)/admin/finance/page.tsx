import { redirect } from "next/navigation";

// The Financial Tracker dashboard moved to Reports; the section now opens on
// Earnings. The report is reached via Reports → Financial Tracker Reports.
export default function Page() {
  redirect("/admin/finance/earnings");
}
