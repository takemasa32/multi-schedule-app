import EventForm from "@/components/event-form";
import { createEvent } from "@/lib/actions";

export default function HomePage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">
          新規イベント作成
        </h1>

        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <EventForm createEvent={createEvent} />
          </div>
        </div>
      </div>
    </main>
  );
}
