import EventFormClient from './event-form-client';

export default function EventForm() {
  // サーバーコンポーネントのため、クライアント側の処理は行わない
  // フォーム送信などのアクションはクライアントコンポーネントに委譲

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-7">
      <EventFormClient />
      <div className="border-base-300 text-base-content/60 mt-7 border-t pt-5 text-sm leading-6">
        作成後、参加者に共有できるリンクが発行されます。
      </div>
    </div>
  );
}
