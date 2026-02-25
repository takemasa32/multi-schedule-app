'use client';

import EventHistory from '@/components/event-history';
import FavoriteEvents from '@/components/favorite-events';
import { FavoriteEventsProvider } from '@/components/favorite-events-context';
import AccountScheduleTemplates from '@/components/account/account-schedule-templates';

type AccountActivityProps = {
  isAuthenticated: boolean;
};

export default function AccountActivity({ isAuthenticated }: AccountActivityProps) {
  return (
    <FavoriteEventsProvider>
      <section className="mb-8">
        <AccountScheduleTemplates initialIsAuthenticated={isAuthenticated} />
      </section>
      <section className="mb-8" data-tour-id="account-favorite-history">
        <h2 className="mb-2 text-lg font-semibold">お気に入りイベント</h2>
        <FavoriteEvents />
      </section>
      <EventHistory maxDisplay={10} showClearButton={true} title="回答履歴" withProvider={false} />
    </FavoriteEventsProvider>
  );
}
