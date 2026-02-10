'use client';

import EventHistory from '@/components/event-history';
import FavoriteEvents from '@/components/favorite-events';
import { FavoriteEventsProvider } from '@/components/favorite-events-context';
import AccountScheduleTemplates from '@/components/account/account-schedule-templates';
import AccountAnswerLinker from '@/components/account/account-answer-linker';

type AccountActivityProps = {
  isAuthenticated: boolean;
};

export default function AccountActivity({ isAuthenticated }: AccountActivityProps) {
  return (
    <FavoriteEventsProvider>
      <section className="mb-8">
        <h2 className="mb-2 text-lg font-semibold">マイ予定設定</h2>
        <AccountScheduleTemplates initialIsAuthenticated={isAuthenticated} />
      </section>
      <AccountAnswerLinker />
      <section className="mb-8">
        <h2 className="mb-2 text-lg font-semibold">お気に入りイベント</h2>
        <FavoriteEvents />
      </section>
      <EventHistory maxDisplay={10} showClearButton={true} title="閲覧履歴" withProvider={false} />
    </FavoriteEventsProvider>
  );
}
