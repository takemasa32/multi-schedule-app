"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  EventHistoryItem,
  getEventHistory,
  clearEventHistory,
  removeEventFromHistory,
} from "@/lib/utils";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import FavoriteEvents from "@/components/favorite-events";
import { FavoriteEventsProvider } from "@/components/favorite-events-context";

export default function HistoryPage() {
  const [history, setHistory] = useState<EventHistoryItem[]>([]);

  useEffect(() => {
    setHistory(getEventHistory());

    // ストレージの変更を監視
    const handleStorageChange = () => {
      setHistory(getEventHistory());
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const handleClearHistory = () => {
    if (confirm("すべての履歴を削除してもよろしいですか？")) {
      clearEventHistory();
      setHistory([]);
    }
  };

  const handleRemoveItem = (eventId: string) => {
    removeEventFromHistory(eventId);
    setHistory(getEventHistory());
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  return (
    <FavoriteEventsProvider>
      <div className="container mx-auto px-4 py-8">
        <Breadcrumbs
          items={[
            { label: "ホーム", href: "/" },
            { label: "閲覧履歴", href: "/history" },
          ]}
        />

        <h1 className="text-2xl font-bold mb-6">イベント閲覧履歴</h1>

        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-2">お気に入りイベント</h2>
          <FavoriteEvents />
        </section>

        {history.length === 0 ? (
          <div className="text-center py-10 bg-base-200 rounded-lg">
            <p>閲覧履歴はありません</p>
            <Link href="/" className="btn btn-primary mt-4">
              ホームに戻る
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-4 flex justify-between items-center">
              <p className="text-sm text-gray-500">
                {history.length}件のイベント履歴があります
              </p>
              <button
                onClick={handleClearHistory}
                className="btn btn-outline btn-sm"
              >
                すべての履歴を削除
              </button>
            </div>

            <div className="bg-base-200 rounded-lg overflow-hidden">
              <ul className="divide-y divide-base-300">
                {history.map((event) => (
                  <li key={event.id} className="p-4 hover:bg-base-300">
                    <div className="flex justify-between items-start">
                      <div>
                        <Link
                          href={
                            event.isCreatedByMe && event.adminToken
                              ? `/event/${event.id}?admin=${event.adminToken}`
                              : `/event/${event.id}`
                          }
                          className="text-lg font-medium text-primary hover:underline"
                        >
                          {event.title}
                        </Link>
                        <p className="text-sm text-gray-500 mt-1">
                          {formatDate(event.createdAt)}
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        {event.isCreatedByMe && (
                          <span className="badge badge-primary">主催</span>
                        )}
                        <button
                          onClick={() => handleRemoveItem(event.id)}
                          className="btn btn-ghost btn-xs"
                          title="履歴から削除"
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 text-center">
              <Link href="/" className="btn btn-primary">
                ホームに戻る
              </Link>
            </div>
          </>
        )}
      </div>
    </FavoriteEventsProvider>
  );
}
