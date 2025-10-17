import { getEvent } from "@/lib/actions";
import { notFound } from "next/navigation";
import { EventNotFoundError } from "@/lib/errors";
import { EventHeader } from "@/components/event-header";
import { FavoriteEventsProvider } from "@/components/favorite-events-context";

export default async function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ public_id: string }>;
}) {
  const { public_id } = await params;
  let event;
  try {
    event = await getEvent(public_id);
  } catch (err) {
    if (err instanceof EventNotFoundError) {
      notFound();
    }
    console.error('イベント取得エラー:', err);
    throw err;
  }
  return (
    <FavoriteEventsProvider>
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <EventHeader
          eventId={event.public_token}
          title={event.title}
          description={event.description}
          isFinalized={event.is_finalized}
        />
        {children}
      </div>
    </FavoriteEventsProvider>
  );
}
