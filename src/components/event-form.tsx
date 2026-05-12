import EventFormClient from './event-form-client';

export default function EventForm() {
  // サーバーコンポーネントのため、クライアント側の処理は行わない
  // フォーム送信などのアクションはクライアントコンポーネントに委譲

  return (
    <div className="mx-auto max-w-2xl p-0 md:p-4">
      <EventFormClient />
      <div className="mt-5 border-t border-base-300 pt-4 text-sm text-base-content/60">
        作成後、参加者に共有できるリンクが発行されます。
      </div>
    </div>
  );
}
