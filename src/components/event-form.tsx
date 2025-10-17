import EventFormClient from './event-form-client';

export default function EventForm() {
  // サーバーコンポーネントのため、クライアント側の処理は行わない
  // フォーム送信などのアクションはクライアントコンポーネントに委譲

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="mb-6 text-2xl font-bold">新規イベント作成</h1>
      <EventFormClient />
      <div className="mt-4 text-sm text-gray-500">
        作成後、参加者に共有できるリンクが発行されます。
      </div>
    </div>
  );
}
