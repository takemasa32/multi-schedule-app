"use client";
import { useState } from "react";
import Link from "next/link";
import EventHistory from "@/components/event-history";
import AddToHomeScreen from "@/components/add-to-home-screen";
import FavoriteEvents from "@/components/favorite-events";
import { FavoriteEventsProvider } from "@/components/favorite-events-context";

export default function PwaHomePage() {
  // URL/ID入力フォームの状態管理
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  const handleOpenEvent = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const value = input.trim();
    if (!value) {
      setError("URLまたはIDを入力してください");
      return;
    }
    // URLからID抽出
    let id = value;
    try {
      const url = new URL(value);
      const match = url.pathname.match(/\/event\/([\w-]+)/);
      if (match) id = match[1];
    } catch {
      // 入力がURLでなければそのままIDとして扱う
    }
    if (!id.match(/^[\w-]{8,}$/)) {
      setError("有効なイベントIDまたはURLを入力してください");
      return;
    }
    window.location.href = `/event/${id}`;
  };

  return (
    <FavoriteEventsProvider>
      <main className="max-w-xl mx-auto p-4 space-y-6">
        <h1 className="text-2xl font-bold mb-2">複数日程調整アプリ ホーム</h1>
        <AddToHomeScreen />
        <section>
          <Link href="/create" className="btn btn-primary w-full mb-4">
            新しいイベントを作成する
          </Link>
        </section>
        <section>
          <h2 className="text-lg font-semibold mb-2">
            最近アクセスしたイベント
          </h2>
          <EventHistory />
        </section>
        <section>
          <h2 className="text-lg font-semibold mb-2">お気に入りイベント</h2>
          <FavoriteEvents />
        </section>
        <section className="mt-6">
          <h2 className="text-lg font-semibold mb-2">イベントURL/IDから開く</h2>
          <form className="flex gap-2" onSubmit={handleOpenEvent}>
            <input
              type="text"
              className="input input-bordered flex-1"
              placeholder="イベントURLまたはIDを入力"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              aria-label="イベントURLまたはID"
            />
            <button type="submit" className="btn btn-secondary">
              開く
            </button>
          </form>
          {error && <p className="text-error text-sm mt-1">{error}</p>}
        </section>
      </main>
    </FavoriteEventsProvider>
  );
}
