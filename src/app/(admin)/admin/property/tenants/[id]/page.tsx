import TenantProfilePage from "./TenantProfilePage";

export const metadata = { title: "Tenant Profile" };

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <TenantProfilePage params={params} />;
}
