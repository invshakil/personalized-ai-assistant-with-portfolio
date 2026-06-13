import PayeeProfilePage from "./PayeeProfilePage";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PayeeProfilePage id={id} />;
}
