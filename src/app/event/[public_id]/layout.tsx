import { getEvent } from "@/lib/actions";
import { notFound } from "next/navigation";
import { EventHeader } from "@/components/event-header";
import { FavoriteEventsProvider } from "@/components/favorite-events-context";

export default async function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { public_id: string };
}) {
  const event = await getEvent(params.public_id);
  if (!event) {
    notFound();
  }
  return (
    <FavoriteEventsProvider>
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <EventHeader
          eventId={event.id}
          title={event.title}
          description={event.description}
          isFinalized={event.is_finalized}
          isAdmin={false}
        />
        {children}
      </div>
    </FavoriteEventsProvider>
  );
}
