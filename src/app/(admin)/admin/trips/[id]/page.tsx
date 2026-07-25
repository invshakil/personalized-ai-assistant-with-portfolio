import TripDetailPage from "./TripDetailPage";

export const metadata = { title: "Trip" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TripDetailPage tripId={id} />;
}
