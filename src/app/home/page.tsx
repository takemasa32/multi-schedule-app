"use client";
import Link from "next/link";
import EventHistory from "@/components/event-history";
import AddToHomeScreen from "@/components/add-to-home-screen";
import FavoriteEvents from "@/components/favorite-events";
import { FavoriteEventsProvider } from "@/components/favorite-events-context";
import siteConfig from "@/lib/site-config";

export default function PwaHomePage() {
  return (
    <FavoriteEventsProvider>
      <main className="max-w-xl mx-auto p-4 space-y-6">
        <h1 className="text-2xl font-bold mb-2">
          {siteConfig.name.full}
          <span className="block text-base text-gray-500 font-normal mt-1">
            {siteConfig.name.tagline}
          </span>
        </h1>
        <AddToHomeScreen />
        <section>
          <Link href="/create" className="btn btn-primary w-full mb-4">
            新しいイベントを作成する
          </Link>
        </section>
        <section>
          <h2 className="text-lg font-semibold mb-2">お気に入りイベント</h2>
          <FavoriteEvents />
        </section>
        <section>
          <h2 className="text-lg font-semibold mb-2">
            最近アクセスしたイベント
          </h2>
          <EventHistory />
        </section>
      </main>
    </FavoriteEventsProvider>
  );
}
