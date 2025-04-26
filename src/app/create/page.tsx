import EventForm from "@/components/event-form";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import Card from "@/components/layout/Card";

export default function CreateEventPage() {
  return (
    <>
      <div className="bg-base-200 mb-6 py-4">
        <div className="container mx-auto max-w-5xl px-4">
          <Breadcrumbs items={[{ label: "イベント作成", href: null }]} />
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 pb-12">
        <div className="text-center mb-8 fade-in">
          <h1 className="text-4xl font-bold mb-3">新規イベント作成</h1>
          <p className="text-base-content/70 max-w-xl mx-auto">
            候補日程を複数選択して、参加者に共有するイベントを作成します。
            作成後に共有用リンクが発行されます。
          </p>
        </div>

        <div style={{ animationDelay: "0.1s" }}>
          <Card className="fade-in">
            <EventForm />
          </Card>
        </div>
      </div>
    </>
  );
}
