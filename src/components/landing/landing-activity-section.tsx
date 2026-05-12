'use client';

import { Star } from 'lucide-react';
import Card from '@/components/layout/Card';
import EventHistory from '@/components/event-history';
import FavoriteEvents from '@/components/favorite-events';
import { FavoriteEventsProvider } from '@/components/favorite-events-context';

export default function LandingActivitySection() {
  return (
    <section className="border-base-300 bg-base-200/40 border-y px-4 py-14">
      <div className="container mx-auto max-w-4xl">
        <FavoriteEventsProvider>
          <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
            <Card>
              <div className="mb-4 flex items-center gap-2">
                <Star className="text-warning h-5 w-5" aria-hidden />
                <h2 className="text-lg font-semibold">お気に入りイベント</h2>
              </div>
              <FavoriteEvents />
            </Card>

            <EventHistory
              maxDisplay={5}
              title="最近開いたイベント"
              showClearButton={true}
              withProvider={false}
              emptyStateTitle="まだ履歴はありません"
              emptyStateDescription="イベントを開いたり作成したりすると、ここに最近使ったイベントが表示されます。"
              emptyStateActionHref="/create"
              emptyStateActionLabel="イベントを作成する"
              containerClassName="m-0"
            />
          </div>
        </FavoriteEventsProvider>
      </div>
    </section>
  );
}
